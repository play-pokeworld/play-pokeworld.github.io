/**
 * @file CurrencyChangedEvent.js
 * @brief Emitted when a secondary currency changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class CurrencyChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'CurrencyChangedEvent';

  /**
   * @param {string} currencyKey - Currency id
   * @param {number} amount - New amount
   */
  constructor(currencyKey, amount) {
    super(CurrencyChangedEvent.TYPE);
    /** @type {string} */
    this.currencyKey = currencyKey;
    /** @type {number} */
    this.amount = amount;
  }
}
