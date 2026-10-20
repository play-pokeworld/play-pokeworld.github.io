/**
 * @file TrainingSessionCompletedEvent.js
 * @brief Emitted once a training session ends, whether it was won or lost.
 */
import { BaseEvent } from '../BaseEvent.js';

export class TrainingSessionCompletedEvent extends BaseEvent {
  static TYPE = 'TrainingSessionCompletedEvent';

  /**
   * @param {number} count
   * @param {{deferSave?: boolean}} [options]
   */
  constructor(count, { deferSave = false } = {}) {
    super(TrainingSessionCompletedEvent.TYPE);
    this.count = count;
    this.deferSave = deferSave;
  }
}
