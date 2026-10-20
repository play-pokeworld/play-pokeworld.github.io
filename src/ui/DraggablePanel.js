/**
 * @file DraggablePanel.js
 * @brief Dashboard window that can be dragged between columns (C++: class DraggablePanel : public UIPanel).
 * Its header carries `data-drag-window`, the hook used by WindowDragController.
 * Every panel receives its starting column at creation (`new StoryPanel(DashboardColumns.LEFT)`);
 * the dashboard stacks the panels of a column in creation order.
 * A dashboard window is always shown entirely: its body never scrolls (dashboard CSS).
 */

import { UIPanel } from './UIPanel.js';
import { UIButton } from './UIButton.js';
import { DashboardColumns } from '../config/DashboardLayout.js';
import { GUIDE_SECTION_FOR_WINDOW } from '../config/GuideSections.js';
import { ModalIds } from '../config/ModalIds.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';

const COLUMN_IDS = Object.freeze(Object.values(DashboardColumns));

export class DraggablePanel extends UIPanel {
  /**
   * @param {Object} options
   * @param {string} options.id              - Mandatory window id (WindowIds value)
   * @param {string} options.column          - Starting column (DashboardColumns value)
   * @param {string} [options.title='']      - Localized title
   * @param {string} [options.icon='']       - IconRegistry name
   * @param {string} [options.bodyId='']
   * @param {string} [options.bodyClassName='']
   * @param {string} [options.className='']
   * @param {string} [options.name='DraggablePanel']
   */
  constructor(options = {}) {
    super({
      id: options.id,
      title: options.title || '',
      icon: options.icon || '',
      bodyId: options.bodyId,
      bodyClassName: options.bodyClassName,
      className: options.className,
      hasHeader: true,
      name: options.name || 'DraggablePanel'
    });
    this._headerDom.setAttribute('data-drag-window', options.id);

    const section = GUIDE_SECTION_FOR_WINDOW[options.id] ?? null;
    const helpButton = new UIButton({
      variant: 'ghost',
      size: 'sm',
      className: 'pw-win-tool-btn pw-win-help-btn',
      icon: 'help',
      onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.GUIDE, { section }))
    });
    helpButton.setData('stopDrag', 'true');
    helpButton.setAriaLabel(t('guide_open_from_panel', { panel: options.title || t('guide_title') }));
    helpButton.setTooltip(t('guide_open_help'));
    this.addHeaderAction(helpButton);

    if (!COLUMN_IDS.includes(options.column)) {
      console.warn(t('debug_panel_column_invalid', { id: options.id, column: String(options.column) }));
    }
    /** @private @type {string} */
    this._defaultColumn = COLUMN_IDS.includes(options.column) ? options.column : DashboardColumns.LEFT;
  }

  /** @returns {string} Column chosen at creation (DashboardColumns value) */
  getDefaultColumn() {
    return this._defaultColumn;
  }

  /**
   * Enters the floating "being dragged" state at a viewport position.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  setDragGeometry(x, y, width, height) {
    this._dom.classList.add('pw-win-dragging');
    this._setCssVariable('--pw-drag-w', `${Math.round(width)}px`);
    this._setCssVariable('--pw-drag-h', `${Math.round(height)}px`);
    this.moveDragTo(x, y);
  }

  /**
   * Moves the floating window (only valid while dragging). The position is applied
   * through a transform, so a move never triggers a layout of the page.
   * @param {number} x
   * @param {number} y
   */
  moveDragTo(x, y) {
    this._setCssVariable('--pw-drag-x', `${Math.round(x)}px`);
    this._setCssVariable('--pw-drag-y', `${Math.round(y)}px`);
  }

  /** Leaves the dragged state. */
  clearDragGeometry() {
    this._dom.classList.remove('pw-win-dragging');
    for (const name of ['--pw-drag-x', '--pw-drag-y', '--pw-drag-w', '--pw-drag-h']) {
      this._setCssVariable(name, null);
    }
  }

  /** @returns {string} Window id used by the drag controller and the layout */
  getWindowId() {
    return this.getId();
  }
}
