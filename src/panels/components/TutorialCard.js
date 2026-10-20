/**
 * @file TutorialCard.js
 * @brief Current guided-tutorial step, with rewards rendered from reward data.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { QuestRewardsView, questRewardEntries } from './QuestRewardsView.js';
import { t } from '../../localization/LocalizationManager.js';

export class TutorialCard extends UIContainer {
  /** @param {(status: Object) => void} onAction @param {() => void} onDisable @param {() => void} onGuide */
  constructor(onAction, onDisable, onGuide) {
    super({ className: 'pw-panel pw-quest-card pw-tutorial-card', name: 'TutorialCard' });
    this._onAction = onAction;
    this._title = new UIText({ tagName: 'div', className: 'pw-quest-card-title pw-tutorial-title' });
    this._description = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-quest-card-desc' });
    this._howLabel = new UIText({ tagName: 'div', className: 'pw-text-sm pw-tutorial-how-label', text: t('tutorial_howto') });
    this._how = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-tutorial-how' });
    this._progressText = new UIText({ className: 'pw-tutorial-progress-text' });
    this._progress = new UIProgressBar({ value: 0, max: 1, variant: 'exp', size: 'sm' });
    this._rewards = new QuestRewardsView();
    this._rewards.addClass('pw-tutorial-rewards');
    this._action = new UIButton({
      variant: 'hbtn',
      className: 'pw-tutorial-action',
      text: '',
      onClick: () => this._onAction?.(this._status)
    });
    this._guide = new UIButton({
      variant: 'ghost',
      size: 'sm',
      className: 'pw-tutorial-guide',
      icon: 'help',
      text: t('guide_title'),
      onClick: () => onGuide?.()
    });
    this._disable = new UIButton({
      variant: 'ghost',
      size: 'sm',
      className: 'pw-tutorial-disable',
      text: t('tutorial_disable_all'),
      onClick: () => onDisable?.()
    });
    this.addChildren([
      this._title,
      this._description,
      this._howLabel,
      this._how,
      new UIContainer({
        className: 'pw-progress-label pw-tutorial-progress-label',
        children: [new UIText({ text: t('quest_progress_label') }), this._progressText]
      }),
      this._progress,
      this._rewards,
      new UIContainer({ className: 'pw-tutorial-actions', children: [this._action, this._guide, this._disable] })
    ]);
  }

  /** @param {Object} status */
  setStatus(status) {
    this._status = status;
    this._title.setText(t('tutorial_card_title', { index: status.index, total: status.total, title: status.title }));
    this._description.setText(status.description);
    this._how.setText(status.how);
    this._progressText.setText(status.progressText);
    this._progress.setValue(status.progress, status.target);
    this._rewards.setRewards(status.rewardData);
    this._rewards.toggleClass('is-empty', questRewardEntries(status.rewardData).length === 0);
    this._action.setText(status.actionLabel);
  }
}
