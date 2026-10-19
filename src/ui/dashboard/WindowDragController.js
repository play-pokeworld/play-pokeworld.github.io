/**
 * @file WindowDragController.js
 * @brief Pointer-driven drag & drop of dashboard windows (C++ equivalent: class WindowDragController).
 *
 * - Pointer Events (mouse & touch), 5 px threshold so that clicks never drag.
 * - The window follows the pointer exactly: it keeps the point where it was grabbed, and moves
 *   through a CSS transform (no layout, no transition), once per animation frame.
 * - A placeholder of the window height shows the drop position live: it moves to the nearest
 *   column (distance to its center) and between the windows (window middles). It only moves when
 *   the target changes, so the page is not re-laid out on every pointer move.
 * - Auto-scroll near the top / bottom edges of the dashboard, faster closer to the edge;
 *   the mouse wheel also scrolls during a drag.
 * - Escape or pointer cancel puts the window back at its original place.
 * The layout model and its persistence belong to DashboardLayoutSystem.
 */

import { UIDragPlaceholder } from '../UIDragPlaceholder.js';
import { AppShell } from '../AppShell.js';

const THRESHOLD_PX = 5;
/** Height of the auto-scroll zones at the top and bottom of the dashboard. */
const EDGE_PX = 80;
/** Maximum auto-scroll speed, reached at the very edge (px per frame). */
const MAX_SCROLL_STEP_PX = 22;
/** Elements inside a header that must keep their own click behaviour. */
const NO_DRAG_SELECTOR = 'button, select, input, a, [data-stop-drag="true"]';

export class WindowDragController {
  /**
   * @param {import('./DashboardView.js').DashboardView} view
   * @param {import('../../systems/DashboardLayoutSystem.js').DashboardLayoutSystem} layout
   */
  constructor(view, layout) {
    this._view = view;
    this._layout = layout;
    /** @private @type {{windowId: string, startX: number, startY: number, grabX: number, grabY: number}|null} */
    this._pending = null;
    /** @private @type {Object|null} */
    this._drag = null;
    this._attached = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onScroll = this._onScroll.bind(this);
  }

