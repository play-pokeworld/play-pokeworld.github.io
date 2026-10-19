/**
 * @file NotificationDismissedEvent.js
 * @brief Emitted by NotificationSystem when a notification must disappear (closed or expired).
 */

import { BaseEvent } from '../BaseEvent.js';

export class NotificationDismissedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'NotificationDismissedEvent';

  /**
   * @param {string} id - Id of the dismissed notification
   */
  constructor(id) {
    super(NotificationDismissedEvent.TYPE);
    /** @type {string} */
    this.id = id;
  }
}
