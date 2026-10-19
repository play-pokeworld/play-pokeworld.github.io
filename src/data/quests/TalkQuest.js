/**
 * @file TalkQuest.js
 * @brief Quest specialization: Talk to NPC (C++: class TalkQuest : public QuestBase).
 */

import { QuestBase } from './QuestBase.js';
import { QuestEventTypes } from './QuestEventTypes.js';

export class TalkQuest extends QuestBase {
  constructor(data = {}) {
    super({ ...data, type: 'talk' });
  }

  checkEvent(eventType, eventData) {
    if (eventType === QuestEventTypes.NPC_TALK && (!this.loc || this.loc === eventData.loc)) {
      this.advance(1);
    }
  }
}
