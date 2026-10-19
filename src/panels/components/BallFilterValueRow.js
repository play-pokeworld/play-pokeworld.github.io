/**
 * @file BallFilterValueRow.js
 * @brief Value option line of the filter editor (type / encounter)
 * (C++: class BallFilterValueRow : public UIContainer). Port of the original valueRow():
 * active → [−] label [menu]; inactive → [+] label (the value starts at normal / route).
 * Base filters show their active value read-only and never list inactive options.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIDropdown } from '../../ui/UIDropdown.js';
import { PokeballSystem } from '../../systems/PokeballSystem.js';
import { BallFilterOptions, BALL_FILTER_TYPES } from '../../data/catch/BallFilterOptions.js';
import { EncounterKinds } from '../../data/catch/EncounterKinds.js';
import { t } from '../../localization/LocalizationManager.js';

export class BallFilterValueRow extends UIContainer {
  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @param {string} option - BallFilterOptions.TYPE | ENCOUNTER
   * @returns {boolean} The line exists for that filter
   */
  static isShown(filter, option) {
    return !filter.isLocked() || !!filter.options[option];
  }

  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @param {{key: string, labelKey: string}} definition - BALL_FILTER_VALUES entry
   */
  constructor(filter, definition) {
    const option = definition.key;
    const value = filter.options[option] ?? null;
    const locked = filter.isLocked();
    super({ className: 'pw-ball-opt-row', name: 'BallFilterValueRow' });
    this.toggleClass('avail', !value);
    const balls = PokeballSystem.getInstance();
    const button = new UIButton({
      className: `pw-ball-opt-btn ${value ? 'remove' : 'add'}`,
      icon: value ? 'minus' : 'plus',
      disabled: locked,
      onClick: () => (value ? balls.setValue(filter.id, option, null) : balls.addValue(filter.id, option))
    });
    button.setAriaLabel(t(definition.labelKey));
    this.addChild(button);
    this.addChild(new UIText({ className: 'pw-ball-opt-label', text: t(definition.labelKey) }));
    if (!value) return;
    this.addChild(new UIDropdown({
      className: 'pw-ball-sel',
      options: BallFilterValueRow._choices(option),
      value,
      disabled: locked,
      onChange: (next) => balls.setValue(filter.id, option, next)
    }));
  }

  /**
   * @private
   * @param {string} option
   * @returns {Array<{value: string, label: string}>}
   */
  static _choices(option) {
    if (option === BallFilterOptions.TYPE) return BALL_FILTER_TYPES.map((type) => ({ value: type, label: t(`type.${type}`) }));
    return Object.values(EncounterKinds).map((kind) => ({ value: kind, label: t(`ball_enc_${kind}`) }));
  }
}
