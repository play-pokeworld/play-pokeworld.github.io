/**
 * PokeWorld Domain — Quest Rules
 *
 * Pure business rules for quest progression, validation, and rewards.
 * Zero DOM access.
 *
 * @module domain/quests/quest-rules
 */

/**
 * Check whether a quest requirement is satisfied by current progress.
 * @param {number} currentProgress
 * @param {number} targetProgress
 * @returns {boolean}
 */
export function isQuestComplete(currentProgress, targetProgress) {
  return (Number(currentProgress) || 0) >= (Number(targetProgress) || 1);
}

/**
 * Calculate progress increment for a quest action.
 * @param {string} actionType - 'defeat_wild' | 'catch' | 'mine_sell' | 'badge' | 'league'
 * @param {string} targetActionType - Required action type for quest
 * @param {number} amount - Incremented amount
 * @returns {number}
 */
export function calculateProgressIncrement(actionType, targetActionType, amount = 1) {
  if (actionType !== targetActionType) return 0;
  return Math.max(0, Number(amount) || 0);
}

/**
 * Calculate reward payouts (money, tokens, items) for a quest completion.
 * @param {Object} questDef - Definition object containing reward structure
 * @returns {Object} { money: number, tokens: number, items: Array }
 */
export function calculateQuestRewards(questDef = {}) {
  const rewards = questDef.rewards || {};
  return {
    money: Math.max(0, Number(rewards.money) || 0),
    tokens: Math.max(0, Number(rewards.tokens) || 0),
    items: Array.isArray(rewards.items) ? [...rewards.items] : [],
  };
}

