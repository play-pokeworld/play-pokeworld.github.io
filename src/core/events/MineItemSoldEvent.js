/**
 * @file MineItemSoldEvent.js
 * @brief Emitted when mine treasure is sold; the quest objective counts units.
 */
import { BaseEvent } from '../BaseEvent.js';

export class MineItemSoldEvent extends BaseEvent {
  static TYPE = 'MineItemSoldEvent';

  /**
   * @param {number} count
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(count, { deferSave = false } = {}) {
    super(MineItemSoldEvent.TYPE);
    this.count = count;
    this.deferSave = deferSave;
  }
}
