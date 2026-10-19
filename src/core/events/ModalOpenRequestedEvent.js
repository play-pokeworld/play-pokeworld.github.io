/**
 * @file ModalOpenRequestedEvent.js
 * @brief Asks the modal with the given id to open (handled by UIModal itself).
 */

import { BaseEvent } from '../BaseEvent.js';

export class ModalOpenRequestedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'ModalOpenRequestedEvent';

  /**
   * @param {string} modalId - ModalIds value
   * @param {Object} [params={}] - Forwarded to UIModal.open()
   */
  constructor(modalId, params = {}) {
    super(ModalOpenRequestedEvent.TYPE);
    /** @type {string} */
    this.modalId = modalId;
    /** @type {Object} */
    this.params = params;
  }
}
