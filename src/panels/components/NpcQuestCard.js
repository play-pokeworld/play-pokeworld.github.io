/**
 * @file NpcQuestCard.js
 * @brief Read-only NPC quest offer/status card; acceptance is delegated to QuestSystem.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { QuestRewardsView } from './QuestRewardsView.js';
import { t } from '../../localization/LocalizationManager.js';

const STATUS_KEYS = Object.freeze({
  active: 'npc_quest_active',
  ready: 'npc_quest_ready',
  offer: 'npc_quest_offer',
  locked: 'npc_quest_locked',
  completed: 'npc_quest_completed'
});

export class NpcQuestCard extends UIContainer {
  /** @param {{status:Object,onAccept:(key:string)=>void}} options */
  constructor({ status, onAccept }) {
    const { quest, state } = status;
    super({ className: `pw-npc-quest-card pw-npc-quest-card--${state}`, name: 'NpcQuestCard' });
    const baseKey = `quests.${quest.category}.${quest.id}`;
    this.addChildren([
      new UIContainer({
        className: 'pw-npc-quest-card-heading',
        children: [
          new UIText({ tagName: 'span', className: 'pw-npc-quest-category', text: t(`quest_category_${quest.category}`) }),
          new UIText({ tagName: 'span', className: 'pw-npc-quest-state', text: t(STATUS_KEYS[state] || 'npc_quest_locked') })
        ]
      }),
      new UIText({ tagName: 'div', className: 'pw-npc-quest-title', text: t(`${baseKey}.title`) }),
      new UIText({ tagName: 'div', className: 'pw-npc-quest-desc', richText: t(`${baseKey}.desc`) })
    ]);
    if (Number.isFinite(status.count) && status.count > 0 && state !== 'offer' && state !== 'locked') {
      this.addChild(new UIText({
        className: 'pw-npc-quest-progress',
        text: t('npc_quest_progress', { value: status.progress || 0, max: status.count })
      }));
    }
    this.addChild(new QuestRewardsView()).setRewards(quest.rewards);
    if (state === 'offer') {
      this.addChild(new UIButton({
        variant: 'success',
        size: 'sm',
        text: t('npc_quest_accept'),
        onClick: () => onAccept(quest.key)
      }));
    }
  }
}
