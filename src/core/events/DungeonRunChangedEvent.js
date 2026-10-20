/**
 * @file DungeonRunChangedEvent.js
 * @brief Emitted after an expedition map, bank, or run status changes.
 */
import { BaseEvent } from '../BaseEvent.js';

export class DungeonRunChangedEvent extends BaseEvent {
  static TYPE = 'DungeonRunChangedEvent';

  /** @param {string|null} locationId @param {string} reason @param {boolean} active */
  constructor(locationId, reason, active) {
    super(DungeonRunChangedEvent.TYPE);
    this.locationId = locationId;
    this.reason = reason;
    this.active = !!active;
  }
}
