/**
 * @file HatcheryLevelUpEvent.js
 * @brief Emitted when one or more daycare Pokémon gain levels.
 */
import { BaseEvent } from '../BaseEvent.js';

export class HatcheryLevelUpEvent extends BaseEvent {
  static TYPE = 'HatcheryLevelUpEvent';

  /**
   * @param {number} levelsGained
   * @param {number} level - Total hatchery levels earned in this save
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(levelsGained, level, { deferSave = false } = {}) {
    super(HatcheryLevelUpEvent.TYPE);
    this.levelsGained = levelsGained;
    this.level = level;
    this.deferSave = deferSave;
  }
}
