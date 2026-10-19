/**
 * @file BaseEstablishObjective.js
 * @brief Establish a secret base (original base_establish).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { SecretBaseEstablishedEvent } from '../../../core/events/SecretBaseEstablishedEvent.js';

export class BaseEstablishObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.BASE_ESTABLISH;
  static EVENTS = [SecretBaseEstablishedEvent];

  /** @override */
  progressFor() {
    return 1;
  }
}
