/**
 * @file DungeonBattleResolvedEvent.js
 * @brief BattleSystem's settlement hand-off to the active dungeon expedition.
 */
import { BaseEvent } from '../BaseEvent.js';

export class DungeonBattleResolvedEvent extends BaseEvent {
  static TYPE = 'DungeonBattleResolvedEvent';

  /** @param {string} locationId @param {string|null} nodeId @param {boolean} victory @param {string} speciesId @param {Object|null} battleRun */
  constructor(locationId, nodeId, victory, speciesId, battleRun = null) {
    super(DungeonBattleResolvedEvent.TYPE);
    this.locationId = locationId;
    this.nodeId = nodeId;
    this.victory = !!victory;
    this.speciesId = speciesId;
    this.battleRun = battleRun ? JSON.parse(JSON.stringify(battleRun)) : null;
  }
}
