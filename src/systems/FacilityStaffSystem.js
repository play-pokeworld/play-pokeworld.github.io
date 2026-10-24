/**
 * @file FacilityStaffSystem.js
 * @brief Shared employee management and effective legacy perks, independent of facility UIs.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { FacilityPurchase } from './facilities/FacilityPurchase.js';
import { STAFF_CATALOG } from '../data/facilities/StaffCatalog.js';
import { StaffRules } from '../config/StaffRules.js';
import { EventBus } from '../core/EventBus.js';
import { FacilityStaffChangedEvent } from '../core/events/FacilityStaffChangedEvent.js';

export class FacilityStaffSystem extends BaseSystem {
  static _instance = null;
  /** @returns {FacilityStaffSystem} */
  static getInstance() { return this._instance || (this._instance = new FacilityStaffSystem()); }
  constructor() { super('FacilityStaffSystem', 'System'); }
  /** @param {Object} definition @returns {Object} */
  getPrice(definition) {
    const index = STAFF_CATALOG.indexOf(definition);
    const cycle = index % StaffRules.CURRENCY_CYCLE.length;
    const ladder = StaffRules.PRICE_LADDERS[cycle];
    return { currency: StaffRules.CURRENCY_CYCLE[cycle], cost: ladder[Math.min(Math.floor(index / StaffRules.CURRENCY_CYCLE.length), ladder.length - 1)] };
  }
  /** @param {number} level @returns {number} */
  xpNeeded(level) { return Math.floor(StaffRules.XP_BASE + StaffRules.XP_PER_LEVEL * level + StaffRules.XP_QUADRATIC * level * level); }
  /** @param {string} sector @returns {Object[]} */
  getSnapshot(sector) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];
    return STAFF_CATALOG.filter((definition) => definition.sector === sector).map((definition) => {
      const entry = save.staff.owned[definition.id];
      const price = this.getPrice(definition);
      return { ...definition, ...price, owned: !!entry, active: save.staff.active[sector] === definition.id,
        level: entry?.level || 1, xp: entry?.xp || 0, xpNeeded: this.xpNeeded(entry?.level || 1),
        unlocked: FeatureAccessSystem.getInstance().isLocationUnlocked(definition.locationId),
        canAfford: save.currencies.get(price.currency) >= price.cost,
        bonusValue: this._value(definition, entry?.level || 1),
        bonusDisplay: this._displayValue(definition, entry?.level || 1) };
    });
  }
  /** @param {string} id @returns {Object} */
  hire(id) {
    const definition = STAFF_CATALOG.find((entry) => entry.id === id);
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!definition || !save || save.staff.owned[id] ||
      !FeatureAccessSystem.getInstance().isFeatureUnlocked(definition.sector) ||
      !FeatureAccessSystem.getInstance().isLocationUnlocked(definition.locationId)) return { result: 'unavailable' };
    const price = this.getPrice(definition);
    const result = FacilityPurchase.apply(save, price.cost, price.currency, () => { save.staff.owned[id] = { level: 1, xp: 0 }; });
    if (result.result === 'ready') { this._changed(definition.sector); SaveSystem.getInstance().saveCurrent(); }
    return result;
  }
  /** @param {string} id @returns {boolean} */
  toggle(id) {
    const definition = STAFF_CATALOG.find((entry) => entry.id === id);
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!definition || !save?.staff.owned[id]) return false;
    const active = save.staff.active[definition.sector];
    if (active && active !== id) return false;
    if (active === id) delete save.staff.active[definition.sector];
    else save.staff.active[definition.sector] = id;
    this._changed(definition.sector); SaveSystem.getInstance().saveCurrent(); return true;
  }
  /** Adds XP inside a facility-owned transaction: never writes a second save. */
  addXp(sector, amount = 1) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const entry = save?.staff.owned[save.staff.active[sector]];
    if (!entry || entry.level >= StaffRules.MAX_LEVEL || !(amount > 0)) return false;
    entry.xp += amount;
    while (entry.level < StaffRules.MAX_LEVEL && entry.xp >= this.xpNeeded(entry.level)) {
      entry.xp -= this.xpNeeded(entry.level); entry.level++;
    }
    this._changed(sector); return true;
  }
  /** @param {string} sector @param {string} bonus @returns {number} */
  getBonus(sector, bonus) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const id = save?.staff.active[sector];
    const definition = STAFF_CATALOG.find((entry) => entry.id === id && entry.bonus === bonus && entry.effectImplemented);
    return definition ? this._value(definition, save.staff.owned[id]?.level || 1) : 0;
  }
  /** @private @param {Object} definition @param {number} level @returns {number} */
  _value(definition, level) {
    if (['hatchery_double_iv_level', 'training_drop'].includes(definition.bonus)) return level * definition.perLevel;
    return Math.min(StaffRules.BONUS_MAX, (level - 1) * definition.perLevel);
  }
  /** @private @param {Object} definition @param {number} level @returns {number} */
  _displayValue(definition, level) {
    if (definition.bonus === 'training_kill_reduction') return Math.round(3 * (level - 1) / (StaffRules.MAX_LEVEL - 1));
    if (definition.bonus === 'mine_extra_items') return Math.floor(3 * (level - 1) / (StaffRules.MAX_LEVEL - 1));
    if (definition.bonus === 'mine_energy_max') return (level - 1) * definition.perLevel;
    return Math.round(this._value(definition, level) * 1000) / 10;
  }
  /** @param {string} sector @returns {number} */
  getSectorLevels(sector) {
    const staff = SaveSystem.getInstance().getCurrentSave()?.staff;
    return STAFF_CATALOG.filter((definition) => definition.sector === sector)
      .reduce((sum, definition) => sum + (staff?.owned[definition.id]?.level || 0), 0);
  }
  /** @param {string} sector @param {number} base @returns {number} */
  getFee(sector, base) {
    const maximum = STAFF_CATALOG.filter((definition) => definition.sector === sector).length * StaffRules.MAX_LEVEL;
    return Math.max(0, Math.ceil(base * (1 - this.getSectorLevels(sector) / maximum)));
  }
  /** @private @param {string} sector */
  _changed(sector) { EventBus.getInstance().dispatch(new FacilityStaffChangedEvent(sector)); }
}
