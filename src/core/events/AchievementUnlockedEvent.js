/**
 * @file AchievementUnlockedEvent.js
 * @brief Emitted when a new achievement tier is unlocked.
 */

import { BaseEvent } from '../BaseEvent.js';

export class AchievementUnlockedEvent extends BaseEvent {
  static TYPE = 'AchievementUnlockedEvent';

  /**
   * @param {Object} ach - The achievement definition
   * @param {number} tier - The unlocked tier index (0-based)
   * @param {string} [bonusLabel=''] - Localized bonus label text
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(ach, tier, bonusLabel = '', { deferSave = false } = {}) {
    super(AchievementUnlockedEvent.TYPE);
    this.ach = ach;
    this.achId = ach?.id || '';
    this.tier = tier;
    this.bonusLabel = bonusLabel;
    this.deferSave = deferSave === true;
  }
}
