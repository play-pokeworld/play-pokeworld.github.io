/**
 * @file HpFillState.js
 * @brief Colour state of an HP gauge (C++: free function hpFillState(int percent)).
 */

/** HP ratio thresholds of the .hp-fill colour states. */
const HP_HIGH_PERCENT = 50;
const HP_MEDIUM_PERCENT = 20;

/**
 * @param {number} percent
 * @returns {'high'|'medium'|'low'}
 */
export function hpFillState(percent) {
  if (percent > HP_HIGH_PERCENT) return 'high';
  if (percent > HP_MEDIUM_PERCENT) return 'medium';
  return 'low';
}
