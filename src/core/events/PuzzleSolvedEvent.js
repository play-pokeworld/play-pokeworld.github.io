/**
 * @file PuzzleSolvedEvent.js
 * @brief Emitted when an exploration puzzle is solved.
 */

import { BaseEvent } from '../BaseEvent.js';

export class PuzzleSolvedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PuzzleSolvedEvent';

  /**
   * @param {string} puzzleId - Puzzle id
   * @param {string} locationId - Location of the puzzle
   * @param {{deferSave?:boolean,firstTime?:boolean}} [options]
   */
  constructor(puzzleId, locationId, { deferSave = false, firstTime = false } = {}) {
    super(PuzzleSolvedEvent.TYPE);
    /** @type {string} */
    this.puzzleId = puzzleId;
    /** @type {string} */
    this.locationId = locationId;
    /** @type {boolean} Broader puzzle transaction owns persistence when true. */
    this.deferSave = deferSave === true;
    /** @type {boolean} Whether this was the first recorded clear. */
    this.firstTime = firstTime === true;
  }
}
