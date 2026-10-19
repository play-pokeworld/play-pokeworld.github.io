/**
 * @file PageChangeEvent.js
 * @brief Emitted by PageManager after the active page changed.
 */

import { BaseEvent } from '../BaseEvent.js';

export class PageChangeEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'PageChangeEvent';

  /**
   * @param {string} fromPage - Previous page id (or empty string)
   * @param {string} toPage - New page id
   * @param {Object} [params={}] - Navigation parameters
   */
  constructor(fromPage, toPage, params = {}) {
    super(PageChangeEvent.TYPE);
    /** @type {string} */
    this.fromPage = fromPage;
    /** @type {string} */
    this.toPage = toPage;
    /** @type {Object} */
    this.params = params;
  }
}
