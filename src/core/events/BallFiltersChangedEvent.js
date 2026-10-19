/**
 * @file BallFiltersChangedEvent.js
 * @brief Emitted by PokeballSystem when the Poké Ball filters changed (ball, order, options,
 * name, enabled state, creation, deletion, reset).
 */

import { BaseEvent } from '../BaseEvent.js';

export class BallFiltersChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'BallFiltersChangedEvent';

  /**
   * @param {string|null} filterId - Filter concerned, null when the whole list changed
   */
  constructor(filterId) {
    super(BallFiltersChangedEvent.TYPE);
    /** @type {string|null} */
    this.filterId = filterId;
  }
}
