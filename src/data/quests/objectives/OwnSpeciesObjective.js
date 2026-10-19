/**
 * @file OwnSpeciesObjective.js
 * @brief Own a Pokémon of the species `species` (original own_species).
 */
import { StateObjective } from './StateObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { PokemonCaughtEvent } from '../../../core/events/PokemonCaughtEvent.js';
import { TeamChangedEvent } from '../../../core/events/TeamChangedEvent.js';

export class OwnSpeciesObjective extends StateObjective {
  static TYPE = ObjectiveTypes.OWN_SPECIES;
  static EVENTS = [PokemonCaughtEvent, TeamChangedEvent];

  /** @override */
  stateProgress(context) {
    return context.ownsSpecies(this.params.species) ? 1 : 0;
  }

  /** @override */
  get count() {
    return 1;
  }

  /** @override */
  describe() {
    return { count: 1, species: this.params.species };
  }
}
