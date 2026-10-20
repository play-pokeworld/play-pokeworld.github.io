/**
 * @file MigrationV4ToV5.js
 * @brief Save migration 4 -> 5 (v1.7): add the twenty persistent team presets.
 * Original game exports carry `G.teamPresets.presetN = { name, uids }` and `G.activePresetId`;
 * these references are normalized to the current `TeamPresetsData` shape without changing Pokémon.
 */
import { TeamPresetRules } from '../../../config/TeamPresetRules.js';

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

/**
 * @param {*} source - Current-shaped teamPresets, original G.teamPresets, or missing
 * @param {*} legacyActiveId - Original G.activePresetId
 * @returns {{activeId: string, slots: Array<{id: string, name: string|null, members: string[]}>}}
 */
function migrateTeamPresets(source, legacyActiveId) {
  let slotsById = new Map();
  if (Array.isArray(source?.slots)) {
    for (const slot of source.slots) {
      if (slot && VALID_IDS.has(slot.id) && !slotsById.has(slot.id)) slotsById.set(slot.id, slot);
    }
  } else {
    const legacySlots = source && typeof source === 'object' && source.slots && typeof source.slots === 'object'
      ? source.slots
      : source;
    for (const id of TeamPresetRules.PRESET_IDS) {
      const slot = legacySlots?.[id];
      if (slot && typeof slot === 'object') slotsById.set(id, slot);
    }
  }

  const activeId = source?.activeId ?? legacyActiveId;
  return {
    activeId: VALID_IDS.has(activeId) ? activeId : TeamPresetRules.DEFAULT_ACTIVE_ID,
    slots: TeamPresetRules.PRESET_IDS.map((id) => {
      const slot = slotsById.get(id);
      return {
        id,
        name: cleanName(slot?.name),
        members: cleanMembers(slot?.members ?? slot?.uids)
      };
    })
  };
}

export const MigrationV4ToV5 = Object.freeze({
  from: 4,
  to: 5,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const { activePresetId, ...rest } = raw;
    return {
      ...rest,
      version: 5,
      teamPresets: migrateTeamPresets(raw.teamPresets, activePresetId)
    };
  }
});
