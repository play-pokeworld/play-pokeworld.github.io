/**
 * @file QuestEncounterRequestedEvent.js
 * @brief Emitted by QuestSystem when claiming a quest needs the reward Pokémon to be met in battle
 * first (original startLegendaryEncounter). The battle system answers by calling
 * QuestSystem.claim(questKey, { encounterWon: true }) once the Pokémon is caught.
 */

import { BaseEvent } from '../BaseEvent.js';

export class QuestEncounterRequestedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'QuestEncounterRequestedEvent';

  /**
   * @param {string} questKey - QuestDB key
   * @param {{species: string, level: number, shiny?: boolean}} pokemon - Reward Pokémon
   * @param {string|null} locationId - Where the encounter takes place (null = current location)
   */
  constructor(questKey, pokemon, locationId) {
    super(QuestEncounterRequestedEvent.TYPE);
    /** @type {string} */
    this.questKey = questKey;
    /** @type {{species: string, level: number, shiny?: boolean}} */
    this.pokemon = pokemon;
    /** @type {string|null} */
    this.locationId = locationId;
  }
}
