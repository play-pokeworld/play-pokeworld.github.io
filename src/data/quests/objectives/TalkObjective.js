/**
 * @file TalkObjective.js
 * @brief A talk objective is satisfied by a conversation in its target location.
 * Quest-offer NPC identity is intentionally separate from objective progression: any NPC in the
 * same location group can count once the quest is active.
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
