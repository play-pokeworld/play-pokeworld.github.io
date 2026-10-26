/**
 * @file AchievementPinnedEvent.js
 * @brief Emitted when the pinned achievement changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class AchievementPinnedEvent extends BaseEvent {
  static TYPE = 'AchievementPinnedEvent';

  /**
   * @param {string} achId - Pinned achievement ID
   * @param {boolean} [isPinned=true] - Whether the achievement is now pinned
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(achId, isPinned = true, { deferSave = false } = {}) {
    super(AchievementPinnedEvent.TYPE);
    this.achId = achId;
    this.isPinned = isPinned !== false;
    this.deferSave = deferSave === true;
  }
}
