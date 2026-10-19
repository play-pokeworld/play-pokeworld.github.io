/**
 * @file KillObjective.js
 * @brief Defeat `count` wild Pokémon, at the location group of `location` when set, anywhere otherwise
 * (original defeat_wild, counted from the moment the quest is active).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { PokemonDefeatedEvent } from '../../../core/events/PokemonDefeatedEvent.js';

export class KillObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.KILL;
  static EVENTS = [PokemonDefeatedEvent];

  /** @override */
  progressFor(event, context) {
    if (!event.wild) return 0;
    return !this.params.location || context.sameLocationGroup(event.locationId, this.params.location) ? 1 : 0;
  }

  /** @override */
  describe() {
    return { count: this.count, location: this.params.location || null };
  }
}
