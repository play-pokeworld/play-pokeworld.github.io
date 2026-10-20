/**
 * @file BallFiltersCommitEvent.js
 * @brief Pre-save notification after a Poké Ball filter mutation, for transactional side effects.
 */
import { BaseEvent } from '../BaseEvent.js';

export class BallFiltersCommitEvent extends BaseEvent {
  static TYPE = 'BallFiltersCommitEvent';

  /** @param {string|null} filterId */
  constructor(filterId) {
    super(BallFiltersCommitEvent.TYPE);
    this.filterId = filterId;
  }
}
