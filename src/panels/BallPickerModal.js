/**
 * @file BallPickerModal.js
 * @brief Ball choice of one filter, with the effect of every ball (C++: class BallPickerModal : public
 * UIModal). Port of the original openBallPicker(): "None" then every ball in the original order
 * (a hidden ball only once owned); the current ball is highlighted.
 *
 * Laid out as the catalogue's sheet (frame `ball-picker`): one row per ball, the sprite in the 34 px
 * chip, the name on the first line and the catch rate on the second, the owned quantity at the right,
 * a full-width "Fermer" at the bottom. The catalogue prints "x1 / taux 1.0" - a scale the game does
 * not have - so the second line keeps the game's real metric, the catch rate in percent.
 *
 * Opened by `ModalOpenRequestedEvent(ModalIds.BALL_PICKER, { filterId })`; it stacks above the filter
 * editor, which stays open.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { SheetRow } from './components/SheetRow.js';
import { BallSlotIcon } from './components/BallSlotIcon.js';
import { UIIcon } from '../ui/UIIcon.js';
import { PokeballSystem } from '../systems/PokeballSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { ModalIds } from '../config/ModalIds.js';
import { BallRules } from '../config/BallRules.js';
import { t } from '../localization/LocalizationManager.js';

export class BallPickerModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.BALL_PICKER,
      title: t('ball_picker_title'),
      size: 'md',
      className: 'pw-sheet pw-ball-box',
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
    this.setTitle(t('ball_picker_title'));

    const choices = [BallRules.NO_BALL, ...balls.getSelectableBalls().map((ball) => ball.id)];
    for (const ballId of choices) this.addChild(this._choice(ballId, filter.ball === ballId));

    this.addChild(new UIButton({
      text: t('close_btn'),
      variant: 'ghost',
      className: 'pw-sheet-btn',
      onClick: () => this.close()
    }));
  }

  /**
   * @private
   * @param {string} ballId
   * @param {boolean} selected
   * @returns {SheetRow}
   */
  _choice(ballId, selected) {
    const none = ballId === BallRules.NO_BALL;
    const rate = none ? null : ItemDB.getInstance().getById(ballId)?.ball?.rate;
    const row = new SheetRow({
      iconNode: none ? new UIIcon({ name: 'close' }) : new BallSlotIcon(ballId),
      title: none ? t('ball_no_ball') : t(`item.${ballId}.name`),
      meta: none ? '' : (rate === null || rate === undefined ? '' : t('ball_catch_rate', { rate })),
      trailing: none ? null : new UIText({
        tagName: 'span',
        className: 'pw-sheet-row-count',
        text: t('ball_qty_times', { n: TextFormatter.formatNumber(PokeballSystem.getInstance().getCount(ballId)) })
      }),
      onClick: () => {
        PokeballSystem.getInstance().setBall(this._filterId, ballId);
        this.close();
      }
    });
    row.toggleClass('selected', selected);
    return row;
  }
}
