/**
 * @file BadgeObjective.js
 * @brief Own the badge `badge` (original badge).
 */
import { StateObjective } from './StateObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { BadgesChangedEvent } from '../../../core/events/BadgesChangedEvent.js';

export class BadgeObjective extends StateObjective {
  static TYPE = ObjectiveTypes.BADGE;
  static EVENTS = [BadgesChangedEvent];

  /** @override */
  stateProgress(context) {
    return context.hasBadge(this.params.badge) ? 1 : 0;
  }

  /** @override */
  get count() {
    return 1;
  }

  /** @override */
  describe() {
    return { count: 1, badge: this.params.badge };
  }
}
