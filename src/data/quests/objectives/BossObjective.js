/**
 * @file BossObjective.js
 * @brief Beat the trainer `trainer` (original trainer_battle): done when the trainer has been beaten
 * once, or — for a gym leader — when its badge is owned.
 */
import { StateObjective } from './StateObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { TrainerDefeatedEvent } from '../../../core/events/TrainerDefeatedEvent.js';
import { BadgesChangedEvent } from '../../../core/events/BadgesChangedEvent.js';

export class BossObjective extends StateObjective {
  static TYPE = ObjectiveTypes.BOSS;
  static EVENTS = [TrainerDefeatedEvent, BadgesChangedEvent];

  /** @override */
  stateProgress(context) {
    const trainer = this.params.trainer;
    return context.trainerWins(trainer) > 0 || context.hasBadge(trainer) ? 1 : 0;
  }

  /** @override */
  get count() {
    return 1;
  }

  /** @override */
  describe() {
    return { count: 1, trainer: this.params.trainer };
  }
}
