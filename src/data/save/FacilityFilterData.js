/** @file FacilityFilterData.js @brief Normalized per-slot filters; contains no Pokémon or duplicated queue state. */
import { BaseModel } from '../core/BaseModel.js';
import { FacilityFilterRules } from '../../config/FacilityFilterRules.js';
export class FacilityFilterData extends BaseModel {
  /** @param {'hatchery'|'training'} sector @param {Object} [raw={}] */
  constructor(sector, raw = {}) {
    super('FacilityFilterData', 'Data');
    this._sector = sector;
    this.deserialize(raw);
  }
  /** @param {string} key @returns {ReadonlyArray<string>} */
  values(key) {
    if (key === 'sort')
      return this._sector === 'hatchery'
        ? FacilityFilterRules.HATCHERY_SORTS
        : FacilityFilterRules.TRAINING_SORTS;
    if (key === 'mode' && this._sector === 'training')
      return ['configured', 'all', ...FacilityFilterRules.MODE_ORDER];
    if (key === (this._sector === 'hatchery' ? 'filterIv' : 'filterEv'))
      return FacilityFilterRules.COMPLETENESS;
    return FacilityFilterRules.COMMON[key] || [];
  }
  /** @param {string} key @returns {string} */
  get(key) {
    return this._values[key];
  }
  /** @param {string} key @param {string} value @returns {boolean} */
  set(key, value) {
    if (
      !Object.hasOwn(this._values, key) ||
      !this.values(key).includes(value) ||
      this._values[key] === value
    )
      return false;
    this._values[key] = value;
    return true;
  }
  /** @override */
  serialize() {
    return { ...this._values };
  }
  /** @override @param {Object} raw */
  deserialize(raw = {}) {
    const fields =
      this._sector === 'hatchery'
        ? FacilityFilterRules.HATCHERY_FIELDS
        : FacilityFilterRules.TRAINING_FIELDS;
    this._values = {};
    for (const key of fields) {
      const fallback =
        key === 'sort'
          ? this._sector === 'hatchery'
            ? 'iv_desc'
            : 'ev_asc'
          : key === 'mode'
            ? 'configured'
            : 'all';
      this._values[key] = this.values(key).includes(raw?.[key])
        ? raw[key]
        : fallback;
    }
  }
}
