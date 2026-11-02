/**
 * @file DebugTimeScale.js
 * @brief Single owner of the debug time multiplier shared by the live simulations.
 *
 * The debug button "speed x10" used to live inside BattleSystem, so it only scaled the wild and
 * trainer battle loop: a training session, which has its own loop in TrainingSystem, kept running
 * at 1x. The multiplier is a debug setting, not a battle rule, so it now lives here and every live
 * simulation reads it (battle, training).
 *
 * Not persisted and never applied to the offline replay (FastForwardSystem): an absence must always
 * be replayed in real seconds, otherwise the recap would claim activity that never happened.
 */

export class DebugTimeScale {
  /** @private @type {DebugTimeScale|null} */
  static _instance = null;

  /** @returns {DebugTimeScale} */
  static getInstance() {
    if (!DebugTimeScale._instance) DebugTimeScale._instance = new DebugTimeScale();
    return DebugTimeScale._instance;
  }

  /** Fastest multiplier offered by the debug button. */
  static MAX_MULTIPLIER = 10;

  constructor() {
    /** @private @type {number} */
    this._multiplier = 1;
  }

  /** @returns {number} Current multiplier, 1 by default */
  getMultiplier() {
    return this._multiplier;
  }

  /**
   * Sets the multiplier. Values below 1 or not finite fall back to 1, above MAX_MULTIPLIER are capped.
   * @param {number} multiplier
   * @returns {number} The multiplier actually applied
   */
  setMultiplier(multiplier) {
    const value = Number(multiplier);
    this._multiplier = Number.isFinite(value) && value > 1
      ? Math.min(DebugTimeScale.MAX_MULTIPLIER, value)
      : 1;
    return this._multiplier;
  }

  /** @returns {number} New multiplier: 10 when it was 1, 1 otherwise */
  toggleX10() {
    return this.setMultiplier(this._multiplier === DebugTimeScale.MAX_MULTIPLIER ? 1 : DebugTimeScale.MAX_MULTIPLIER);
  }

  /**
   * Scales a real elapsed time by the multiplier.
   * @param {number} dt - Seconds
   * @returns {number} Simulated seconds
   */
  scale(dt) {
    return Number.isFinite(dt) && dt > 0 ? dt * this._multiplier : 0;
  }

  /** Restores 1x (new save, page teardown). */
  reset() {
    this._multiplier = 1;
  }
}
