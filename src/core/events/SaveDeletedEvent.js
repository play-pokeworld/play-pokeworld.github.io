/**
 * @file SaveDeletedEvent.js
 * @brief Emitted after a save slot was deleted.
 */

import { BaseEvent } from '../BaseEvent.js';

export class SaveDeletedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'SaveDeletedEvent';

  /**
   * @param {string} slotId - Save id
   */
  constructor(slotId) {
    super(SaveDeletedEvent.TYPE);
    /** @type {string} */
    this.slotId = slotId;
  }
}
