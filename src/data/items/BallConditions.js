/**
 * @file BallConditions.js
 * @brief Conditions of the special balls (C++: enum class BallCondition), original BALL_DEFS
 * `condition` vocabulary. Evaluated by systems/catch/BallRateRules.js.
 */
export const BallConditions = Object.freeze({
  /** The wild Pokémon has the water type (Lure Ball). */
  WATER: 'water',
  /** The species evolves with a Moon Stone (Moon Ball). */
  MOON_STONE: 'moonstone',
  /** Speed stat of the wild Pokémon ≥ 100 (Fast Ball). */
  FAST: 'fast',
  /** Rain on the battlefield (Dive Ball). */
  RAIN: 'rain',
  /** Species already owned (Repeat Ball). */
  OWNED: 'owned',
  /** Wild Pokémon level ≤ 25 (Nest Ball). */
  LOW_LEVEL: 'lowlevel',
  /** The battle takes place in a dungeon (Dusk Ball). */
  DUNGEON: 'dungeon',
  /** Bonus grows with the turns the wild Pokémon played (Timer Ball). */
  TIMER: 'timer',
  /** Bonus shrinks with the attacks needed for the K.O. (Quick Ball). */
  QUICK: 'quick',
  /** Ultra Beast (Beast Ball): no species of the game has that flag. */
  ULTRA_BEAST: 'ultra'
});
