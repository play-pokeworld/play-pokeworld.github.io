/**
 * @file PokemonCaughtEvent.js
 * @brief Emitted when a wild Pokémon is caught.
 */

import { BaseEvent } from '../BaseEvent.js';

export class PokemonCaughtEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PokemonCaughtEvent';

  /**
   * @param {string} speciesId - PokemonDB id
   * @param {string} locationId - Location of the capture
   * @param {boolean} shiny - Shiny specimen
   */
  constructor(speciesId, locationId, shiny) {
    super(PokemonCaughtEvent.TYPE);
    /** @type {string} */
    this.speciesId = speciesId;
    /** @type {string} */
    this.locationId = locationId;
    /** @type {boolean} */
    this.shiny = shiny;
  }
}
