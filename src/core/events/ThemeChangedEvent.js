/**
 * @file ThemeChangedEvent.js
 * @brief Emitted by PreferencesSystem when the colour theme changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class ThemeChangedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'ThemeChangedEvent';

  /**
   * @param {string} themeId - UiThemes id
   */
  constructor(themeId) {
    super(ThemeChangedEvent.TYPE);
    /** @type {string} */
    this.themeId = themeId;
  }
}
