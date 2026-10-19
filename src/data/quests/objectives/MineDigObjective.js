/**
 * @file MineDigObjective.js
 * @brief Dig `count` items in the mine (original mine_items).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { MineDugEvent } from '../../../core/events/MineDugEvent.js';

export class MineDigObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.MINE_DIG;
  static EVENTS = [MineDugEvent];

  /** @override */
  progressFor(event) {
    return Math.max(0, event.count);
  }
}
