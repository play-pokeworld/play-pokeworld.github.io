/**
 * @file BadgesChangedEvent.js
 * @brief Emitted when the badge count changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BadgesChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BadgesChangedEvent';

  /**
   * @param {number} currentBadges - Badges owned
   * @param {number} totalBadges - Badges available
   */
  constructor(currentBadges, totalBadges) {
    super(BadgesChangedEvent.TYPE);
    /** @type {number} */
    this.currentBadges = currentBadges;
    /** @type {number} */
    this.totalBadges = totalBadges;
  }
}
