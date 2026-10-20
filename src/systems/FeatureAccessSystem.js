/**
 * @file FeatureAccessSystem.js
 * @brief DOM-free resolver for sticky world progression and quest-gated features.
 *
 * This is the single source of access rules. It combines the original map graph (badges, connections,
 * cleared routes and special quest/item/title gates) with per-save sticky unlocks. UI consumers receive
 * ContentAccessChangedEvent; gameplay systems still ask this resolver before mutating state.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationKinds } from '../data/world/LocationKinds.js';
import { TrainerDB } from '../data/trainers/TrainerDB.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { STARTERS_BY_REGION } from '../data/pokemon/StarterData.js';
import { REGIONS } from '../config/Regions.js';
import { CONTENT_FEATURES, LOCATION_ACCESS_GATES, MIRAGE_ROTATION_WINDOW_MS, REGION_START_LOCATIONS } from '../config/ContentAccessRules.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { MineRules } from '../config/MineRules.js';
import { TrainingRules } from '../config/TrainingRules.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { TrainerDefeatedEvent } from '../core/events/TrainerDefeatedEvent.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';

const FEATURE_IDS = Object.freeze(Object.values(CONTENT_FEATURES));
/** @param {Object|null} snapshot @returns {string} */
function snapshotKey(snapshot) {
  return JSON.stringify(snapshot);
}

export class FeatureAccessSystem extends BaseSystem {
  /** @private @type {FeatureAccessSystem|null} */
  static _instance = null;

  /** @returns {FeatureAccessSystem} */
  static getInstance() {
    if (!FeatureAccessSystem._instance) FeatureAccessSystem._instance = new FeatureAccessSystem();
    return FeatureAccessSystem._instance;
  }

  constructor() {
    super('FeatureAccessSystem', 'System');
    /** @private @type {Array<[Function, Function]>} */
    this._subscriptions = [];
    /** @private @type {Object|null} */
    this._lastSnapshot = null;
  }

  /** @override */
  init() {
    if (this._subscriptions.length) return;
    const bus = EventBus.getInstance();
    const bind = (eventClass, reason, predicate = null) => {
      const callback = (event) => {
        if (!predicate || predicate(event)) this.refresh(reason);
      };
      bus.subscribe(eventClass, callback);
      this._subscriptions.push([eventClass, callback]);
    };
    bind(SaveCreatedEvent, 'save-created');
    bind(SaveLoadedEvent, 'save-loaded');
    bind(SaveDeletedEvent, 'save-deleted');
    bind(LocationChangedEvent, 'location-changed');
    bind(BadgesChangedEvent, 'badges-changed');
    bind(QuestClaimedEvent, 'quest-claimed');
    bind(InventoryChangedEvent, 'inventory-changed');
    bind(PokemonDefeatedEvent, 'wild-win', (event) => event.wild === true);
    bind(TrainerDefeatedEvent, 'trainer-defeated');
    bind(PokedexChangedEvent, 'pokedex-changed');
    this.refresh('system-ready', { force: true, persist: false });
  }

  /** @override */
  onDestroy() {
    const bus = EventBus.getInstance();
    for (const [eventClass, callback] of this._subscriptions) bus.unsubscribe(eventClass, callback);
    this._subscriptions = [];
    this._lastSnapshot = null;
    super.onDestroy();
  }

