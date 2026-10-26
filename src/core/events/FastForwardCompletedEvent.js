/**
 * @file FastForwardCompletedEvent.js
 * @brief Emitted when an offline / fast-forward simulation batch finishes.
 */
import { BaseEvent } from '../BaseEvent.js';

export class FastForwardCompletedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'FastForwardCompletedEvent';

  /**
   * @param {Object} summary - Fast-forward simulation outcome
   */
  constructor(summary) {
    super(FastForwardCompletedEvent.TYPE);
    this.summary = Object.freeze({ ...summary });
  }
}
