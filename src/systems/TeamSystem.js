/**
 * @file TeamSystem.js
 * @brief Active team operations (C++ equivalent: class TeamSystem : public BaseSystem). No DOM access.
 * Views never edit the team array themselves: they call this system and listen to TeamChangedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';

export class TeamSystem extends BaseSystem {
  /** @private @type {TeamSystem|null} */
  static _instance = null;

  /** @returns {TeamSystem} */
  static getInstance() {
    if (!TeamSystem._instance) {
      TeamSystem._instance = new TeamSystem();
    }
    return TeamSystem._instance;
  }

  constructor() {
    super('TeamSystem', 'System');
  }

  /** @returns {import('../data/PokemonData.js').PokemonData[]} Team of the active save (live array) */
  getTeam() {
    return SaveSystem.getInstance().getCurrentSave()?.team ?? [];
  }

  /**
   * Puts the Pokémon at `index` in first position (it fights first).
   * @param {number} index
   * @returns {boolean} False when the index is not a valid non-lead position
   */
  setLead(index) {
    const team = this.getTeam();
    if (!Number.isInteger(index) || index <= 0 || index >= team.length) return false;
    [team[0], team[index]] = [team[index], team[0]];
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new TeamChangedEvent(team.length));
    return true;
  }
}
