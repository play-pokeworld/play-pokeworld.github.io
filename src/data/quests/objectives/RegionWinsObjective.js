/**
 * @file RegionWinsObjective.js
 * @brief Reach `count` wild wins in the region `region` (original region_wins, all-time total).
 */
import { StateObjective } from './StateObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { PokemonDefeatedEvent } from '../../../core/events/PokemonDefeatedEvent.js';

export class RegionWinsObjective extends StateObjective {
  static TYPE = ObjectiveTypes.REGION_WINS;
  static EVENTS = [PokemonDefeatedEvent];

  /** @override */
  stateProgress(context) {
    return context.wildWinsInRegion(this.params.region || this.quest.region);
  }

  /** @override */
  describe() {
    return { count: this.count, region: this.params.region || this.quest.region };
  }
}
