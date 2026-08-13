/**
 * PokeWorld Domain — Secret Base Rules
 *
 * Pure business rules for secret base layout capacity, decoration limits,
 * and ORAS Flag System rank calculations. Zero DOM access.
 *
 * @module domain/base/base-rules
 */

/**
 * Determine the rank title and color of has Secret Base based on collected flags.
 * @param {number} flagCount - Total flags collected
 * @returns {Object} { rank: string, color: string, nextThreshold: number|null }
 */
export function getBaseRankFromFlags(flagCount = 0) {
  const flags = Math.max(0, Number(flagCount) || 0);
  if (flags >= 1000) {
    return { rank: 'platinum', color: '#E5E4E2', nextThreshold: null };
  }
  if (flags >= 500) {
    return { rank: 'gold', color: '#FFD700', nextThreshold: 1000 };
  }
  if (flags >= 100) {
    return { rank: 'silver', color: '#C0C0C0', nextThreshold: 500 };
  }
  if (flags >= 30) {
    return { rank: 'bronze', color: '#CD7F32', nextThreshold: 100 };
  }
  return { rank: 'normal', color: '#A9A9A9', nextThreshold: 30 };
}

/**
 * Validate whether a new decoration can be placed in the current layout.
 * @param {number} currentDecorationCount - Number of decorations already placed
 * @param {number} [maxCapacity=16] - Maximum decoration capacity for the base layout
 * @returns {boolean}
 */
export function canPlaceDecoration(currentDecorationCount, maxCapacity = 16) {
  const current = Math.max(0, Number(currentDecorationCount) || 0);
  const max = Math.max(1, Number(maxCapacity) || 16);
  return current < max;
}

