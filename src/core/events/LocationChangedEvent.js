/**
 * @file LocationChangedEvent.js
 * @brief Emitted when the player travels to another location.
 */

import { BaseEvent } from '../BaseEvent.js';

export class LocationChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'LocationChangedEvent';

  /**
   * @param {string} region - Region id
   * @param {string} locationId - LocationDB id
   */
  constructor(region, locationId) {
    super(LocationChangedEvent.TYPE);
    /** @type {string} */
    this.region = region;
    /** @type {string} */
    this.locationId = locationId;
  }
}
