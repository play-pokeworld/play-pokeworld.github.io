/**
 * @file FacilityStaffData.js
 * @brief Persistent recruited employees, levels, XP and one active employee per sector.
 */
import { BaseModel } from '../core/BaseModel.js';
import { SaveValues } from '../core/SaveValues.js';
import { STAFF_CATALOG } from '../facilities/StaffCatalog.js';
import { StaffRules } from '../../config/StaffRules.js';

export class FacilityStaffData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) { super('FacilityStaffData', 'Data'); this.deserialize(data); }
  /** @override */
  serialize() { return { owned: SaveValues.copy(this.owned), active: { ...this.active } }; }
  /** @override @param {Object} data */
  deserialize(data = {}) {
    this.owned = {};
    this.active = {};
    for (const definition of STAFF_CATALOG) {
      const entry = data?.owned?.[definition.id];
      if (!entry) continue;
      this.owned[definition.id] = {
        level: SaveValues.integer(entry.level ?? data.level?.[definition.id], 1, 1, StaffRules.MAX_LEVEL),
        xp: SaveValues.number(entry.xp ?? data.xp?.[definition.id])
      };
    }
    for (const sector of StaffRules.SECTORS) {
      const raw = data?.active?.[sector];
      const ids = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
      const id = ids.find((candidate) => STAFF_CATALOG.some((entry) =>
        entry.id === candidate && entry.sector === sector && this.owned[candidate]));
      if (id) this.active[sector] = id;
    }
  }
}
