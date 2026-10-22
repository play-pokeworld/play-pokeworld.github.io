/**
 * @file BoxFiltersData.js
 * @brief Persisted PC filter state (the original boxFilters object, normalized to current values).
 */
import { BaseModel } from '../core/BaseModel.js';
import { REGIONS } from '../../config/Regions.js';
import { TYPE_IDS } from '../core/TypeChart.js';

const DEFAULTS = Object.freeze({
  region: 'all',
  type: 'all',
  shiny: 'all',
  evo: 'all',
  favorite: 'all',
  locked: 'all',
  iv: 'all',
  ev: 'all',
  rank: 'all',
  forms: 'all',
  search: ''
});
const RANKS = Object.freeze(['all', 'E', 'D', 'C', 'B', 'A', 'S']);
const ENUM_VALUES = Object.freeze({
  region: ['all', ...REGIONS.map((region) => region.id)],
  type: ['all', ...TYPE_IDS],
  shiny: ['all', 'shiny', 'normal'],
  evo: ['all', 'missing'],
  favorite: ['all', 'favorite', 'not_favorite'],
  locked: ['all', 'locked', 'unlocked'],
  iv: ['all', 'complete', 'incomplete'],
  ev: ['all', 'complete', 'incomplete'],
  rank: RANKS,
  forms: ['all', 'forms']
});

/** @param {string} key @param {*} value @returns {string} */
function normalizeValue(key, value) {
  if (key === 'search') return typeof value === 'string' ? value.slice(0, 120) : '';
  const allowed = ENUM_VALUES[key];
  return allowed?.includes(value) ? value : DEFAULTS[key];
}

export class BoxFiltersData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) {
    super('BoxFiltersData', 'Data');
    this.deserialize(data);
  }

  /** @returns {Readonly<Object>} */
  static get defaults() {
    return DEFAULTS;
  }

  /** @param {string} key @returns {string} */
  get(key) {
    return this._values[key] ?? DEFAULTS[key] ?? '';
  }

  /**
   * @param {string} key
   * @param {*} value
   * @returns {boolean} Whether the normalized value changed
   */
  set(key, value) {
    if (!(key in DEFAULTS)) return false;
    const normalized = normalizeValue(key, value);
    if (this._values[key] === normalized) return false;
    this._values[key] = normalized;
    return true;
  }

  /** @returns {boolean} Whether any filter differed from its default */
  reset() {
    let changed = false;
    for (const key of Object.keys(DEFAULTS)) {
      if (this._values[key] !== DEFAULTS[key]) changed = true;
      this._values[key] = DEFAULTS[key];
    }
    return changed;
  }

  /** @override @returns {Object} */
  serialize() {
    return { ...this._values };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this._values = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, normalizeValue(key, raw[key])]));
  }
}
