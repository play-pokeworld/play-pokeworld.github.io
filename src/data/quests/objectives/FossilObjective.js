/**
 * @file FossilObjective.js
 * @brief Revive `count` fossils (original fossil_revive).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { FossilRevivedEvent } from '../../../core/events/FossilRevivedEvent.js';

export class FossilObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.FOSSIL;
  static EVENTS = [FossilRevivedEvent];

  /** @override */
  progressFor() {
    return 1;
  }
}
