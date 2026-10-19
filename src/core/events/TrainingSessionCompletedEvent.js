/**
 * @file TrainingSessionCompletedEvent.js
 * @brief Emitted when a training center session ends.
 */

import { BaseEvent } from '../BaseEvent.js';

export class TrainingSessionCompletedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'TrainingSessionCompletedEvent';

  /**
   * @param {number} count - Sessions completed
   */
  constructor(count) {
    super(TrainingSessionCompletedEvent.TYPE);
    /** @type {number} */
    this.count = count;
  }
}
