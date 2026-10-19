/**
 * @file BattleStartedEvent.js
 * @brief Emitted by BattleSystem when a wild battle starts.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BattleStartedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BattleStartedEvent';

  /**
   * @param {PokemonData} playerPokemon - Lead Pokemon of the player
   * @param {PokemonData} foePokemon - Wild opponent
   */
  constructor(playerPokemon, foePokemon) {
    super(BattleStartedEvent.TYPE);
    /** @type {PokemonData} */
    this.playerPokemon = playerPokemon;
    /** @type {PokemonData} */
    this.foePokemon = foePokemon;
  }
}
