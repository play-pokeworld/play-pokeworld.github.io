/** Signals that a newer application version is available. */
import { BaseEvent } from '../BaseEvent.js';

export class UpdateAvailableEvent extends BaseEvent {
  static TYPE = 'UpdateAvailableEvent';

  /** @param {string} version */
  constructor(version) {
    super(UpdateAvailableEvent.TYPE);
    this.version = version;
  }
}
