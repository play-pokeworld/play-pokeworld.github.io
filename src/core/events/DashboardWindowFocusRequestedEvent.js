/**
 * @file DashboardWindowFocusRequestedEvent.js
 * @brief Requests mobile navigation to reveal and scroll to a dashboard window.
 */
import { BaseEvent } from '../BaseEvent.js';

export class DashboardWindowFocusRequestedEvent extends BaseEvent {
  static TYPE = 'DashboardWindowFocusRequestedEvent';

  /** @param {string} windowId */
  constructor(windowId) {
    super(DashboardWindowFocusRequestedEvent.TYPE);
    this.windowId = windowId;
  }
}
