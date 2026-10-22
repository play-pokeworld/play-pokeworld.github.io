/**
 * @file LocationSystem.js
 * @brief Player position on the world map and travel rules (C++ equivalent: class LocationSystem : public BaseSystem).
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { NpcDirectory } from '../data/world/NpcDirectory.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { REGION_START_LOCATIONS } from '../config/ContentAccessRules.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { NpcTalkedEvent } from '../core/events/NpcTalkedEvent.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { QuestSystem } from './QuestSystem.js';
import { RoamingSystem } from './RoamingSystem.js';
import { SpeciesOwnership } from './catch/SpeciesOwnership.js';
import { QuestCategories } from '../data/quests/QuestCategories.js';
import { t } from '../localization/LocalizationManager.js';

/** Map node states (each maps to a CSS class of UIMapView). */
export const LocationStates = Object.freeze({
  CURRENT: 'current',
  ADJACENT: 'adjacent',
  REACHABLE: 'reachable',
  LOCKED: 'locked'
});

/** Semantic map fills: status color is independent of travel/current-node styling. */
export const LocationMapStatuses = Object.freeze({
  LOCKED: 'locked',
  QUEST: 'quest',
  ROAMING: 'roaming',
  CATCH: 'catch',
  SHINY: 'shiny',
  COMPLETE: 'complete'
});

export class LocationSystem extends BaseSystem {
  /** @private @type {LocationSystem|null} */
  static _instance = null;

  /** @returns {LocationSystem} */
  static getInstance() {
    if (!LocationSystem._instance) {
      LocationSystem._instance = new LocationSystem();
    }
    return LocationSystem._instance;
  }

  constructor() {
    super('LocationSystem', 'System');
  }

  /** @private @returns {import('../data/save/PlayerData.js').PlayerData|null} */
  _player() {
    return SaveSystem.getInstance().getCurrentSave()?.player ?? null;
  }

  /** @returns {string} LocationDB id of the player position */
  getCurrentLocationId() {
    return this._player()?.location ?? PlayerDefaults.LOCATION_ID;
  }

  /** @returns {string} Region of the player position */
  getCurrentRegion() {
    return LocationDB.getInstance().getById(this.getCurrentLocationId())?.region ?? PlayerDefaults.REGION;
  }

  /**
   * @param {string} locationId
   * @returns {boolean} True when the central progression resolver denies access
   */
  isLocked(locationId) {
    return !FeatureAccessSystem.getInstance().isLocationUnlocked(locationId);
  }

  /**
   * @param {string} locationId
   * @returns {string} One of LocationStates
   */
  getState(locationId) {
    const currentId = this.getCurrentLocationId();
    if (locationId === currentId) return LocationStates.CURRENT;
    if (this.isLocked(locationId)) return LocationStates.LOCKED;
    const current = LocationDB.getInstance().getById(currentId);
    return current && current.connections.includes(locationId) ? LocationStates.ADJACENT : LocationStates.REACHABLE;
  }

  /**
   * Resolves the color-coded map legend state without changing access or save data.
   * The priority and palette semantics follow main: locked, active story/side quest, uncaught
   * roaming legendary, missing catch, missing shiny, then completed/transparent.
   * @param {string} locationId
   * @param {number} [now=Date.now()] - Injectable clock for deterministic map-state tests
   * @returns {string} One of LocationMapStatuses
   */
  getMapColorStatus(locationId, now = Date.now()) {
    const locations = LocationDB.getInstance();
    const location = locations.getById(locationId);
    if (!location || this.isLocked(locationId)) return LocationMapStatuses.LOCKED;

    const group = locations.getGroup(locationId);
    const hasActiveStoryQuest = QuestSystem.getInstance().getActiveQuests().some((status) => {
      if (![QuestCategories.MAIN, QuestCategories.SIDE].includes(status.quest.category)) return false;
      const questLocation = status.quest.objective?.location || status.objective?.location || status.quest.location;
      return !!questLocation && locations.getGroup(questLocation) === group;
    });
    if (hasActiveStoryQuest) return LocationMapStatuses.QUEST;

    const save = SaveSystem.getInstance().getCurrentSave();
    const roamingSpecies = RoamingSystem.getSpeciesAt(locationId, now);
    if (roamingSpecies && !save?.pokedex.isCaught(roamingSpecies)) return LocationMapStatuses.ROAMING;

    const speciesIds = [...new Set(locations.getEncountersForGroup(locationId).map((entry) => entry.species))];
    if (speciesIds.some((speciesId) => !save?.pokedex.isCaught(speciesId))) return LocationMapStatuses.CATCH;
    if (save && speciesIds.some((speciesId) => !SpeciesOwnership.isShinyUnlocked(save, speciesId))) {
      return LocationMapStatuses.SHINY;
    }
    return LocationMapStatuses.COMPLETE;
  }

  /**
   * Talks to a selected person at the current location. Talk quest objectives continue to use
   * the location, while progression gates can inspect the stable NPC identity.
   * @param {string|null} [npcId=null]
   * @returns {boolean} False if no save is loaded or the selected person is not at this location
   */
  talkToNpc(npcId = null) {
    if (!this._player()) return false;
    const locationId = this.getCurrentLocationId();
    if (npcId != null && !NpcDirectory.getById(locationId, npcId)) return false;
    EventBus.getInstance().dispatch(new NpcTalkedEvent(locationId, npcId));
    return true;
  }

  /**
   * Moves the player, persists the save and emits LocationChangedEvent.
   * @param {string} locationId
   * @returns {boolean} False when the location is unknown or locked
   */
  travelTo(locationId) {
    const location = LocationDB.getInstance().getById(locationId);
    const player = this._player();
    if (!location || !player || this.isLocked(locationId)) {
      console.warn(t('debug_travel_refused', { id: locationId }));
      return false;
    }
    const run = SaveSystem.getInstance().getCurrentSave()?.dungeons?.run;
    if (run?.active && run.locationId !== locationId) {
      NotificationSystem.getInstance().notifyTemporary(t('dungeon_locked_travel'), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
      return false;
    }
    player.location = locationId;
    player.region = location.region;
    EventBus.getInstance().dispatch(new LocationChangedEvent(location.region, locationId, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    return true;
  }

  /**
   * Changes the active story region and places the player at its original starting town.
   * A region is reachable only after its preceding League and Pokédex gates are met.
   * @param {string} regionId
   * @returns {boolean} False when the region is locked, unknown, or travel is blocked by a dungeon run
   */
  travelToRegion(regionId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const locationId = REGION_START_LOCATIONS[regionId];
    const location = locationId ? LocationDB.getInstance().getById(locationId) : null;
    if (!save || !location || location.region !== regionId ||
        !FeatureAccessSystem.getInstance().getRegionAccessStatus(regionId).unlocked) return false;
    if (save.player.region === regionId) return true;

    const run = save.dungeons?.run;
    if (run?.active && run.locationId !== locationId) {
      NotificationSystem.getInstance().notifyTemporary(t('dungeon_locked_travel'), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
      return false;
    }

    save.player.region = regionId;
    save.player.location = locationId;
    FeatureAccessSystem.getInstance().refresh('region-travel', { persist: false });
    EventBus.getInstance().dispatch(new LocationChangedEvent(regionId, locationId, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    return true;
  }
}
