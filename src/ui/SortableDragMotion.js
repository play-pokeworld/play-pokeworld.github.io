/** @file SortableDragMotion.js @brief One floating card, original CSS context, placeholder and document edge scrolling. */
import { UIDragPlaceholder } from './UIDragPlaceholder.js';
import { SortableListRules } from '../config/SortableListRules.js';
export class SortableDragMotion {
  constructor(onFrame) {
    this._onFrame = onFrame;
    this._state = null;
    this._frame = null;
  }
  /** @param {Object} row @param {number} x @param {number} y */
  begin(row, x, y) {
    this.end();
    const node = row.getDomElement(),
      rect = row.getBounds();
    const placeholder = new UIDragPlaceholder({
      className: 'pw-sortable-placeholder',
    });
    placeholder.setHeight(rect.height);
    node.parentNode?.insertBefore(placeholder.getDomElement(), node);
    const panel = node.closest?.('.dash-win'),
      plane = node.closest?.('#main-dashboard');
    panel?.classList.add('pw-sortable-drag-host');
    plane?.classList.add('pw-sortable-drag-plane');
    this._state = {
      row,
      placeholder,
      panel,
      plane,
      x,
      y,
      grabX: x - rect.left,
      grabY: y - rect.top,
    };
    row._setCssVariable('--pw-sortable-w', `${rect.width}px`);
    row._setCssVariable('--pw-sortable-h', `${rect.height}px`);
    row._setCssVariable('--pw-sortable-x', `${rect.left}px`);
    row._setCssVariable('--pw-sortable-y', `${rect.top}px`);
    row.addClass('pw-sortable-floating');
    this._request();
  }
  /** @param {number} x @param {number} y */
  move(x, y) {
    if (!this._state) return;
    this._state.x = x;
    this._state.y = y;
    this._request();
  }
  isActive() {
    return !!this._state;
  }
  _request() {
    if (this._frame !== null) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = null;
      this._paint();
    });
  }
  _paint() {
    const s = this._state;
    if (!s) return;
    s.row._setCssVariable('--pw-sortable-x', `${s.x - s.grabX}px`);
    s.row._setCssVariable('--pw-sortable-y', `${s.y - s.grabY}px`);
    const edge = SortableListRules.EDGE_PX,
      height = window.innerHeight;
    const distance =
      s.y < edge ? s.y - edge : s.y > height - edge ? s.y - (height - edge) : 0;
    if (distance) {
      const step =
        Math.sign(distance) *
        Math.min(
          SortableListRules.MAX_SCROLL_STEP,
          Math.ceil(
            (Math.abs(distance) / edge) * SortableListRules.MAX_SCROLL_STEP,
          ),
        );
      window.scrollBy?.(0, step);
    }
    this._onFrame?.({ clientX: s.x, clientY: s.y });
    if (distance) this._request();
  }
  end() {
    if (this._frame !== null) {
      cancelAnimationFrame(this._frame);
      this._frame = null;
    }
    const s = this._state;
    this._state = null;
    if (!s) return;
    s.row.removeClass('pw-sortable-floating');
    s.placeholder.destroy();
    s.panel?.classList.remove('pw-sortable-drag-host');
    s.plane?.classList.remove('pw-sortable-drag-plane');
  }
}
