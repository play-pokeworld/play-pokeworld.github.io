/**
 * @file NotificationCenterView.js
 * @brief On-screen stack of notifications, top-left, newest at the bottom
 * (C++ equivalent: class NotificationCenterView : public UIElement).
 * View of NotificationSystem: renders NotificationDispatchedEvent, removes on NotificationDismissedEvent.
 */

import { UIElement } from '../UIElement.js';
import { UIToast } from '../UIToast.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { PreferencesSystem } from '../../systems/PreferencesSystem.js';
import { NotificationTypes, TOAST_LEAVE_ANIMATION_MS } from '../../config/NotificationConfig.js';
import { NotificationDispatchedEvent } from '../../core/events/NotificationDispatchedEvent.js';
import { NotificationDismissedEvent } from '../../core/events/NotificationDismissedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class NotificationCenterView extends UIElement {
  constructor() {
    super({ id: 'pw-notification-container', className: 'pw-notification-container', name: 'NotificationCenterView' });
    /** @private @type {Map<string, UIToast>} */
    this._toasts = new Map();

    this.listen(NotificationDispatchedEvent, (event) => this._show(event));
    this.listen(NotificationDismissedEvent, (event) => this._hide(event.id));
  }

  /**
   * @private
   * @param {NotificationDispatchedEvent} event
   */
  _show(event) {
    const channelId = event.channel.toLowerCase();
    const toast = new UIToast({
      message: event.message,
      variant: event.notificationType,
      tone: event.tone,
      // The channel badge is a developer aid: only shown in debug mode.
      badge: PreferencesSystem.getInstance().isDebugMode()
        ? { text: t(`channel_${channelId}`), className: `channel-${channelId}` }
        : null,
      timerLabel: event.notificationType === NotificationTypes.TEMPORARY ? t('notif_temporary_indicator') : '',
      closeLabel: t('notif_close_tooltip'),
      onClose: () => NotificationSystem.getInstance().dismiss(event.id)
    });
    toast.setData('id', event.id);
    toast.setData('channel', event.channel);
    this._toasts.set(event.id, toast);
    this.addChild(toast);
    toast.playEnter();
  }

  /**
   * @private
   * @param {string} id
   */
  _hide(id) {
    const toast = this._toasts.get(id);
    if (!toast) return;
    this._toasts.delete(id);
    toast.playLeave(TOAST_LEAVE_ANIMATION_MS);
  }
}
