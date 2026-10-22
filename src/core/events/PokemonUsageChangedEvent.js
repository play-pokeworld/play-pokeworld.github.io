/**
 * @file PokemonUsageChangedEvent.js
 * @brief Emitted by PokemonUsageSystem when the modes using owned Pokémon changed (party,
 * daycare, training session…). Views refresh availability and action locks on it.
 */
import { BaseEvent } from '../BaseEvent.js';

export class PokemonUsageChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PokemonUsageChangedEvent';

  /** @param {string|null} [pokemonUid=null] - Affected Pokémon, or null for a batch change */
  constructor(pokemonUid = null) {
    super(PokemonUsageChangedEvent.TYPE);
    /** @type {string|null} */
    this.pokemonUid = pokemonUid;
  }
}
