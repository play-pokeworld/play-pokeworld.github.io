/**
 * @file AtollStateChangedEvent.js
 * @brief Emitted when Atoll tokens, streaks, mode wins, factory runs or fragments change.
 */

import { BaseEvent } from '../BaseEvent.js';

export class AtollStateChangedEvent extends BaseEvent {
  static TYPE = 'AtollStateChangedEvent';

  constructor() {
    super(AtollStateChangedEvent.TYPE);
  }
}
