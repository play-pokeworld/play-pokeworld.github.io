/**
 * @file MineDugEvent.js
 * @brief Emitted when the mine yields items.
 */

import { BaseEvent } from '../BaseEvent.js';

export class MineDugEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'MineDugEvent';

  /**
   * @param {number} count - Items dug up
   */
  constructor(count) {
    super(MineDugEvent.TYPE);
    /** @type {number} */
    this.count = count;
  }
}
