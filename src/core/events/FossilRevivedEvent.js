/**
 * @file FossilRevivedEvent.js
 * @brief Emitted when a fossil is revived.
 */

import { BaseEvent } from '../BaseEvent.js';

export class FossilRevivedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'FossilRevivedEvent';

  /**
   * @param {string} speciesId - PokemonDB id of the revived Pokémon
   */
  constructor(speciesId) {
    super(FossilRevivedEvent.TYPE);
    /** @type {string} */
    this.speciesId = speciesId;
  }
}
