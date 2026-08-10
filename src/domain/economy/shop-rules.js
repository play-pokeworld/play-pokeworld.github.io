/**
 * PokeWorld Domain — Shop Rules
 *
 * Pure business rules for item pricing, bulk discounts, and affordability checks.
 * Zero DOM access.
 *
 * @module domain/economy/shop-rules
 */

/**
 * Calculate total purchase price for a quantity of an item.
 * Supports optional discount multiplier (e.g. 0.9 for 10% discount).
 * @param {number} unitPrice - Base price per item
 * @param {number} quantity - Number of units to buy
 * @param {number} [discountMultiplier=1] - Discount factor (0.1 to 1.0)
 * @returns {number}
 */
export function calculatePurchasePrice(unitPrice, quantity, discountMultiplier = 1) {
  const price = Math.max(0, Number(unitPrice) || 0);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const mult = Math.min(1, Math.max(0.1, Number(discountMultiplier) || 1));
  return Math.round(price * qty * mult);
}

/**
 * Check if the player can afford a given purchase price.
 * @param {number} playerBalance - Current player money or tokens
 * @param {number} totalCost - Total cost of purchase
 * @returns {boolean}
 */
export function canAffordPurchase(playerBalance, totalCost) {
  return (Number(playerBalance) || 0) >= (Number(totalCost) || 0);
}

/**
 * Calculate the maximum quantity of an item the player can afford.
 * @param {number} playerBalance
 * @param {number} unitPrice
 * @param {number} [discountMultiplier=1]
 * @returns {number}
 */
export function calculateMaxAffordableQuantity(playerBalance, unitPrice, discountMultiplier = 1) {
  const balance = Math.max(0, Number(playerBalance) || 0);
  const price = Math.max(0.01, Number(unitPrice) || 1);
  const mult = Math.min(1, Math.max(0.1, Number(discountMultiplier) || 1));
  const effectivePrice = price * mult;
  return Math.floor(balance / effectivePrice);
}

/** Bag cap for hold-type items (held/buff/category buffs) — classic parity. */
export const HELD_ITEM_CAP = 25;
/** Default stack cap for any other item (classic parity). */
export const DEFAULT_ITEM_CAP = 999999;

/**
 * Whether one more unit of `item` fits the bag (classic rule: hold-type items
 * are capped at 25, everything else is effectively unbounded).
 * @param {Object} item - ITEMS row (may carry type/category/buff)
 * @param {number} owned - Currently owned quantity
 * @returns {boolean}
 */
export function canAddToBag(item, owned) {
  if (!item) return false;
  const capped = !!(item.type === 'held' || item.category || item.buff);
  const limit = capped ? HELD_ITEM_CAP : DEFAULT_ITEM_CAP;
  return (Number(owned) || 0) < limit;
}

/**
 * Merge one shop's static stock with its generated TM/HM stock, dropping
 * duplicates — parity with the classic renderer.
 * @param {string[]} baseItems
 * @param {string[]} generatedStock
 * @returns {string[]}
 */
export function mergeShopStock(baseItems = [], generatedStock = []) {
  const base = Array.isArray(baseItems) ? baseItems : [];
  const extra = Array.isArray(generatedStock) ? generatedStock : [];
  return base.concat(extra.filter((key) => !base.includes(key)));
}

/**
 * Sellable-treasure rule (classic parity): only existing inventory rows whose
 * item type is not 'fossil' can be sold.
 * @param {Object|null} item - ITEMS row
 * @param {number} owned - Currently owned quantity
 * @returns {boolean}
 */
export function canSellTreasure(item, owned) {
  if (!item || (Number(owned) || 0) <= 0) return false;
  return item.type !== 'fossil';
}

/**
 * Treasure sale value (classic parity: `itm.value`, default 2 000₽ per unit).
 * @param {Object} item - ITEMS row
 * @param {number} count - Units sold (clamped by the caller to owned quantity)
 * @returns {number} Total ₽ gained
 */
export function computeSaleValue(item, count) {
  const unitValue = Math.max(0, Number(item && item.value) || 2000);
  return Math.max(0, Math.floor(Number(count) || 0)) * unitValue;
}
