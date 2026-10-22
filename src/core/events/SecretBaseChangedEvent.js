/**
 * @file SecretBaseChangedEvent.js
 * @brief Emitted after the secret-base model or transient visit changes.
 */
import { BaseEvent } from '../BaseEvent.js';

export class SecretBaseChangedEvent extends BaseEvent {
  static TYPE = 'SecretBaseChangedEvent';

  /** @param {string} reason @param {Object|null} [snapshot=null] */
  constructor(reason, snapshot = null) {
    super(SecretBaseChangedEvent.TYPE);
    this.reason = reason || 'changed';
    this.snapshot = snapshot;
  }
}
