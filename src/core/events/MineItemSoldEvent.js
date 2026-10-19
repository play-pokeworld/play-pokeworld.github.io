/**
 * @file MineItemSoldEvent.js
 * @brief Emitted when mine items are sold.
 */

import { BaseEvent } from '../BaseEvent.js';

export class MineItemSoldEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'MineItemSoldEvent';

  /**
   * @param {number} count - Items sold
   */
  constructor(count) {
    super(MineItemSoldEvent.TYPE);
    /** @type {number} */
    this.count = count;
  }
}
