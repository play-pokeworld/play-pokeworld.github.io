/**
 * @file PokedexData.js
 * @brief Pokédex progress of one save (C++: class PokedexData : public BaseModel).
 *
 * One entry per species slug that has been met:
 *   { "pidgey": { "seen": true, "caught": false, "shiny": false } }
 * Counts (caught / seen) are always derived from the entries, never stored next to them.
 */

import { BaseModel } from '../core/BaseModel.js';
import { EventBus } from '../../core/EventBus.js';
import { PokedexChangedEvent } from '../../core/events/PokedexChangedEvent.js';

/** Caught status of a species (C++: enum class CaughtStatus). */
export const CaughtStatus = Object.freeze({ NOT_CAUGHT: 'not_caught', CAUGHT: 'caught', SHINY: 'shiny' });

export class PokedexData extends BaseModel {
  /**
   * @param {Object} [data={}] - Serialized entries
   */
  constructor(data = {}) {
    super('PokedexData', 'Data');
    /** @private @type {Map<string, {seen: boolean, caught: boolean, shiny: boolean}>} */
    this._entries = new Map();
    this.deserialize(data);
  }

  /** @param {string} species @returns {boolean} */
  isSeen(species) {
    return !!this._entries.get(species)?.seen;
  }

  /** @param {string} species @returns {boolean} */
  isCaught(species) {
    return !!this._entries.get(species)?.caught;
  }

  /**
   * @param {string} species
   * @returns {string} CaughtStatus value
   */
  getCaughtStatus(species) {
    const entry = this._entries.get(species);
    if (!entry?.caught) return CaughtStatus.NOT_CAUGHT;
    return entry.shiny ? CaughtStatus.SHINY : CaughtStatus.CAUGHT;
  }

  /** @returns {number} */
  getCaughtCount() {
    let count = 0;
    for (const entry of this._entries.values()) if (entry.caught) count++;
    return count;
  }

  /** @returns {number} */
  getSeenCount() {
    let count = 0;
    for (const entry of this._entries.values()) if (entry.seen) count++;
    return count;
  }

  /** @returns {Array<{species: string, shiny: boolean}>} Caught species for collection displays. */
  getCaughtSpecies() {
    return [...this._entries.entries()]
      .filter(([, entry]) => entry.caught)
      .map(([species, entry]) => ({ species, shiny: entry.shiny }));
  }

  /** @param {string} species */
  markSeen(species) {
    if (!species || this.isSeen(species)) return;
    this._entry(species).seen = true;
    EventBus.getInstance().dispatch(new PokedexChangedEvent(species));
  }

  /**
   * @param {string} species
   * @param {boolean} [shiny=false]
   */
  markCaught(species, shiny = false) {
    if (!species) return;
    const entry = this._entry(species);
    if (entry.caught && (entry.shiny || !shiny)) return;
    entry.seen = true;
    entry.caught = true;
    entry.shiny = entry.shiny || !!shiny;
    EventBus.getInstance().dispatch(new PokedexChangedEvent(species));
  }

  /**
   * @override
   * @returns {Object<string, {seen: boolean, caught: boolean, shiny: boolean}>}
   */
  serialize() {
    const out = {};
    for (const [species, entry] of this._entries) out[species] = { ...entry };
    return out;
  }

  /**
   * @override
   * @param {Object} data - Entries keyed by species slug
   */
  deserialize(data = {}) {
    this._entries.clear();
    for (const [species, raw] of Object.entries(data || {})) {
      if (!raw || typeof raw !== 'object') continue;
      const caught = raw.caught === true;
      this._entries.set(species, { seen: raw.seen === true || caught, caught, shiny: caught && raw.shiny === true });
    }
  }

  /**
   * @private
   * @param {string} species
   */
  _entry(species) {
    if (!this._entries.has(species)) this._entries.set(species, { seen: false, caught: false, shiny: false });
    return this._entries.get(species);
  }
}
