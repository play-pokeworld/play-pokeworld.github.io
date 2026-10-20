/**
 * @file TeamPresetsChangedEvent.js
 * @brief Emitted after a saved team preset or the active preset id changes.
 */
import { BaseEvent } from '../BaseEvent.js';

export class TeamPresetsChangedEvent extends BaseEvent {
  static TYPE = 'TeamPresetsChangedEvent';

  /** @param {string|null} [presetId=null] */
  constructor(presetId = null) {
    super(TeamPresetsChangedEvent.TYPE);
    /** @type {string|null} */
    this.presetId = presetId;
  }
}
