/**
 * @file CatchQuest.js
 * @brief Quest specialization: Catch Pokémon (C++: class CatchQuest : public QuestBase).
 */

import { QuestBase } from './QuestBase.js';
import { QuestEventTypes } from './QuestEventTypes.js';

export class CatchQuest extends QuestBase {
  constructor(data = {}) {
    super({ ...data, type: 'catch' });
  }

  checkEvent(eventType) {
    if (eventType === QuestEventTypes.POKEMON_CAUGHT) {
      this.advance(1);
    }
  }
}
