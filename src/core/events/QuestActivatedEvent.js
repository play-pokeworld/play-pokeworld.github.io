/**
 * @file QuestActivatedEvent.js
 * @brief Emitted by QuestSystem when a quest becomes active.
 */

import { BaseEvent } from '../BaseEvent.js';

export class QuestActivatedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'QuestActivatedEvent';

  /**
   * @param {string} questKey - QuestDB key (<category>.<id>)
   */
  constructor(questKey) {
    super(QuestActivatedEvent.TYPE);
    /** @type {string} */
    this.questKey = questKey;
  }
}
