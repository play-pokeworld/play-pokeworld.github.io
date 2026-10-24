/** @file SaveCheckpointRequestedEvent.js @brief Browser lifecycle requests a synchronous checkpoint. */
import { BaseEvent } from '../BaseEvent.js';
export class SaveCheckpointRequestedEvent extends BaseEvent {
  static TYPE = 'SaveCheckpointRequestedEvent';
  constructor() { super(SaveCheckpointRequestedEvent.TYPE); }
}
