/**
 * @file HatcherySystem.js
 * @brief Daycare progression, fossil incubation and daycare deposits.
 * Daycare slots reference collection Pokémon by uid: a housed Pokémon stays in the PC box, the
 * DAYCARE usage (PokemonUsageSystem) only locks the actions it is not allowed to perform.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { FossilSystem } from './FossilSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { BattleFoeKnockedOutEvent } from '../core/events/BattleFoeKnockedOutEvent.js';
import { HatcheryChangedEvent } from '../core/events/HatcheryChangedEvent.js';
import { HatcheryLevelUpEvent } from '../core/events/HatcheryLevelUpEvent.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { LocationSystem } from './LocationSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { CONTENT_FEATURES } from '../config/ContentAccessRules.js';
import { PokemonRules } from '../config/PokemonRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export const HatcheryResults = Object.freeze({
  READY: 'ready',
  NO_SAVE: 'no-save',
  WRONG_LOCATION: 'wrong-location',
  NO_SLOT: 'no-slot',
  NOT_FOUND: 'not-found',
  LAST_TEAM_MEMBER: 'last-team-member',
  NOT_DAYCARE: 'not-daycare',
  NOT_READY: 'not-ready',
  NOT_FOSSIL: 'not-fossil',
  NO_ITEM: 'no-item',
  STORY_LOCKED: 'story-locked',
  FEATURE_LOCKED: 'feature-locked',
  UNKNOWN_SPECIES: 'unknown-species',
  MAX_SLOTS: 'max-slots',
  NEED_QUEST_POINTS: 'need-quest-points'
});

export class HatcherySystem extends BaseSystem {
  /** @private @type {HatcherySystem|null} */
  static _instance = null;

  /** @returns {HatcherySystem} */
  static getInstance() {
    if (!HatcherySystem._instance) HatcherySystem._instance = new HatcherySystem();
    return HatcherySystem._instance;
  }

  constructor() {
    super('HatcherySystem', 'System');
    /** @private @type {Function|null} */
    this._onKnockout = null;
  }

  /** @override */
  init() {
    if (this._onKnockout) return;
    this._onKnockout = (event) => this._handleKnockout(event);
    EventBus.getInstance().subscribe(BattleFoeKnockedOutEvent, this._onKnockout);
  }

  /** @override */
  onDestroy() {
    if (this._onKnockout) EventBus.getInstance().unsubscribe(BattleFoeKnockedOutEvent, this._onKnockout);
    this._onKnockout = null;
    super.onDestroy();
  }

  /**
   * Read-only view of the slots; daycare slots also expose their resolved collection Pokémon.
   * @returns {{maxSlots:number,slots:Array<Object|null>}}
   */
  getSnapshot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const hatchery = save?.hatchery;
    return hatchery
      ? { maxSlots: hatchery.maxSlots, slots: hatchery.slots.map((slot) => this._snapshotSlot(save, slot)) }
      : { maxSlots: 0, slots: [] };
  }

  /** @returns {boolean} */
  isUnlocked() {
    return FeatureAccessSystem.getInstance().isFeatureUnlocked(CONTENT_FEATURES.HATCHERY);
  }

  /** @returns {boolean} */
  canUseHere() {
    return this.isUnlocked() && LocationSystem.getInstance().getCurrentLocationId() === HatcheryRules.LOCATION_ID;
  }

  /** Purchases one additional slot for the original quest-point price. */
  upgradeSlot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.canUseHere()) return this._failure(HatcheryResults.WRONG_LOCATION);
    const current = save.hatchery.maxSlots;
    if (current >= HatcheryRules.MAX_SLOT_COUNT) return this._failure(HatcheryResults.MAX_SLOTS);
    const cost = HatcheryRules.SLOT_UPGRADE_COSTS[current - 1];
    if (save.currencies.get('questPoint') < cost) return this._failure(HatcheryResults.NEED_QUEST_POINTS);
    save.currencies.add('questPoint', -cost);
    save.hatchery.maxSlots = current + 1;
    save.hatchery.slots.push(null);
    this._dispatchChanged();
    SaveSystem.getInstance().saveCurrent();
    this._notify('hatchery_upgrade_done', { slots: save.hatchery.maxSlots });
    return { result: HatcheryResults.READY, slots: save.hatchery.maxSlots, cost };
  }

  /**
   * Owned Pokémon that may be deposited (party first; the last party member is never offered).
   * `source` is 'team' for a party member, 'box' otherwise.
   * @returns {Array<{uid:string,label:string,source:string,pokemon:Object}>}
   */
  getCandidates() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];
    const usage = PokemonUsageSystem.getInstance();
    const team = save.team;
    const others = save.collection.getAll().filter((pokemon) => !save.teamMembers.includes(pokemon.uid));
    return [
      ...(team.length > 1 ? team.map((pokemon) => ({ pokemon, source: 'team' })) : []),
      ...others.map((pokemon) => ({ pokemon, source: 'box' }))
    ].filter(({ pokemon }) => usage.canPerform(pokemon.uid, PokemonActionIds.DEPOSIT_DAYCARE))
      .map(({ pokemon, source }) => ({ uid: pokemon.uid, label: pokemon.getDisplayName(), source, pokemon }));
  }

  /**
   * @returns {Array<{itemId:string,speciesId:string,quantity:number}>}
   */
  getFossilCandidates() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];
    return FossilSystem.getInstance().getCandidates();
  }

  /**
   * @param {string} uid
   * @returns {{result:string,pokemon:Object|null}}
   */
  depositPokemon(uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.canUseHere()) return this._failure(HatcheryResults.WRONG_LOCATION);
    const slotIndex = save.hatchery.findEmptySlot();
    if (slotIndex < 0) return this._failure(HatcheryResults.NO_SLOT);
    const pokemon = save.collection.get(uid);
    if (!pokemon) return this._failure(HatcheryResults.NOT_FOUND);
    const teamSystem = TeamSystem.getInstance();
    const teamMember = teamSystem.isMember(uid);
    if (teamMember && save.teamMembers.size <= 1) return this._failure(HatcheryResults.LAST_TEAM_MEMBER);
    if (!PokemonUsageSystem.getInstance().canPerform(uid, PokemonActionIds.DEPOSIT_DAYCARE)) {
      return this._failure(HatcheryResults.NOT_FOUND);
    }
    if (teamMember && !teamSystem.removePokemon(uid, { persist: false, notify: false })) {
      return this._failure(HatcheryResults.NOT_FOUND);
    }
    save.hatchery.setSlot(slotIndex, { kind: 'daycare', pokemonUid: uid, knockouts: 0 });
    this._dispatchRosterChanged(teamMember);
    SaveSystem.getInstance().saveCurrent();
    this._notify('hatchery_deposited', { name: pokemon.getDisplayName() });
    return { result: HatcheryResults.READY, pokemon };
  }

  /**
   * @param {number} slotIndex
   * @returns {{result:string,pokemon:Object|null,stored:string|null}}
   */
  withdrawPokemon(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.canUseHere()) return this._failure(HatcheryResults.WRONG_LOCATION);
    const slot = save.hatchery.slots[slotIndex];
    if (!slot) return this._failure(HatcheryResults.NOT_FOUND);
    if (slot.kind === 'fossil') return slot.ready
      ? this.collectFossil(slotIndex)
      : this._failure(HatcheryResults.NOT_READY);
    if (slot.kind !== 'daycare') return this._failure(HatcheryResults.NOT_DAYCARE);
    const pokemon = save.collection.get(slot.pokemonUid);
    if (!pokemon) return this._failure(HatcheryResults.NOT_FOUND);
    save.hatchery.setSlot(slotIndex, null);
    const teamSystem = TeamSystem.getInstance();
    const stored = teamSystem.addMember(pokemon.uid, { persist: false, notify: false }) ? 'team' : 'box';
    this._dispatchRosterChanged(stored === 'team');
    SaveSystem.getInstance().saveCurrent();
    this._notify(stored === 'team' ? 'hatchery_withdrawn_team' : 'hatchery_withdrawn_box', {
      name: pokemon.getDisplayName()
    });
    return { result: HatcheryResults.READY, pokemon, stored };
  }

  /**
   * Begins a fossil incubation in an empty hatchery slot.
   * @param {string} itemId
   * @returns {{result:string,slotIndex:number}}
   */
  startFossilIncubation(itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.canUseHere()) return this._failure(HatcheryResults.WRONG_LOCATION);
    if (!FossilSystem.getInstance().isRevivalUnlocked(save)) return this._failure(HatcheryResults.STORY_LOCKED);
    const slotIndex = save.hatchery.findEmptySlot();
    if (slotIndex < 0) return this._failure(HatcheryResults.NO_SLOT);
    const item = ItemDB.getInstance().getById(itemId);
    if (!item || item.kind !== ItemKinds.FOSSIL || item.futureOnly || !item.revives) {
      return this._failure(HatcheryResults.NOT_FOSSIL);
    }
    if (!PokemonDB.getInstance().has(item.revives)) return this._failure(HatcheryResults.UNKNOWN_SPECIES);
    if (!save.inventory.remove(itemId, 1)) return this._failure(HatcheryResults.NO_ITEM);
    const required = this._requiredFossilKos(item.revives);
    save.hatchery.setSlot(slotIndex, {
      kind: 'fossil', itemId, speciesId: item.revives, knockouts: 0, required, ready: false
    });
    this._dispatchChanged();
    SaveSystem.getInstance().saveCurrent();
    this._notify('hatchery_fossil_started', { item: t(`item.${itemId}.name`) });
    return { result: HatcheryResults.READY, slotIndex };
  }

  /** @param {number} slotIndex @returns {{result:string,pokemon:Object|null,stored:string|null}} */
  collectFossil(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.canUseHere()) return this._failure(HatcheryResults.WRONG_LOCATION);
    if (!FossilSystem.getInstance().isRevivalUnlocked(save)) return this._failure(HatcheryResults.STORY_LOCKED);
    const slot = save.hatchery.slots[slotIndex];
    if (!slot || slot.kind !== 'fossil') return this._failure(HatcheryResults.NOT_FOSSIL);
    if (!slot.ready) return this._failure(HatcheryResults.NOT_READY);
    if (!PokemonDB.getInstance().has(slot.speciesId)) return this._failure(HatcheryResults.UNKNOWN_SPECIES);
    save.hatchery.setSlot(slotIndex, null);
    const revived = FossilSystem.getInstance().reviveSpeciesWithoutItem(save, slot.speciesId);
    if (!revived) {
      save.hatchery.setSlot(slotIndex, slot);
      return this._failure(HatcheryResults.UNKNOWN_SPECIES);
    }
    this._dispatchChanged();
    const stored = revived.stored;
    SaveSystem.getInstance().saveCurrent();
    return { result: HatcheryResults.READY, pokemon: revived.pokemon, stored };
  }

  /** @private @param {BattleFoeKnockedOutEvent} event */
  _handleKnockout(event) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    let changed = false;
    let levelsGained = 0;
    const levelled = [];
    for (const slot of save.hatchery.slots) {
      if (slot?.kind === 'daycare') {
        const pokemon = save.collection.get(slot.pokemonUid);
        if (!pokemon || pokemon.level >= PokemonRules.MAX_LEVEL) continue;
        slot.knockouts++;
        changed = true;
        while (slot.knockouts >= HatcheryRules.DAYCARE_KOS_PER_LEVEL && pokemon.level < PokemonRules.MAX_LEVEL) {
          slot.knockouts -= HatcheryRules.DAYCARE_KOS_PER_LEVEL;
          pokemon.setLevel(pokemon.level + 1);
          levelsGained++;
          if (!levelled.includes(pokemon)) levelled.push(pokemon);
        }
        if (pokemon.level >= PokemonRules.MAX_LEVEL) slot.knockouts = 0;
      } else if (slot?.kind === 'fossil' && !slot.ready) {
        slot.knockouts = Math.min(slot.required, slot.knockouts + 1);
        slot.ready = slot.knockouts >= slot.required;
        changed = true;
      }
    }
    if (!changed) return;
    if (levelsGained > 0) {
      save.statistics.recordHatcheryLevels(levelsGained);
      EventBus.getInstance().dispatch(new HatcheryLevelUpEvent(levelsGained, save.statistics.hatcheryLevel, {
        deferSave: event.deferSave === true
      }));
      for (const pokemon of levelled) this._notify('hatchery_level_up', {
        name: pokemon.getDisplayName(), level: pokemon.level
      });
    }
    if (levelled.length > 0) BoxSystem.getInstance().dispatchChanged();
    this._dispatchChanged();
    if (event.deferSave !== true) SaveSystem.getInstance().saveCurrent();
  }

  /** @private @param {import('../data/save/SaveData.js').SaveData} save @param {Object|null} slot @returns {Object|null} */
  _snapshotSlot(save, slot) {
    if (!slot) return null;
    return slot.kind === 'daycare'
      ? { ...slot, pokemon: save.collection.get(slot.pokemonUid) }
      : { ...slot };
  }

  /**
   * Notifies the collection, the party (when it changed) and the daycare after a deposit/withdrawal.
   * @private @param {boolean} teamChanged
   */
  _dispatchRosterChanged(teamChanged) {
    if (teamChanged) TeamSystem.getInstance().dispatchChanged();
    else PokemonUsageSystem.getInstance().dispatchChanged();
    BoxSystem.getInstance().dispatchChanged();
    this._dispatchChanged();
  }

  /** @private @param {string} speciesId */
  _requiredFossilKos(speciesId) {
    const species = PokemonDB.getInstance().getById(speciesId);
    const bst = Object.values(species?.baseStats ?? {}).reduce((sum, stat) => sum + Number(stat || 0), 0);
    const band = HatcheryRules.BST_BANDS.find((entry) => bst <= entry.maximum);
    return band?.kos ?? HatcheryRules.MAX_FOSSIL_KOS;
  }

  /** @private */
  _dispatchChanged() {
    const count = SaveSystem.getInstance().getCurrentSave()?.hatchery?.maxSlots ?? 0;
    EventBus.getInstance().dispatch(new HatcheryChangedEvent(count));
  }

  /** @private @param {string} result */
  _failure(result) {
    const key = result === HatcheryResults.FEATURE_LOCKED ? 'content_feature_locked' :
      result === HatcheryResults.WRONG_LOCATION ? 'hatchery_location_required' :
        result === HatcheryResults.NO_SLOT ? 'hatchery_slots_full' :
        result === HatcheryResults.LAST_TEAM_MEMBER ? 'hatchery_keep_team_member' :
          result === HatcheryResults.NO_ITEM ? 'hatchery_fossil_unavailable' :
            result === HatcheryResults.STORY_LOCKED ? 'fossil_story_locked' :
              result === HatcheryResults.NOT_READY ? 'hatchery_fossil_not_ready' :
              result === HatcheryResults.MAX_SLOTS ? 'hatchery_slots_max' :
                result === HatcheryResults.NEED_QUEST_POINTS ? 'hatchery_need_quest_points' :
                  result === HatcheryResults.NOT_FOSSIL ? 'hatchery_not_a_fossil' :
                    result === HatcheryResults.UNKNOWN_SPECIES ? 'hatchery_unknown_species' :
                      'hatchery_action_unavailable';
    if (result !== HatcheryResults.NO_SAVE) this._notify(key,
      result === HatcheryResults.WRONG_LOCATION
        ? { location: t(`location.${HatcheryRules.LOCATION_ID}`) }
        : result === HatcheryResults.FEATURE_LOCKED
          ? { feature: t('hatchery_management_title') }
          : {});
    return { result, pokemon: null, stored: null };
  }

  /** @private @param {string} key @param {Object} [params] */
  _notify(key, params = {}) {
    NotificationSystem.getInstance().notifyTemporary(t(key, params), {
      channel: NotificationChannels.GAMEPLAY,
      tone: key === 'hatchery_level_up' ? NotificationTones.SUCCESS : NotificationTones.INFO
    });
  }
}
