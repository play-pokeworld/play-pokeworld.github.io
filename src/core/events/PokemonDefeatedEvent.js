/**
 * @file PokemonDefeatedEvent.js
 * @brief Emitted by the battle engine when a foe Pokémon faints (wild or trainer).
 */

import { BaseEvent } from '../BaseEvent.js';

export class PokemonDefeatedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PokemonDefeatedEvent';

  /**
   * @param {string} speciesId - PokemonDB id of the fainted foe
   * @param {number} level - Its level
   * @param {string} locationId - Location of the battle
   * @param {boolean} wild - true for a wild Pokémon, false for a trainer Pokémon
   * @param {{deferSave?:boolean}} [options] - Defer listener persistence to the battle transaction
   */
  constructor(speciesId, level, locationId, wild, { deferSave = false } = {}) {
    super(PokemonDefeatedEvent.TYPE);
    /** @type {string} */
    this.speciesId = speciesId;
    /** @type {number} */
    this.level = level;
    /** @type {string} */
    this.locationId = locationId;
    /** @type {boolean} */
    this.wild = wild;
    /** @type {boolean} */
    this.deferSave = deferSave === true;
  }
}
