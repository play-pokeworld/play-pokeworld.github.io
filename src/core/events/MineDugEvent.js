/**
 * @file MineDugEvent.js
 * @brief Emitted when the mine reveals one or more loot objects.
 */
import { BaseEvent } from '../BaseEvent.js';

export class MineDugEvent extends BaseEvent {
  static TYPE = 'MineDugEvent';

  /**
   * @param {number} count
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(count, { deferSave = false } = {}) {
    super(MineDugEvent.TYPE);
    this.count = count;
    this.deferSave = deferSave;
  }
}
