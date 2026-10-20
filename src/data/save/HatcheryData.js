/**
 * @file HatcheryData.js
 * @brief Persistent daycare and fossil-incubation slots.
 */
import { BaseModel } from '../core/BaseModel.js';
import { PokemonData } from '../pokemon/PokemonData.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';

/** @param {*} value @param {number} fallback @returns {number} */
function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback;
}

/** @param {*} raw @returns {Object|null} */
function readSlot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind || (raw.isFossil ? 'fossil' : raw.pokemon || raw.poke ? 'daycare' : '');
  if (kind === 'daycare') {
    const pokemon = raw.pokemon || raw.poke;
    if (!pokemon || typeof pokemon !== 'object') return null;
    return {
      kind,
      pokemon: pokemon instanceof PokemonData ? pokemon : new PokemonData(pokemon),
      knockouts: Math.max(0, Math.floor(Number(raw.knockouts ?? raw.steps) || 0))
    };
  }
  if (kind === 'fossil') {
    const itemId = raw.itemId || raw.fossilKey;
    const speciesId = raw.speciesId || raw.species || '';
    if (typeof itemId !== 'string' || !itemId || typeof speciesId !== 'string' || !speciesId) return null;
    const required = boundedInteger(raw.required ?? raw.stepsReq, HatcheryRules.MIN_FOSSIL_KOS,
      HatcheryRules.MIN_FOSSIL_KOS, HatcheryRules.MAX_FOSSIL_KOS);
    const knockouts = Math.max(0, Math.floor(Number(raw.knockouts ?? raw.steps) || 0));
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
      slots: this.slots.map((slot) => {
        if (!slot) return null;
        return slot.kind === 'daycare'
          ? { kind: slot.kind, pokemon: slot.pokemon.serialize(), knockouts: slot.knockouts }
          : { ...slot };
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
    this.slots = Array.from({ length: this.maxSlots }, (_, index) => readSlot(rawSlots[index]));
  }
}
