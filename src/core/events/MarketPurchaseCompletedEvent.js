/** @file MarketPurchaseCompletedEvent.js @brief Completed Pokémon purchase, distinct from wild captures and hatch credits. */
import { BaseEvent } from '../BaseEvent.js';
export class MarketPurchaseCompletedEvent extends BaseEvent {
  static TYPE = 'MarketPurchaseCompletedEvent';
  /** @param {string} speciesId @param {number} quantity @param {number} total @param {string} region */
  constructor(speciesId, quantity, total, region) {
    super(MarketPurchaseCompletedEvent.TYPE);
    this.speciesId = speciesId;
    this.quantity = quantity;
    this.total = total;
    this.region = region;
    this.deferSave = true;
  }
}
