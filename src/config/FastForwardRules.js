/**
 * @file FastForwardRules.js
 * @brief Limits of the AFK catch-up: it only replays the activities the player launched.
 */

export const FastForwardRules = Object.freeze({
  /** Below this absence, nothing is simulated (a tab switch is not an absence). */
  MIN_ELAPSED_MS: 4000,
  /** Longest absence that is replayed; beyond it, the rest is ignored. */
  MAX_CATCH_UP_SECONDS: 12 * 3600,
  /** Granularity of the replay, in seconds: the same step the live loop uses at 2 fps. */
  STEP_SECONDS: 0.5,
  /** Hard guard: a replay can never run more steps than this (runaway protection). */
  MAX_STEPS: 120000
});
