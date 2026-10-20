/**
 * @file MigrationV8ToV9.js
 * @brief Save migration 8 -> 9: persist Kanto hatchery, mine and training state.
 */
import { HatcheryRules } from '../../../config/HatcheryRules.js';

/** @param {*} value @returns {Object} */
function normalizeHatchery(value) {
  const source = value && typeof value === 'object' ? value : {};
  const slots = Array.isArray(source.slots) ? source.slots : [];
  const desired = Math.max(Number(source.maxSlots) || HatcheryRules.DEFAULT_SLOT_COUNT, slots.length);
  const maxSlots = Math.max(HatcheryRules.DEFAULT_SLOT_COUNT,
    Math.min(HatcheryRules.MAX_SLOT_COUNT, Math.floor(desired)));
  return {
    maxSlots,
    slots: Array.from({ length: maxSlots }, (_, index) => slots[index] ?? null)
  };
}

export const MigrationV8ToV9 = Object.freeze({
  from: 8,
  to: 9,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const statistics = raw.statistics && typeof raw.statistics === 'object' ? raw.statistics : {};
    const mine = raw.mine && typeof raw.mine === 'object' ? { ...raw.mine } : {};
    return {
      ...raw,
      version: 9,
      hatchery: normalizeHatchery(raw.hatchery),
      mine,
      statistics: {
        ...statistics,
        trainingSessions: Math.max(0, Math.floor(Number(statistics.trainingSessions) || 0))
      }
    };
  }
});
