/**
 * @file WindowReorderedEvent.js
 * @brief Emitted by DashboardLayoutSystem after a dashboard window was dropped.
 */

import { BaseEvent } from '../BaseEvent.js';

export class WindowReorderedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'WindowReorderedEvent';

  /**
   * @param {string} windowId - DOM id of the moved window
   * @param {string} targetColumn - Destination column (DashboardColumns value)
   * @param {number} newIndex - Index inside the destination column
   */
  constructor(windowId, targetColumn, newIndex) {
    super(WindowReorderedEvent.TYPE);
    /** @type {string} */
    this.windowId = windowId;
    /** @type {string} */
    this.targetColumn = targetColumn;
    /** @type {number} */
    this.newIndex = newIndex;
  }
}
