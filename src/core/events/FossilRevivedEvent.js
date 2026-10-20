/**
 * @file FossilRevivedEvent.js
 * @brief Emitted after a fossil successfully revives a Pokémon, including a duplicate IV outcome.
 */
import { BaseEvent } from '../BaseEvent.js';

export class FossilRevivedEvent extends BaseEvent {
  static TYPE = 'FossilRevivedEvent';

  /**
   * @param {string} speciesId
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(speciesId, { deferSave = false } = {}) {
    super(FossilRevivedEvent.TYPE);
    this.speciesId = speciesId;
    this.deferSave = deferSave;
  }
}
