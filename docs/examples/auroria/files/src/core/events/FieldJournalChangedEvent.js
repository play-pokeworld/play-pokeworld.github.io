/** @file FieldJournalChangedEvent.js @brief A field site was surveyed through its canonical command. */
import { BaseEvent } from "../BaseEvent.js";
export class FieldJournalChangedEvent extends BaseEvent {
  static TYPE = "FieldJournalChangedEvent";
  constructor(locationId) {
    super(FieldJournalChangedEvent.TYPE);
    this.locationId = locationId;
  }
}
