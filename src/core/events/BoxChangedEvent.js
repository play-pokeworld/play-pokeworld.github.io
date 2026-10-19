/**
 * @file BoxChangedEvent.js
 * @brief Emitted by BoxSystem when the content of the PC box changed.
 */

import { BaseEvent } from '../BaseEvent.js';

export class BoxChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BoxChangedEvent';

  /**
   * @param {number} boxSize - Number of Pokémon in the box
   */
  constructor(boxSize) {
    super(BoxChangedEvent.TYPE);
    /** @type {number} */
    this.boxSize = boxSize;
  }
}
