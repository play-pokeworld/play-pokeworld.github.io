/**
 * @file QuestCard.js
 * @brief Card of one active quest: title, description, progress bar, rewards and claim button
 * (C++: class QuestCard : public UIContainer). StoryPanel builds one card per active quest and
 * refreshes it in place with setStatus().
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { questRewardText } from './QuestRewardText.js';
import { t } from '../../localization/LocalizationManager.js';

export class QuestCard extends UIContainer {
  /**
   * @param {Object} options
   * @param {Function} options.onClaim - Receives the quest key (completed quest)
   * @param {Function} options.onChallenge - Receives the quest key (trainer quest in progress)
   */
  constructor({ onClaim, onChallenge }) {
    super({ className: 'pw-panel pw-quest-card', name: 'QuestCard' });
    /** @private @type {string} */
    this._questKey = '';
    this._category = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-quest-card-category' });
    this._title = new UIText({ tagName: 'div', className: 'pw-quest-card-title' });
    this._desc = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-quest-card-desc' });
    this._progressText = new UIText();
    this._bar = new UIProgressBar({ value: 0, max: 1, trackClassName: 'pw-progress-bar-sm quest-progress-container', fillClassName: 'quest-progress-bar' });
    this._reward = new UIText({ tagName: 'div', className: 'pw-quest-reward' });
    /** @private @type {boolean} true while the button challenges the quest trainer */
    this._challenging = false;
    this._claim = new UIButton({
      variant: 'hbtn',
      className: 'quest-claim-btn',
      text: '',
      onClick: () => (this._challenging ? onChallenge(this._questKey) : onClaim(this._questKey))
    });
    this.addChildren([
      this._category,
      this._title,
      this._desc,
      new UIContainer({ className: 'pw-progress-label', children: [new UIText({ text: t('quest_progress_label') }), this._progressText] }),
      this._bar,
      this._reward,
      this._claim
    ]);
  }

  /**
   * @param {import('../../systems/QuestSystem.js').QuestStatus} status
   * @param {boolean} [canChallenge=false] - The objective is a trainer battle (boss / badge)
   */
  setStatus(status, canChallenge = false) {
    const { quest, progress, count, complete } = status;
    this._challenging = canChallenge && !complete;
    const keyBase = `quests.${quest.category}.${quest.id}`;
    this._questKey = quest.key;
    this._category.setText(t(`quest_category_${quest.category}`));
    this._title.setText(t(`${keyBase}.title`));
    this._desc.setRichText(t(`${keyBase}.desc`));
    this._progressText.setText(t('value_over_max', { value: progress, max: count }));
    this._bar.setValue(progress, count);
    this._bar.setFillState(complete ? 'is-done' : '');
    this._reward.setRichText(questRewardText(quest.rewards));
    this._claim.setText(t(complete ? 'quest_claim_btn' : this._challenging ? 'quest_challenge_btn' : 'quest_in_progress_btn'));
    this._claim.toggleClass('is-done', complete);
    this._claim.toggleClass('is-challenge', this._challenging);
    this._claim.setEnabled(complete || this._challenging);
  }
}
