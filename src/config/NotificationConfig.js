/**
 * @file NotificationConfig.js
 * @brief Notification channels, types, tones and timings (C++ equivalent: namespace NotificationConfig).
 */

/** Channels a notification can be published on (each can be muted in the settings). */
export const NotificationChannels = Object.freeze({
  SYSTEM: 'SYSTEM',
  GAMEPLAY: 'GAMEPLAY',
  BATTLE: 'BATTLE',
  ECONOMY: 'ECONOMY',
  ACHIEVEMENT: 'ACHIEVEMENT'
});

/** 'normal' stays until closed by the player, 'temporary' disappears by itself. */
export const NotificationTypes = Object.freeze({
  NORMAL: 'normal',
  TEMPORARY: 'temporary'
});

/** Semantic tones: each maps to a `.pw-toast--tone-<tone>` class (notifications.css). */
export const NotificationTones = Object.freeze({
  SUCCESS: 'success',
  DANGER: 'danger',
  INFO: 'info',
  ACCENT: 'accent',
  WARNING: 'warning'
});

/** Lifetime of a temporary notification (ms). */
export const TEMPORARY_NOTIFICATION_MS = 2000;

/** Duration of the toast leave animation (ms), must match notifications.css. */
export const TOAST_LEAVE_ANIMATION_MS = 200;
