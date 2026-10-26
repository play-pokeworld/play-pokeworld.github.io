/**
 * @file AtollData.js
 * @brief Persistent Battle Atoll progress: tokens, streaks, mode wins, factory run, and legend fragments.
 */

import { BaseModel } from '../core/BaseModel.js';

/** @param {*} value @param {number} fallback @returns {number} */
function boundedInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}

export class AtollData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('AtollData', 'Data');
    this.deserialize(data);
  }

  /**
   * Adds battle tokens.
   * @param {number} amount
   */
  addTokens(amount) {
    const add = Math.max(0, Math.floor(Number(amount) || 0));
    this.tokens += add;
  }

  /**
   * Spends battle tokens if balance is sufficient.
   * @param {number} amount
   * @returns {boolean}
   */
  spendTokens(amount) {
    const cost = Math.max(0, Math.floor(Number(amount) || 0));
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  /**
   * Records a mode victory, updating streaks and counter.
   * @param {string} modeKey
   */
  recordWin(modeKey) {
    this.streak += 1;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    const key = String(modeKey || 'tower_c');
    this.winsByMode[key] = (this.winsByMode[key] || 0) + 1;
  }

  /**
   * Resets current streak on defeat or forfeit.
   */
  recordLoss() {
    this.streak = 0;
  }

  /**
   * Adds legend fragments.
   * @param {number} amount
   */
  addFragments(amount) {
    const add = Math.max(0, Math.floor(Number(amount) || 0));
    this.fragments += add;
  }

  /**
   * Spends legend fragments if balance is sufficient.
   * @param {number} amount
   * @returns {boolean}
   */
  spendFragments(amount) {
    const cost = Math.max(0, Math.floor(Number(amount) || 0));
    if (this.fragments < cost) return false;
    this.fragments -= cost;
    return true;
  }

  /**
   * Sets or updates active factory run.
   * @param {Object|null} run
   */
  setFactoryRun(run) {
    if (!run || typeof run !== 'object') {
      this.factoryRun = null;
      return;
    }
    this.factoryRun = {
      modeKey: String(run.modeKey || 'factory_c'),
      seedWindow: boundedInteger(run.seedWindow, 0),
      streak: boundedInteger(run.streak, 0),
      team: Array.isArray(run.team) ? run.team.map((entry) => ({ ...entry })) : []
    };
  }

  /**
   * Abandons current factory run.
   */
  clearFactoryRun() {
    this.factoryRun = null;
  }

  /** @override */
  serialize() {
    return {
      tokens: this.tokens,
      streak: this.streak,
      bestStreak: this.bestStreak,
      winsByMode: { ...this.winsByMode },
      factoryRun: this.factoryRun
        ? {
            modeKey: this.factoryRun.modeKey,
            seedWindow: this.factoryRun.seedWindow,
            streak: this.factoryRun.streak,
            team: Array.isArray(this.factoryRun.team) ? this.factoryRun.team.map((p) => ({ ...p })) : []
          }
        : null,
      fragments: this.fragments,
      pendingFragmentLegendary: this.pendingFragmentLegendary
    };
  }

  /** @override */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this.tokens = boundedInteger(raw.tokens, 0);
    this.streak = boundedInteger(raw.streak, 0);
    this.bestStreak = boundedInteger(raw.bestStreak, 0);

    this.winsByMode = {};
    if (raw.winsByMode && typeof raw.winsByMode === 'object' && !Array.isArray(raw.winsByMode)) {
      for (const [key, val] of Object.entries(raw.winsByMode)) {
        const count = boundedInteger(val, 0);
        if (count > 0) this.winsByMode[key] = count;
      }
    }

    if (raw.factoryRun && typeof raw.factoryRun === 'object') {
      this.factoryRun = {
        modeKey: String(raw.factoryRun.modeKey || 'factory_c'),
        seedWindow: boundedInteger(raw.factoryRun.seedWindow, 0),
        streak: boundedInteger(raw.factoryRun.streak, 0),
        team: Array.isArray(raw.factoryRun.team) ? raw.factoryRun.team.map((entry) => ({ ...entry })) : []
      };
    } else {
      this.factoryRun = null;
    }

    this.fragments = boundedInteger(raw.fragments, 0);
    this.pendingFragmentLegendary = boundedInteger(raw.pendingFragmentLegendary, 0);
  }
}
