/**
 * @file TeamMembersData.js
 * @brief Ordered uids of the active party (C++ equivalent: class TeamMembersData : public BaseModel).
 *
 * Serialized shape (save schema 16): `team: [uid…]` (lead first, at most PlayerDefaults.TEAM_SIZE).
 * The Pokémon themselves live in PokemonCollectionData; this model only stores references.
 * Mutations go through TeamSystem, which validates them against the collection.
 */
import { BaseModel } from '../core/BaseModel.js';
import { PlayerDefaults } from '../../config/PlayerDefaults.js';

/** @param {*} value @returns {string[]} Unique, non-empty uids within the party size */
function cleanUids(value) {
  const uids = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const uid = typeof raw === 'string' ? raw.trim() : '';
    if (!uid || uids.includes(uid)) continue;
    uids.push(uid);
    if (uids.length >= PlayerDefaults.TEAM_SIZE) break;
  }
  return uids;
}

export class TeamMembersData extends BaseModel {
  /** @param {string[]} [data=[]] */
  constructor(data = []) {
    super('TeamMembersData', 'Data');
    /** @private @type {string[]} */
    this._uids = [];
    this.deserialize(data);
  }

  /** @returns {number} */
  get size() {
    return this._uids.length;
  }

  /** @returns {ReadonlyArray<string>} Party uids, lead first (fresh frozen array) */
  getUids() {
    return Object.freeze([...this._uids]);
  }

  /** @param {string} uid @returns {boolean} */
  includes(uid) {
    return this._uids.includes(uid);
  }

  /** @param {string} uid @returns {number} Party index or -1 */
  indexOf(uid) {
    return this._uids.indexOf(uid);
  }

  /** @returns {boolean} */
  isFull() {
    return this._uids.length >= PlayerDefaults.TEAM_SIZE;
  }

  /**
   * Replaces the whole ordered party. Refuses duplicates and oversized parties instead of
   * silently truncating them.
   * @param {string[]} uids
   * @returns {boolean}
   */
  setUids(uids) {
    if (!Array.isArray(uids) || uids.length > PlayerDefaults.TEAM_SIZE) return false;
    const cleaned = cleanUids(uids);
    if (cleaned.length !== uids.length) return false;
    this._uids = cleaned;
    return true;
  }

  /** @override @returns {string[]} */
  serialize() {
    return [...this._uids];
  }

  /** @override @param {string[]} [data=[]] */
  deserialize(data = []) {
    this._uids = cleanUids(data);
  }
}
