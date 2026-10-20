/**
 * @file ShopPurchaseCompletedEvent.js
 * @brief Emitted after a shop purchase has changed the wallet and inventory.
 */
import { BaseEvent } from '../BaseEvent.js';

export class ShopPurchaseCompletedEvent extends BaseEvent {
  static TYPE = 'ShopPurchaseCompletedEvent';

  /**
   * @param {string} itemId
   * @param {number} quantity
   * @param {string} shopId
   * @param {string} currencyId
   * @param {number} totalPrice
   */
  constructor(itemId, quantity, shopId, currencyId, totalPrice) {
    super(ShopPurchaseCompletedEvent.TYPE);
    this.itemId = itemId;
    this.quantity = quantity;
    this.shopId = shopId;
    this.currencyId = currencyId;
    this.totalPrice = totalPrice;
  }
}
