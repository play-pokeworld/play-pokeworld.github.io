/**
 * @file AnimationPreferencesChangedEvent.js
 * @brief Emitted when a persisted animation preference changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class AnimationPreferencesChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from a minifiable class name). */
  static TYPE = 'AnimationPreferencesChangedEvent';

  /**
   * @param {string} preferenceId
   * @param {boolean} enabled
   * @param {Record<string, boolean>} preferences
   */
  constructor(preferenceId, enabled, preferences) {
    super(AnimationPreferencesChangedEvent.TYPE);
    /** @type {string} */
    this.preferenceId = preferenceId;
    /** @type {boolean} */
    this.enabled = enabled;
    /** @type {Record<string, boolean>} */
    this.preferences = { ...preferences };
  }
}
