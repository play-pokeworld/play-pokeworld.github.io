/**
 * @file BaseVisitObjective.js
 * @brief Visit a secret base `count` times (original base_visit).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { SecretBaseVisitedEvent } from '../../../core/events/SecretBaseVisitedEvent.js';

export class BaseVisitObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.BASE_VISIT;
  static EVENTS = [SecretBaseVisitedEvent];

  /** @override */
  progressFor() {
    return 1;
  }
}
