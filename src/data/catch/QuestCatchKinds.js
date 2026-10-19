/**
 * @file QuestCatchKinds.js
 * @brief How a quest changes the catch rate of its final encounter (C++: enum class QuestCatchKind).
 */
export const QuestCatchKinds = Object.freeze({
  /** Wild battle. */
  NONE: 'none',
  /** Final encounter of a side (legendary) quest: rate × QuestRules.ENCOUNTER_CATCH_MULT. */
  LEGENDARY: 'legendary',
  /** Pokémon given by a main quest: rate 100 (original battle.questGift). */
  GIFT: 'gift'
});
