/**
 * @file BonusChangedEvent.js
 * @brief Emitted when one or more registered gameplay bonus sources change.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BonusChangedEvent extends BaseEvent {
  static TYPE = 'BonusChangedEvent';

  /** @param {string[]} sourceIds @param {string[]} types */
  constructor(sourceIds = [], types = []) {
    super(BonusChangedEvent.TYPE);
    this.sourceIds = [...new Set(sourceIds.filter(Boolean))];
    this.types = [...new Set(types.filter(Boolean))];
  }
}
