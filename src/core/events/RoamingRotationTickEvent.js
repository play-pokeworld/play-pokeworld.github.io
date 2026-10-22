/**
 * @file RoamingRotationTickEvent.js
 * @brief Emitted once per real-time second so views can refresh the shared 12-hour rotation timer.
 */
import { BaseEvent } from '../BaseEvent.js';

export class RoamingRotationTickEvent extends BaseEvent {
  static TYPE = 'RoamingRotationTickEvent';

  /** @param {number} timestamp - Milliseconds since the Unix epoch */
  constructor(timestamp) {
    super(RoamingRotationTickEvent.TYPE);
    this.timestamp = timestamp;
  }
}