  /** Starts listening to pointer / keyboard input. */
  attach() {
    if (this._attached) return;
    this._attached = true;
    const root = this._view.getDomElement();
    root.addEventListener('pointerdown', this._onPointerDown);
    root.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('pointermove', this._onPointerMove, { passive: false });
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerCancel);
    window.addEventListener('keydown', this._onKeyDown);
  }

  /** Stops listening (and cancels a drag in progress). */
  detach() {
    if (!this._attached) return;
    this._cancelDrag();
    this._attached = false;
    const root = this._view.getDomElement();
    root.removeEventListener('pointerdown', this._onPointerDown);
    root.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
    window.removeEventListener('keydown', this._onKeyDown);
  }

  /** @returns {boolean} True while a window is being dragged */
  isDragging() {
    return this._drag !== null;
  }

  // --- Input handlers ---

  /** @private @param {PointerEvent} event */
  _onPointerDown(event) {
    if (AppShell.isMobileMode()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target;
    if (!target || !target.closest || target.closest(NO_DRAG_SELECTOR)) return;
    const header = target.closest('[data-drag-window]');
    if (!header) return;
    const windowId = header.dataset.dragWindow;
    const panel = this._view.getWindow(windowId);
    if (!panel || !this._layout.findWindow(windowId)) return;

    const bounds = panel.getBounds();
    this._pending = {
      windowId,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - bounds.left,
      grabY: event.clientY - bounds.top
    };
  }

  /** @private @param {PointerEvent} event */
  _onPointerMove(event) {
    if (this._pending) {
      const distance = Math.hypot(event.clientX - this._pending.startX, event.clientY - this._pending.startY);
      if (distance <= THRESHOLD_PX) return;
      this._beginDrag();
    }
    if (!this._drag) return;
    event.preventDefault();
    this._drag.clientX = event.clientX;
    this._drag.clientY = event.clientY;
    this._requestFrame();
  }

  /** @private */
  _onPointerUp() {
    if (this._drag) this._drop();
    this._pending = null;
  }

  /** @private */
  _onPointerCancel() {
    this._cancelDrag();
    this._pending = null;
  }

  /** @private @param {KeyboardEvent} event */
  _onKeyDown(event) {
    if (event.key === 'Escape') this._cancelDrag();
  }

  /** @private The drop target depends on the scroll position. */
  _onScroll() {
    if (this._drag) this._requestFrame();
  }

  // --- Drag lifecycle ---

  /** @private */
  _beginDrag() {
    const { windowId, startX, startY, grabX, grabY } = this._pending;
    this._pending = null;
    const panel = this._view.getWindow(windowId);
    const origin = this._layout.findWindow(windowId);
    if (!panel || !origin) return;

    const column = this._view.getColumn(origin.column);
    const bounds = panel.getBounds();

    const placeholder = new UIDragPlaceholder();
    placeholder.setHeight(bounds.height);
    column.insertChildBefore(placeholder, panel);

    // Remember the original neighbour so that a cancel restores the exact position.
    const siblings = column.getChildren();
    const originNext = siblings[siblings.indexOf(panel) + 1] || null;

    column.removeChild(panel);
    panel.setDragGeometry(startX - grabX, startY - grabY, bounds.width, bounds.height);
    AppShell.mountOverlay(panel);
    AppShell.setWindowDragActive(true);

    this._drag = {
      windowId,
      panel,
      placeholder,
      originColumn: origin.column,
      originNext,
      targetColumn: origin.column,
      columns: this._view.measureColumns(),
      grabX,
      grabY,
      clientX: startX,
      clientY: startY,
      frame: 0
    };
    this._view.setHoveredColumn(origin.column);
  }

  /** @private */
  _requestFrame() {
    if (this._drag && !this._drag.frame) {
      this._drag.frame = requestAnimationFrame(() => this._renderFrame());
    }
  }

  /** @private One frame: all layout reads first, then the DOM writes. */
  _renderFrame() {
    const drag = this._drag;
    if (!drag) return;
    drag.frame = 0;

    // Reads
    const column = this._nearestColumn(drag.clientX);
    const before = this._windowBelowPointer(column, drag.clientY);
    const scrollStep = this._autoScrollStep(drag.clientY);

    // Writes
    drag.panel.moveDragTo(drag.clientX - drag.grabX, drag.clientY - drag.grabY);
    this._movePlaceholder(column, before);
    if (scrollStep !== 0 && this._view.scrollByPixels(scrollStep)) {
      this._requestFrame(); // keep scrolling while the pointer stays in the edge zone
    }
  }

  /**
   * @private
   * @param {number} clientX
   * @returns {string} Column whose center is the closest to the pointer
   */
  _nearestColumn(clientX) {
    let best = this._drag.targetColumn;
    let bestDistance = Infinity;
    for (const { column, centerX } of this._drag.columns) {
      const distance = Math.abs(clientX - centerX);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = column;
      }
    }
    return best;
  }

  /**
   * First window of the column whose middle is below the pointer (null = end of the column).
   * @private
   * @param {string} column
   * @param {number} clientY
   * @returns {string|null} Window id
   */
  _windowBelowPointer(column, clientY) {
    const entry = this._view.measureWindows(column).find(({ bounds }) => clientY < bounds.top + bounds.height / 2);
    return entry ? entry.id : null;
  }

  /**
   * @private
   * @param {number} clientY
   * @returns {number} Pixels to scroll this frame (negative = up)
   */
  _autoScrollStep(clientY) {
    const bounds = this._view.getBounds();
    const topDepth = bounds.top + EDGE_PX - clientY;
    const bottomDepth = clientY - (bounds.bottom - EDGE_PX);
    if (topDepth > 0) return -Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, topDepth / EDGE_PX));
    if (bottomDepth > 0) return Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, bottomDepth / EDGE_PX));
    return 0;
  }

  /**
   * Moves the placeholder only when the drop target changed.
   * @private
   * @param {string} column
   * @param {string|null} beforeId
   */
  _movePlaceholder(column, beforeId) {
    const drag = this._drag;
    const container = this._view.getColumn(column);
    const beforePanel = beforeId ? this._view.getWindow(beforeId) : null;
    const children = container.getChildren();
    const currentIndex = children.indexOf(drag.placeholder);
    const nextChild = currentIndex === -1 ? undefined : (children[currentIndex + 1] || null);
    if (currentIndex !== -1 && nextChild === beforePanel) return;

    container.insertChildBefore(drag.placeholder, beforePanel);
    if (drag.targetColumn !== column) {
      drag.targetColumn = column;
      this._view.setHoveredColumn(column);
    }
  }

  /** @private Puts the window where the placeholder is and saves the layout. */
  _drop() {
    const drag = this._drag;
    const container = this._view.getColumn(drag.targetColumn);
    const children = container.getChildren();
    const placeholderIndex = children.indexOf(drag.placeholder);
    const nextChild = placeholderIndex === -1 ? null : (children[placeholderIndex + 1] || null);
    const index = children
      .slice(0, Math.max(0, placeholderIndex))
      .filter((child) => child !== drag.placeholder && typeof child.getWindowId === 'function').length;

    this._endDrag();
    container.insertChildBefore(drag.panel, nextChild);
    this._layout.moveWindow(drag.windowId, drag.targetColumn, index);
  }

  /** @private Restores the window at its original place. */
  _cancelDrag() {
    const drag = this._drag;
    if (!drag) return;
    this._endDrag();
    this._view.getColumn(drag.originColumn).insertChildBefore(drag.panel, drag.originNext);
  }

  /** @private Removes the drag visuals; the caller re-parents the panel. */
  _endDrag() {
    const drag = this._drag;
    if (drag.frame) cancelAnimationFrame(drag.frame);
    drag.panel.clearDragGeometry();
    drag.placeholder.destroy();
    this._view.setHoveredColumn(null);
    AppShell.setWindowDragActive(false);
    this._drag = null;
  }
}
