/**
 * @file MineChangedEvent.js
 * @brief Emitted after mine energy, tools, grid or loot changes.
 */
import { BaseEvent } from '../BaseEvent.js';

export class MineChangedEvent extends BaseEvent {
  static TYPE = 'MineChangedEvent';

  /** @param {string} reason */
  constructor(reason) {
    super(MineChangedEvent.TYPE);
    this.reason = reason;
  }
}
