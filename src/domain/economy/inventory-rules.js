/**
 * PokeWorld Domain — Inventory Rules
 *
 * Pure business rules for item stacking, TM/HM hold eligibility, and consumption.
 * Zero DOM access.
 *
 * @module domain/economy/inventory-rules
 */

/**
 * Check whether an item can be held by a Pokemon in battle.
 * Excludes stones, evolution items, TMs, and HMs.
 * @param {string} itemCat - Item category ('held'|'buff'|'ball'|'stone'|'ct_cs'|etc.)
 * @returns {boolean}
 */
export function isHoldableCategory(itemCat) {
  const cat = String(itemCat || '').toLowerCase();
  return cat === 'held' || cat === 'buff' || cat === 'type_boost' || cat === 'choice';
}

/**
 * Calculate remaining stack count after consuming items.
 * @param {number} currentCount
 * @param {number} [consumeAmount=1]
 * @returns {number}
 */
export function calculateRemainingStack(currentCount, consumeAmount = 1) {
  const count = Math.max(0, Number(currentCount) || 0);
  const consume = Math.max(0, Number(consumeAmount) || 1);
  return Math.max(0, count - consume);
}

/**
 * Check whether an item is has reusable TM or HM.
 * @param {string} itemKey - Unique item identifier
 * @returns {boolean}
 */
export function isReusableCtCs(itemKey) {
  const key = String(itemKey || '').toLowerCase();
  return key.startsWith('ct_') || key.startsWith('cs_') || key.startsWith('tm_') || key.startsWith('hm_');
}
