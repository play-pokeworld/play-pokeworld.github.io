/**
 * @file NotificationDispatchedEvent.js
 * @brief Carries a notification from NotificationSystem.notify() to its view (NotificationCenterView).
 */

import { BaseEvent } from '../BaseEvent.js';

export class NotificationDispatchedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'NotificationDispatchedEvent';

  /**
   * @param {string} id - Unique notification id
   * @param {string} message - Already localized message (may contain the TextFormatter whitelist markup)
   * @param {string} [notificationType='normal'] - 'normal' (manual close) or 'temporary' (auto-dismiss)
   * @param {string} [channel='GAMEPLAY'] - NotificationChannels value
   * @param {string} [tone='success'] - NotificationTones value
   */
  constructor(id, message, notificationType = 'normal', channel = 'GAMEPLAY', tone = 'success') {
    super(NotificationDispatchedEvent.TYPE);
    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.message = message;
    /** @type {string} */
    this.notificationType = notificationType;
    /** @type {string} */
    this.channel = channel;
    /** @type {string} */
    this.tone = tone;
  }
}
