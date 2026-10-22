/**
 * @file ItemUseRules.js
 * @brief Item-use action ids and outcomes for the Rework inventory system.
 */
export const ItemUseActions = Object.freeze({
  UNLOCK_MOVE: 'unlock_move',
  EVOLVE: 'evolve',
  RARE_CANDY: 'rare_candy',
  VITAMIN: 'vitamin'
});

export const ItemUseResults = Object.freeze({
  SUCCESS: 'success',
  NO_SAVE: 'no_save',
  NOT_OWNED: 'not_owned',
  UNSUPPORTED: 'unsupported',
  TARGET_MISSING: 'target_missing',
  TARGET_INELIGIBLE: 'target_ineligible',
  BATTLE_ACTIVE: 'battle_active'
});

export const ItemUseRules = Object.freeze({
  RARE_CANDY_ID: 'rarecandy',
  VITAMIN_CATEGORY: 'vitamin',
  TIME_CANDY_CATEGORY: 'time_candy',
  LINK_STONE_ID: 'link_stone'
});

export const MoveLearningResults = Object.freeze({
  SUCCESS: 'success',
  NO_SAVE: 'no_save',
  TARGET_MISSING: 'target_missing',
  MOVE_UNKNOWN: 'move_unknown',
  MOVE_NOT_AVAILABLE: 'move_not_available',
  BATTLE_ACTIVE: 'battle_active',
  POKEMON_IN_USE: 'pokemon_in_use',
  REPLACEMENT_REQUIRED: 'replacement_required',
  INVALID_SLOT: 'invalid_slot'
});
