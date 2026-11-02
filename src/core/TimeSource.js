/**
 * @file TimeSource.js
 * @brief Single clock used by the schedulers that must be able to fast-forward (AFK catch-up).
 *
 * A live game reads the real time. During a catch-up, `FastForwardSystem` shifts the offset so that a
 * system scheduling its next step (`RelaunchSystem`, `DungeonAutoSystem`) behaves exactly as it would
 * have while the player was away: it steps, waits, steps again. Nothing else in the game reads this
 * clock, so the shift can never leak into wall-clock data such as the mine energy timestamp.
 */

export class TimeSource {
  /** @type {number} Milliseconds added to the wall clock. */
  static _offsetMs = 0;

  /** @returns {number} Current (possibly shifted) timestamp in ms. */
  static now() {
    return Date.now() + TimeSource._offsetMs;
  }

  /** @returns {number} Current shift in ms. */
  static get offsetMs() {
    return TimeSource._offsetMs;
  }

  /**
   * Places the simulated clock at an absolute shift (negative = in the past).
   * @param {number} ms
   */
  static setOffset(ms) {
    const value = Number(ms);
    TimeSource._offsetMs = Number.isFinite(value) ? value : 0;
  }

  /**
   * Moves the simulated clock forward without touching the wall clock.
   * @param {number} ms
   */
  static advance(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value <= 0) return;
    TimeSource._offsetMs += value;
  }

  /** Cancels any shift; always called when a catch-up ends, even on failure. */
  static reset() {
    TimeSource._offsetMs = 0;
  }
}
