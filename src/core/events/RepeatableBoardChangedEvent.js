/**
 * @file RepeatableBoardChangedEvent.js
 * @brief Emitted after repeatable board state changes (unlock, choices, reroll or slot upgrade).
 */
import { BaseEvent } from '../BaseEvent.js';

export class RepeatableBoardChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'RepeatableBoardChangedEvent';

  /**
   * @param {string} reason - Stable, non-localized reason for diagnostics and consumers
   */
  constructor(reason = 'updated') {
    super(RepeatableBoardChangedEvent.TYPE);
    /** @type {string} */
    this.reason = reason;
  }
}
