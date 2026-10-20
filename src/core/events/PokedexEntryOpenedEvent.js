/**
 * @file PokedexEntryOpenedEvent.js
 * @brief Emitted when the player opens details for a seen Pokédex entry.
 */
import { BaseEvent } from '../BaseEvent.js';

export class PokedexEntryOpenedEvent extends BaseEvent {
  static TYPE = 'PokedexEntryOpenedEvent';

  /** @param {string} speciesId */
  constructor(speciesId) {
    super(PokedexEntryOpenedEvent.TYPE);
    this.speciesId = speciesId;
  }
}
