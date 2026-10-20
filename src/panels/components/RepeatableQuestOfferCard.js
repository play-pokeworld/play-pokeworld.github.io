/**
 * @file RepeatableQuestOfferCard.js
 * @brief One persisted repeatable contract offer, rendered entirely with shared UI widgets.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { QuestRewardsView } from './QuestRewardsView.js';
import { t } from '../../localization/LocalizationManager.js';

export class RepeatableQuestOfferCard extends UIContainer {
  /**
   * @param {Readonly<Object>} quest
   * @param {{canAccept:boolean,onAccept:Function}} options
   */
  constructor(quest, { canAccept, onAccept }) {
    super({ className: 'pw-panel pw-quest-card pw-repeatable-offer-card', name: 'RepeatableQuestOfferCard' });
    this.addChild(new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1 pw-quest-card-category',
      text: t('quest_category_repeatable')
    }));
    this.addChild(new UIContainer({
      className: 'pw-repeatable-offer-heading',
      children: [
        new UIIcon({ name: 'refresh', size: 'sm', className: 'pw-repeatable-offer-icon' }),
        new UIText({ tagName: 'div', className: 'pw-quest-card-title', text: t(`quests.repeatable.${quest.id}.title`) })
      ]
    }));
    this.addChild(new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1 pw-quest-card-desc',
      richText: t(`quests.repeatable.${quest.id}.desc`)
    }));
    const rewards = new QuestRewardsView();
    rewards.setRewards(quest.rewards);
    this.addChild(rewards);
    if (canAccept) {
      this.addChild(new UIButton({
        variant: 'hbtn',
        className: 'pw-repeatable-offer-accept',
        text: t('repeatable_offer_accept'),
        onClick: () => onAccept(quest.key)
      }));
    } else {
      this.addChild(new UIText({
        tagName: 'div',
        className: 'pw-text-sm pw-light1 pw-repeatable-slots-full',
        text: t('repeatable_slots_full')
      }));
    }
  }
}
