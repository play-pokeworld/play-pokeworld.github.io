/**
 * @file StarterSelectedEvent.js
 * @brief Emitted when the player picks a starter Pokemon.
 */

import { BaseEvent } from '../BaseEvent.js';

export class StarterSelectedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'StarterSelectedEvent';

  /**
   * @param {number} pokemonId - National Pokedex number
   * @param {string} [region='kanto'] - Starter region
   */
  constructor(pokemonId, region = 'kanto') {
    super(StarterSelectedEvent.TYPE);
    /** @type {number} */
    this.pokemonId = pokemonId;
    /** @type {string} */
    this.region = region;
  }
}
