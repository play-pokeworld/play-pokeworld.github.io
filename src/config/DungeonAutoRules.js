/** @file DungeonAutoRules.js @brief Original three pilot modes and live step pacing. */
export const DungeonAutoRules = Object.freeze({
  MODES: Object.freeze(['farm', 'boss', 'chest']),
  DEFAULT_MODE: 'farm',
  START_DELAY_MS: 400,
  STEP_DELAY_MS: 350,
  CHEST_DELAY_MS: 450,
  FIGHT_AVOIDANCE_COST: 4,
  DIRECTIONS: Object.freeze([
    Object.freeze([1, 0]),
    Object.freeze([-1, 0]),
    Object.freeze([0, -1]),
    Object.freeze([0, 1]),
  ]),
  FIGHT_TYPES: Object.freeze(['combat', 'elite']),
  ENCOUNTER_TYPES: Object.freeze(['combat', 'elite', 'boss']),
});
