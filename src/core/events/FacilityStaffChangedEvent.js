/**
 * @file FacilityStaffChangedEvent.js
 * @brief A staff hire, assignment or progression changed after a complete mutation.
 */
import { BaseEvent } from '../BaseEvent.js';
export class FacilityStaffChangedEvent extends BaseEvent {
  static TYPE = 'FacilityStaffChangedEvent';
  /** @param {string} sector */
  constructor(sector) { super(FacilityStaffChangedEvent.TYPE); this.sector = sector; }
}
