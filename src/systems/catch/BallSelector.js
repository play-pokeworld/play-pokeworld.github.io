/**
 * @file BallSelector.js
 * @brief Which ball is thrown at a wild Pokémon (C++: class BallSelector, static), port of the
 * original ballForEnemy(). Filters are read in priority order, disabled or non-matching ones
 * are skipped; the first matching filter decides:
 *   - a ball is set: that ball if at least one is owned, otherwise nothing is thrown;
 *   - no ball on a base (locked) filter: "no opinion", the next filter decides;
 *   - no ball on a custom filter: nothing is thrown.
 * The species catch rate plays no part: only the ball counts.
 */
import { BallFilterMatcher } from './BallFilterMatcher.js';

export class BallSelector {
  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData[]} filters - Priority order
   * @param {import('./CatchEncounter.js').CatchEncounter} encounter
   * @param {(ballId: string) => number} ownedCount - Balls in the bag
   * @returns {string|null} Ball item id, null = no ball thrown
   */
  static ballFor(filters, encounter, ownedCount) {
    for (const filter of filters) {
      if (!filter.enabled || !BallFilterMatcher.matches(filter, encounter)) continue;
      if (!filter.hasBall()) {
        if (filter.isLocked()) continue;
        return null;
      }
      return ownedCount(filter.ball) > 0 ? filter.ball : null;
    }
    return null;
  }
}
