/**
 * @file BallRateRules.js
 * @brief Effective catch rate of a ball (C++: class BallRateRules, static), port of the original
 * ballEffectiveRate() / ballConditionMet():
 *   - Master Ball: always 100 %;
 *   - base rate of the ball (the number of copies owned never changes it, game design decision);
 *   - special balls add their bonus when their condition holds (Timer / Quick: computed bonus);
 *   - capped at 100 %.
 * The species of the wild Pokémon never changes the rate (only the ball counts).
 */
import { ItemDB } from '../../data/items/ItemDB.js';
import { BallConditions } from '../../data/items/BallConditions.js';
import { Weathers } from '../../data/battle/BattleFields.js';
import { LocationKinds } from '../../data/world/LocationKinds.js';
import { BallRules } from '../../config/BallRules.js';
import { BattleRules } from '../../config/BattleRules.js';

/** Conditions that hold or not (bonus = the ball bonus). */
const CONDITION_CHECKS = Object.freeze({
  [BallConditions.WATER]: (encounter) => encounter.types.includes('water'),
  [BallConditions.MOON_STONE]: (encounter) => encounter.evolvesWithMoonStone,
  [BallConditions.FAST]: (encounter) => encounter.pokemon.getStats().spe >= BallRules.FAST_SPEED_MIN,
  [BallConditions.RAIN]: (encounter) => encounter.weather === Weathers.RAIN,
  [BallConditions.OWNED]: (encounter) => encounter.owned,
  [BallConditions.LOW_LEVEL]: (encounter) => encounter.pokemon.level <= BallRules.LOW_LEVEL_MAX,
  [BallConditions.DUNGEON]: (encounter) => encounter.locationKind === LocationKinds.DUNGEON,
  [BallConditions.ULTRA_BEAST]: (encounter) => encounter.ultraBeast
});

/** Conditions whose bonus is computed from the battle. */
const COMPUTED_BONUSES = Object.freeze({
  [BallConditions.TIMER]: (encounter) => Math.min(BallRules.TIMER_BONUS_MAX, BallRules.TIMER_BONUS_PER_TURN * encounter.foeTurns),
  [BallConditions.QUICK]: (encounter) =>
    BallRules.QUICK_BONUS.find((tier) => encounter.playerAttacks <= tier.maxAttacks)?.bonus ?? BallRules.QUICK_BONUS_MIN
});

export class BallRateRules {
  /**
   * @param {string} ballId
   * @param {import('./CatchEncounter.js').CatchEncounter} encounter
   * @returns {number} Condition bonus (percent), 0 when the condition does not hold
   */
  static conditionBonus(ballId, encounter) {
    const ball = ItemDB.getInstance().getById(ballId)?.ball;
    if (!ball?.condition) return 0;
    const computed = COMPUTED_BONUSES[ball.condition];
    if (computed) return computed(encounter);
    return CONDITION_CHECKS[ball.condition]?.(encounter) ? ball.bonus : 0;
  }

  /**
   * @param {string} ballId
   * @param {import('./CatchEncounter.js').CatchEncounter} encounter
   * @param {number} ownedCount - Copies of that ball in the bag before the throw
   * @returns {number} Catch rate in percent
   */
  static effectiveRate(ballId, encounter) {
    const ball = ItemDB.getInstance().getById(ballId)?.ball;
    if (!ball) return BattleRules.DEFAULT_BALL_RATE;
    if (ballId === BallRules.MASTER_BALL) return BallRules.MAX_RATE;
    const rate = ball.rate + BallRateRules.conditionBonus(ballId, encounter);
    return Math.min(BallRules.MAX_RATE, rate);
  }
}
