/**
 * @file HatchObjective.js
 * @brief Hatch `count` eggs (original egg_hatch).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { EggHatchedEvent } from '../../../core/events/EggHatchedEvent.js';

export class HatchObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.HATCH;
  static EVENTS = [EggHatchedEvent];

  /** @override */
  progressFor() {
    return 1;
  }
}
