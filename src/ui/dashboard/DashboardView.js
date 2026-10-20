/**
 * @file DashboardView.js
 * @brief Three-column dashboard hosting the DraggablePanels (C++: class DashboardView : public UIElement).
 *
 * - Each panel is created with its starting column; addWindow() stacks it at the bottom of that column,
 *   so creation order = top-to-bottom order. The resulting default layout is handed to
 *   DashboardLayoutSystem, which restores the layout saved by the player on top of it.
 * - The dashboard is the only scroll container of the game screen: the columns grow with their
 *   content and the windows are never cut nor scrolled internally.
 * - Owns the WindowDragController (attached while the page is active).
 */

import { UIElement } from '../UIElement.js';
import { UIContainer } from '../UIContainer.js';
import { WindowDragController } from './WindowDragController.js';
import { DashboardColumns, DASHBOARD_COLUMN_ORDER } from '../../config/DashboardLayout.js';

/** DOM id and CSS classes of each column (ids kept from the original for its stylesheet). */
const COLUMN_DOM = Object.freeze({
  [DashboardColumns.LEFT]: { id: 'col-1', className: 'dash-col pw-static-016' },
  [DashboardColumns.CENTER]: { id: 'col-2', className: 'dash-col center-col pw-static-026' },
  [DashboardColumns.RIGHT]: { id: 'col-3', className: 'dash-col pw-static-016' }
});

export class DashboardView extends UIElement {
  /**
   * @param {import('../../systems/DashboardLayoutSystem.js').DashboardLayoutSystem} layoutSystem
   */
  constructor(layoutSystem) {
    super({ id: 'main-dashboard', className: 'pw-static-015', name: 'DashboardView' });
    /** @private */
    this._layoutSystem = layoutSystem;
    /** @private @type {Map<string, UIContainer>} */
    this._columns = new Map();
    /** @private @type {Map<string, import('../DraggablePanel.js').DraggablePanel>} */
    this._windows = new Map();
    /** @private @type {Set<string>|null} Mobile focus filter; null means desktop/all. */
    this._visibleWindowIds = null;
    for (const column of DASHBOARD_COLUMN_ORDER) {
      const container = new UIContainer(COLUMN_DOM[column]);
      container.setData('col', column);
      this._columns.set(column, container);
      this.addChild(container);
    }

    /** @private */
    this._dragController = new WindowDragController(this, layoutSystem);
  }

  /**
   * Adds a window at the bottom of its starting column.
   * @param {import('../DraggablePanel.js').DraggablePanel} panel
   */
  addWindow(panel) {
    this._windows.set(panel.getWindowId(), panel);
    this._columns.get(panel.getDefaultColumn()).addChild(panel);
    this._applyWindowVisibility(panel.getWindowId(), panel);
  }

  /**
   * Adds several windows in order, then restores the layout saved by the player.
   * @param {Array<import('../DraggablePanel.js').DraggablePanel>} panels
   */
  addWindows(panels) {
    for (const panel of panels) this.addWindow(panel);
    this.applyLayout(this._layoutSystem.setDefaultLayout(this.getDefaultLayout()));
  }

  /**
   * Layout given by the panels themselves (starting column, creation order).
   * @returns {import('../../systems/DashboardLayoutSystem.js').ColumnLayout}
   */
  getDefaultLayout() {
    const layout = {};
    for (const column of DASHBOARD_COLUMN_ORDER) layout[column] = [];
    for (const [id, panel] of this._windows) layout[panel.getDefaultColumn()].push(id);
    return layout;
  }

  /**
   * @param {string} windowId
   * @returns {import('../DraggablePanel.js').DraggablePanel|null}
   */
  getWindow(windowId) {
    return this._windows.get(windowId) || null;
  }

  /**
   * @param {string} column - DashboardColumns value
   * @returns {UIContainer|null}
   */
  getColumn(column) {
    return this._columns.get(column) || null;
  }

  /**
   * Moves every window into its column, in order.
   * @param {import('../../systems/DashboardLayoutSystem.js').ColumnLayout} layout
   */
  applyLayout(layout) {
    for (const column of DASHBOARD_COLUMN_ORDER) {
      const container = this._columns.get(column);
      for (const id of layout[column] || []) {
        const panel = this._windows.get(id);
        if (panel) container.addChild(panel);
      }
    }
  }

  /**
   * Shows only the given windows (mobile tabs), or every window when `ids` is null.
   * @param {Iterable<string>|null} ids
   */
  setVisibleWindows(ids) {
    this._visibleWindowIds = ids === null ? null : new Set(ids || []);
    this._applyVisibility();
  }

  /** Applies the selected mobile focus; progression-locked panels stay visible and explain their gate. */
  _applyVisibility() {
    for (const [id, panel] of this._windows) this._applyWindowVisibility(id, panel);
  }

  /** @private @param {string} id @param {import('../DraggablePanel.js').DraggablePanel} panel */
  _applyWindowVisibility(id, panel) {
    const focusGranted = this._visibleWindowIds === null || this._visibleWindowIds.has(id);
    panel.toggleClass('is-hidden', !focusGranted);
    // Progression locks are rendered inside the panel; only the selected mobile tab hides it.
    panel.toggleClass('mobile-visible', this._visibleWindowIds !== null && focusGranted);
  }

  /**
   * Highlights the drop target column during a drag.
   * @param {string|null} column
   */
  setHoveredColumn(column) {
    for (const [id, container] of this._columns) {
      container.toggleClass('col-hovered', id === column);
    }
  }

  /**
   * Column ids with the horizontal center of each column (one layout read per column).
   * @returns {Array<{column: string, centerX: number}>}
   */
  measureColumns() {
    const result = [];
    for (const [column, container] of this._columns) {
      const bounds = container.getBounds();
      if (bounds.width > 0) result.push({ column, centerX: bounds.left + bounds.width / 2 });
    }
    return result;
  }

  /**
   * Visible windows of a column, in DOM order, with their current bounds.
   * @param {string} column
   * @returns {Array<{id: string, bounds: DOMRect}>}
   */
  measureWindows(column) {
    const result = [];
    for (const child of this._columns.get(column).getChildren()) {
      const id = typeof child.getWindowId === 'function' ? child.getWindowId() : '';
      if (!id || !this._windows.has(id)) continue;
      const bounds = child.getBounds();
      if (bounds.height > 0) result.push({ id, bounds });
    }
    return result;
  }

  /**
   * Scrolls a requested dashboard window into view.
   * @param {string} windowId
   * @returns {boolean}
   */
  focusWindow(windowId) {
    const panel = this._windows.get(windowId);
    if (!panel) return false;
    const element = panel.getDomElement();
    if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  /**
   * Scrolls the dashboard by a number of pixels (drag auto-scroll).
   * @param {number} deltaPx
   * @returns {boolean} True when the scroll position changed
   */
  scrollByPixels(deltaPx) {
    const before = this._dom.scrollTop;
    this._dom.scrollTop = before + deltaPx;
    return this._dom.scrollTop !== before;
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._dragController.attach();
  }

  /** @override */
  onExit() {
    this._dragController.detach();
    super.onExit();
  }
}
