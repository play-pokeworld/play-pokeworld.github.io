/**
 * @file StaffRules.js
 * @brief Staff prices and advancement. Legacy "PC" recruitment costs use quest points by decision.
 */
export const StaffRules = Object.freeze({
  SECTORS: Object.freeze(['hatchery', 'training', 'mine']),
  MAX_LEVEL: 100,
  MAX_ACTIVE: 1,
  CURRENCY_CYCLE: Object.freeze(['money', 'questPoint', 'diamond', 'questPoint']),
  PRICE_LADDERS: Object.freeze([
    Object.freeze([25000, 75000, 200000, 500000]),
    Object.freeze([1000, 2000, 4000, 8000]),
    Object.freeze([20, 50, 100, 200]),
    Object.freeze([100, 200, 400])
  ]),
  XP_BASE: 40,
  XP_PER_LEVEL: 12,
  XP_QUADRATIC: 0.25,
  BONUS_MAX: 0.85,
  ENERGY_DISCOUNT_MAX: 0.5,
  TRAINING_DROP_ITEMS: Object.freeze(['occa_berry', 'babiri_berry', 'shuca_berry', 'passho_berry'])
});
