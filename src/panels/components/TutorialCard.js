/**
 * @file TutorialCard.js
 * @brief Current guided-tutorial step, with actions and device-specific guidance.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { getTutorialDeviceHint } from '../../ui/TutorialDeviceHint.js';
import { t } from '../../localization/LocalizationManager.js';

export class TutorialCard extends UIContainer {
  /** @param {(status: Object) => void} onAction @param {() => void} onDisable @param {() => void} onGuide */
  constructor(onAction, onDisable, onGuide) {
    super({ className: 'pw-panel pw-quest-card pw-tutorial-card', name: 'TutorialCard' });
    this._onAction = onAction;
    this._stepHeading = new UIText({ tagName: 'div', className: 'pw-tutorial-step-heading' });
    this._title = new UIText({ tagName: 'div', className: 'pw-quest-card-title pw-tutorial-title' });
    this._description = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-quest-card-desc' });
    this._howLabel = new UIText({ tagName: 'div', className: 'pw-text-sm pw-tutorial-how-label', text: t('tutorial_howto') });
    this._how = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-tutorial-how-text' });
    this._howBlock = new UIContainer({
      className: 'pw-tutorial-how',
      children: [this._howLabel, this._how]
    });
    this._progressText = new UIText({ className: 'pw-tutorial-progress-text' });
    this._progress = new UIProgressBar({ value: 0, max: 1, variant: 'exp', size: 'lg' });
    this._action = new UIButton({
      variant: 'hbtn',
      className: 'pw-tutorial-action',
      text: '',
      onClick: () => this._onAction?.(this._status)
    });
    this._guide = new UIButton({
      variant: 'secondary',
      size: 'sm',
      className: 'pw-tutorial-guide',
      text: t('guide_title'),
      onClick: () => onGuide?.()
    });
    this._disable = new UIButton({
      variant: 'secondary',
      size: 'sm',
      className: 'pw-tutorial-disable',
      text: t('tutorial_disable_all'),
      onClick: () => onDisable?.()
    });
    this.addChildren([
      new UIContainer({
        className: 'pw-tutorial-heading',
        children: [new UIIcon({ name: 'lightbulb', size: 'sm' }), this._stepHeading]
      }),
      this._title,
      this._description,
      this._howBlock,
      this._progressText,
      this._progress,
      new UIContainer({ className: 'pw-tutorial-actions', children: [this._action, this._guide, this._disable] })
    ]);
  }

  /** @param {Object} status */
  setStatus(status) {
    this._status = status;
    this._stepHeading.setText(t('tutorial_step_lbl', { idx: status.index, total: status.total }));
    this._title.setText(status.title);
    this._description.setText(status.description);
    const deviceHint = status.action === 'route1'
      ? getTutorialDeviceHint('map')
      : status.action === 'pokemon_sheet'
        ? getTutorialDeviceHint('sheet')
        : '';
    this._how.setText([status.how, deviceHint].filter(Boolean).join(' '));
    this._progressText.setText(status.progressText);
    this._progress.setValue(status.progress, status.target);
    this._action.setText(status.actionLabel);
  }
}
