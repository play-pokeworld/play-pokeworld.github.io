/**
 * @file NpcTalkedEvent.js
 * @brief Emitted when the player talks to the NPCs of a location.
 */

import { BaseEvent } from '../BaseEvent.js';

export class NpcTalkedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'NpcTalkedEvent';

  /**
   * @param {string} locationId - Location of the NPC
   */
  constructor(locationId) {
    super(NpcTalkedEvent.TYPE);
    /** @type {string} */
    this.locationId = locationId;
  }
}
