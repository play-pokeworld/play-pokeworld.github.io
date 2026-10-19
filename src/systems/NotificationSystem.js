/**
 * @file NotificationSystem.js
 * @brief Notification model (C++ equivalent: class NotificationSystem : public BaseSystem).
 * Filters by channel, keeps the active records and expires temporary notifications.
 * Rendering is done by src/ui/notifications/NotificationCenterView.js, which listens to
 * NotificationDispatchedEvent / NotificationDismissedEvent. This class never touches the DOM.
 */

import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';
import {
  NotificationChannels,
  NotificationTypes,
  NotificationTones,
  TEMPORARY_NOTIFICATION_MS
} from '../config/NotificationConfig.js';
import { NotificationDispatchedEvent } from '../core/events/NotificationDispatchedEvent.js';
import { NotificationDismissedEvent } from '../core/events/NotificationDismissedEvent.js';
import { t } from '../localization/LocalizationManager.js';

/**
 * @typedef {Object} NotifyOptions
 * @property {string} [type='normal']       - NotificationTypes value
 * @property {string} [channel='GAMEPLAY']  - NotificationChannels value
 * @property {string} [tone='success']      - NotificationTones value
 */

export class NotificationSystem extends BaseSystem {
  /** @private @type {NotificationSystem|null} */
  static _instance = null;

  /** @returns {NotificationSystem} */
  static getInstance() {
    if (!NotificationSystem._instance) {
      NotificationSystem._instance = new NotificationSystem();
    }
    return NotificationSystem._instance;
  }

  constructor() {
    super('NotificationSystem', 'System');
    /** @private @type {Map<string, {id: string, message: string, type: string, channel: string, tone: string}>} */
    this._records = new Map();
    /** @private @type {Map<string, ReturnType<typeof setTimeout>>} */
    this._timers = new Map();
    this._idCounter = 0;

    const allChannels = Object.values(NotificationChannels);
    const stored = LocalStore.getJson(StorageKeys.NOTIFICATION_CHANNELS, null);
    /** @private @type {Set<string>} */
    this._enabledChannels = new Set(Array.isArray(stored) ? stored.filter((c) => allChannels.includes(c)) : allChannels);
  }

  // --- Channels ---

  /**
   * @param {string} channel
   * @returns {boolean}
   */
  isChannelEnabled(channel) {
    return this._enabledChannels.has(channel);
  }

  /**
   * @param {string} channel
   * @param {boolean} enabled
   */
  setChannelEnabled(channel, enabled) {
    if (enabled) this._enabledChannels.add(channel);
    else this._enabledChannels.delete(channel);
    LocalStore.setJson(StorageKeys.NOTIFICATION_CHANNELS, [...this._enabledChannels]);
    console.log(t(enabled ? 'debug_notif_channel_enabled' : 'debug_notif_channel_disabled', { channel }));
  }

  // --- Publishing ---

  /**
   * Publishes a notification.
   * @param {string} message - Already localized text (may use the TextFormatter markup)
   * @param {NotifyOptions} [options={}]
   * @returns {string|null} Notification id, or null when the channel is muted
   */
  notify(message, options = {}) {
    const channel = options.channel || NotificationChannels.GAMEPLAY;
    const type = options.type === NotificationTypes.TEMPORARY ? NotificationTypes.TEMPORARY : NotificationTypes.NORMAL;
    const tone = Object.values(NotificationTones).includes(options.tone) ? options.tone : NotificationTones.SUCCESS;

    if (!this.isChannelEnabled(channel)) {
      console.log(t('debug_notif_muted_suppressed', { channel }));
      return null;
    }

    const id = `notif_${++this._idCounter}`;
    this._records.set(id, { id, message, type, channel, tone });
    console.log(t('debug_notif_dispatched', { channel, type, message }));
    EventBus.getInstance().dispatch(new NotificationDispatchedEvent(id, message, type, channel, tone));

    if (type === NotificationTypes.TEMPORARY) {
      this._timers.set(id, setTimeout(() => this.dismiss(id), TEMPORARY_NOTIFICATION_MS));
    }
    return id;
  }

  /**
   * Shortcut for a temporary notification.
   * @param {string} message
   * @param {Omit<NotifyOptions, 'type'>} [options={}]
   * @returns {string|null}
   */
  notifyTemporary(message, options = {}) {
    return this.notify(message, { ...options, type: NotificationTypes.TEMPORARY });
  }

  /**
   * Removes an active notification.
   * @param {string} id
   */
  dismiss(id) {
    if (!this._records.has(id)) return;
    this._records.delete(id);
    clearTimeout(this._timers.get(id));
    this._timers.delete(id);
    console.log(t('debug_notif_dismissed', { id }));
    EventBus.getInstance().dispatch(new NotificationDismissedEvent(id));
  }

  /**
   * @param {string} id
   * @returns {{id: string, message: string, type: string, channel: string, tone: string}|null}
   */
  getRecord(id) {
    return this._records.get(id) || null;
  }
}
