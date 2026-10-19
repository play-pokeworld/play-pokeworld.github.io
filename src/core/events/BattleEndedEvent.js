/**
 * @file BattleEndedEvent.js
 * @brief Emitted by BattleSystem when the current battle ends.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BattleEndedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BattleEndedEvent';

  /**
   * @param {boolean} victory - True when the foe was defeated
   * @param {number} [expGained=0] - Experience gained
   * @param {number} [moneyGained=0] - Money gained
   */
  constructor(victory, expGained = 0, moneyGained = 0) {
    super(BattleEndedEvent.TYPE);
    /** @type {boolean} */
    this.victory = victory;
    /** @type {number} */
    this.expGained = expGained;
    /** @type {number} */
    this.moneyGained = moneyGained;
  }
}
