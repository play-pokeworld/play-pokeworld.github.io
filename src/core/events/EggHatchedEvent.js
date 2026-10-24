/**
 * @file EggHatchedEvent.js
 * @brief Emitted when an egg hatches in the hatchery.
 */

import { BaseEvent } from '../BaseEvent.js';

export class EggHatchedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'EggHatchedEvent';

  /**
   * @param {string} speciesId - PokemonDB id of the newborn
   */
  constructor(speciesId, { deferSave = false } = {}) {
    super(EggHatchedEvent.TYPE);
    /** @type {string} */
    this.speciesId = speciesId;
    this.deferSave = deferSave;
  }
}
