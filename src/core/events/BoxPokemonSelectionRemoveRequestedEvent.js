/**
 * @file BoxPokemonSelectionRemoveRequestedEvent.js
 * @brief Generic request for the caller to remove the selection target instead of choosing a PC entry.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BoxPokemonSelectionRemoveRequestedEvent extends BaseEvent {
  static TYPE = 'BoxPokemonSelectionRemoveRequestedEvent';

  /** @param {string} requestId - Opaque id supplied by the selection caller */
  constructor(requestId) {
    super(BoxPokemonSelectionRemoveRequestedEvent.TYPE);
    this.requestId = requestId;
  }
}
