/**
 * @file StoryPanel.js
 * @brief Story & quests window: current main quest card (C++: class StoryPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { QuestDB } from '../data/QuestDB.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
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
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const region = SaveSystem.getInstance().getCurrentSave()?.player.region ?? PlayerDefaults.REGION;
    const quest = QuestDB.getInstance().getActiveStoryQuest(region, 0);
    if (!quest) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-empty-center', text: t('story_no_quest') }));
      return;
    }

    const keyBase = `quests.${quest.category}.${quest.id}`;
    const title = t(`${keyBase}.title`);
    const done = quest.isCompleted();
    const bar = new UIProgressBar({
      value: quest.progress,
      max: quest.target,
      trackClassName: 'pw-progress-bar-sm quest-progress-container',
      fillClassName: 'quest-progress-bar'
    });
    bar.setFillState(done ? 'is-done' : '');

    this.addChild(new UIContainer({
      className: 'pw-panel pw-quest-card',
      children: [
        new UIText({ tagName: 'div', className: 'pw-quest-card-title', text: title }),
        new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-quest-card-desc', richText: t(`${keyBase}.desc`) }),
        new UIContainer({
          className: 'pw-progress-label',
          children: [
            new UIText({ text: t('quest_progress_label') }),
            new UIText({ text: t('value_over_max', { value: quest.progress, max: quest.target }) })
          ]
        }),
        bar,
        new UIText({ tagName: 'div', className: 'pw-quest-reward', richText: t(`${keyBase}.rewardDesc`) }),
        new UIButton({
          variant: 'hbtn',
          className: `quest-claim-btn ${done ? 'is-done' : ''}`.trim(),
          text: t(done ? 'quest_claim_btn' : 'quest_in_progress_btn'),
          onClick: () => NotificationSystem.getInstance().notify(
            t(done ? 'quest_reward_claimed' : 'quest_still_in_progress', { title }),
            { channel: NotificationChannels.ACHIEVEMENT, tone: NotificationTones.WARNING }
          )
        })
      ]
    }));
  }
}
