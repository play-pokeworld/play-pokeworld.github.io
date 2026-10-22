/**
 * @file SecretBaseVisitedEvent.js
 * @brief Emitted when the player visits a secret base.
 */

import { BaseEvent } from '../BaseEvent.js';

export class SecretBaseVisitedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'SecretBaseVisitedEvent';

  /**
   * @param {string} locationId - Location of the base
   * @param {{deferSave?:boolean}} [options={}] - Used when the visit shares a save transaction.
   */
  constructor(locationId, options = {}) {
    super(SecretBaseVisitedEvent.TYPE);
    /** @type {string} */
    this.locationId = locationId;
    this.deferSave = options.deferSave === true;
  }
}
