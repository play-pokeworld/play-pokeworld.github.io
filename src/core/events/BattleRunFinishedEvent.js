/** @file BattleRunFinishedEvent.js @brief Settled context distinguishes natural defeat from voluntary stop. */
import { BaseEvent } from '../BaseEvent.js';
export class BattleRunFinishedEvent extends BaseEvent {
  static TYPE = 'BattleRunFinishedEvent';
  /** @param {string} locationId @param {string} kind @param {string} outcome @param {boolean} natural */
  constructor(locationId, kind, outcome, natural) {
    super(BattleRunFinishedEvent.TYPE);
    this.locationId = locationId;
    this.kind = kind;
    this.outcome = outcome;
    this.natural = natural === true;
  }
}
