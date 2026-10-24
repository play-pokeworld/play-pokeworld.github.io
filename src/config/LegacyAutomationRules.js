/** @file LegacyAutomationRules.js @brief Explicit legacy booleans and receipt fields; absence is never purchase evidence. */
export const LegacyAutomationRules = Object.freeze({
  TRUE_VALUES: Object.freeze([true, 1, 'true', '1']),
  FALSE_VALUES: Object.freeze([false, 0, 'false', '0']),
  PURCHASE_FLAGS: Object.freeze(['purchased', 'owned']),
});
