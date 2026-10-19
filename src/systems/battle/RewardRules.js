/**
 * @file RewardRules.js
 * @brief Experience and money of a wild victory (C++: class RewardRules), port of the original
 * gainXP / calculateScaledXp and currency.js moneyPerKill / locationRank.
 *
 *   base  = floor(xpYield × foeLevel / 7); share = max(1, floor(base × 0.7))
 *   each living member: level gap ≥ 10 → 0, above → ×(10 − gap)/10, below → ×(1 + |gap| × 0.15),
 *   floored; Lucky Egg ×1.5.
 *   money = max(10, round(3d + 5d^1.15)), d = regionIndex × 9 + clamp(badgesRequired, 0, 8) + 1.
 *   dungeon tokens per catch = max(1, round(6 × (2d / (2.8 / (1 + regionIndex / 3)))^1.08)).
 * Achievement and secret-base multipliers of the original are not applied yet.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { CaptureRules } from '../../config/CaptureRules.js';
import { REGIONS } from '../../config/Regions.js';

export class RewardRules {
  /**
   * @param {number} memberLevel
   * @param {number} foeLevel
   * @param {number} baseShare
   * @returns {number}
   */
  static scaledExp(memberLevel, foeLevel, baseShare) {
    const gap = memberLevel - foeLevel;
    if (gap >= BattleRules.EXP_LEVEL_GAP_CAP) return 0;
    let factor = 1;
    if (gap > 0) factor = (BattleRules.EXP_LEVEL_GAP_CAP - gap) / BattleRules.EXP_LEVEL_GAP_CAP;
    else if (gap < 0) factor = 1 + Math.abs(gap) * BattleRules.EXP_UNDERDOG_BONUS;
    return Math.max(0, Math.floor(baseShare * factor));
  }

  /**
   * @param {{xpYield: number}} foeSpecies
   * @param {number} foeLevel
   * @returns {number} Share of every living member before level scaling
   */
  static baseShare(foeSpecies, foeLevel) {
    const base = Math.floor(((foeSpecies?.xpYield ?? 0) * foeLevel) / BattleRules.EXP_YIELD_DIVISOR);
    return Math.max(1, Math.floor(base * BattleRules.EXP_SHARE));
  }

  /**
   * @param {number} baseShare
   * @param {number} memberLevel
   * @param {number} foeLevel
   * @param {boolean} luckyEgg
   * @returns {number}
   */
  static memberExp(baseShare, memberLevel, foeLevel, luckyEgg) {
    const share = RewardRules.scaledExp(memberLevel, foeLevel, baseShare);
    return luckyEgg ? Math.floor(share * BattleRules.LUCKY_EGG_MULT) : share;
  }

  /**
   * @param {{region: string, badgesRequired: number}|null} location
   * @returns {number}
   */
  static wildMoney(location) {
    const rank = RewardRules.locationRank(location);
    return Math.max(BattleRules.MONEY_MIN, Math.round(BattleRules.MONEY_LINEAR * rank + BattleRules.MONEY_POWER_FACTOR * Math.pow(rank, BattleRules.MONEY_EXPONENT)));
  }

  /**
   * @param {{region: string}|null} location
   * @returns {number} Index of the location region (0 = Kanto)
   */
  static regionIndex(location) {
    return Math.max(0, REGIONS.findIndex((region) => region.id === location?.region));
  }

  /**
   * Original locationRank: 9 × region + clamp(badgesRequired, 0, 8) + 1.
   * @param {{region: string, badgesRequired: number}|null} location
   * @returns {number}
   */
  static locationRank(location) {
    const badges = Math.max(0, Math.min(BattleRules.MONEY_MAX_BADGES, location?.badgesRequired ?? 0));
    return RewardRules.regionIndex(location) * BattleRules.MONEY_REGION_STEP + badges + 1;
  }

  /**
   * @param {{region: string, badgesRequired: number}|null} location
   * @returns {number} Dungeon tokens of one catch
   */
  static catchTokens(location) {
    const rank = RewardRules.locationRank(location);
    const divisor = CaptureRules.TOKENS_DIVISOR / (1 + RewardRules.regionIndex(location) / CaptureRules.TOKENS_REGION_DIVISOR);
    const tokens = CaptureRules.TOKENS_BASE * Math.pow((CaptureRules.TOKENS_RANK_FACTOR * rank) / divisor, CaptureRules.TOKENS_EXPONENT);
    return Math.max(CaptureRules.TOKENS_MIN, Math.round(tokens));
  }
}
