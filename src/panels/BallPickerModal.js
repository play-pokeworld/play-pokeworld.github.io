/**
 * @file BallPickerModal.js
 * @brief Ball choice of one filter, with the effect of every ball (C++: class BallPickerModal :
 * public UIModal). Port of the original openBallPicker(): "None" then every ball in the
 * original order (a hidden ball only once owned), icon, name, description and quantity; the
 * current ball is highlighted. Opened by `ModalOpenRequestedEvent(ModalIds.BALL_PICKER, { filterId })`;
 * it stacks above the filter editor, which stays open.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { BallSlotIcon } from './components/BallSlotIcon.js';
import { BallDescription } from './components/BallDescription.js';
import { PokeballSystem } from '../systems/PokeballSystem.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { ModalIds } from '../config/ModalIds.js';
import { BallRules } from '../config/BallRules.js';
import { t } from '../localization/LocalizationManager.js';

export class BallPickerModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.BALL_PICKER,
      hasHeader: false,
      showCloseBtn: false,
      className: 'pw-ball-box',
      overlayClassName: 'pw-ball-overlay pw-ball-overlay--picker',
      name: 'BallPickerModal'
    });
    /** @private @type {string|null} */
    this._filterId = null;
  }

  /**
   * @override
   * @param {{filterId?: string}} [params={}]
   */
  open(params = {}) {
    this._filterId = params.filterId ?? null;
    if (!PokeballSystem.getInstance().getFilter(this._filterId)) return;
    super.open(params);
  }

  /** Rebuilt on every opening so that it always reflects the save. @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const balls = PokeballSystem.getInstance();
    const filter = balls.getFilter(this._filterId);
    if (!filter) return;
    this.addChild(new UIText({ tagName: 'div', className: 'pw-ball-title', text: balls.getLabel(filter) }));
    const choices = [BallRules.NO_BALL, ...balls.getSelectableBalls().map((ball) => ball.id)];
    for (const ballId of choices) this.addChild(this._choice(ballId, filter.ball === ballId));
  }

  /**
   * @private
   * @param {string} ballId
   * @param {boolean} selected
   * @returns {UIContainer}
   */
  _choice(ballId, selected) {
    const none = ballId === BallRules.NO_BALL;
    const row = new UIContainer({
      className: 'pw-ball-row-opt',
      children: [
        new BallSlotIcon(ballId, 'lg'),
        new UIContainer({
          className: 'pw-ball-name-block',
          children: [
            new UIText({ className: 'pw-ball-name', text: none ? t('ball_no_ball') : t(`item.${ballId}.name`) }),
            new UIText({ className: 'pw-ball-desc', text: BallDescription.describe(ballId) })
          ]
        }),
        new UIText({
          className: 'pw-ball-qty2',
          text: none ? '' : t('ball_qty_times', { n: TextFormatter.formatNumber(PokeballSystem.getInstance().getCount(ballId)) })
        })
      ]
    });
    row.toggleClass('selected', selected);
    row.addDomListener('click', () => {
      PokeballSystem.getInstance().setBall(this._filterId, ballId);
      this.close();
    });
    return row;
  }
}