  /** @returns {Object} Plain access snapshot safe for UI consumers. */
  getSnapshot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) {
      return {
        features: Object.fromEntries(FEATURE_IDS.map((id) => [id, false])),
        locations: [],
        regions: ['kanto'],
        regionStarters: [],
        championTitle: false
      };
    }
    return {
      features: Object.fromEntries(FEATURE_IDS.map((id) => [id, this._isFeatureUnlocked(id, save)])),
      locations: this.getUnlockedLocations().map((location) => location.id),
      regions: this._getAccessibleRegions(save),
      regionStarters: [...save.access.regionStarters],
      championTitle: this._hasChampionTitle(save)
    };
  }

  /** @param {string} featureId @returns {boolean} */
  isFeatureUnlocked(featureId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    return !!save && this._isFeatureUnlocked(featureId, save);
  }

  /**
   * Whether a location passes its special gates and is reachable/previously unlocked.
   * @param {string} locationId
   * @returns {boolean}
   */
  isLocationUnlocked(locationId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    return !!save && this._isLocationUnlocked(locationId, save, new Set());
  }

  /**
   * Structured, localization-free reason why a map location is locked.
   * @param {string} locationId
   * @returns {{unlocked:boolean,reason:string,need?:number,have?:number,itemId?:string,questKey?:string,starterRegion?:string,blockingLocationId?:string,remainingWins?:number}}
   */
  getLocationAccessStatus(locationId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const location = LocationDB.getInstance().getById(locationId);
    if (!save || !location) return { unlocked: false, reason: 'missing' };
    if (this._isLocationUnlocked(locationId, save, new Set())) return { unlocked: true, reason: '' };

    const need = Math.max(0, Number(location.badgesRequired) || 0);
    const have = this._regionBadgeCount(location.region, save);
    if (need > have) return { unlocked: false, reason: 'badges', need, have };
    const gate = LOCATION_ACCESS_GATES[locationId];
    if (gate?.itemId && save.inventory.count(gate.itemId) <= 0) {
      return { unlocked: false, reason: 'item', itemId: gate.itemId };
    }
    if (gate?.questKey && !this._hasClaimedQuest(save, gate.questKey)) {
      return { unlocked: false, reason: 'quest', questKey: gate.questKey };
    }
    if (gate?.championTitle && !this._hasChampionTitle(save)) return { unlocked: false, reason: 'champion' };
    if (gate?.starterRegion && !this._hasRegionStarter(gate.starterRegion, save)) {
      return { unlocked: false, reason: 'starter', starterRegion: gate.starterRegion };
    }
    if (Number.isInteger(gate?.rotationWindow) && this.getRotationWindow() % 2 !== gate.rotationWindow) {
      return { unlocked: false, reason: 'rotation' };
    }
    const blockingLocation = location.connections
      .map((id) => LocationDB.getInstance().getById(id))
      .find((entry) => entry && this._isLocationUnlocked(entry.id, save, new Set()) && !this._isLocationCleared(entry, save));
    if (blockingLocation) {
      const requiredWins = Math.max(0, Number(blockingLocation.winsToClear) || 0);
      return {
        unlocked: false,
        reason: 'wins',
        blockingLocationId: blockingLocation.id,
        remainingWins: Math.max(0, requiredWins - save.statistics.wildWinsInGroup(blockingLocation.id))
      };
    }
    return { unlocked: false, reason: 'unreachable' };
  }

  /** @param {string} locationId @returns {boolean} */
  isLocationCleared(locationId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const location = LocationDB.getInstance().getById(locationId);
    if (!save || !location) return false;
    return this._isLocationCleared(location, save);
  }

  /**
   * @param {string|null} [kind=null]
   * @returns {Readonly<Object>[]} Currently accessible locations, optionally filtered by kind.
   */
  getUnlockedLocations(kind = null) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || (kind && !Object.values(LocationKinds).includes(kind))) return [];
    return LocationDB.getInstance().getAll().filter((location) =>
      (!kind || location.kind === kind) && this._isLocationUnlocked(location.id, save, new Set())
    );
  }

  /** @param {string} kind @returns {boolean} */
  hasUnlockedLocationKind(kind) {
    return this.getUnlockedLocations(kind).length > 0;
  }

  /**
   * Recomputes access, persists newly-earned sticky facts, and publishes one access event.
   * @param {string} [reason]
   * @param {{force?:boolean,persist?:boolean}} [options]
   * @returns {Object} Current snapshot
   */
  refresh(reason = 'progression', { force = false, persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    let dataChanged = false;
    if (save) {
      const before = JSON.stringify(save.access.serialize());
      for (const region of Object.keys(STARTERS_BY_REGION)) {
        if (this._ownsRegionStarter(region, save)) dataChanged = save.access.unlockRegionStarter(region) || dataChanged;
      }
      if (this._hasChampionTitle(save) && !save.access.championTitle) {
        save.access.championTitle = true;
        dataChanged = true;
      }
      for (const location of LocationDB.getInstance().getAll()) {
        if (this._isLocationUnlocked(location.id, save, new Set())) {
          dataChanged = save.access.unlockLocation(location.id) || dataChanged;
        }
      }
      for (const featureId of FEATURE_IDS) {
        if (this._isFeatureUnlocked(featureId, save)) {
          dataChanged = save.access.unlockFeature(featureId) || dataChanged;
        }
      }
      dataChanged = JSON.stringify(save.access.serialize()) !== before || dataChanged;
      if (dataChanged && persist) SaveSystem.getInstance().saveCurrent();
    }

    const snapshot = this.getSnapshot();
    const previous = this._lastSnapshot;
    const changedFeatures = FEATURE_IDS.filter((id) => previous?.features?.[id] !== snapshot.features[id]);
    const previousLocations = new Set(previous?.locations || []);
    const nextLocations = new Set(snapshot.locations);
    const changedLocations = [...new Set([
      ...(previous?.locations || []).filter((id) => !nextLocations.has(id)),
      ...snapshot.locations.filter((id) => !previousLocations.has(id))
    ])];
    const previousRegions = new Set(previous?.regions || []);
    const nextRegions = new Set(snapshot.regions || []);
    const changedRegions = [...new Set([
      ...(previous?.regions || []).filter((id) => !nextRegions.has(id)),
      ...(snapshot.regions || []).filter((id) => !previousRegions.has(id))
    ])];
    const changedSnapshot = snapshotKey(previous) !== snapshotKey(snapshot);
    this._lastSnapshot = snapshot;
    if (force || dataChanged || changedSnapshot) {
      EventBus.getInstance().dispatch(new ContentAccessChangedEvent(snapshot, {
        reason,
        changedFeatures,
        changedLocations,
        changedRegions
      }));
    }
    return snapshot;
  }

  /**
   * Accessible regions for the header and other read-only UI, following the original gate:
   * Kanto starts open; each next region needs the previous regional league and a complete
   * previous regional Pokédex. This is intentionally separate from which regional starter
   * has been caught (`regionStarters`).
   * @private @param {Object} save @returns {string[]}
   */
  _getAccessibleRegions(save) {
    const regions = REGIONS.filter((region) => region.available).map((region) => region.id);
    if (regions.length === 0) return [];
    const accessible = [regions[0]];
    const pokemonDb = PokemonDB.getInstance();
    for (let index = 1; index < regions.length; index++) {
      const previous = regions[index - 1];
      const leagueWon = save.statistics.hasWonLeague(previous) ||
        (previous === 'kanto' && save.access.championTitle);
      const species = pokemonDb.getByRegion(previous);
      const pokedexComplete = species.length > 0 && species.every((entry) => save.pokedex.isCaught(entry.id));
      if (!leagueWon || !pokedexComplete) break;
      accessible.push(regions[index]);
    }
    return accessible;
  }

  /** @private @param {string} featureId @param {Object} save @returns {boolean} */
  _isFeatureUnlocked(featureId, save) {
    if (!FEATURE_IDS.includes(featureId)) return false;
    if (save.access.hasFeature(featureId)) return true;
    if (featureId === CONTENT_FEATURES.HATCHERY) return this._isLocationUnlocked(HatcheryRules.LOCATION_ID, save, new Set());
    if (featureId === CONTENT_FEATURES.MINE) {
      const current = LocationDB.getInstance().getById(save.player.location);
      const mine = LocationDB.getInstance().getById(MineRules.LOCATION_ID);
      const sameGroup = current && mine && current.group === mine.group;
      return !!sameGroup || this._isLocationUnlocked(MineRules.LOCATION_ID, save, new Set());
    }
    if (featureId === CONTENT_FEATURES.TRAINING) return save.player.hasBadge(TrainingRules.REQUIRED_BADGE_ID);
    return false;
  }

  /** @private @param {string} locationId @param {Object} save @param {Set<string>} seen */
  _isLocationUnlocked(locationId, save, seen) {
    const locations = LocationDB.getInstance();
    const location = locations.getById(locationId);
    if (!location || !this._locationGateSatisfied(location, save)) return false;

    const primaryId = this._groupPrimary(location);
    const current = locations.getById(save.player.location);
    if (current && this._groupPrimary(current) === primaryId) return true;
    if (primaryId !== location.id) return this._isLocationUnlocked(primaryId, save, seen);
    if (save.access.hasLocation(location.id)) return true;
    if (REGION_START_LOCATIONS[location.region] === location.id && save.player.region === location.region) return true;
    if (location.id === save.player.location) return true;
    if (seen.has(location.id)) return false;

    const nextSeen = new Set(seen);
    nextSeen.add(location.id);
    for (const connectionId of location.connections) {
      const previous = locations.getById(connectionId);
      if (previous && this._isLocationUnlocked(previous.id, save, nextSeen) && this._isLocationCleared(previous, save)) return true;
    }
    return false;
  }

  /** @private @param {Object} location @param {Object} save @returns {boolean} */
  _locationGateSatisfied(location, save) {
    const required = Math.max(0, Number(location.badgesRequired) || 0);
    if (required > this._regionBadgeCount(location.region, save)) return false;
    const gate = LOCATION_ACCESS_GATES[location.id];
    if (!gate) return true;
    if (gate.itemId && save.inventory.count(gate.itemId) <= 0) return false;
    if (gate.questKey && !this._hasClaimedQuest(save, gate.questKey)) return false;
    if (gate.championTitle && !this._hasChampionTitle(save)) return false;
    if (gate.starterRegion && !this._hasRegionStarter(gate.starterRegion, save)) return false;
    if (Number.isInteger(gate.rotationWindow) && this.getRotationWindow() % 2 !== gate.rotationWindow) return false;
    return true;
  }

  /** @private @param {string} region @param {Object} save @returns {number} */
  _regionBadgeCount(region, save) {
    const badgeIds = new Set(TrainerDB.getInstance().getGyms(region).map((trainer) => trainer.badge).filter(Boolean));
    if (badgeIds.size === 0) return 0;
    return save.player.badges.filter((badgeId) => badgeIds.has(badgeId)).length;
  }

  /** @private @param {string} region @param {Object} save @returns {boolean} */
  _hasRegionStarter(region, save) {
    return save.access.hasRegionStarter(region) || this._ownsRegionStarter(region, save);
  }

  /** @private @param {string} region @param {Object} save @returns {boolean} */
  _ownsRegionStarter(region, save) {
    const starters = STARTERS_BY_REGION[region] || [];
    if (!starters.length) return false;
    const speciesIds = new Set(starters.map((starter) => starter.species));
    return [...save.team, ...save.box].some((pokemon) => speciesIds.has(pokemon.species)) ||
      starters.some((starter) => save.pokedex.isCaught(starter.species));
  }

  /** @private @param {Object} save @returns {boolean} */
  _hasChampionTitle(save) {
    return save.access.championTitle === true || save.statistics.leaguesWon.length > 0;
  }

  /** @private @param {Object} save @param {string} questKey @returns {boolean} */
  _hasClaimedQuest(save, questKey) {
    const quest = QuestDB.getInstance().getById(questKey);
    if (!quest) return false;
    if (quest.category !== 'main') return save.quests.isCompleted(questKey);
    const chain = QuestDB.getInstance().getMainChain(quest.region);
    const stepIndex = chain.findIndex((entry) => entry.key === questKey);
    return stepIndex >= 0 && save.quests.getMainStep(quest.region) > stepIndex;
  }

  /** @private @param {Object} location @param {Object} save @returns {boolean} */
  _isLocationCleared(location, save) {
    const required = Math.max(0, Number(location.winsToClear) || 0);
    return required === 0 || save.statistics.wildWinsInGroup(location.id) >= required;
  }

  /** @private @param {Object} location @returns {string} */
  _groupPrimary(location) {
    if (!location.group || location.group === location.id) return location.id;
    const locations = LocationDB.getInstance();
    if (locations.has(location.group)) return location.group;
    const groupMembers = locations.getAll()
      .filter((entry) => (entry.group || entry.id) === location.group)
      .map((entry) => entry.id)
      .sort();
    return groupMembers[0] || location.id;
  }

  /** @returns {number} Alternating 12-hour window, as in the original map logic. */
  getRotationWindow() {
    return Math.floor(Date.now() / MIRAGE_ROTATION_WINDOW_MS);
  }
}
