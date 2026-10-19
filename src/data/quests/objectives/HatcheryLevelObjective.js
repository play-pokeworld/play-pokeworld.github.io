/**
 * @file HatcheryLevelObjective.js
 * @brief Gain `count` hatchery levels (original hatchery_level, counts the levels gained).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { HatcheryLevelUpEvent } from '../../../core/events/HatcheryLevelUpEvent.js';

export class HatcheryLevelObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.HATCHERY_LEVEL;
  static EVENTS = [HatcheryLevelUpEvent];

  /** @override */
  progressFor(event) {
    return Math.max(0, event.levelsGained);
  }
}
