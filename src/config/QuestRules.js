/**
 * @file QuestRules.js
 * @brief Numeric rules of the quests, ported from the original quest-core.js (C++: namespace QuestRules).
 */
export const QuestRules = Object.freeze({
  /** Repeatable quests active at the same time (original maxRepeatables = 1 + slot upgrades). */
  REPEATABLE_SLOTS: 1,
  /** Catch-rate multiplier of a quest reward encounter (original LEGENDARY_QUEST_CATCH_MULT, capped at 100%). */
  ENCOUNTER_CATCH_MULT: 2,
  /** Currency paid by quest rewards (original P0 economy: quest points). */
  REWARD_CURRENCY: 'questPoint'
});
