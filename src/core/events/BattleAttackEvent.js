/**
 * @file BattleAttackEvent.js
 * @brief Emitted by BattleSystem after each attack (feeds the battle timeline).
 */

import { BaseEvent } from '../BaseEvent.js';

export class BattleAttackEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BattleAttackEvent';

  /**
   * @param {Object} attack
   * @param {string} attack.side - CombatSides value of the attacker
   * @param {string} attack.moveId - MoveDB id
   * @param {string} attack.moveType - Lowercase type id of the move
   * @param {number} attack.damage - HP removed from the defender
   * @param {number} attack.effectiveness - Type multiplier (0, 0.25, 0.5, 1, 2, 4)
   */
  constructor(attack) {
    super(BattleAttackEvent.TYPE);
    /** @type {string} */
    this.side = attack.side;
    /** @type {string} */
    this.moveId = attack.moveId;
    /** @type {string} */
    this.moveType = attack.moveType;
    /** @type {number} */
    this.damage = attack.damage;
    /** @type {number} */
    this.effectiveness = attack.effectiveness;
  }
}
