/**
 * @file BallFilterEditorModal.js
 * @brief Poké Ball filter editor (C++: class BallFilterEditorModal : public UIModal).
 * Port of the original renderBallFilterEditor(): "New filter" / "Reset" buttons, priority hint,
 * one BallFilterEditorRow per filter (reordered by drag & drop), "Close" button. Opened by
 * `ModalOpenRequestedEvent(ModalIds.BALL_FILTERS)`; rebuilt on every BallFiltersChangedEvent.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UISortableList } from '../ui/UISortableList.js';
import { BallFilterEditorRow } from './components/BallFilterEditorRow.js';
import { PokeballSystem } from '../systems/PokeballSystem.js';
import { BallFiltersChangedEvent } from '../core/events/BallFiltersChangedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';

export class BallFilterEditorModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.BALL_FILTERS,
      title: t('ball_settings'),
      size: 'md',
      hasHeader: true,
      showCloseBtn: true,
      hasFooter: false,
      className: 'pw-ball-box',
      overlayClassName: 'pw-ball-overlay',
      name: 'BallFilterEditorModal'
    });
    /** @private @type {Set<string>} Filters whose option lines are unfolded (session state) */
    this._openOptions = new Set();
    for (const eventClass of [BallFiltersChangedEvent, InventoryChangedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
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
    this.addChild(new UIContainer({
      className: 'pw-ball-editor-top',
      children: [
        new UIButton({ variant: 'hbtn', text: t('ball_new_filter'), onClick: () => balls.create() }),
        new UIButton({ variant: 'hbtn', text: t('ball_reset_filters'), onClick: () => balls.reset() })
      ]
    }));
    this.addChild(new UIText({ tagName: 'div', className: 'pw-ball-editor-note', text: t('ball_editor_hint') }));

    const list = new UISortableList({ className: 'pw-ball-filter-list', onReorder: (fromId, toId) => balls.reorder(fromId, toId) });
    for (const filter of balls.getFilters()) {
      const row = new BallFilterEditorRow(filter, {
        optionsOpen: this._openOptions.has(filter.id),
        onToggleOptions: () => this._toggleOptions(filter.id)
      });
      list.addItem(filter.id, row, row.getHandle());
    }
    this.addChild(list);
  }

  /**
   * @private
   * @param {string} filterId
   */
  _toggleOptions(filterId) {
    if (this._openOptions.has(filterId)) this._openOptions.delete(filterId);
    else this._openOptions.add(filterId);
    this._render();
  }
}
