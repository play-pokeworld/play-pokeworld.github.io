/**
 * @file PokedexChangedEvent.js
 * @brief Emitted by PokedexData when a species is seen or caught for the first time (or caught shiny).
 */

import { BaseEvent } from '../BaseEvent.js';

export class PokedexChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PokedexChangedEvent';

  /**
   * @param {string} species - Species slug whose entry changed
   */
  constructor(species) {
    super(PokedexChangedEvent.TYPE);
    /** @type {string} */
    this.species = species;
  }
}
