/**
 * @file PokeballsPanel.js
 * @brief Poké Ball window: one row per capture filter, in priority order
 * (C++: class PokeballsPanel : public DraggablePanel). Port of the original
 * renderPokeballWindow(): Name | Ball | Qty table; a disabled filter is greyed out; clicking the
 * ball slot opens the ball picker; the gear opens the filter editor. Balls are bought in shops.
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { BallSlotIcon } from './components/BallSlotIcon.js';
import { PokeballSystem } from '../systems/PokeballSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { BallFiltersChangedEvent } from '../core/events/BallFiltersChangedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

export class PokeballsPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.POKEBALLS,
      column,
      title: t('panel_pokeballs_title'),
      icon: 'pokeball',
      bodyId: 'pokeballs-window-body',
      bodyClassName: 'pw-static-022',
      name: 'PokeballsPanel'
    });

    const settings = new UIButton({
      className: 'pw-win-tool-btn',
      icon: 'settings',
      onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BALL_FILTERS))
    });
    settings.setTooltip(t('ball_settings'));
    settings.setAriaLabel(t('ball_settings'));
    this.addHeaderAction(settings);

    this._grid = new UIContainer({ className: 'pw-ball-grid' });
    this.addChild(new UIContainer({ className: 'pw-ball-panel', children: [this._grid] }));

    for (const eventClass of [BallFiltersChangedEvent, InventoryChangedEvent, SaveLoadedEvent]) {
      this.listen(eventClass, () => this._render());
    }
    this._render();
  }

  /** @private */
  _render() {
    const balls = PokeballSystem.getInstance();
    this._grid.clearChildren();
    this._grid.addChild(new UIContainer({
      className: 'pw-ball-head',
      children: [
        new UIText({ className: 'pw-ball-head-name', text: t('ball_col_name') }),
        new UIText({ className: 'pw-ball-col', text: t('ball_col_ball') }),
        new UIText({ className: 'pw-ball-col', text: t('ball_col_qty') })
      ]
    }));
    for (const filter of balls.getFilters()) {
      const ballCell = new UIContainer({
        tagName: 'span',
        className: 'pw-ball-row-cell pw-ball-row-ball',
        children: [new BallSlotIcon(filter.ball)]
      });
      ballCell.setTooltip(t('ball_cycle_hint'));
      ballCell.addDomListener('click', () => EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.BALL_PICKER, { filterId: filter.id })
      ));
      const quantity = filter.hasBall() ? balls.getCount(filter.ball) : 0;
      const row = new UIContainer({
        className: 'pw-ball-row',
        children: [
          new UIText({ className: 'pw-ball-row-cell pw-ball-row-name', text: balls.getLabel(filter) }),
          ballCell,
          new UIText({ className: 'pw-ball-row-cell pw-ball-row-qty', text: TextFormatter.formatNumber(quantity) })
        ]
      });
      row.toggleClass('off', !filter.enabled);
      this._grid.addChild(row);
    }
  }
}
