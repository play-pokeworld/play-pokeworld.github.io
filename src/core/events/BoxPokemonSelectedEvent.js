/**
 * @file BoxPokemonSelectedEvent.js
 * @brief Generic selection result from a PC list, without team-domain knowledge.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BoxPokemonSelectedEvent extends BaseEvent {
  static TYPE = 'BoxPokemonSelectedEvent';

  /**
   * @param {string} requestId - Opaque request id supplied by the selection caller
   * @param {string} pokemonUid - Stable uid of the selected stored Pokémon
   */
  constructor(requestId, pokemonUid) {
    super(BoxPokemonSelectedEvent.TYPE);
    this.requestId = requestId;
    this.pokemonUid = pokemonUid;
  }
}
