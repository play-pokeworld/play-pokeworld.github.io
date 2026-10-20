/**
 * @file DungeonEnteredEvent.js
 * @brief Emitted after a dungeon toll is paid and its encounter chain starts.
 */
import { BaseEvent } from '../BaseEvent.js';

export class DungeonEnteredEvent extends BaseEvent {
  static TYPE = 'DungeonEnteredEvent';

  /** @param {string} locationId @param {number} toll @param {number} encounterLimit */
  constructor(locationId, toll, encounterLimit) {
    super(DungeonEnteredEvent.TYPE);
    this.locationId = locationId;
    this.toll = toll;
    this.encounterLimit = encounterLimit;
  }
}
