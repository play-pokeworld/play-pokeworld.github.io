/**
 * @file SecretBaseVisitChangedEvent.js
 * @brief Emitted when a transient secret-base visit changes position or mode.
 */
import { BaseEvent } from '../BaseEvent.js';

export class SecretBaseVisitChangedEvent extends BaseEvent {
  static TYPE = 'SecretBaseVisitChangedEvent';

  /** @param {string} reason @param {Object|null} [snapshot=null] */
  constructor(reason, snapshot = null) {
    super(SecretBaseVisitChangedEvent.TYPE);
    this.reason = reason || 'changed';
    this.snapshot = snapshot;
  }
}
