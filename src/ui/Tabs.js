/**
 * PokeWorld UI Design System — Tabs Component
 *
 * Tab navigation header with corresponding panel switching.
 *
 * @module ui/Tabs
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {Array<{id: string, label: string, content?: string|HTMLElement}>} [options.tabs=[]] - Tab definitions
 * @param {string} [options.defaultTabId=''] - ID of initial active tab
 * @param {Function} [options.onTabChange] - Callback fired when active tab changes
 * @param {string} [options.className=''] - Additional CSS classes
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

import { eventBus } from '../core/event-bus.js';

export class Tabs {
  constructor(options = {}) {
    this.tabs = Array.isArray(options.tabs) ? options.tabs : [];
    this.activeTabId = options.defaultTabId || (this.tabs[0] && this.tabs[0].id) || '';
    this.onTabChange = typeof options.onTabChange === 'function' ? options.onTabChange : null;
    this.className = options.className || '';
    this._element = null;
    this._navElement = null;
    this._bodyElement = null;
  }

  /**
   * Render and return the tabs element
   * @returns {HTMLElement}
   */
  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-tabs ${this.className}`.trim();

    const nav = document.createElement('div');
    nav.className = 'pw-ui-tabs-nav';

    const body = document.createElement('div');
    body.className = 'pw-ui-tabs-body';

    this.tabs.forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-ui-tab-btn';
      if (tab.id === this.activeTabId) {
        btn.classList.add('is-active');
      }
      btn.textContent = tab.label;

      const pane = document.createElement('div');
      pane.className = 'pw-ui-tab-pane';
      if (tab.id === this.activeTabId) {
        pane.classList.add('is-active');
      }
      if (tab.content) {
        if (typeof tab.content === 'string') {
          globalThis._pwSetHtmlSafe(pane, tab.content);
        } else if (tab.content instanceof HTMLElement) {
          pane.appendChild(tab.content);
        }
      }

      btn.addEventListener('click', () => {
        this.activeTabId = tab.id;
        nav.querySelectorAll('.pw-ui-tab-btn').forEach((b, i) => {
          b.classList.toggle('is-active', this.tabs[i] && this.tabs[i].id === tab.id);
        });
        body.querySelectorAll('.pw-ui-tab-pane').forEach((p, i) => {
          p.classList.toggle('is-active', this.tabs[i] && this.tabs[i].id === tab.id);
        });
        eventBus.emit('input:select', { tabId: tab.id });
        if (this.onTabChange) {
          this.onTabChange(tab.id, tab);
        }
      });

      nav.appendChild(btn);
      body.appendChild(pane);
    });

    el.appendChild(nav);
    el.appendChild(body);
    this._element = el;
    this._navElement = nav;
    this._bodyElement = body;
    return el;
  }
}
