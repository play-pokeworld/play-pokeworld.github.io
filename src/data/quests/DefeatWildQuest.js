/**
 * @file DefeatWildQuest.js
 * @brief Quest specialization: Defeat wild Pokémon (C++: class DefeatWildQuest : public QuestBase).
 */

import { QuestBase } from './QuestBase.js';
import { QuestEventTypes } from './QuestEventTypes.js';

export class DefeatWildQuest extends QuestBase {
  constructor(data = {}) {
    super({ ...data, type: 'defeat_wild' });
  }

  checkEvent(eventType, eventData) {
    if (eventType === QuestEventTypes.WILD_DEFEATED && (!this.loc || this.loc === eventData.loc)) {
      this.advance(1);
    }
  }
}
