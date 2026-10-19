/**
 * @file StoryPanel.js
 * @brief Story & quests window: one QuestCard per active quest, main quest first
 * (C++: class StoryPanel : public DraggablePanel). Reads QuestSystem, never the save directly.
 */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIText } from '../ui/UIText.js';
import { QuestCard } from './components/QuestCard.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { TrainerSystem } from '../systems/TrainerSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class StoryPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.STORY,
      column,
      title: t('story_quests_title'),
      icon: 'book',
      bodyId: 'story-panel',
      bodyClassName: 'pw-static-022',
      name: 'StoryPanel'
    });
    for (const eventClass of [QuestActivatedEvent, QuestProgressedEvent, QuestClaimedEvent, SaveLoadedEvent, LocationChangedEvent]) {
      this.listen(eventClass, () => this._render());
    }
    this._render();
  }

  /** @private */
  _render() {
    const statuses = QuestSystem.getInstance().getActiveQuests();
    this.clearChildren();
    if (statuses.length === 0) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-empty-center', text: t('story_no_quest') }));
      return;
    }
    for (const status of statuses) {
      const card = new QuestCard({
        onClaim: (key) => this._claim(key),
        onChallenge: (key) => TrainerSystem.getInstance().challengeQuest(key)
      });
      card.setStatus(status, TrainerSystem.getInstance().getQuestOpponent(status.quest.key) !== null);
      this.addChild(card);
    }
  }

  /**
   * @private
   * @param {string} questKey
   */
  _claim(questKey) {
    const status = QuestSystem.getInstance().getStatus(questKey);
    if (!status) return;
    const title = t(`quests.${status.quest.category}.${status.quest.id}.title`);
    if (QuestSystem.getInstance().claim(questKey)) {
      NotificationSystem.getInstance().notify(t('quest_reward_claimed', { title }), {
        channel: NotificationChannels.ACHIEVEMENT, tone: NotificationTones.SUCCESS
      });
    }
  }
}
