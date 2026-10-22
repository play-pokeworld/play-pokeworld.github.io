/**
 * @file SecretBaseEstablishedEvent.js
 * @brief Emitted when the player establishes a secret base.
 */

import { BaseEvent } from '../BaseEvent.js';

export class SecretBaseEstablishedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'SecretBaseEstablishedEvent';

  /**
   * @param {string} locationId - Location of the base
   * @param {{deferSave?:boolean}} [options={}] - Used when establishment shares a save transaction.
   */
  constructor(locationId, options = {}) {
    super(SecretBaseEstablishedEvent.TYPE);
    /** @type {string} */
    this.locationId = locationId;
    this.deferSave = options.deferSave === true;
  }
}
