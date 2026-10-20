/**
 * @file TeamPresetsData.js
 * @brief Ordered, per-save presets of Pokémon uids (C++ equivalent: class TeamPresetsData : BaseModel).
 *
 * Serialized shape (save schema 5):
 *   { activeId, slots: [{ id, name, members: string[] }, ...] }
 * A null name means the localized default for that slot; member references resolve against the
 * active party and PC box, so a preset never duplicates or owns Pokémon data itself.
 */
import { BaseModel } from '../core/BaseModel.js';
import { TeamPresetRules } from '../../config/TeamPresetRules.js';

const VALID_IDS = new Set(TeamPresetRules.PRESET_IDS);

/** @param {*} value @returns {string|null} */
function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim().slice(0, TeamPresetRules.NAME_MAX_LENGTH);
  return name || null;
}

/** @param {*} value @returns {string[]} */
function cleanMembers(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const members = [];
  for (const raw of value) {
    const uid = typeof raw === 'string' ? raw.trim() : '';
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    members.push(uid);
    if (members.length >= TeamPresetRules.MAX_MEMBERS) break;
  }
  return members;
}

export class TeamPresetsData extends BaseModel {
  /** @param {Object} [data] - Serialized schema 5 preset data */
  constructor(data) {
    super('TeamPresetsData', 'Data');
    this._slots = [];
    this.activeId = TeamPresetRules.DEFAULT_ACTIVE_ID;
    this.deserialize(data);
  }

  /** @returns {Array<{id: string, name: string|null, members: string[]}>} Slot snapshots in display order */
  getAll() {
    return this._slots.map((slot) => ({ ...slot, members: [...slot.members] }));
  }

  /**
   * @param {string} id
   * @returns {{id: string, name: string|null, members: string[]}|null}
   */
  getById(id) {
    const slot = this._slots.find((entry) => entry.id === id);
    return slot ? { ...slot, members: [...slot.members] } : null;
  }

  /** @param {string} id @param {string|null} name @returns {boolean} */
  setName(id, name) {
    const slot = this._slots.find((entry) => entry.id === id);
    if (!slot) return false;
    slot.name = cleanName(name);
    return true;
  }

  /** @param {string} id @param {string[]} members @returns {boolean} */
  setMembers(id, members) {
    const slot = this._slots.find((entry) => entry.id === id);
    if (!slot) return false;
    slot.members = cleanMembers(members);
    return true;
  }

  /** @param {string} id @returns {boolean} */
  setActiveId(id) {
    if (!VALID_IDS.has(id)) return false;
    this.activeId = id;
    return true;
  }

  /** @override @returns {Object} */
  serialize() {
    return {
      activeId: this.activeId,
      slots: this._slots.map((slot) => ({ ...slot, members: [...slot.members] }))
    };
  }

  /** @override @param {Object} data */
  deserialize(data) {
    const byId = new Map();
    for (const raw of Array.isArray(data?.slots) ? data.slots : []) {
      if (!raw || !VALID_IDS.has(raw.id) || byId.has(raw.id)) continue;
      byId.set(raw.id, raw);
    }
    this._slots = TeamPresetRules.PRESET_IDS.map((id) => {
      const raw = byId.get(id);
      return {
        id,
        name: cleanName(raw?.name),
        members: cleanMembers(raw?.members)
      };
    });
    this.activeId = VALID_IDS.has(data?.activeId) ? data.activeId : TeamPresetRules.DEFAULT_ACTIVE_ID;
  }
}
