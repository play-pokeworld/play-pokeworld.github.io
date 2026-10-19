/**
 * @file SaveLoadedEvent.js
 * @brief Emitted after a save slot became the active save.
 */

import { BaseEvent } from '../BaseEvent.js';

export class SaveLoadedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'SaveLoadedEvent';

  /**
   * @param {string} slotId - Save id
   * @param {SaveData} saveData - Loaded save
   */
  constructor(slotId, saveData) {
    super(SaveLoadedEvent.TYPE);
    /** @type {string} */
    this.slotId = slotId;
    /** @type {SaveData} */
    this.saveData = saveData;
  }
}
