/**
 * @file MoveConfig.js
 * @brief Rules of the level-up move pools, as in the original (game-helpers.js getSpeciesMovePool)
 * (C++: namespace MoveConfig).
 */

export const MoveConfig = Object.freeze({
  /** Size of the level-up pool of a species (best moves first). */
  POOL_SIZE: 15,
  /** One more move every LEVEL_STEP levels (1 move at level 1-7, 2 at 8-14…). */
  LEVEL_STEP: 7,
  /** Moves a Pokémon can use in battle. */
  ACTIVE_SLOTS: 4,
  /** Move of a Pokémon whose pool is empty. */
  FALLBACK_MOVE_ID: 'tackle',
  /** learnTypes value meaning "every Pokémon can draw this move". */
  ANY_TYPE: 'all'
});
