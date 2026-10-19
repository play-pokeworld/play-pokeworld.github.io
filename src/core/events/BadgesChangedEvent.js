/**
 * @file BadgesChangedEvent.js
 * @brief Emitted when the player earns a badge.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BadgesChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BadgesChangedEvent';

  /**
   * @param {string[]} badgeIds - Badges owned (gym leader ids, e.g. 'brock')
   * @param {number} totalBadges - Badges available
   */
  constructor(badgeIds, totalBadges) {
    super(BadgesChangedEvent.TYPE);
    /** @type {ReadonlyArray<string>} */
    this.badgeIds = Object.freeze([...badgeIds]);
    /** @type {number} */
    this.currentBadges = badgeIds.length;
    /** @type {number} */
    this.totalBadges = totalBadges;
  }
}
