/**
 * @file HatcheryChangedEvent.js
 * @brief Emitted after hatchery slots or progress change.
 */
import { BaseEvent } from '../BaseEvent.js';

export class HatcheryChangedEvent extends BaseEvent {
  static TYPE = 'HatcheryChangedEvent';

  /** @param {number} slotCount */
  constructor(slotCount) {
    super(HatcheryChangedEvent.TYPE);
    this.slotCount = slotCount;
  }
}
