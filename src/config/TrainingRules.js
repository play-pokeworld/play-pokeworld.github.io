/**
 * @file TrainingRules.js
 * @brief Rules for the automatic six-opponent training session.
 */
export const TrainingRules = Object.freeze({
  LOCATION_ID: 'vermilion',
  REQUIRED_BADGE_ID: 'surge',
  OPPONENT_COUNT: 6,
  MOVE_MODE_LEVEL_OFFSET: -2,
  MODE_LEVEL_OFFSETS: Object.freeze({ move: -2, talent: -1, hidden: -1, level: 2, ev: 0 }),
  MIN_STAFF_OPPONENT_COUNT: 3,
  MAX_STAFF_OPPONENT_REDUCTION: 3,
  MIN_OPPONENT_LEVEL: 3,
  LEVEL_VARIATION: Object.freeze([-1, 0, 1]),
  TICK_SECONDS: 0.1,
  MAX_SIMULATION_TICKS: 6000,
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
