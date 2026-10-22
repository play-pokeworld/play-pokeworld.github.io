/**
 * @file BoxPokemonSelectionCancelledEvent.js
 * @brief Generic cancellation of a PC-list selection request.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BoxPokemonSelectionCancelledEvent extends BaseEvent {
  static TYPE = 'BoxPokemonSelectionCancelledEvent';

  /** @param {string} requestId - Opaque request id supplied by the selection caller */
  constructor(requestId) {
    super(BoxPokemonSelectionCancelledEvent.TYPE);
    this.requestId = requestId;
  }
}
