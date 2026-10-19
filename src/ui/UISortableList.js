/**
 * @file UISortableList.js
 * @brief Vertical list reordered by dragging a handle (C++: class UISortableList : public UIContainer).
 * Each item is a row widget plus the handle widget that starts the drag. While dragging, the
 * row gets .is-dragging and the row under the pointer .is-drop-target; on release the list
 * reports (draggedKey, targetKey) and lets the owner apply the new order.
 */

import { UIContainer } from './UIContainer.js';

export class UISortableList extends UIContainer {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.className='']
   * @param {(fromKey: string, toKey: string) => void} [options.onReorder=null]
   */
  constructor(options = {}) {
    super({ className: `pw-sortable-list ${options.className || ''}`.trim(), name: options.name || 'UISortableList' });
    /** @private @type {Array<{key: string, row: import('./UIElement.js').UIElement}>} */
    this._items = [];
    /** @private */ this._onReorder = options.onReorder || null;
    /** @private @type {{key: string, row: import('./UIElement.js').UIElement, target: Object|null}|null} */
    this._drag = null;
  }

  /**
   * @param {string} key - Identifier reported by onReorder
   * @param {import('./UIElement.js').UIElement} row
   * @param {import('./UIElement.js').UIElement} handle - Child of the row that starts the drag
   */
  addItem(key, row, handle) {
    this.addChild(row);
    const item = { key, row };
    this._items.push(item);
    handle.setAttribute('data-stop-drag', 'true');
    handle.addDomListener('pointerdown', (event) => this._start(event, item, handle));
    handle.addDomListener('pointermove', (event) => this._move(event));
    handle.addDomListener('pointerup', () => this._end(true));
    handle.addDomListener('pointercancel', () => this._end(false));
  }

  /** Removes (and destroys) every item. */
  clearItems() {
    this._drag = null;
    this._items = [];
    this.clearChildren();
  }

  /** @private */
  _start(event, item, handle) {
    event.preventDefault();
    handle.getDomElement().setPointerCapture?.(event.pointerId);
    this._drag = { key: item.key, row: item.row, target: null };
    item.row.addClass('is-dragging');
  }

  /** @private */
  _move(event) {
    if (!this._drag) return;
    const target = this._items.find(({ row }) => {
      const bounds = row.getBounds();
      return event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    }) ?? null;
    if (target === this._drag.target) return;
    this._drag.target?.row.removeClass('is-drop-target');
    this._drag.target = target && target.key !== this._drag.key ? target : null;
    this._drag.target?.row.addClass('is-drop-target');
  }

  /** @private */
  _end(commit) {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    drag.row.removeClass('is-dragging');
    drag.target?.row.removeClass('is-drop-target');
    if (commit && drag.target && this._onReorder) this._onReorder(drag.key, drag.target.key);
  }
}
