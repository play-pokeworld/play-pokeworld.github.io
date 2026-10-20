/**
 * @file TrainingBattleChangedEvent.js
 * @brief Emitted when a training session starts, progresses, or ends.
 */
import { BaseEvent } from '../BaseEvent.js';

export class TrainingBattleChangedEvent extends BaseEvent {
  static TYPE = 'TrainingBattleChangedEvent';

  /** @param {Object|null} state */
  constructor(state) {
    super(TrainingBattleChangedEvent.TYPE);
    this.state = state;
  }
}
