/**
 * @file DashboardLayoutSystem.js
 * @brief Owns the dashboard column layout state and its persistence
 * (C++ equivalent: class DashboardLayoutSystem : public BaseSystem). Pure model: no DOM access.
 *
 * The default layout is not hardcoded here: the dashboard view builds it from the panels
 * (each panel is created with its starting column) and hands it over with setDefaultLayout().
 * The stored layout (user drags) is then applied on top of it.
 * The drag interaction itself lives in src/ui/dashboard/WindowDragController.js.
 */

import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';
import { DashboardColumns, DASHBOARD_COLUMN_ORDER } from '../config/DashboardLayout.js';
import { WindowReorderedEvent } from '../core/events/WindowReorderedEvent.js';

/** @typedef {Object<string, string[]>} ColumnLayout - column id (DashboardColumns) → ordered window ids */

/** Layouts saved by v1.0 / v1.1 used 1-based column numbers. */
const LEGACY_COLUMN_KEYS = Object.freeze({
  [DashboardColumns.LEFT]: '1',
  [DashboardColumns.CENTER]: '2',
  [DashboardColumns.RIGHT]: '3'
});

/** @returns {ColumnLayout} */
function emptyLayout() {
  const layout = {};
  for (const column of DASHBOARD_COLUMN_ORDER) layout[column] = [];
  return layout;
}

export class DashboardLayoutSystem extends BaseSystem {
  /** @private @type {DashboardLayoutSystem|null} */
  static _instance = null;

  constructor() {
    super('DashboardLayoutSystem', 'System');
    /** @private @type {ColumnLayout} */
    this._defaults = emptyLayout();
    /** @private @type {ColumnLayout} */
    this._columns = emptyLayout();
  }

  /** @returns {DashboardLayoutSystem} */
  static getInstance() {
    if (!DashboardLayoutSystem._instance) {
      DashboardLayoutSystem._instance = new DashboardLayoutSystem();
    }
    return DashboardLayoutSystem._instance;
  }

  /**
   * Repairs a stored layout against the defaults: drops unknown / duplicated ids and appends
   * windows missing from it (e.g. added by a newer version) to their default column.
   * @param {any} stored
   * @param {ColumnLayout} defaults
   * @returns {ColumnLayout}
   */
  static sanitize(stored, defaults) {
    const known = new Map();
    for (const column of DASHBOARD_COLUMN_ORDER) {
      for (const id of defaults[column] || []) known.set(id, column);
    }

    const placed = new Set();
    const result = emptyLayout();
    for (const column of DASHBOARD_COLUMN_ORDER) {
      const raw = stored && typeof stored === 'object' ? (stored[column] ?? stored[LEGACY_COLUMN_KEYS[column]]) : null;
      const ids = Array.isArray(raw) ? raw : [];
      result[column] = ids.filter((id) => known.has(id) && !placed.has(id) && placed.add(id));
    }
    for (const [id, column] of known) {
      if (!placed.has(id)) result[column].push(id);
    }
    return result;
  }

  /**
   * Declares the default layout (built from the panels) and restores the saved one on top of it.
   * @param {ColumnLayout} defaults
   * @returns {ColumnLayout} The layout to display
   */
  setDefaultLayout(defaults) {
    this._defaults = DashboardLayoutSystem.sanitize(defaults, defaults);
    this._columns = DashboardLayoutSystem.sanitize(LocalStore.getJson(StorageKeys.DASHBOARD_COLUMNS, null), this._defaults);
    return this.getColumns();
  }

  /** @returns {ColumnLayout} Deep copy of the current layout */
  getColumns() {
    const copy = {};
    for (const column of DASHBOARD_COLUMN_ORDER) copy[column] = [...this._columns[column]];
    return copy;
  }

  /**
   * @param {string} windowId
   * @returns {{column: string, index: number}|null}
   */
  findWindow(windowId) {
    for (const column of DASHBOARD_COLUMN_ORDER) {
      const index = this._columns[column].indexOf(windowId);
      if (index !== -1) return { column, index };
    }
    return null;
  }

  /**
   * Moves a window, persists the layout and emits WindowReorderedEvent.
   * @param {string} windowId
   * @param {string} column - Target column (DashboardColumns value)
   * @param {number} index - Insertion index inside the target column (after removal of the window)
   */
  moveWindow(windowId, column, index) {
    if (!this.findWindow(windowId) || !this._columns[column]) return;
    for (const c of DASHBOARD_COLUMN_ORDER) {
      this._columns[c] = this._columns[c].filter((id) => id !== windowId);
    }
    const safeIndex = Math.max(0, Math.min(index, this._columns[column].length));
    this._columns[column].splice(safeIndex, 0, windowId);
    this._persist();
    EventBus.getInstance().dispatch(new WindowReorderedEvent(windowId, column, safeIndex));
  }

  /**
   * Restores the default layout.
   * @returns {ColumnLayout}
   */
  resetLayout() {
    this._columns = DashboardLayoutSystem.sanitize(this._defaults, this._defaults);
    this._persist();
    return this.getColumns();
  }

  /** @private */
  _persist() {
    LocalStore.setJson(StorageKeys.DASHBOARD_COLUMNS, this._columns);
  }
}
