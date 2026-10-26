/**
 * @file AtollBattleFinishedEvent.js
 * @brief Emitted when an Atoll battle completes with victory or defeat.
 */

import { BaseEvent } from '../BaseEvent.js';

export class AtollBattleFinishedEvent extends BaseEvent {
  static TYPE = 'AtollBattleFinishedEvent';

  /**
   * @param {string} modeKey
   * @param {boolean} victory
   * @param {number} tokensGained
   */
  constructor(modeKey, victory, tokensGained = 0) {
    super(AtollBattleFinishedEvent.TYPE);
    this.modeKey = modeKey;
    this.victory = victory;
    this.tokensGained = tokensGained;
  }
}
