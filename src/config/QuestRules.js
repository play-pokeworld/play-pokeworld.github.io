/**
 * @file QuestRules.js
 * @brief Numeric rules of the quests, ported from the original quest-core.js (C++: namespace QuestRules).
 */
export const QuestRules = Object.freeze({
  /** Base repeatable quests active at the same time; upgrades add up to four more slots. */
  REPEATABLE_SLOTS: 1,
  /** Number of persisted repeatable contracts shown on the board at once. */
  REPEATABLE_OFFER_COUNT: 3,
  /** Free board reroll delay, matching the original ten-minute cooldown. */
  REPEATABLE_REROLL_MS: 10 * 60 * 1000,
  /** Pokédollar cost of each additional repeatable slot, in upgrade order. */
  REPEATABLE_SLOT_UPGRADE_COSTS: Object.freeze([75000, 200000, 500000, 1200000]),
  /** Maximum active slots after all upgrades. */
  REPEATABLE_MAX_SLOTS: 5,
  /** Original location and stable identity of the repeatable-board unlock NPC. */
  REPEATABLE_UNLOCK_LOCATION: 'cerulean',
  REPEATABLE_UNLOCK_NPC_ID: 'swimmer-ondee',
  /** Catch-rate multiplier of a quest reward encounter (original LEGENDARY_QUEST_CATCH_MULT, capped at 100%). */
  ENCOUNTER_CATCH_MULT: 2,
  /** Currency paid by quest rewards (original P0 economy: quest points). */
  REWARD_CURRENCY: 'questPoint'
});
