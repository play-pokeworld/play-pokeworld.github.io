/**
 * @file DungeonRules.js
 * @brief Tunable rules shared by dungeon systems and presentation.
 */
import { resolveLocationScene } from './LocationBackgrounds.js';

const ENTRY_TOLLS = Object.freeze([100, 150, 250, 350, 500, 650, 800, 900, 1000]);
const CAVE_SCENES = new Set(['cave', 'iceCave', 'trench', 'volcano', 'mountain', 'snow', 'desert']);
const WIPE_KEEP_RATIO = 0.5;
const COMPLETION_BONUS = 2.5;
const EXHAUSTED_RATE = 0.4;

/** @param {*} value @param {number} [fallback=0] @returns {number} */
function badgeTier(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(8, Math.floor(number))) : fallback;
}

function isCaveScene(locationId) {
  return CAVE_SCENES.has(resolveLocationScene(locationId, 'dungeon'));
}

export const DungeonRules = Object.freeze({
  ENTRY_TOLLS,
  WIPE_KEEP_RATIO,
  COMPLETION_BONUS,
  EXHAUSTED_RATE,
  AUTO_UNLOCK_CLEARS: 3,
  /** @param {number} badgeCount @returns {number} */
  entryToll(badgeCount) {
    return ENTRY_TOLLS[badgeTier(badgeCount)];
  },
  /** @param {string} locationId @param {number} badgeCount @returns {boolean} */
  isCaveLike(locationId, badgeCount = 0) {
    return isCaveScene(locationId);
  },
  /** @param {number} badgeCount @param {string} locationId @returns {number} */
  depthFor(badgeCount, locationId) {
    if (!isCaveScene(locationId)) return 1;
    return 2 + Math.round(badgeTier(badgeCount) / 8);
  },
  /** @param {number} badgeCount @returns {{cols:number,rows:number}} */
  gridSizeFor(badgeCount) {
    const tier = badgeTier(badgeCount);
    return {
      cols: 7 + Math.round((11 - 7) * (tier / 8)),
      rows: 5 + Math.round((8 - 5) * (tier / 8))
    };
  },
  /** @param {number} floor @returns {number} */
  multiplierFor(floor) {
    return Math.round((1 + (Math.max(1, Number(floor) || 1) - 1) * 0.5) * 100) / 100;
  },
  /** @param {number} floor @returns {number} */
  quotaFor(floor) {
    const currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
    return 4 + currentFloor - 1;
  },
  /** @param {number} badgeCount @returns {{tokens:number,money:number}} */
  winLootFor(badgeCount) {
    const tier = badgeTier(badgeCount);
    return { tokens: 6 + tier * 4, money: 80 + tier * 60 };
  }
});
