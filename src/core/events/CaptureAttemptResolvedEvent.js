/**
 * @file CaptureAttemptResolvedEvent.js
 * @brief Emitted after a selected Poké Ball has resolved as a catch or escape.
 */

import { BaseEvent } from '../BaseEvent.js';

export class CaptureAttemptResolvedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from a minifiable class name). */
  static TYPE = 'CaptureAttemptResolvedEvent';

  /** @param {{speciesId:string, form:string, name:string, shiny:boolean, ballId:string, rate:number, caught:boolean, duplicate:boolean}} result */
  constructor(result) {
    super(CaptureAttemptResolvedEvent.TYPE);
    /** @type {string} */
    this.speciesId = result.speciesId;
    /** @type {string} */
    this.form = result.form || '';
    /** @type {string} */
    this.name = result.name;
    /** @type {boolean} */
    this.shiny = !!result.shiny;
    /** @type {string} */
    this.ballId = result.ballId;
    /** @type {number} */
    this.rate = Math.max(0, Math.min(100, Number(result.rate) || 0));
    /** @type {boolean} */
    this.caught = !!result.caught;
    /** @type {boolean} */
    this.duplicate = !!result.duplicate;
  }
}
