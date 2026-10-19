/**
 * @file PokemonRules.js
 * @brief Numeric rules of owned / wild Pokémon, ported from the original game
 * (game-helpers.js calcStat / xpForLevel, pokemon-factory.js, progression.js) (C++: namespace PokemonRules).
 */
export const PokemonRules = Object.freeze({
  /** Stat keys, in the order of the generated `stats` arrays. */
  STAT_KEYS: Object.freeze(['hp', 'atk', 'def', 'spa', 'spd', 'spe']),
  MIN_LEVEL: 1,
  MAX_LEVEL: 100,
  /** Stats of a shiny Pokémon are multiplied by this factor (original SHINY_BONUS_PCT 20). */
  SHINY_STAT_MULT: 1.2,
  /** Each IV / EV star adds this ratio to the stat (original IV_STEP_PCT / EV_STEP_PCT 5). */
  STAR_STEP: 0.05,
  /** Highest IV of one stat (game design decision: 6 per stat). */
  IV_MAX: 6,
  /** Highest EV of one stat and of all stats together. */
  EV_MAX: 18,
  EV_TOTAL_MAX: 36,
  /** Experience curve: total experience of level L = floor(L^3 * EXP_CURVE_FACTOR). */
  EXP_CURVE_FACTOR: 0.8,
  /** Base experience of a defeated Pokémon = floor(xpYield * level / EXP_YIELD_DIVISOR). */
  EXP_YIELD_DIVISOR: 7,
  /** Share of the base experience given to each living team member. */
  EXP_SHARE_RATIO: 0.7,
  /** A team member EXP_LEVEL_GAP_CAP levels above the foe earns nothing. */
  EXP_LEVEL_GAP_CAP: 10,
  /** Bonus per level when the team member is below the foe. */
  EXP_UNDERDOG_BONUS: 0.15,
  /** Talent rarity roll of a new Pokémon (percent): common / rare / very rare. */
  TALENT_ROLL: Object.freeze({ 1: 60, 2: 30, 3: 10 })
});
