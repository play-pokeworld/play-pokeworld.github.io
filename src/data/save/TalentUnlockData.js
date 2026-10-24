/**
 * @file TalentUnlockData.js
 * @brief Permanent species talent ledger. Pokémon themselves remain collection-owned.
 */
import { BaseModel } from '../core/BaseModel.js';
import { SaveValues } from '../core/SaveValues.js';
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { TalentDB } from '../pokemon/TalentDB.js';

export class TalentUnlockData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) { super('TalentUnlockData', 'Data'); this.deserialize(data); }
  /** @param {string} species @param {string} talent @returns {boolean} */
  unlock(species, talent) {
    const definition = PokemonDB.getInstance().getById(species);
    if (!definition || !TalentDB.getInstance().has(talent) ||
      (!definition.talents.includes(talent) && definition.hiddenTalent !== talent)) return false;
    const ids = this._unlocked[species] || (this._unlocked[species] = []);
    if (ids.includes(talent)) return false;
    ids.push(talent);
    return true;
  }
  /** @param {string} species @param {string} talent @returns {boolean} */
  has(species, talent) { return this._unlocked[species]?.includes(talent) === true; }
  /** @param {string} species @returns {string[]} */
  getIds(species) { return [...(this._unlocked[species] || [])]; }
  /** @param {string} species @returns {boolean} */
  hasHidden(species) { return this.has(species, PokemonDB.getInstance().getById(species)?.hiddenTalent); }
  /** @override */
  serialize() { return SaveValues.copy(this._unlocked); }
  /** @override @param {Object} data */
  deserialize(data = {}) {
    this._unlocked = {};
    for (const [species, talents] of Object.entries(data && typeof data === 'object' ? data : {})) {
      for (const talent of SaveValues.ids(talents)) this.unlock(species, talent);
    }
  }
}
