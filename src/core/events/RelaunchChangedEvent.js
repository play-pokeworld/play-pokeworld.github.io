/** @file RelaunchChangedEvent.js @brief Relaunch ownership, preference or transient countdown changed. */
import { BaseEvent } from '../BaseEvent.js';
export class RelaunchChangedEvent extends BaseEvent {
  static TYPE = 'RelaunchChangedEvent';
  constructor(kind = null) {
    super(RelaunchChangedEvent.TYPE);
    this.kind = kind;
  }
}
