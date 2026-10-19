/**
 * @file BallRules.js
 * @brief Numbers of the Poké Ball system, ported from the original pokeballs.js
 * (C++: namespace BallRules).
 */
export const BallRules = Object.freeze({
  /** Ball value of a filter that throws nothing (original 'none'). */
  NO_BALL: 'none',
  /** Balls of a brand new save (original ensurePokeballs: 10 Poké Balls). */
  STARTING_BALLS: Object.freeze({ pokeball: 10 }),
  /** Always 100 %, whatever the condition. */
  MASTER_BALL: 'masterball',
  /** The caught Pokémon starts at CaptureRules.LUXURY_CAUGHT_LEVEL. */
  LUXURY_BALL: 'luxuryball',
  /** Highest catch rate (percent). */
  MAX_RATE: 100,
  /** Fast Ball: speed stat threshold. */
  FAST_SPEED_MIN: 100,
  /** Nest Ball: highest level. */
  LOW_LEVEL_MAX: 25,
  /** Timer Ball: bonus = min(TIMER_BONUS_MAX, TIMER_BONUS_PER_TURN × turns of the wild Pokémon). */
  TIMER_BONUS_PER_TURN: 2,
  TIMER_BONUS_MAX: 25,
  /** Quick Ball: bonus by number of player attacks, first matching `maxAttacks` wins. */
  QUICK_BONUS: Object.freeze([
    Object.freeze({ maxAttacks: 1, bonus: 30 }),
    Object.freeze({ maxAttacks: 2, bonus: 25 }),
    Object.freeze({ maxAttacks: 3, bonus: 20 }),
    Object.freeze({ maxAttacks: 5, bonus: 15 }),
    Object.freeze({ maxAttacks: 8, bonus: 10 })
  ]),
  QUICK_BONUS_MIN: 5,
  /** New custom filter (original createBallFilter): added first, "not caught", Poké Ball. */
  CUSTOM_FILTER_ID_PREFIX: 'custom_',
  CUSTOM_FILTER_OPTIONS: Object.freeze({ caught: false }),
  CUSTOM_FILTER_BALL: 'pokeball',
  /** Value given to a value option when the player adds it (type normal / route). */
  DEFAULT_TYPE_OPTION: 'normal',
  DEFAULT_ENCOUNTER_OPTION: 'route'
});
