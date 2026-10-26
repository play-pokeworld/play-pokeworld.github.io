/**
 * @file HatcheryData.js
 * @brief Persistent daycare and fossil-incubation slots.
 *
 * Serialized shape (save schema 18):
 *   { maxSlots, modes, pendingModes, priorities, filters, queues, queueLevel, autoOptions,
 *     autoHatchPurchased, autoHatchEnabled, autoFillPurchased, autoFillEnabled,
 *     slots: [null | daycare | incubation | fossil] }
 * Pokémon slots reference owned uids; fossil slots reference item/species ids.
 * A daycare slot only references a Pokémon of PokemonCollectionData by uid.
 */
import { FacilityFilterData } from './FacilityFilterData.js';
import { BaseModel } from '../core/BaseModel.js';
import { FacilityRules } from '../../config/FacilityRules.js';
import { SaveValues } from '../core/SaveValues.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';

/** @param {*} value @param {number} fallback @returns {number} */
function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback;
}

/** @param {*} raw @returns {Object|null} */
function readSlot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind || (raw.isFossil ? 'fossil' : raw.pokemonUid ? 'daycare' : '');
  if (kind === 'daycare' || kind === 'incubation') {
    const pokemonUid = typeof raw.pokemonUid === 'string' ? raw.pokemonUid.trim() : '';
    if (!pokemonUid) return null;
    return {
      kind,
      pokemonUid,
      knockouts: SaveValues.integer(raw.knockouts ?? raw.steps, 0),
      initialLevel: SaveValues.integer(raw.initialLevel, 0),
      ...(kind === 'incubation' ? { required: boundedInteger(raw.required, HatcheryRules.MAX_FOSSIL_KOS,
        HatcheryRules.MIN_FOSSIL_KOS, HatcheryRules.MAX_FOSSIL_KOS), ready: raw.ready === true } : {}),
      paid: raw.paid === true
    };
  }
  if (kind === 'fossil') {
    const itemId = raw.itemId || raw.fossilKey;
    const speciesId = raw.speciesId || raw.species || '';
    if (typeof itemId !== 'string' || !itemId || typeof speciesId !== 'string' || !speciesId) return null;
    const required = boundedInteger(raw.required ?? raw.stepsReq, HatcheryRules.MIN_FOSSIL_KOS,
      HatcheryRules.MIN_FOSSIL_KOS, HatcheryRules.MAX_FOSSIL_KOS);
    const knockouts = SaveValues.integer(raw.knockouts ?? raw.steps, 0);
    return { kind, itemId, speciesId, knockouts, required, ready: raw.ready === true || knockouts >= required };
  }
  return null;
}

export class HatcheryData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) {
    super('HatcheryData', 'Data');
    this.deserialize(data);
  }

  /** @returns {number} */
  findEmptySlot() {
    return this.slots.findIndex((slot) => slot === null);
  }

  /** @returns {string[]} Uids of the Pokémon currently housed in the daycare */
  getDaycareUids() {
    return this.slots.filter((slot) => slot?.pokemonUid).map((slot) => slot.pokemonUid);
  }

  /** @returns {string[]} */
  getReservedUids() { return [...this.getDaycareUids(), ...this.queues.flat().filter((entry) => entry.kind === 'pokemon').map((entry) => entry.uid)]; }

  /** @param {string} uid @returns {number} Index of the daycare slot housing this Pokémon, or -1 */
  findDaycareSlot(uid) {
    return this.slots.findIndex((slot) => slot?.pokemonUid && slot.pokemonUid === uid);
  }

  /**
   * @param {number} index
   * @param {Object|null} slot
   * @returns {boolean}
   */
  setSlot(index, slot) {
    if (!Number.isInteger(index) || index < 0 || index >= this.maxSlots) return false;
    this.slots[index] = readSlot(slot);
    return slot === null || this.slots[index] !== null;
  }

  /** @override */
  serialize() {
    return {
      maxSlots: this.maxSlots,
      modes: [...this.modes],
      filters: this.filters.map((entry) => entry.serialize()),
      pendingModes: [...this.pendingModes],
      priorities: [...this.priorities],
      queues: SaveValues.copy(this.queues),
      queueLevel: this.queueLevel,
      autoHatchPurchased: this.autoHatchPurchased,
      autoHatchEnabled: this.autoHatchEnabled,
      autoFillPurchased: this.autoFillPurchased,
      autoFillEnabled: this.autoFillEnabled,
      autoOptions: [...this.autoOptions],
      slots: this.slots.map((slot) => {
        if (!slot) return null;
        return { ...slot };
      })
    };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
    const requested = raw.maxSlots ?? raw.hatcheryMaxSlots;
    const desired = Math.max(Number(requested) || HatcheryRules.DEFAULT_SLOT_COUNT, rawSlots.length);
    this.maxSlots = boundedInteger(desired, HatcheryRules.DEFAULT_SLOT_COUNT,
      HatcheryRules.DEFAULT_SLOT_COUNT, HatcheryRules.MAX_SLOT_COUNT);
    this.filters=Array.from({length:this.maxSlots},(_,index)=>new FacilityFilterData('hatchery',raw.filters?.[index]));
    this.queueLevel = SaveValues.integer(raw.queueLevel, 0, 0, FacilityRules.QUEUE_UPGRADE_COSTS.length);
    this.modes = Array.from({ length: this.maxSlots }, (_, index) =>
      raw.modes?.[index] === HatcheryRules.MODE_INCUBATION || rawSlots[index]?.kind === HatcheryRules.MODE_INCUBATION || rawSlots[index]?.kind === 'fossil'
        ? HatcheryRules.MODE_INCUBATION : HatcheryRules.MODE_DAYCARE);
    this.pendingModes = Array.from({ length: this.maxSlots }, (_, index) =>
      raw.pendingModes?.[index] === HatcheryRules.MODE_DAYCARE ? HatcheryRules.MODE_DAYCARE : null);
    this.priorities = Array.from({ length: this.maxSlots }, (_, index) => raw.priorities?.[index] === 'fossil' ? 'fossil' : 'pokemon');
    this.queues = Array.from({ length: this.maxSlots }, (_, index) =>
      (Array.isArray(raw.queues?.[index]) ? raw.queues[index] : []).flatMap((entry) => {
        if (typeof entry === 'string' && entry) return [{ kind: 'pokemon', uid: entry }];
        if (entry?.kind === 'pokemon' && typeof entry.uid === 'string' && entry.uid) return [{ kind: 'pokemon', uid: entry.uid }];
        if (entry?.kind === 'fossil' && typeof entry.itemId === 'string' && entry.itemId) return [{ kind: 'fossil', itemId: entry.itemId }];
        return [];
      }).slice(0, FacilityRules.QUEUE_DEFAULT + this.queueLevel * FacilityRules.QUEUE_STEP));
    this.autoHatchPurchased = raw.autoHatchPurchased === true;
    this.autoHatchEnabled = this.autoHatchPurchased && raw.autoHatchEnabled === true;
    this.autoFillPurchased = raw.autoFillPurchased === true;
    this.autoFillEnabled = this.autoFillPurchased && raw.autoFillEnabled === true;
    this.autoOptions = HatcheryRules.AUTOMATION_FILTERS.filter((id) => raw.autoOptions?.includes(id));
    this.slots = Array.from({ length: this.maxSlots }, (_, index) => readSlot(rawSlots[index]));
  }
}
