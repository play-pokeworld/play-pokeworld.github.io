/**
 * @file InventoryChangedEvent.js
 * @brief Emitted when the quantity of an item in the bag changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class InventoryChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'InventoryChangedEvent';

  /**
   * @param {string} itemId - ItemDB id
   * @param {number} quantity - New quantity in the bag
   */
  constructor(itemId, quantity) {
    super(InventoryChangedEvent.TYPE);
    /** @type {string} */
    this.itemId = itemId;
    /** @type {number} */
    this.quantity = quantity;
  }
}
