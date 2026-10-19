/**
 * @file BattleStateChangedEvent.js
 * @brief Emitted by BattleSystem after every turn (HP, level...) so views can refresh.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BattleStateChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BattleStateChangedEvent';

  /**
   * @param {PokemonData} playerPokemon - Lead Pokemon of the player
   * @param {PokemonData} foePokemon - Wild opponent
   */
  constructor(playerPokemon, foePokemon) {
    super(BattleStateChangedEvent.TYPE);
    /** @type {PokemonData} */
    this.playerPokemon = playerPokemon;
    /** @type {PokemonData} */
    this.foePokemon = foePokemon;
  }
}
