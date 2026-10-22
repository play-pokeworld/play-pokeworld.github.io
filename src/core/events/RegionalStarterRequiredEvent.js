/**
 * @file RegionalStarterRequiredEvent.js
 * @brief Requests the UI to collect the player's first starter for an entered region.
 */
import { BaseEvent } from '../BaseEvent.js';

export class RegionalStarterRequiredEvent extends BaseEvent {
  static TYPE = 'RegionalStarterRequiredEvent';

  /** @param {string} regionId */
  constructor(regionId) {
    super(RegionalStarterRequiredEvent.TYPE);
    this.regionId = regionId;
  }
}
