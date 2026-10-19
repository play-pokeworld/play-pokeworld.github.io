/**
 * @file QuestProgressedEvent.js
 * @brief Emitted by QuestSystem when the progress of an active quest changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class QuestProgressedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'QuestProgressedEvent';

  /**
   * @param {string} questKey - QuestDB key (<category>.<id>)
   * @param {number} progress - Current progress
   * @param {number} count - Progress needed
   */
  constructor(questKey, progress, count) {
    super(QuestProgressedEvent.TYPE);
    /** @type {string} */
    this.questKey = questKey;
    /** @type {number} */
    this.progress = progress;
    /** @type {number} */
    this.count = count;
  }
}
