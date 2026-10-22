/**
 * @file PokemonUsageSystem.js
 * @brief Knows which game modes currently use each owned Pokémon (C++ equivalent:
 * class PokemonUsageSystem : public BaseSystem). No DOM access.
 *
 * The collection (BoxSystem) owns the Pokémon; this system only answers "where is it used?":
 *   - persisted usages are read from the save (party uids, daycare slots);
 *   - session usages are claimed / released by the mode that runs them (training session, and
 *     any future mode), and are cleared whenever another save becomes active.
 * Views use it to hide unavailable Pokémon from selections and to lock incompatible actions;
 * systems use it to enforce the same rules (PokemonActionRules + config/PokemonUsageRules.js).
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { PokemonUsageChangedEvent } from '../core/events/PokemonUsageChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { PokemonActionRules } from './pokemon/PokemonActionRules.js';
import {
  PokemonUsageIds,
  PERSISTED_POKEMON_USAGES,
  POKEMON_USAGE_ORDER
} from '../config/PokemonUsageRules.js';

/** Readers of the usages stored in the save, keyed by PokemonUsageIds value. */
const PERSISTED_USAGE_READERS = Object.freeze({
  [PokemonUsageIds.TEAM]: (save, uid) => save.teamMembers.includes(uid),
  [PokemonUsageIds.DAYCARE]: (save, uid) => save.hatchery.findDaycareSlot(uid) >= 0
});

export class PokemonUsageSystem extends BaseSystem {
  /** @private @type {PokemonUsageSystem|null} */
  static _instance = null;

  /** @returns {PokemonUsageSystem} */
  static getInstance() {
    if (!PokemonUsageSystem._instance) PokemonUsageSystem._instance = new PokemonUsageSystem();
    return PokemonUsageSystem._instance;
  }

  constructor() {
    super('PokemonUsageSystem', 'System');
    /** @private @type {Map<string, Set<string>>} session usage id -> claimed uids */
    this._claims = new Map();
    const clear = () => this._clearClaims();
    const bus = EventBus.getInstance();
    this._unsubscribers = [bus.subscribe(SaveCreatedEvent, clear), bus.subscribe(SaveLoadedEvent, clear)];
  }

  /**
   * @param {string} uid
   * @returns {string[]} PokemonUsageIds currently using this Pokémon, most specific first
   */
  getUsages(uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || typeof uid !== 'string' || !uid) return [];
    return POKEMON_USAGE_ORDER.filter((usage) => {
      const reader = PERSISTED_USAGE_READERS[usage];
      return reader ? reader(save, uid) : this._claims.get(usage)?.has(uid) === true;
    });
  }

  /** @param {string} uid @returns {string|null} Most specific usage, or null when the Pokémon is free in the PC */
  getPrimaryUsage(uid) {
    return this.getUsages(uid)[0] ?? null;
  }

  /** @param {string} uid @returns {boolean} No mode uses the Pokémon */
  isAvailable(uid) {
    return this.getUsages(uid).length === 0;
  }

  /**
   * @param {string} uid
   * @param {string} action - PokemonActionIds value
   * @returns {{kind:string, usage:string}|null} Lock preventing the action, or null when allowed
   */
  getActionLock(uid, action) {
    return PokemonActionRules.lockFor(action, this.getUsages(uid));
  }

  /** @param {string} uid @param {string} action @returns {boolean} */
  canPerform(uid, action) {
    return this.getActionLock(uid, action) === null;
  }

  /**
   * Registers a session usage (e.g. the trainee of a training session).
   * @param {string} usage - PokemonUsageIds value that is not persisted in the save
   * @param {string} uid
   * @returns {boolean}
   */
  claim(usage, uid) {
    if (!this._isSessionUsage(usage) || typeof uid !== 'string' || !uid) return false;
    const claimed = this._claims.get(usage) ?? new Set();
    if (claimed.has(uid)) return true;
    claimed.add(uid);
    this._claims.set(usage, claimed);
    this.dispatchChanged(uid);
    return true;
  }

  /**
   * Ends a session usage.
   * @param {string} usage
   * @param {string} uid
   * @returns {boolean} True when a claim was removed
   */
  release(usage, uid) {
    const claimed = this._claims.get(usage);
    if (!claimed?.delete(uid)) return false;
    if (claimed.size === 0) this._claims.delete(usage);
    this.dispatchChanged(uid);
    return true;
  }

  /**
   * Notifies views that a usage changed. Systems owning a persisted usage (party, daycare) call it
   * after their mutation; claims and releases call it themselves.
   * @param {string|null} [uid=null]
   */
  dispatchChanged(uid = null) {
    EventBus.getInstance().dispatch(new PokemonUsageChangedEvent(uid));
  }

  /** @private @param {string} usage @returns {boolean} */
  _isSessionUsage(usage) {
    return POKEMON_USAGE_ORDER.includes(usage) && !PERSISTED_POKEMON_USAGES.includes(usage);
  }

  /** @private */
  _clearClaims() {
    if (this._claims.size === 0) return;
    this._claims.clear();
    this.dispatchChanged();
  }

  /** @override */
  onDestroy() {
    for (const unsubscribe of this._unsubscribers) unsubscribe();
    this._unsubscribers = [];
    this._claims.clear();
    super.onDestroy();
  }
}
