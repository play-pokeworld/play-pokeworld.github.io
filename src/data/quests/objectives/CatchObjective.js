/**
 * @file CatchObjective.js
 * @brief Catch `count` Pokémon, at the location group of `location` when set, anywhere otherwise (original catch).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { PokemonCaughtEvent } from '../../../core/events/PokemonCaughtEvent.js';

export class CatchObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.CATCH;
  static EVENTS = [PokemonCaughtEvent];

  /** @override */
  progressFor(event, context) {
    return !this.params.location || context.sameLocationGroup(event.locationId, this.params.location) ? 1 : 0;
  }

  /** @override */
  describe() {
    return { count: this.count, location: this.params.location || null };
  }
}
