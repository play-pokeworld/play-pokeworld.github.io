/** Signals that the player dismissed the update notice for this session. */
import { BaseEvent } from '../BaseEvent.js';

export class UpdateBannerDismissedEvent extends BaseEvent {
  static TYPE = 'UpdateBannerDismissedEvent';

  constructor() {
    super(UpdateBannerDismissedEvent.TYPE);
  }
}
