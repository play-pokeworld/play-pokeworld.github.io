/**
 * @file HatcheryLevelUpEvent.js
 * @brief Emitted when the hatchery gains levels.
 */

import { BaseEvent } from '../BaseEvent.js';

export class HatcheryLevelUpEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'HatcheryLevelUpEvent';

  /**
   * @param {number} levelsGained - Levels gained at once
   * @param {number} level - New hatchery level
   */
  constructor(levelsGained, level) {
    super(HatcheryLevelUpEvent.TYPE);
    /** @type {number} */
    this.levelsGained = levelsGained;
    /** @type {number} */
    this.level = level;
  }
}
