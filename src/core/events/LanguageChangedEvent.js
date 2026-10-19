/**
 * @file LanguageChangedEvent.js
 * @brief Emitted by LocalizationManager when the active language changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class LanguageChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'LanguageChangedEvent';

  /**
   * @param {string} lang - New language code
   */
  constructor(lang) {
    super(LanguageChangedEvent.TYPE);
    /** @type {string} */
    this.lang = lang;
  }
}
