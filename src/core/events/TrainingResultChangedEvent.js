/**
 * @file TrainingResultChangedEvent.js
 * @brief Emitted with the result of a completed training session.
 */
import { BaseEvent } from '../BaseEvent.js';

export class TrainingResultChangedEvent extends BaseEvent {
  static TYPE = 'TrainingResultChangedEvent';

  /** @param {Object} result */
  constructor(result) {
    super(TrainingResultChangedEvent.TYPE);
    this.result = result ? { ...result } : null;
  }
}
