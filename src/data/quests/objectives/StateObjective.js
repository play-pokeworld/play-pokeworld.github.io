/**
 * @file StateObjective.js
 * @brief Base of the objectives whose progress is a STATE of the save (badge owned, item held,
 * wins in a region…) rather than a counter (C++: class StateObjective : public QuestObjective).
 * QuestSystem re-reads stateProgress() whenever one of the EVENTS is dispatched.
 */
import { QuestObjective } from './QuestObjective.js';

export class StateObjective extends QuestObjective {
  /** @override */
  isStateBased() {
    return true;
  }
}
