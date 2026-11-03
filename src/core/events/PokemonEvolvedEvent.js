/**
 * @file PokemonEvolvedEvent.js
 * @brief Emitted by EvolutionSystem once a source Pokémon has produced its evolved species.
 *
 * The source Pokémon is unchanged: `createdUid` is the new level-1 Pokémon added to the collection.
 */

import { BaseEvent } from '../BaseEvent.js';

export class PokemonEvolvedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PokemonEvolvedEvent';

  /**
   * @param {string} sourceUid - Uid of the Pokémon that triggered the evolution
   * @param {string} sourceSpecies - Species of the triggering Pokémon (kept as is)
   * @param {string} species - Species that was produced
   * @param {string|null} createdUid - Uid of the new level-1 Pokémon, null when creation failed
   * @param {{deferSave?:boolean}} [options]
   */
  constructor(sourceUid, sourceSpecies, species, createdUid = null, {deferSave=false}={}) {
    super(PokemonEvolvedEvent.TYPE);
    /** @type {string} */
    this.sourceUid = sourceUid;
    /** @type {string} */
    this.sourceSpecies = sourceSpecies;
    /** @type {string} */
    this.species = species;
    /** @type {string|null} */
    this.createdUid = createdUid;
    this.deferSave = deferSave;
  }
}
