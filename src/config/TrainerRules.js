/**
 * @file TrainerRules.js
 * @brief Rewards and locks of the trainer battles, ported from the original battle-switch.js /
 * quest-core.js (C++: namespace TrainerRules).
 */
export const TrainerRules = Object.freeze({
  /** Gym / league win experience: sum(xpYield x level) of the foes / living members / EXP_DIVISOR. */
  EXP_DIVISOR: 2,
  /** xpYield used when a species has none (original `p.xpYield || 100`). */
  EXP_DEFAULT_YIELD: 100,
  /**
   * Quest points paid for a quest trainer (original pqForMoney): first step whose money threshold
   * the trainer reward reaches.
   */
  QUEST_POINT_STEPS: Object.freeze([
    Object.freeze({ money: 27000, questPoints: 2500 }),
    Object.freeze({ money: 21000, questPoints: 1000 }),
    Object.freeze({ money: 16000, questPoints: 500 }),
    Object.freeze({ money: 9000, questPoints: 250 }),
    Object.freeze({ money: 0, questPoints: 100 })
  ]),
  /** Currency credited by quest trainers. */
  QUEST_POINT_CURRENCY: 'questPoint',
  /** Currency credited by gyms and leagues. */
  MONEY_CURRENCY: 'money'
});
