/**
 * PokeWorld UI Design System — List Component
 *
 * Uniform scrollable list container with item selection and semantic input support.
 *
 * @module ui/List
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {Array} [options.items=[]] - Array of data items to render
 * @param {Function} [options.renderItem] - Callback (item, idx) => HTMLElement or HTML string
 * @param {Function} [options.onSelect] - Callback fired when an item is selected
 * @param {string} [options.className=''] - Additional CSS classes
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

import { eventBus } from '../core/event-bus.js';

export class List {
  constructor(options = {}) {
    this.items = Array.isArray(options.items) ? options.items : [];
    this.renderItem = typeof options.renderItem === 'function' ? options.renderItem : null;
    this.onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
    this.className = options.className || '';
    this._element = null;
    this._selectedIdx = -1;
  }

  /**
   * Render and return the list container element
   * @returns {HTMLElement}
   */
  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-list ${this.className}`.trim();

    this.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'pw-ui-list-item';
      if (idx === this._selectedIdx) {
        row.classList.add('is-selected');
      }

      if (this.renderItem) {
        const rendered = this.renderItem(item, idx);
        if (typeof rendered === 'string') {
          globalThis._pwSetHtmlSafe(row, rendered);
        } else if (rendered instanceof HTMLElement) {
          row.appendChild(rendered);
        }
      } else {
        row.textContent = String(item);
      }

      row.addEventListener('click', () => {
        this._selectedIdx = idx;
        el.querySelectorAll('.pw-ui-list-item').forEach((r, i) => {
          r.classList.toggle('is-selected', i === idx);
        });
        eventBus.emit('input:select', { item, index: idx });
        if (this.onSelect) {
          this.onSelect(item, idx);
        }
      });

      el.appendChild(row);
    });

    this._element = el;
    return el;
  }
}
