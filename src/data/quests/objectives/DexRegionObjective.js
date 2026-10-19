/**
 * @file DexRegionObjective.js
 * @brief Catch `count` species of the region `region` (original dex_region).
 */
import { StateObjective } from './StateObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { PokemonCaughtEvent } from '../../../core/events/PokemonCaughtEvent.js';

export class DexRegionObjective extends StateObjective {
  static TYPE = ObjectiveTypes.DEX_REGION;
  static EVENTS = [PokemonCaughtEvent];

  /** @override */
  stateProgress(context) {
    return context.caughtInRegion(this.params.region || this.quest.region);
  }

  /** @override */
  describe() {
    return { count: this.count, region: this.params.region || this.quest.region };
  }
}
