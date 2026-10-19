/**
 * @file BallFilterEditorRow.js
 * @brief One filter of the editor (C++: class BallFilterEditorRow : public UIContainer).
 * Port of the original renderBallFilterEditor() row:
 *   [drag handle] [on/off switch] [name (input for a custom filter)] [ball] [✕ custom only]
 *   [Edit settings / Hide settings] → toggle and value option lines.
 * The drag handle is exposed (getHandle) for the sortable list of the editor.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { BallSlotIcon } from './BallSlotIcon.js';
import { BallFilterToggleRow } from './BallFilterToggleRow.js';
import { BallFilterValueRow } from './BallFilterValueRow.js';
import { PokeballSystem } from '../../systems/PokeballSystem.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { BALL_FILTER_TOGGLES, BALL_FILTER_VALUES } from '../../data/catch/BallFilterOptions.js';
import { ModalIds } from '../../config/ModalIds.js';
import { t } from '../../localization/LocalizationManager.js';

export class BallFilterEditorRow extends UIContainer {
  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @param {Object} options
   * @param {boolean} options.optionsOpen - Option lines unfolded
   * @param {Function} options.onToggleOptions - () => void
   */
  constructor(filter, { optionsOpen, onToggleOptions }) {
    super({ className: 'pw-ball-filter-row', name: 'BallFilterEditorRow' });
    this.toggleClass('off', !filter.enabled);
    const balls = PokeballSystem.getInstance();
    const locked = filter.isLocked();

    this._handle = new UIContainer({ tagName: 'span', className: 'pw-ball-drag', children: [new UIIcon({ name: 'grip' })] });
    this._handle.setTooltip(t('ball_drag_hint'));

    const enabled = new UIButton({ className: 'pw-ball-switch', onClick: () => balls.toggleEnabled(filter.id) });
    enabled.toggleClass('on', filter.enabled);
    enabled.setTooltip(t('ball_enable'));
    enabled.setAriaLabel(t('ball_enable'));

    const name = locked
      ? new UIText({ className: 'pw-ball-filter-name', text: balls.getLabel(filter) })
      : new UITextInput({
        className: 'pw-ball-filter-name-input',
        value: balls.getLabel(filter),
        onChange: (value) => balls.rename(filter.id, value)
      });

    const ball = new UIContainer({ tagName: 'span', className: 'pw-ball-ball-btn', children: [new BallSlotIcon(filter.ball)] });
    ball.setTooltip(t('ball_cycle_hint'));
    ball.addDomListener('click', () => EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.BALL_PICKER, { filterId: filter.id })
    ));

    let remove;
    if (locked) {
      remove = new UIContainer({ tagName: 'span', className: 'pw-ball-del-pad' });
    } else {
      remove = new UIButton({ className: 'pw-ball-del', icon: 'close', onClick: () => balls.remove(filter.id) });
      remove.setTooltip(t('ball_delete'));
      remove.setAriaLabel(t('ball_delete'));
    }

    this.addChild(new UIContainer({ className: 'pw-ball-filter-top', children: [this._handle, enabled, name, ball, remove] }));
    const paramsToggle = new UIButton({
      className: 'pw-ball-params-toggle',
      text: optionsOpen ? t('ball_edit_hide') : t('ball_edit_show'),
      onClick: onToggleOptions
    });
    paramsToggle.toggleClass('on', optionsOpen);
    this.addChild(paramsToggle);
    if (optionsOpen) this.addChild(this._optionLines(filter));
  }

  /** @returns {UIContainer} Drag handle of the row */
  getHandle() {
    return this._handle;
  }

  /**
   * @private
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @returns {UIContainer}
   */
  _optionLines(filter) {
    const lines = new UIContainer({ className: 'pw-ball-opts' });
    for (const definition of BALL_FILTER_TOGGLES) {
      if (BallFilterToggleRow.isShown(filter, definition.key)) lines.addChild(new BallFilterToggleRow(filter, definition));
    }
    for (const definition of BALL_FILTER_VALUES) {
      if (BallFilterValueRow.isShown(filter, definition.key)) lines.addChild(new BallFilterValueRow(filter, definition));
    }
    return lines;
  }
}
