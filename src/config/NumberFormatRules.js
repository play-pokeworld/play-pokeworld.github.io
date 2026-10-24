/** @file NumberFormatRules.js @brief Native compact display units; transaction amounts are never rounded. */
export const NumberFormatRules = Object.freeze({
  BASE: 1000,
  DECIMAL_THRESHOLD: 10,
  SMALL_DECIMALS: 1,
  SUFFIXES: Object.freeze(['', 'K', 'M', 'B', 'T', 'Qa']),
});
