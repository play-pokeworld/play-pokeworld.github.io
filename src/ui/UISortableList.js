/**
 * @file UISortableList.js
 * @brief Reorderable list with a pointer handle and immediate mouse card dragging and touch hold protection.
 * Items can be synchronized by stable key so live roster rows keep their widgets and focus.
 */

import { UIContainer } from './UIContainer.js';
import { SortableDragMotion } from './SortableDragMotion.js';

import { SortableListRules } from '../config/SortableListRules.js';

export class UISortableList extends UIContainer {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.className='']
   * @param {(fromKey: string, toKey: string) => void} [options.onReorder=null]
   * @param {boolean} [options.rowDrag=false] - Enable whole-card pointer dragging
   */
  constructor(options = {}) {
    super({
      className: `pw-sortable-list ${options.className || ''}`.trim(),
      name: options.name || 'UISortableList',
    });
    /** @private @type {Array<{key: string, row: import('./UIElement.js').UIElement, handle: import('./UIElement.js').UIElement|null}>} */
    this._items = [];
    /** @private */ this._onReorder = options.onReorder || null;
    /** @private @type {{key: string, row: import('./UIElement.js').UIElement, target: Object|null}|null} */
    this._drag = null;
    /** @private @type {{key:string,row:import('./UIElement.js').UIElement,target:Object|null}|null} */
    this._nativeDrag = null;
    /** @private @type {{key:string,row:import('./UIElement.js').UIElement,timer:ReturnType<typeof setTimeout>|null,ready:boolean}|null} */
    this._mouseDragArm = null;
    /** @private */ this._rowDragEnabled = options.rowDrag === true;
    /** @private @type {WeakSet<import('./UIElement.js').UIElement>} */
    this._boundHandles = new WeakSet();
    /** @private @type {WeakSet<import('./UIElement.js').UIElement>} */
    this._boundRows = new WeakSet();
    this._suppressedClicks = new WeakMap();
    this._followPointer = options.followPointer === true;
    this._contextKey = options.getContextKey || (() => null);
    this._motion = new SortableDragMotion((point) =>
      this._updateDropTarget(point),
    );
    this._escape = (event) => {
      if (event.key === 'Escape') this.cancelDrag();
    };
    this._blur = () => this.cancelDrag();
    window.addEventListener('keydown', this._escape);
    window.addEventListener('blur', this._blur);
  }

  /**
   * Adds one item.
   * @param {string} key - Identifier reported by onReorder
   * @param {import('./UIElement.js').UIElement} row
   * @param {import('./UIElement.js').UIElement} [handle=null] - Child of the row that starts the pointer drag
   */
  addItem(key, row, handle = null) {
    const item = { key: String(key), row, handle };
    this.addChild(row);
    this._items.push(item);
    this._bindHandle(item);
    this._bindRowDrag(item);
  }

  /**
   * Synchronizes rows by stable key without recreating retained widgets.
   * The caller supplies the desired order; an existing row for a key wins over
   * a newly constructed one so live controls and keyboard focus survive refreshes.
   * @param {Array<{key:string,row:import('./UIElement.js').UIElement,handle?:import('./UIElement.js').UIElement|null}>} entries
   */
  setItems(entries) {
    const focusedKey = this.getFocusedDataKey();
    const previousByKey = new Map(this._items.map((item) => [item.key, item]));
    const next = [];
    const usedKeys = new Set();
    for (const entry of entries || []) {
      if (!entry || entry.key == null || !entry.row) continue;
      const key = String(entry.key);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const previous = previousByKey.get(key);
      const row = previous?.row || entry.row;
      const handle = previous?.handle || entry.handle || null;
      next.push({ key, row, handle });
    }

    const retainedRows = new Set(next.map((item) => item.row));
    for (const item of this._items) {
      if (retainedRows.has(item.row)) continue;
      if (this._drag?.row === item.row || this._drag?.target?.row === item.row)
        this._end(false);
      if (this._mouseDragArm?.row === item.row)
        this._cancelMouseDragArm(item.row);
      if (
        this._nativeDrag?.row === item.row ||
        this._nativeDrag?.target?.row === item.row
      )
        this._clearNativeDrag();
      this.removeChild(item.row);
      item.row.destroy();
    }

    for (const item of next) {
      if (item.row.getParent() !== this) this.addChild(item.row);
      this._bindHandle(item);
      this._bindRowDrag(item);
    }

    // Move only rows that are out of place. In the browser, insertBefore moves
    // the existing node instead of replacing its subtree; retained focus stays
    // attached to the same handle.
    if (!this._motion.isActive())
      for (let index = 0; index < next.length; index++) {
        const node = next[index].row.getDomElement();
        const current = this._dom.children[index] || null;
        if (current !== node) this._dom.insertBefore(node, current);
      }
    this._children = next.map((item) => item.row);
    this._items = next;
    if (focusedKey) this.focusDescendantByDataKey(focusedKey);
  }

  /** Cancels a gesture without committing a model mutation. */
  cancelDrag() {
    if (this._drag?.fromRow)
      this._suppressedClicks.set(
        this._drag.row,
        Date.now() + SortableListRules.CLICK_SUPPRESSION_MS,
      );
    this._end(false);
    this._clearNativeDrag();
    this._cancelMouseDragArm();
  }

  /** Removes (and destroys) every item. */
  clearItems() {
    this._end(false);
    this._clearNativeDrag();
    this._cancelMouseDragArm();
    this._items = [];
    this.clearChildren();
  }

  /** @override */
  onDestroy() {
    this._end(false);
    this._clearNativeDrag();
    this._cancelMouseDragArm();
    window.removeEventListener('keydown', this._escape);
    window.removeEventListener('blur', this._blur);
    super.onDestroy();
  }

  /** @private @param {{key:string,row:import('./UIElement.js').UIElement,handle:import('./UIElement.js').UIElement|null}} item */
  _bindHandle(item) {
    const handle = item.handle;
    if (!handle || this._boundHandles.has(handle)) return;
    this._boundHandles.add(handle);
    handle.setAttribute('data-stop-drag', 'true');
    handle.addDomListener('pointerdown', (event) =>
      this._start(event, item, handle),
    );
    handle.addDomListener('pointermove', (event) => this._move(event));
    handle.addDomListener('pointerup', () => this._end(true));
    handle.addDomListener('pointercancel', () => this._end(false));
  }

  /** @private @param {{key:string,row:import('./UIElement.js').UIElement,handle:import('./UIElement.js').UIElement|null}} item */
  _bindRowDrag(item) {
    if (!this._rowDragEnabled || this._boundRows.has(item.row)) return;
    this._boundRows.add(item.row);
    const row = item.row;
    row.addClass('pw-sortable-row');
    row.addDomListener(
      'click',
      (event) => {
        if ((this._suppressedClicks.get(row) || 0) < Date.now()) return;
        this._suppressedClicks.delete(row);
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
    row.addDomListener(
      'touchmove',
      (event) => {
        if (this._drag?.row === row) event.preventDefault();
      },
      { passive: false },
    );
    row.addDomListener(
      'contextmenu',
      (event) => {
        if (this._drag?.row === row) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    row.addDomListener('pointerdown', (event) =>
      this._armRowPointer(event, item),
    );
    row.addDomListener('pointermove', (event) =>
      this._moveRowPointer(event, item),
    );
    row.addDomListener('pointerup', (event) =>
      this._finishRowPointer(event, item, true),
    );
    row.addDomListener('pointercancel', (event) =>
      this._finishRowPointer(event, item, false),
    );
    row.addDomListener('lostpointercapture', (event) =>
      this._finishRowPointer(event, item, false),
    );
    row.addDomListener('mousedown', (event) => {
      if (typeof PointerEvent === 'function') return;
      if (event.button !== 0 || this._isDragBlockedTarget(event.target)) return;
      this._cancelMouseDragArm();
      const arm = { key: item.key, row, timer: null, ready: false };
      this._mouseDragArm = arm;
      arm.timer = setTimeout(() => {
        if (this._mouseDragArm !== arm) return;
        arm.ready = true;
        row.setAttribute('draggable', 'true');
        row.addClass('is-drag-armed');
      }, SortableListRules.HOLD_MS);
    });
    row.addDomListener('mouseup', () => this._onRowMouseUp(item));
    row.addDomListener('dragstart', (event) =>
      this._startNativeDrag(event, item),
    );
    row.addDomListener('dragover', (event) =>
      this._nativeDragOver(event, item),
    );
    row.addDomListener('dragleave', (event) =>
      this._nativeDragLeave(event, item),
    );
    row.addDomListener('drop', (event) => this._dropOnRow(event, item));
    row.addDomListener('dragend', () => {
      this._clearNativeDrag();
      this._cancelMouseDragArm(item.row);
    });
  }

  /** @private Real card dragging shares the pointer engine with handles, not HTML drag arming. */
  _armRowPointer(event, item) {
    if (event.isPrimary === false) return;
    if (event.button == null || event.button === 0)
      this._suppressedClicks.delete(item.row);
    if (
      (event.button != null && event.button !== 0) ||
      this._isDragBlockedTarget(event.target)
    )
      return;
    this._cancelMouseDragArm();
    const arm = {
      key: item.key,
      row: item.row,
      pointer: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ready: false,
      touch: event.pointerType === 'touch' || event.pointerType === 'pen',
      context: this._contextKey(),
      timer: null,
    };
    this._mouseDragArm = arm;
    item.row.getDomElement().setPointerCapture?.(event.pointerId);
    if (arm.touch)
      arm.timer = setTimeout(() => {
        if (this._mouseDragArm === arm) this._beginRowPointer(arm);
      }, SortableListRules.HOLD_MS);
  }
  /** @private */
  _beginRowPointer(arm) {
    if (this._contextKey() !== arm.context) {
      this._cancelMouseDragArm();
      return;
    }
    arm.ready = true;
    arm.timer = null;
    this._drag = {
      key: arm.key,
      row: arm.row,
      target: null,
      fromRow: true,
      pointerId: arm.pointerId,
      context: arm.context,
    };
    arm.row.addClass('is-dragging');
    if (this._followPointer) this._motion.begin(arm.row, arm.x, arm.y);
  }
  /** @private */
  _moveRowPointer(event, item) {
    const arm = this._mouseDragArm;
    if (
      !arm?.pointer ||
      arm.row !== item.row ||
      arm.pointerId !== event.pointerId
    )
      return;
    if (this._contextKey() !== arm.context) {
      this.cancelDrag();
      return;
    }
    if (!arm.ready) {
      const distance = Math.hypot(event.clientX - arm.x, event.clientY - arm.y);
      if (arm.touch) {
        if (distance > SortableListRules.MOVE_SLOP)
          this._cancelMouseDragArm(item.row);
        return;
      }
      if (distance <= SortableListRules.DRAG_THRESHOLD) return;
      this._beginRowPointer(arm);
    }
    event.preventDefault();
    this._move(event);
  }
  /** @private */
  _finishRowPointer(event, item, commit) {
    const arm = this._mouseDragArm;
    if (
      !arm?.pointer ||
      arm.row !== item.row ||
      arm.pointerId !== event.pointerId
    )
      return;
    if (arm.ready) {
      this._suppressedClicks.set(
        item.row,
        Date.now() + SortableListRules.CLICK_SUPPRESSION_MS,
      );
      this._end(commit && this._contextKey() === arm.context);
    }
    this._cancelMouseDragArm(item.row);
  }

  /** @private @param {Object|null} target @returns {boolean} */
  _isDragBlockedTarget(target) {
    return !!target?.closest?.(SortableListRules.BLOCKING_TARGETS);
  }

  /** @private @param {{key:string,row:import('./UIElement.js').UIElement}} item */
  _onRowMouseUp(item) {
    const arm = this._mouseDragArm;
    if (!arm || arm.row !== item.row || this._nativeDrag?.row === item.row)
      return;
    this._cancelMouseDragArm(item.row);
  }

  /** @private @param {Object} event @param {{key:string,row:import('./UIElement.js').UIElement}} item */
  _startNativeDrag(event, item) {
    const rowNode = item.row.getDomElement();
    if (this._drag?.fromRow) {
      event.preventDefault();
      return;
    }
    if (
      rowNode.getAttribute('draggable') !== 'true' ||
      this._isDragBlockedTarget(event.target)
    ) {
      event.preventDefault();
      return;
    }

    const arm = this._mouseDragArm;
    if (arm?.row === item.row && arm.timer !== null) {
      clearTimeout(arm.timer);
      arm.timer = null;
    }
    this._end(false);
    this._clearNativeDrag();

    const transfer = event.dataTransfer;
    if (transfer) {
      try {
        transfer.clearData?.();
      } catch {}
      try {
        transfer.effectAllowed = 'move';
      } catch {}
      try {
        transfer.setData?.('text/plain', item.key);
      } catch {}
    }
    item.row.removeClass('is-drag-armed');
    this._nativeDrag = { key: item.key, row: item.row, target: null };
    item.row.addClass('is-dragging');
  }

  /** @private @param {Object} event @param {{key:string,row:import('./UIElement.js').UIElement}} item */
  _nativeDragOver(event, item) {
    if (!this._nativeDrag) return;
    event.preventDefault();
    if (event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'move';
      } catch {}
    }
    this._setNativeDropTarget(item);
  }

  /** @private @param {Object} event @param {{key:string,row:import('./UIElement.js').UIElement}} item */
  _nativeDragLeave(event, item) {
    if (!this._nativeDrag || this._nativeDrag.target?.row !== item.row) return;
    const rowNode = item.row.getDomElement();
    if (event.relatedTarget && rowNode.contains?.(event.relatedTarget)) return;
    this._setNativeDropTarget(null);
  }

  /** @private @param {{key:string,row:import('./UIElement.js').UIElement}|null} target */
  _setNativeDropTarget(target) {
    if (!this._nativeDrag) return;
    const next = target && target.key !== this._nativeDrag.key ? target : null;
    if (next === this._nativeDrag.target) return;
    this._nativeDrag.target?.row.removeClass('is-drop-target');
    this._nativeDrag.target = next;
    this._nativeDrag.target?.row.addClass('is-drop-target');
  }

  /** @private @param {Object} event @param {{key:string,row:import('./UIElement.js').UIElement}} item */
  _dropOnRow(event, item) {
    if (!this._nativeDrag) return;
    event.preventDefault();
    const fromKey = this._nativeDrag.key;
    const toKey = item.key;
    this._clearNativeDrag();
    if (fromKey !== toKey && this._onReorder) this._onReorder(fromKey, toKey);
  }

  /** @private */
  _clearNativeDrag() {
    const drag = this._nativeDrag;
    if (!drag) return;
    this._nativeDrag = null;
    drag.row.removeClass('is-dragging');
    drag.row.removeClass('is-drop-target');
    drag.target?.row.removeClass('is-drop-target');
    this._cancelMouseDragArm(drag.row);
  }

  /** @private @param {Object} event @param {{key:string,row:import('./UIElement.js').UIElement,handle:import('./UIElement.js').UIElement|null}} item @param {import('./UIElement.js').UIElement} handle */
  _start(event, item, handle) {
    event.preventDefault();
    handle.getDomElement().setPointerCapture?.(event.pointerId);
    this._drag = { key: item.key, row: item.row, target: null };
    item.row.addClass('is-dragging');
  }

  /** @private */
  _move(event) {
    if (!this._drag) return;
    if (this._followPointer && this._drag.fromRow)
      this._motion.move(event.clientX, event.clientY);
    this._updateDropTarget(event);
  }
  /** @private */
  _updateDropTarget(event) {
    if (!this._drag) return;
    const target =
      this._items.find(({ key, row }) => {
        if (key === this._drag.key) return false;
        const bounds = row.getBounds();
        return (
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom &&
          (!Number.isFinite(event.clientX) ||
            (event.clientX >= bounds.left && event.clientX <= bounds.right))
        );
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
    this._motion.end();
    drag.row.removeClass('is-dragging');
    drag.target?.row.removeClass('is-drop-target');
    if (commit && drag.target && this._onReorder)
      this._onReorder(drag.key, drag.target.key);
  }

  /** @private @param {UIElement|null} [row=null] */
  _cancelMouseDragArm(row = null) {
    const arm = this._mouseDragArm;
    if (!arm || (row && arm.row !== row)) return;
    this._mouseDragArm = null;
    if (
      arm.pointer &&
      arm.row.getDomElement().hasPointerCapture?.(arm.pointerId)
    )
      arm.row.getDomElement().releasePointerCapture?.(arm.pointerId);
    if (arm.timer !== null) clearTimeout(arm.timer);
    arm.row.removeAttribute('draggable');
    arm.row.removeClass('is-drag-armed');
    this._mouseDragArm = null;
  }
}
