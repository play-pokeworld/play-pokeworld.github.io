/**
 * @file InventoryRules.js
 * @brief Stack limits and duplicate payout of items, ported from the original data/dupes.js
 * (C++: namespace InventoryRules).
 */
export const InventoryRules = Object.freeze({
  /** Held items, battle items and categorized consumables (berries, vitamins…). */
  LIMITED_STACK: 25,
  /** Everything else (virtually unlimited). */
  UNLIMITED_STACK: 999999,
  /** Money paid per overflowing copy, as a share of its price (original ECO-05: 10 %). */
  DUPLICATE_PAYOUT_RATE: 0.10
});
