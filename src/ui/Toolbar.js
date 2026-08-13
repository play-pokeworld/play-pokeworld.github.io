/**
 * PokeWorld UI Design System — Toolbar Component
 *
 * Standardized filter / sort / search toolbar for every data screen
 * (bag, PC box, dictionary, selectors, shops…).
 *
 * The toolbar is RENDERED OUTSIDE the scrollable content: it is a flex
 * sibling of the scroller, not a child, so it NEVER scrolls away and can
 * never leave the "empty gap where the grid bleeds through" defect.
 * Consumers do not need any sticky CSS hacks — the component owns the
 * required styles via the single canonical stylesheet section
 * (`pw-ui-toolbar*` classes in design-system.css).
 *
 * @module ui/Toolbar
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {Object} [options.search] - Search configuration:
 *   { placeholder: string, value: string, onInput: (query) => void }
 * @param {Object} [options.sort] - Sort configuration:
 *   { options: Array<{ id, label }>, active: string, onChange: (id) => void }
 * @param {Array<HTMLElement|string>} [options.left=[]] - Extra controls prepended (tabs, pills…)
 * @param {Array<HTMLElement|string>} [options.right=[]] - Extra controls appended (reset…)
 * @param {boolean} [options.fixed=true] - Fixed (non-scrolling) mode; false = plain inline bar
 * @param {string} [options.className=''] - Additional CSS classes
 *
 * Events: emits `ui:filter-change` on the EventBus with
 * { query, sort } whenever the user types or changes the sort.
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

import { eventBus } from '../core/event-bus.js';

let _toolbarSeq = 0;

export class Toolbar {
  constructor(options = {}) {
    this.search = options.search || null;
    this.sort = options.sort || null;
    this.left = Array.isArray(options.left) ? options.left : [];
    this.right = Array.isArray(options.right) ? options.right : [];
    this.fixed = options.fixed !== false;
    this.className = options.className || '';
    this.inputId = `pw-tb-search-${++_toolbarSeq}`;
    this._element = null;
    this._input = null;
    this._sortButtons = new Map();
    this._query = (this.search && this.search.value) || '';
    this._sort = (this.sort && this.sort.active) || null;
  }

  /**
   * Create and return the toolbar DOM element.
   * @returns {HTMLElement}
   */
  render() {
    const root = document.createElement('div');
    root.className = `pw-ui-toolbar pw-ui-toolbar--fixed ${this.className}`.trim();

    // Optional leading controls (category tabs, filter pills…)
    for (const item of this.left) root.appendChild(this._mount(item));

    // Sort pills (unified interactive buttons — never a dropdown)
    if (this.sort && Array.isArray(this.sort.options) && this.sort.options.length) {
      const sortBar = document.createElement('div');
      sortBar.className = 'pw-ui-toolbar-sort';
      const label = document.createElement('span');
      label.className = 'pw-ui-toolbar-sort-label';
      label.textContent = '';
      sortBar.appendChild(label);
      for (const opt of this.sort.options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pw-ui-btn usm-sort-btn' + (String(this._sort) === String(opt.id) ? ' active' : '');
        btn.dataset.sort = opt.id;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => this.setSort(opt.id, true));
        this._sortButtons.set(String(opt.id), btn);
        sortBar.appendChild(btn);
      }
      root.appendChild(sortBar);
    }

    // Search input (standardized, persistent focus target)
    if (this.search) {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = this.inputId;
      input.className = 'pw-ui-toolbar-search dict-search box-filter-search';
      input.placeholder = this.search.placeholder || '';
      input.value = this._query;
      input.setAttribute('aria-label', this.search.placeholder || this.inputId);
      input.addEventListener('input', () => {
        this._query = input.value;
        if (typeof this.search.onInput === 'function') this.search.onInput(input.value);
        this._emit();
      });
      root.appendChild(input);
      this._input = input;
    }

    // Optional trailing controls (reset button…)
    for (const item of this.right) root.appendChild(this._mount(item));

    this._element = root;
    return root;
  }

  _mount(item) {
    if (item && item.nodeType) return item;
    const wrap = document.createElement('div');
    globalThis._pwSetHtmlSafe(wrap, String(item == null ? '' : item));
    return wrap;
  }

  _emit() {
    eventBus.emit('ui:filter-change', { query: this._query, sort: this._sort, component: 'Toolbar' });
  }

  /**
   * Update the active sort. Optionally re-emit the change (user click).
   * @param {string} id
   * @param {boolean} [notify=false]
   */
  setSort(id, notify = false) {
    this._sort = id;
    for (const [sortId, btn] of this._sortButtons) {
      btn.classList.toggle('active', sortId === String(id));
    }
    if (this.sort && typeof this.sort.onChange === 'function') this.sort.onChange(id);
    if (notify) this._emit();
  }

  /**
   * Update the search query programmatically (does not re-emit).
   * @param {string} q
   */
  setQuery(q) {
    this._query = String(q == null ? '' : q);
    if (this._input) this._input.value = this._query;
  }

  /**
   * @returns {{ query: string, sort: string|null }}
   */
  getState() {
    return { query: this._query, sort: this._sort };
  }

  /**
   * True when the toolbar is in fixed (non-scrolling) mode.
   * @returns {boolean}
   */
  isFixed() {
    return this.fixed;
  }
}

