/**
 * @file BoxChangedEvent.js
 * @brief Emitted by BoxSystem when the PC box (the collection of every owned Pokémon) or one of
 * its Pokémon changed.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BoxChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BoxChangedEvent';

  /**
   * @param {number} boxSize - Number of owned Pokémon (whole collection)
   */
  constructor(boxSize, {deferSave=false}={}) {
    super(BoxChangedEvent.TYPE);
    /** @type {number} */
    this.boxSize = boxSize;
    this.deferSave=deferSave;
  }
}
