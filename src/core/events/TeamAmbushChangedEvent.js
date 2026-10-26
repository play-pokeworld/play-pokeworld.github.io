/**
 * @file TeamAmbushChangedEvent.js
 * @brief Emitted when an enemy team ambush is cleared or updated.
 */

import { BaseEvent } from '../BaseEvent.js';

export class TeamAmbushChangedEvent extends BaseEvent {
  static TYPE = 'TeamAmbushChangedEvent';

  constructor() {
    super(TeamAmbushChangedEvent.TYPE);
  }
}
