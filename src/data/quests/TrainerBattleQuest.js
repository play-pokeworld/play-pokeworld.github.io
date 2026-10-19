/**
 * @file TrainerBattleQuest.js
 * @brief Quest specialization: Trainer / Gym battle (C++: class TrainerBattleQuest : public QuestBase).
 */

import { QuestBase } from './QuestBase.js';
import { QuestEventTypes } from './QuestEventTypes.js';

export class TrainerBattleQuest extends QuestBase {
  constructor(data = {}) {
    super({ ...data, type: 'trainer_battle' });
  }

  checkEvent(eventType, eventData) {
    if (eventType === QuestEventTypes.TRAINER_DEFEATED) {
      this.advance(1);
    }
  }
}
