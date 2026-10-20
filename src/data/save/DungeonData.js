/**
 * @file DungeonData.js
 * @brief Persistent counters, active dungeon expedition and last-run summary.
 */
import { BaseModel } from '../core/BaseModel.js';
import { DungeonRunData } from './DungeonRunData.js';

/** @param {*} value @param {number} fallback @returns {number} */
function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

/** @param {*} value @returns {Object} */
function copyCounters(value) {
  const result = {};
  for (const [key, amount] of Object.entries(value && typeof value === 'object' ? value : {})) {
    const quantity = nonNegative(amount);
    if (quantity > 0) result[key] = quantity;
  }
  return result;
}

export class DungeonData extends BaseModel {
  /** @param {Object} [data] */
  constructor(data = {}) {
    super('DungeonData', 'Data');
    this.deserialize(data);
  }

  /** @param {string} locationId @returns {number} */
  clearCount(locationId) {
    return this.clears[locationId] || 0;
  }

  /** @param {string} locationId */
  recordClear(locationId) {
    if (locationId) this.clears[locationId] = (this.clears[locationId] || 0) + 1;
  }

  /** @param {Object|null} run */
  setRun(run) {
    this.run = run ? (run instanceof DungeonRunData ? run : new DungeonRunData(run)) : null;
  }

  /** @override @returns {Object} */
  serialize() {
    return {
      exploredTotal: this.exploredTotal,
      clears: { ...this.clears },
      run: this.run?.serialize() ?? null,
      lastRun: this.lastRun ? { ...this.lastRun } : null
    };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this.exploredTotal = nonNegative(raw.exploredTotal ?? raw.dungeonsExplored);
    this.clears = copyCounters(raw.clears ?? raw.dungeonClears);
    const rawRun = raw.run ?? raw.dungeonRun;
    this.run = rawRun && typeof rawRun === 'object' ? new DungeonRunData(rawRun) : null;
    if (this.run && !this.run.active) this.run = null;
    this.lastRun = raw.lastRun && typeof raw.lastRun === 'object' ? { ...raw.lastRun } : null;
  }
}
