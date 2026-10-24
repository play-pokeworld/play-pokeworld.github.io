/** @file TrainingModeCard.js @brief Colored mode description, with a real action only when eligible and unlocked. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';
import { FacilityUiRules } from '../../config/FacilityUiRules.js';
import { t } from '../../localization/LocalizationManager.js';
export class TrainingModeCard extends UIContainer {
  /** @param {string} mode @param {Function} onClick */
  constructor(mode, onClick) {
    super({
      className: `training-mode-row training-mode--${mode}`,
      name: 'TrainingModeCard',
    });
    this._mode = mode;
    this._title = new UIText({
      tagName: 'b',
      text: t(FacilityUiRules.MODE_KEYS[mode]),
    });
    this._description = new UIText({
      tagName: 'small',
      text: t(`training_mode_${mode}_desc`),
    });
    this._status = new UIText({ className: 'training-mode-status' });
    this._button = new UIButton({
      className: 'pw-training-mode-action',
      onClick,
    });
    this._button.setAriaLabel(t(FacilityUiRules.MODE_KEYS[mode]));
    this.addChildren([
      this._title,
      this._description,
      this._status,
      this._button,
    ]);
  }
  /** @param {Object} mode @param {boolean} blocked */
  setModel(mode, blocked) {
    const enabled = mode.unlocked && mode.eligible && !blocked;
    this._button.setVisible(enabled);
    this._status.setVisible(!enabled);
    this._status.setText(
      !mode.unlocked
        ? t(
            FacilityUiRules.MODE_GATES[this._mode] ||
              'facility_training_unlock_hint',
          )
        : !mode.eligible
          ? t(`training_mode_${this._mode}_done`)
          : t('training_battle_active'),
    );
    this.toggleClass('is-disabled', !enabled);
  }
}
