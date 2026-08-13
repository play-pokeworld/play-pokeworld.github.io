/**
 * PokeWorld UI Design System — Window Component
 *
 * Generic modal / window component with header (title + close button),
 * scrollable body, optional action footer, and optional dragging.
 *
 * @module ui/Window
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string} [options.id] - Optional DOM ID for the window element
 * @param {string} [options.title=''] - Window header title text or localization key
 * @param {string|HTMLElement} [options.content=''] - Hand scrollable content
 * @param {string|HTMLElement} [options.footer=''] - Optional footer content or action buttons
 * @param {boolean} [options.closable=true] - Whether to show the header close button
 * @param {boolean} [options.draggable=false] - Whether the window can be dragged via header
 * @param {boolean} [options.overlay=true] - Whether to display has dark background overlay
 * @param {Function} [options.onClose] - Callback fired when window is closed
 * @param {string} [options.className=''] - Additional CSS classes
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

import { eventBus } from '../core/event-bus.js';

export class Window {
  constructor(options = {}) {
    this.id = options.id || `pw-win-${Math.random().toString(36).slice(2, 9)}`;
    this.title = options.title || '';
    this.content = options.content || '';
    this.footer = options.footer || null;
    this.closable = options.closable !== false;
    this.draggable = Boolean(options.draggable);
    this.overlay = options.overlay !== false;
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.className = options.className || '';
    this._element = null;
    this._overlayElement = null;
    this._isOpen = false;
  }

  /**
   * Render and mount the window into document.body
   * @returns {HTMLElement} The root window element
   */
  open() {
    if (this._isOpen) return this._element;
    this._isOpen = true;

    if (this.overlay) {
      this._overlayElement = document.createElement('div');
      this._overlayElement.className = 'pw-ui-overlay';
      this._overlayElement.addEventListener('click', () => this.close());
      document.body.appendChild(this._overlayElement);
    }

    const winEl = document.createElement('div');
    winEl.id = this.id;
    winEl.className = `pw-ui-window ${this.className}`.trim();
    winEl.setAttribute('role', 'dialog');
    winEl.setAttribute('aria-modal', 'true');

    // Header
    const headerEl = document.createElement('div');
    headerEl.className = 'pw-ui-window-header';

    const titleEl = document.createElement('h2');
    titleEl.className = 'pw-ui-window-title';
    titleEl.textContent = this.title;
    headerEl.appendChild(titleEl);

    if (this.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'pw-ui-window-close';
      closeBtn.setAttribute('data-i18n-aria-label', 'modal_close_btn');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.close());
      headerEl.appendChild(closeBtn);
    }
    winEl.appendChild(headerEl);

    // Body
    const bodyEl = document.createElement('div');
    bodyEl.className = 'pw-ui-window-body';
    if (typeof this.content === 'string') {
      globalThis._pwSetHtmlSafe(bodyEl, this.content);
    } else if (this.content instanceof HTMLElement) {
      bodyEl.appendChild(this.content);
    }
    winEl.appendChild(bodyEl);

    // Footer (optional)
    if (this.footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'pw-ui-window-footer';
      if (typeof this.footer === 'string') {
        globalThis._pwSetHtmlSafe(footerEl, this.footer);
      } else if (this.footer instanceof HTMLElement) {
        footerEl.appendChild(this.footer);
      }
      winEl.appendChild(footerEl);
    }

    document.body.appendChild(winEl);
    this._element = winEl;

    eventBus.emit('ui:panel-open', { id: this.id, component: 'Window' });
    return winEl;
  }

  /**
   * Close and unmount the window
   */
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;

    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    if (this._overlayElement && this._overlayElement.parentNode) {
      this._overlayElement.parentNode.removeChild(this._overlayElement);
    }

    if (this.onClose) {
      this.onClose();
    }
    eventBus.emit('ui:panel-close', { id: this.id, component: 'Window' });
  }

  isOpen() {
    return this._isOpen;
  }
}

