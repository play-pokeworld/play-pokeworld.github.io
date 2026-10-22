/**
 * @file NpcDialogueRules.js
 * @brief Stable content gates for localized NPC dialogue.
 */

/**
 * NPC ids and zero-based localized line positions whose copy promotes the repeatable board.
 * Keep FR and EN dialogue arrays aligned; these lines are hidden until the board is unlocked.
 */
export const REPEATABLE_BOARD_HELP_LINES = Object.freeze({
  'swimmer-ondee': Object.freeze([0, 1]),
  'npc_ecruteak_1': Object.freeze([1]),
  'kanto_indigo_npc_01': Object.freeze([1]),
  'npc_olivine_2': Object.freeze([1]),
  'npc_olivine_3': Object.freeze([0, 1]),
  'kanto_saffron_npc_01': Object.freeze([1])
});
