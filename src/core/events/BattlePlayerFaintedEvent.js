/**
 * @file BattlePlayerFaintedEvent.js
 * @brief Emitted when one of the player's Pokémon faints during a battle.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BattlePlayerFaintedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BattlePlayerFaintedEvent';

  /**
   * @param {string} speciesId - PokemonDB id of the fainted team member
   * @param {number} level - Its level
   * @param {string} locationId - Location of the battle
   */
  constructor(speciesId, level, locationId) {
    super(BattlePlayerFaintedEvent.TYPE);
    /** @type {string} */
    this.speciesId = speciesId;
    /** @type {number} */
    this.level = Math.max(0, Number(level) || 0);
    /** @type {string} */
    this.locationId = locationId;
  }
}
