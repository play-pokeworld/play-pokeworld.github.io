/**
 * @file QuestDB.js
 * @brief Singleton repository managing all quests and storyline progression (C++: class QuestDB : public BaseObject).
 * Instantiates strongly-typed QuestBase subclasses from authentic quest data.
 */

import { BaseObject } from '../core/BaseObject.js';
import { QuestBase } from './quests/QuestBase.js';
import { TalkQuest } from './quests/TalkQuest.js';
import { DefeatWildQuest } from './quests/DefeatWildQuest.js';
import { TrainerBattleQuest } from './quests/TrainerBattleQuest.js';
import { CatchQuest } from './quests/CatchQuest.js';
import { MineQuest } from './quests/MineQuest.js';
import { STORY_QUESTS } from './raw/story-quests.js';
import { SIDE_QUESTS } from './raw/side-quests-data.js';
import { REPEATABLE_QUESTS } from './raw/repeatable-quests-data.js';

export class QuestDB extends BaseObject {
  /** @type {QuestDB|null} */
  static _instance = null;

  /** @returns {QuestDB} */
  static getInstance() {
    if (!QuestDB._instance) {
      QuestDB._instance = new QuestDB();
    }
    return QuestDB._instance;
  }

  constructor() {
    super('QuestDB', 'Data');

    /** @private @type {Map<string, QuestBase>} */
    this._quests = new Map();

    /** @private @type {QuestBase[]} */
    this._storyQuests = [];

    /** @private @type {Map<string, QuestBase>} */
    this._sideQuests = new Map();

    /** @private @type {QuestBase[]} */
    this._repeatableQuests = [];

    this.init();
  }

  /**
   * Factory method creating strongly-typed Quest instances
   * @private
   */
  _createQuestInstance(category, data) {
    const raw = { ...data, category };
    switch (data.type) {
      case 'talk':
        return new TalkQuest(raw);
      case 'defeat_wild':
        return new DefeatWildQuest(raw);
      case 'trainer_battle':
        return new TrainerBattleQuest(raw);
      case 'catch':
        return new CatchQuest(raw);
      case 'mine_sell':
        return new MineQuest(raw);
      default:
        return new QuestBase(raw);
    }
  }

  init() {
    if (this._quests.size > 0) return;

    // 1. Story Quests
    (STORY_QUESTS || []).forEach(sq => {
      const q = this._createQuestInstance('main', sq);
      this._storyQuests.push(q);
      this._quests.set(`main_${q.id}`, q);
    });

    // 2. Side Quests
    for (const [id, sq] of Object.entries(SIDE_QUESTS || {})) {
      const q = this._createQuestInstance('side', sq);
      this._sideQuests.set(id, q);
      this._quests.set(`side_${id}`, q);
    }

    // 3. Repeatable Quests
    (REPEATABLE_QUESTS || []).forEach(rq => {
      const q = this._createQuestInstance('repeatable', rq);
      this._repeatableQuests.push(q);
      this._quests.set(`repeatable_${q.id}`, q);
    });
  }

  /**
   * Get main story quest by index/id
   * @param {number|string} id
   * @returns {QuestBase|null}
   */
  getMainQuest(id) {
    return this._quests.get(`main_${id}`) || null;
  }

  /**
   * Get current active story quest for a region
   * @param {string} [region='kanto']
   * @param {number} [completedCount=0]
   * @returns {QuestBase|null}
   */
  getActiveStoryQuest(region = 'kanto', completedCount = 0) {
    const regionQuests = this._storyQuests.filter(q => q.region === region);
    return regionQuests[completedCount] || regionQuests[0] || null;
  }

  /** @returns {QuestBase[]} */
  getStoryQuests() {
    return [...this._storyQuests];
  }

  /** @returns {QuestBase[]} */
  getRepeatableQuests() {
    return [...this._repeatableQuests];
  }

  /** @returns {number} */
  get count() {
    return this._quests.size;
  }
}

