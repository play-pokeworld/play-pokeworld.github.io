/**
 * @file BallFiltersData.js
 * @brief Ordered Poké Ball filters of a save (C++: class BallFiltersData : public BaseModel).
 * Order = priority: the first enabled filter matching the wild Pokémon decides the ball.
 * Every preset always exists (original ensurePokeballs re-inserts a missing preset at its
 * preset position); unknown or duplicated ids are dropped.
 *
 * Serialized shape (save schema 4): BallFilterData[] (see BallFilterData.js).
 */
import { BaseModel } from '../core/BaseModel.js';
import { BallFilterData } from './BallFilterData.js';
import { BallFilterPresets } from '../catch/BallFilterPresets.js';

export class BallFiltersData extends BaseModel {
  /**
   * @param {Object[]} [data] - Serialized filters; omitted = the presets
   */
  constructor(data) {
    super('BallFiltersData', 'Data');
    this.deserialize(data);
  }

  /** @returns {BallFilterData[]} The presets, in priority order */
  static presetFilters() {
    return BallFilterPresets.ids().map((id) => BallFilterData.fromPreset(id));
  }

  /** @returns {BallFilterData[]} Live ordered list */
  getAll() {
    return this._filters;
  }

  /**
   * @param {string} id
   * @returns {BallFilterData|null}
   */
  getById(id) {
    return this._filters.find((filter) => filter.id === id) ?? null;
  }

  /**
   * @param {string} id
   * @returns {number} Position, -1 when unknown
   */
  indexOf(id) {
    return this._filters.findIndex((filter) => filter.id === id);
  }

  /** @override */
  serialize() {
    return this._filters.map((filter) => filter.serialize());
  }

  /** @override */
  deserialize(data) {
    if (!Array.isArray(data)) {
      /** @private @type {BallFilterData[]} */
      this._filters = BallFiltersData.presetFilters();
      return;
    }
    const seen = new Set();
    this._filters = [];
    for (const raw of data) {
      const filter = new BallFilterData(raw);
      if (!filter.id || seen.has(filter.id)) continue;
      seen.add(filter.id);
      this._filters.push(filter);
    }
    BallFilterPresets.ids().forEach((id, presetIndex) => {
      if (seen.has(id)) return;
      this._filters.splice(Math.min(presetIndex, this._filters.length), 0, BallFilterData.fromPreset(id));
    });
  }
}
