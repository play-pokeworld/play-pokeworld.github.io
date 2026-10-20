/**
 * @file TrainingRules.js
 * @brief Rules for the automatic six-opponent training session.
 */
export const TrainingRules = Object.freeze({
  LOCATION_ID: 'vermilion',
  REQUIRED_BADGE_ID: 'surge',
  OPPONENT_COUNT: 6,
  MOVE_MODE_LEVEL_OFFSET: -2,
  MIN_OPPONENT_LEVEL: 3,
  LEVEL_VARIATION: Object.freeze([-1, 0, 1]),
  TICK_SECONDS: 0.1,
  MAX_SIMULATION_TICKS: 6000,
  MODE_ID: 'move'
});
