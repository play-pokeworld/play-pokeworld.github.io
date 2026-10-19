/**
 * @file AccuracyRules.js
 * @brief Hit roll of a move (C++: class AccuracyRules), port of the original executeAttack
 * accuracy block: accuracy (0 = 100), minus ACCURACY_DOWN_STEP per accuracy_down stack of the
 * attacker (floor ACCURACY_FLOOR, stacks consumed), minus evasion talents of the defender;
 * never_miss talents on either side and neverMiss moves always hit.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';

export class AccuracyRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} attacker
   * @param {import('./BattleCombatant.js').BattleCombatant} defender
   * @param {Readonly<Object>} move
   * @param {import('../../core/Random.js').Random} random
   * @returns {boolean} true when the move hits
   */
  static rollHit(attacker, defender, move, random) {
    let accuracy = move.accuracy || 100;
    if (attacker.accuracyPenalty > 0) {
      accuracy = Math.max(BattleRules.ACCURACY_FLOOR, accuracy - BattleRules.ACCURACY_DOWN_STEP * attacker.accuracyPenalty);
      attacker.accuracyPenalty = 0;
    }
    if (move.neverMiss) return true;
    if (attacker.hasTalentEffect(TalentEffectKinds.NEVER_MISS) || defender.hasTalentEffect(TalentEffectKinds.NEVER_MISS)) return true;
    for (const effect of defender.talentEffects(TalentEffectKinds.EVASION)) accuracy -= effect.add;
    return random.chance(accuracy);
  }
}
