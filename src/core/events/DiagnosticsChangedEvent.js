/**
 * @file DiagnosticsChangedEvent.js
 * @brief Emitted when the browser diagnostic error list changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class DiagnosticsChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from a minifiable class name). */
  static TYPE = 'DiagnosticsChangedEvent';

  /** @param {number} count @param {number} max */
  constructor(count, max) {
    super(DiagnosticsChangedEvent.TYPE);
    /** @type {number} */
    this.count = count;
    /** @type {number} */
    this.max = max;
  }
}
