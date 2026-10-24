/**
 * @file TeamChangedEvent.js
 * @brief Emitted by TeamSystem when the order or the content of the active team changed.
 */

import { BaseEvent } from '../BaseEvent.js';

export class TeamChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'TeamChangedEvent';

  /**
   * @param {number} teamSize - Number of Pokémon in the team
   */
  constructor(teamSize, {deferSave=false}={}) {
    super(TeamChangedEvent.TYPE);
    /** @type {number} */
    this.teamSize = teamSize;
    this.deferSave=deferSave;
  }
}
