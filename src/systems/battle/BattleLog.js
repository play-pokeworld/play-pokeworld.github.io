/**
 * @file BattleLog.js
 * @brief Language-neutral battle log (C++: class BattleLog). The engine records localization keys
 * and raw parameters; the presentation layer translates them (move ids, item ids, stats and
 * statuses are translated there, names are already display names).
 */

/**
 * @typedef {Object} BattleLogEntry
 * @property {string} key - Localization key
 * @property {Object} params
 */

export class BattleLog {
  constructor() {
    /** @type {BattleLogEntry[]} */
    this.entries = [];
  }

  /**
   * @param {string} key
   * @param {Object} [params={}]
   */
  add(key, params = {}) {
    this.entries.push({ key, params });
  }

  /** @returns {BattleLogEntry[]} Entries recorded since the last call */
  drain() {
    const entries = this.entries;
    this.entries = [];
    return entries;
  }
}
