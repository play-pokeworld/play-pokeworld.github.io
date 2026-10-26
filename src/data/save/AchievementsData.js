/**
 * @file AchievementsData.js
 * @brief Persisted achievements progress of one save (C++: class AchievementsData : public BaseModel).
 *
 * Serialized shape:
 *   {
 *     unlockedTiers: { [achId]: number },
 *     unlockedAt: { [achId_tier]: number },
 *     pinned: string,
 *     stats: { [key]: number }
 *   }
 */

import { BaseModel } from '../core/BaseModel.js';

const DEFAULT_PINNED = 'dex_kanto';

/** @param {*} raw @returns {Record<string, number>} */
function readNumericMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw)) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      out[key] = num;
    }
  }
  return out;
}

export class AchievementsData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('AchievementsData', 'Data');
    /** @private @type {Map<string, number>} */
    this._unlockedTiers = new Map();
    /** @private @type {Map<string, number>} */
    this._unlockedAt = new Map();
    /** @private @type {Set<string>} */
    this._pinned = new Set([DEFAULT_PINNED]);
    /** @private @type {Map<string, number>} */
    this._stats = new Map();

    this.deserialize(data);
  }

  /**
   * Returns the highest unlocked tier for an achievement, or -1 if locked.
   * @param {string} achId
   * @returns {number}
   */
  getUnlockedTier(achId) {
    if (!achId) return -1;
    return this._unlockedTiers.has(achId) ? this._unlockedTiers.get(achId) : -1;
  }

  /**
   * Records an unlocked tier for an achievement.
   * @param {string} achId
   * @param {number} tierIndex
   * @param {number} [timestamp=Date.now()]
   * @returns {boolean} Whether a new tier was recorded
   */
  setUnlockedTier(achId, tierIndex, timestamp = Date.now()) {
    if (!achId || typeof tierIndex !== 'number' || tierIndex < 0) return false;
    const current = this.getUnlockedTier(achId);
    if (tierIndex > current) {
      this._unlockedTiers.set(achId, tierIndex);
      for (let t = Math.max(0, current + 1); t <= tierIndex; t++) {
        const key = `${achId}_${t}`;
        if (!this._unlockedAt.has(key)) {
          this._unlockedAt.set(key, timestamp);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Checks whether a specific tier of an achievement is unlocked.
   * @param {string} achId
   * @param {number} tierIndex
   * @returns {boolean}
   */
  isTierUnlocked(achId, tierIndex = 0) {
    return this.getUnlockedTier(achId) >= tierIndex;
  }

  /**
   * Returns the unlock timestamp for a specific tier.
   * @param {string} achId
   * @param {number} tierIndex
   * @returns {number|null}
   */
  getUnlockedAt(achId, tierIndex = 0) {
    const key = `${achId}_${tierIndex}`;
    return this._unlockedAt.get(key) || null;
  }

  /**
   * Returns the primary pinned achievement ID (for backward compatibility).
   * @returns {string}
   */
  getPinnedId() {
    const first = this._pinned.values().next().value;
    return first || DEFAULT_PINNED;
  }

  /**
   * Sets a single pinned achievement ID (for backward compatibility).
   * @param {string} achId
   */
  setPinnedId(achId) {
    this._pinned.clear();
    const id = typeof achId === 'string' && achId ? achId : DEFAULT_PINNED;
    this._pinned.add(id);
  }

  /**
   * Returns a copy of all pinned achievement IDs.
   * @returns {string[]}
   */
  getPinnedList() {
    return Array.from(this._pinned);
  }

  /**
   * Checks if an achievement is pinned.
   * @param {string} achId
   * @returns {boolean}
   */
  isPinned(achId) {
    return this._pinned.has(achId);
  }

  /**
   * Pins an achievement.
   * @param {string} achId
   */
  pin(achId) {
    if (typeof achId === 'string' && achId) {
      this._pinned.add(achId);
    }
  }

  /**
   * Unpins an achievement.
   * @param {string} achId
   */
  unpin(achId) {
    if (typeof achId === 'string') {
      this._pinned.delete(achId);
    }
  }

  /**
   * Toggles pinned state of an achievement.
   * @param {string} achId
   * @returns {boolean} true if now pinned, false if unpinned
   */
  togglePin(achId) {
    if (this.isPinned(achId)) {
      this.unpin(achId);
      return false;
    }
    this.pin(achId);
    return true;
  }

  /**
   * Returns the value of an achievement tracking counter.
   * @param {string} key
   * @returns {number}
   */
  getStat(key) {
    return this._stats.get(key) || 0;
  }

  /**
   * Sets an achievement tracking counter.
   * @param {string} key
   * @param {number} value
   */
  setStat(key, value) {
    if (!key) return;
    this._stats.set(key, Math.max(0, Number(value) || 0));
  }

  /**
   * Increments an achievement counter and returns the new value.
   * @param {string} key
   * @param {number} [amount=1]
   * @returns {number}
   */
  incrementStat(key, amount = 1) {
    if (!key) return 0;
    const current = this.getStat(key);
    const updated = Math.max(0, current + (Number(amount) || 0));
    this._stats.set(key, updated);
    return updated;
  }

  /**
   * Returns a copy of all unlocked tiers.
   * @returns {Record<string, number>}
   */
  getAllUnlockedTiers() {
    return Object.fromEntries(this._unlockedTiers);
  }

  /**
   * Returns a copy of all achievement stats.
   * @returns {Record<string, number>}
   */
  getAllStats() {
    return Object.fromEntries(this._stats);
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      unlockedTiers: Object.fromEntries(this._unlockedTiers),
      unlockedAt: Object.fromEntries(this._unlockedAt),
      pinned: Array.from(this._pinned),
      stats: Object.fromEntries(this._stats)
    };
  }

  /**
   * @override
   * @param {Object} [data={}]
   */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};

    this._unlockedTiers.clear();
    for (const [key, value] of Object.entries(readNumericMap(raw.unlockedTiers))) {
      this._unlockedTiers.set(key, Math.floor(value));
    }

    this._unlockedAt.clear();
    for (const [key, value] of Object.entries(readNumericMap(raw.unlockedAt))) {
      this._unlockedAt.set(key, Math.floor(value));
    }

    this._pinned.clear();
    if (Array.isArray(raw.pinned)) {
      for (const id of raw.pinned) {
        if (typeof id === 'string' && id) this._pinned.add(id);
      }
    } else if (typeof raw.pinned === 'string' && raw.pinned) {
      this._pinned.add(raw.pinned);
    }
    if (this._pinned.size === 0) {
      this._pinned.add(DEFAULT_PINNED);
    }

    this._stats.clear();
    for (const [key, value] of Object.entries(readNumericMap(raw.stats))) {
      this._stats.set(key, value);
    }
  }
}
