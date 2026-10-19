/**
 * @file TrainingObjective.js
 * @brief Complete `count` training center sessions (original training_session).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { TrainingSessionCompletedEvent } from '../../../core/events/TrainingSessionCompletedEvent.js';

export class TrainingObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.TRAINING;
  static EVENTS = [TrainingSessionCompletedEvent];

  /** @override */
  progressFor(event) {
    return Math.max(0, event.count);
  }
}
