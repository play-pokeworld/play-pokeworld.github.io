/**
 * @file QuestCategories.js
 * @brief Quest families (C++: enum class QuestCategory).
 *  - MAIN: the story chain of a region, one active quest at a time, in table order;
 *  - SIDE: accepted by the player, done once (legendary chains are side quests);
 *  - REPEATABLE: accepted in a limited number of slots, can be done again after the claim.
 */
export const QuestCategories = Object.freeze({
  MAIN: 'main',
  SIDE: 'side',
  REPEATABLE: 'repeatable'
});
