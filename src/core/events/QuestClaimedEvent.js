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
   * @param {{deferSave?:boolean}} [options] - A wider game operation owns persistence when true.
   */
  constructor(questKey, { deferSave = false } = {}) {
    super(QuestClaimedEvent.TYPE);
    /** @type {string} */
    this.questKey = questKey;
    /** @type {boolean} */
    this.deferSave = deferSave === true;
  }
}
