/**
 * @file TutorialProgressChangedEvent.js
 * @brief Emitted when tutorial completion, rewards or visibility change.
 */
import { BaseEvent } from '../BaseEvent.js';

export class TutorialProgressChangedEvent extends BaseEvent {
  static TYPE = 'TutorialProgressChangedEvent';

  /** @param {string|null} stepId @param {boolean} enabled */
  constructor(stepId, enabled) {
    super(TutorialProgressChangedEvent.TYPE);
    this.stepId = stepId;
    this.enabled = !!enabled;
  }
}
