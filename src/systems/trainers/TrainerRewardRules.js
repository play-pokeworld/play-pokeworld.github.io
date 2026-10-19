/**
 * @file TrainerRewardRules.js
 * @brief Experience and quest points of the trainer battles (pure functions).
 */
import { TrainerRules } from '../../config/TrainerRules.js';

export class TrainerRewardRules {
  /**
   * Original champion win: floor(sum(xpYield x level) / living members / 2), same share for all.
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData[]} foes - Every foe of the battle
   * @param {number} livingMembers
   * @returns {number}
   */
  static expShare(foes, livingMembers) {
    const total = foes.reduce((sum, foe) => sum + (foe.getSpecies()?.xpYield || TrainerRules.EXP_DEFAULT_YIELD) * foe.level, 0);
    return Math.floor(total / Math.max(1, livingMembers) / TrainerRules.EXP_DIVISOR);
  }

  /**
   * Original pqForMoney().
   * @param {number} money - Trainer reward
   * @returns {number}
   */
  static questPoints(money) {
    return TrainerRules.QUEST_POINT_STEPS.find((step) => money >= step.money)?.questPoints ?? 0;
  }
}
