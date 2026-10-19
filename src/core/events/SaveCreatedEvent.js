/**
 * @file SaveCreatedEvent.js
 * @brief Emitted after a new save slot was created.
 */

import { BaseEvent } from '../BaseEvent.js';

export class SaveCreatedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'SaveCreatedEvent';

  /**
   * @param {string} slotId - Save id
   * @param {string} trainerName - Trainer nickname
   */
  constructor(slotId, trainerName) {
    super(SaveCreatedEvent.TYPE);
    /** @type {string} */
    this.slotId = slotId;
    /** @type {string} */
    this.trainerName = trainerName;
  }
}
