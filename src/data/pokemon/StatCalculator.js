/**
 * @file StatCalculator.js
 * @brief Stats of a Pokémon from its base stats (C++: class StatCalculator, static).
 * Port of the original calcStat:
 *   HP    = floor(2 * base * level / 100) + level + 10
 *   other = floor(2 * base * level / 100) + 5
 *   shiny: floor(value * 1.2); then floor(value * (1 + iv * 0.05 + ev * 0.05)).
 */
import { PokemonRules } from '../../config/PokemonRules.js';

export class StatCalculator {
  /**
   * @param {number} base
   * @param {number} level
   * @param {Object} [options]
   * @param {boolean} [options.isHp=false]
   * @param {boolean} [options.shiny=false]
   * @param {number} [options.iv=0]
   * @param {number} [options.ev=0]
   * @returns {number}
   */
  static stat(base, level, { isHp = false, shiny = false, iv = 0, ev = 0 } = {}) {
    const scaled = Math.floor((2 * base * level) / 100);
    let value = isHp ? scaled + level + 10 : scaled + 5;
    if (shiny) value = Math.floor(value * PokemonRules.SHINY_STAT_MULT);
    return Math.floor(value * (1 + (iv || 0) * PokemonRules.STAR_STEP + (ev || 0) * PokemonRules.STAR_STEP));
  }

  /**
   * @param {Readonly<Record<string, number>>} baseStats
   * @param {number} level
   * @param {Object} [options]
   * @param {boolean} [options.shiny=false]
   * @param {Record<string, number>} [options.ivs]
   * @param {Record<string, number>} [options.evs]
   * @returns {Readonly<Record<string, number>>} Every stat of PokemonRules.STAT_KEYS
   */
  static all(baseStats, level, { shiny = false, ivs = {}, evs = {} } = {}) {
    const stats = {};
    for (const key of PokemonRules.STAT_KEYS) {
      stats[key] = StatCalculator.stat(baseStats[key] || 0, level, { isHp: key === 'hp', shiny, iv: ivs[key], ev: evs[key] });
    }
    return Object.freeze(stats);
  }

  /**
   * @returns {Record<string, number>} A zero value for every stat (fresh IVs / EVs)
   */
  static zeroSpread() {
    const spread = {};
    for (const key of PokemonRules.STAT_KEYS) spread[key] = 0;
    return spread;
  }

  /**
   * Clamps an IV / EV spread to the rules (unknown keys dropped).
   * @param {Object} raw
   * @param {number} max - Highest value of one stat
   * @param {number} [totalMax=Infinity] - Highest sum
   * @returns {Record<string, number>}
   */
  static clampSpread(raw, max, totalMax = Infinity) {
    const spread = StatCalculator.zeroSpread();
    let total = 0;
    for (const key of PokemonRules.STAT_KEYS) {
      const value = Math.max(0, Math.min(max, Math.floor(Number(raw?.[key]) || 0), totalMax - total));
      spread[key] = value;
      total += value;
    }
    return spread;
  }
}
