/**
 * @file MineQuest.js
 * @brief Quest specialization: Mining sell (C++: class MineQuest : public QuestBase).
 */

import { QuestBase } from './QuestBase.js';
import { QuestEventTypes } from './QuestEventTypes.js';

export class MineQuest extends QuestBase {
  constructor(data = {}) {
    super({ ...data, type: 'mine_sell' });
  }

  checkEvent(eventType, eventData) {
    if (eventType === QuestEventTypes.MINE_SELL) {
      this.advance(eventData.amount || 1);
    }
  }
}
