/**
 * @file TrainingRules.js
 * @brief Rules of the training centre: the sparring waves of a session, their level curve, the
 * reward cadence and the facility economics.
 *
 * The sparring waves follow the balance plan (docs/PLAN_EQUILIBRAGE_GLOBAL.md, training section:
 * 30 sparring waves calibrated on the class and the base stat total of the trainee, with levels
 * between 60 % and 120 % of it). The opponents are drawn from the rank of the trainee
 * (PokemonRankRules), never from the original fixed six-species list.
 */
export const TrainingRules = Object.freeze({
  LOCATION_ID: 'vermilion',
  REQUIRED_BADGE_ID: 'surge',
  /** Sparring waves of one session (plan: 30 waves). */
  OPPONENT_COUNT: 30,
  /** A session always keeps at least this many waves, staff included. */
  MIN_STAFF_OPPONENT_COUNT: 6,
  /** Waves removed by the best training staff member (30 waves at level 1 → 24 at max level). */
  MAX_STAFF_OPPONENT_REDUCTION: 6,
  /** One reward every REWARD_INTERVAL_WAVES waves defeated: same rate per battle as the original
   *  six-opponent session (1 reward for 6 waves), 5 rewards for a complete 30-wave session. */
  REWARD_INTERVAL_WAVES: 6,
  /** Level of the waves compared to the trainee: the first wave is easier, the last one harder. */
  WAVE_LEVEL_FACTOR_MIN: 0.6,
  WAVE_LEVEL_FACTOR_MAX: 1.2,
  /** Level shift of each mode, applied to the trainee level before the wave factor. */
  MODE_LEVEL_OFFSETS: Object.freeze({ move: -2, talent: -1, hidden: -1, level: 2, ev: 0 }),
  MIN_OPPONENT_LEVEL: 3,
  LEVEL_VARIATION: Object.freeze([-1, 0, 1]),
  TICK_SECONDS: 0.1,
  /** Hard cap of one session: 30 minutes of real battle time (30 waves). */
  MAX_SIMULATION_TICKS: 18000,
  MODE_ID: 'move',
  DEFAULT_SLOT_COUNT: 1,
  MAX_SLOT_COUNT: 2,
  SECOND_SLOT_COST: 2500,
  AUTOMATION_COST: 1000,
  AUTOMATION_FEE: 500,
  LEVEL_GAIN_MIN: 2,
  LEVEL_GAIN_MAX: 5,
  EV_GAIN: 1,
  TALENT_RARITY_WEIGHTS: Object.freeze({ 1: 60, 2: 30, 3: 12 }),
  MODES: Object.freeze(['move', 'talent', 'level', 'ev', 'hidden']),
  MODE_BADGES: Object.freeze({ level: 'blaine', ev: 'giovanni' }),
  LEAGUE_GATED_MODES: Object.freeze(['talent', 'hidden']),
  AUTOMATION_OPTIONS: Object.freeze(['move', 'talent', 'level', 'ev', 'hidden']),
  LEAGUE_REGION_IDS: Object.freeze(['kanto', 'johto'])
});
