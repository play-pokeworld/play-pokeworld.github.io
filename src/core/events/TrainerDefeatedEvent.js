/**
 * @file TrainerDefeatedEvent.js
 * @brief Emitted when a trainer battle (gym, rival, boss…) is won.
 */

import { BaseEvent } from '../BaseEvent.js';

export class TrainerDefeatedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'TrainerDefeatedEvent';

  /**
   * @param {string} trainerId - Battle id of the trainer (quest objective `trainer`)
   * @param {string} locationId - Location of the battle
   */
  constructor(trainerId, locationId) {
    super(TrainerDefeatedEvent.TYPE);
    /** @type {string} */
    this.trainerId = trainerId;
    /** @type {string} */
    this.locationId = locationId;
  }
}
