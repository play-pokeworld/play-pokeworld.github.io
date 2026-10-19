/**
 * @file TalkObjective.js
 * @brief Talk to the NPCs of the quest location (original talk). A main talk quest is claimed at once,
 * like the original talkNpcMainQuest().
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { NpcTalkedEvent } from '../../../core/events/NpcTalkedEvent.js';

export class TalkObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.TALK;
  static EVENTS = [NpcTalkedEvent];
  static AUTO_CLAIM = true;

  /** @override */
  progressFor(event, context) {
    const location = this.quest.location;
    return !location || context.sameLocationGroup(event.locationId, location) ? this.count : 0;
  }

  /** @override */
  describe() {
    return { count: this.count, location: this.quest.location || null };
  }
}
