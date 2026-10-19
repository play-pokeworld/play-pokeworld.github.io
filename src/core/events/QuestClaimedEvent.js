/**
 * @file QuestClaimedEvent.js
 * @brief Emitted by QuestSystem when the rewards of a quest are claimed.
 */

import { BaseEvent } from '../BaseEvent.js';

export class QuestClaimedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'QuestClaimedEvent';

  /**
   * @param {string} questKey - QuestDB key (<category>.<id>)
   */
  constructor(questKey) {
    super(QuestClaimedEvent.TYPE);
    /** @type {string} */
    this.questKey = questKey;
  }
}
