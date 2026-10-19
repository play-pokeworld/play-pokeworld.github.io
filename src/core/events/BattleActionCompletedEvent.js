/**
 * @file BattleActionCompletedEvent.js
 * @brief Emitted by BattleSystem when a battle action granted rewards.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BattleActionCompletedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BattleActionCompletedEvent';

  /**
   * @param {string} actionId - Action identifier
   * @param {number} expGained - Experience gained
   * @param {number} moneyGained - Money gained
   */
  constructor(actionId, expGained, moneyGained) {
    super(BattleActionCompletedEvent.TYPE);
    /** @type {string} */
    this.actionId = actionId;
    /** @type {number} */
    this.expGained = expGained;
    /** @type {number} */
    this.moneyGained = moneyGained;
  }
}
