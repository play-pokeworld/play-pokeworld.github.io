/**
 * @file DebugModeChangedEvent.js
 * @brief Emitted by PreferencesSystem when the developer mode is toggled.
 */

import { BaseEvent } from '../BaseEvent.js';

export class DebugModeChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'DebugModeChangedEvent';

  /**
   * @param {boolean} enabled - New developer mode state
   */
  constructor(enabled) {
    super(DebugModeChangedEvent.TYPE);
    /** @type {boolean} */
    this.enabled = enabled;
  }
}
