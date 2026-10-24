/**
 * @file FacilityRules.js
 * @brief Shared facility queue and automation constants from the reference game.
 */
export const FacilityRules = Object.freeze({
  QUEUE_DEFAULT: 3,
  QUEUE_STEP: 3,
  QUEUE_MAX: 15,
  QUEUE_UPGRADE_COSTS: Object.freeze([5000, 10000, 25000, 50000]),
  QUEUE_CURRENCY: 'questPoint',
  AUTO_SCAN_SECONDS: 1,
  MONEY_CURRENCY: 'money'
});
