/** @file TeamPresetDraftChangedEvent.js @brief Signals a transient preset editor update, never a new owned roster. */
import { BaseEvent } from '../BaseEvent.js';
export class TeamPresetDraftChangedEvent extends BaseEvent {
  static TYPE = 'TeamPresetDraftChangedEvent';
  /** @param {string|null} presetId */
  constructor(presetId = null) {
    super(TeamPresetDraftChangedEvent.TYPE);
    this.presetId = presetId;
  }
}
