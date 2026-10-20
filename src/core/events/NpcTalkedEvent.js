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
   * @param {string|null} [npcId=null] - Stable identity when a specific NPC was selected
   */
  constructor(locationId, npcId = null) {
    super(NpcTalkedEvent.TYPE);
    /** @type {string} */
    this.locationId = locationId;
    /** @type {string|null} */
    this.npcId = typeof npcId === 'string' && npcId.length > 0 ? npcId : null;
  }
}
