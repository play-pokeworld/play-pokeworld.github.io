/**
 * @file BallFilterToggleRow.js
 * @brief Boolean option line of the filter editor: [− / +] label
 * (C++: class BallFilterToggleRow : public UIContainer). Port of the original optRow():
 * an active option shows a red "−" button (disabled on a base filter), an inactive one a green
 * "+" button. Base filters never list their inactive options (see isShown).
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { PokeballSystem } from '../../systems/PokeballSystem.js';
import { t } from '../../localization/LocalizationManager.js';

export class BallFilterToggleRow extends UIContainer {
  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @param {string} toggle - BallFilterOptions value
   * @returns {boolean} The line exists for that filter
   */
  static isShown(filter, toggle) {
    return !filter.isLocked() || PokeballSystem.getInstance().isToggleOn(filter, toggle);
  }

  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @param {{key: string, labelKey: string}} definition - BALL_FILTER_TOGGLES entry
   */
  constructor(filter, definition) {
    const on = PokeballSystem.getInstance().isToggleOn(filter, definition.key);
    super({ className: 'pw-ball-opt-row', name: 'BallFilterToggleRow' });
    this.toggleClass('avail', !on);
    const button = new UIButton({
      className: `pw-ball-opt-btn ${on ? 'remove' : 'add'}`,
      icon: on ? 'minus' : 'plus',
      disabled: filter.isLocked(),
      onClick: () => PokeballSystem.getInstance().setToggle(filter.id, definition.key, !on)
    });
    button.setAriaLabel(t(definition.labelKey));
    this.addChild(button);
    this.addChild(new UIText({ className: 'pw-ball-opt-label', text: t(definition.labelKey) }));
  }
}
