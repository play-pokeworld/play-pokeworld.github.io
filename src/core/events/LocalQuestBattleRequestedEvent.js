/**
 * @file LocalQuestBattleRequestedEvent.js
 * @brief Emitted after the temporary local-quest NPC dialogue is closed.
 */
import { BaseEvent } from '../BaseEvent.js';

export class LocalQuestBattleRequestedEvent extends BaseEvent {
  /** Bus key of this event type (never derived from the minifiable class name). */
  static TYPE = 'LocalQuestBattleRequestedEvent';

  /**
   * @param {string} locationId
   * @param {string} questKey
   */
  constructor(locationId, questKey) {
    super(LocalQuestBattleRequestedEvent.TYPE);
    this.locationId = locationId;
    this.questKey = questKey;
  }
}
