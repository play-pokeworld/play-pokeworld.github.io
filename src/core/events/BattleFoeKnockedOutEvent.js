/**
 * @file BattleFoeKnockedOutEvent.js
 * @brief Emitted once for every foe defeated in wild, trainer, quest or training battles.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BattleFoeKnockedOutEvent extends BaseEvent {
  static TYPE = 'BattleFoeKnockedOutEvent';

  /**
   * @param {string} speciesId
   * @param {number} level
   * @param {string} locationId
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(speciesId, level, locationId, { deferSave = false } = {}) {
    super(BattleFoeKnockedOutEvent.TYPE);
    this.speciesId = speciesId;
    this.level = level;
    this.locationId = locationId;
    this.deferSave = deferSave;
  }
}
