/**
 * @file ModalToggledEvent.js
 * @brief Emitted when a modal window opens or closes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class ModalToggledEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'ModalToggledEvent';

  /**
   * @param {string} modalName - Object name of the modal
   * @param {boolean} isOpen - New open state
   */
  constructor(modalName, isOpen) {
    super(ModalToggledEvent.TYPE);
    /** @type {string} */
    this.modalName = modalName;
    /** @type {boolean} */
    this.isOpen = isOpen;
  }
}
