/**
 * @file QuestCard.js
 * @brief Card of one active quest: title, description, objective, progress, rewards and action
 * (C++: class QuestCard : public UIContainer). StoryPanel builds one card per active quest and
 * refreshes it in place with setStatus().
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { QuestRewardsView } from './QuestRewardsView.js';
import { t } from '../../localization/LocalizationManager.js';

/** @param {string} key @param {string} fallback @returns {string} */
function translatedOr(key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

/**
 * Display the same actionable objective text used by the story quest journal.
 * Counter objectives keep the compact numeric progress row and bar.
 * @param {import('../../systems/QuestSystem.js').QuestStatus} status
 * @returns {{text:string,hint:string,hideProgress:boolean,isTrainer:boolean}}
 */
function objectivePresentation(status) {
  const { quest, objective, complete } = status;
  const type = quest.objective?.type;
  const details = objective?.describe?.() || {};

  if (type === 'talk') {
    return { text: t(complete ? 'm.quest_ui.23' : 'm.quest_ui.22'), hint: '', hideProgress: true, isTrainer: false };
  }
  if (type === 'badge') {
    return { text: t(complete ? 'm.quest_ui.25' : 'm.quest_ui.24'), hint: '', hideProgress: true, isTrainer: false };
  }
  if (type === 'item') {
    const itemId = details.item || quest.objective.item || quest.objective.requiredItem || '';
    const itemKey = `item.${itemId}.name`;
    const itemName = translatedOr(itemKey, itemId);
    return {
      text: t(complete ? 'quest_item_obtained' : 'quest_item_obtain', { item: itemName }),
      hint: '',
      hideProgress: true,
      isTrainer: false
    };
  }
  if (type === 'boss') {
    const trainerId = details.trainer || quest.objective.trainer || '';
    const trainerKey = `trainer.${trainerId}.name`;
    const trainerName = translatedOr(trainerKey, trainerId);
    return {
      text: t('trainer_battle_target', { trainer: trainerName }),
      hint: complete ? t('trainer_battle_done') : t('trainer_battle_hint'),
      hideProgress: true,
      isTrainer: true
    };
  }
  return { text: '', hint: '', hideProgress: false, isTrainer: false };
}

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
    this._objectiveText = new UIText({ tagName: 'div', className: 'pw-light2 pw-quest-objective-text' });
    this._objectiveHint = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-quest-info-line' });
    this._objectiveBlock = new UIContainer({
      className: 'pw-quest-objective',
      children: [this._objectiveText, this._objectiveHint]
    });
    this._progressText = new UIText();
    this._progressLabel = new UIContainer({
      className: 'pw-progress-label',
      children: [new UIText({ text: t('quest_progress_label') }), this._progressText]
    });
    this._bar = new UIProgressBar({ value: 0, max: 1, trackClassName: 'pw-progress-bar-sm quest-progress-container', fillClassName: 'quest-progress-bar' });
    this._reward = new QuestRewardsView();
    this._inProgressText = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1 pw-quest-info-line',
      text: t('m.quest_ui.20')
    });
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
      this._objectiveBlock,
      this._progressLabel,
      this._bar,
      this._reward,
      this._inProgressText,
      this._claim
    ]);
  }

  /**
   * @param {import('../../systems/QuestSystem.js').QuestStatus} status
   * @param {boolean} [canChallenge=false] - The objective is a trainer battle (boss / badge)
   * @param {number|null} [displayIndex=null] - Story-chain number; omitted for side/repeatable quests
   */
  setStatus(status, canChallenge = false, displayIndex = null) {
    const { quest, progress, count, complete } = status;
    const objective = objectivePresentation(status);
    this._challenging = canChallenge && !complete;
    const keyBase = `quests.${quest.category}.${quest.id}`;
    const title = t(`${keyBase}.title`);
    this._questKey = quest.key;
    this._category.setText(t(`quest_category_${quest.category}`));
    this._category.setVisible(quest.category !== 'main');
    this._title.setText(
      Number.isInteger(displayIndex) && displayIndex > 0
        ? t('quest_numbered_title', { index: displayIndex, title })
        : title
    );
    this._desc.setRichText(t(`${keyBase}.desc`));
    this._objectiveText.setText(objective.text);
    this._objectiveHint.setText(objective.hint);
    this._objectiveBlock.toggleClass('is-trainer', objective.isTrainer);
    this._objectiveBlock.setVisible(Boolean(objective.text || objective.hint));
    this._objectiveHint.setVisible(Boolean(objective.hint));
    this._progressLabel.setVisible(!objective.hideProgress);
    this._bar.setVisible(!objective.hideProgress);
    this._progressText.setText(t('value_over_max', { value: progress, max: count }));
    this._bar.setValue(progress, count);
    this._bar.setFillState(complete ? 'is-done' : '');
    this._reward.setRewards(quest.rewards);
    this._inProgressText.setVisible(!complete && !this._challenging);
    this._claim.setVisible(complete || this._challenging);
    this._claim.setText(t(complete ? 'quest_claim_btn' : 'quest_challenge_btn'));
    this._claim.toggleClass('is-done', complete);
    this._claim.toggleClass('is-challenge', this._challenging);
    this._claim.setEnabled(complete || this._challenging);
  }
}
