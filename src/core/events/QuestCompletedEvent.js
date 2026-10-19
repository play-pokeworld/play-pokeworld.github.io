/**
 * @file QuestCompletedEvent.js
 * @brief Emitted by QuestSystem when an active quest reaches its objective (rewards not claimed yet).
 */

import { BaseEvent } from '../BaseEvent.js';

export class QuestCompletedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'QuestCompletedEvent';

  /**
   * @param {string} questKey - QuestDB key (<category>.<id>)
   */
  constructor(questKey) {
    super(QuestCompletedEvent.TYPE);
    /** @type {string} */
    this.questKey = questKey;
  }
}
