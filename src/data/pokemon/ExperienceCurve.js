/**
 * @file ExperienceCurve.js
 * @brief Experience rules of the original game (C++: class ExperienceCurve, static).
 * Experience is stored as a running total: level L starts at floor(L^3 * 0.8) points
 * (original xpForLevel) and the next level is reached at levelStart(L + 1).
 */
import { PokemonRules } from '../../config/PokemonRules.js';

export class ExperienceCurve {
  /**
   * @param {number} level
   * @returns {number} Total experience at which `level` starts
   */
  static levelStart(level) {
    return Math.floor(Math.pow(level, 3) * PokemonRules.EXP_CURVE_FACTOR);
  }

  /**
   * @param {number} totalExp
   * @returns {number} Level reached with that total (capped at MAX_LEVEL)
   */
  static levelFor(totalExp) {
    let level = PokemonRules.MIN_LEVEL;
    while (level < PokemonRules.MAX_LEVEL && totalExp >= ExperienceCurve.levelStart(level + 1)) level++;
    return level;
  }

  /**
   * Base experience given by a defeated Pokémon (original gainXP `base`).
   * @param {number} xpYield - Species experience yield
   * @param {number} level - Level of the defeated Pokémon
   * @returns {number}
   */
  static baseYield(xpYield, level) {
    return Math.floor((xpYield * level) / PokemonRules.EXP_YIELD_DIVISOR);
  }

  /**
   * Share of one living team member (original gainXP + calculateScaledXp, before held items).
   * @param {number} baseYield - ExperienceCurve.baseYield()
   * @param {number} memberLevel
   * @param {number} foeLevel
   * @param {number} [multiplier=1] - Secret base / achievement bonuses
   * @returns {number}
   */
  static shareFor(baseYield, memberLevel, foeLevel, multiplier = 1) {
    const share = Math.max(1, Math.floor(baseYield * PokemonRules.EXP_SHARE_RATIO * multiplier));
    const gap = memberLevel - foeLevel;
    if (gap >= PokemonRules.EXP_LEVEL_GAP_CAP) return 0;
    let factor = 1;
    if (gap > 0) factor = (PokemonRules.EXP_LEVEL_GAP_CAP - gap) / PokemonRules.EXP_LEVEL_GAP_CAP;
    else if (gap < 0) factor = 1 + Math.abs(gap) * PokemonRules.EXP_UNDERDOG_BONUS;
    return Math.max(0, Math.floor(share * factor));
  }
}
