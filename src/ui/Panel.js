/**
 * PokeWorld UI Design System — Panel Component
 *
 * Content block container inside has window or on the hand screen.
 *
 * @module ui/Panel
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string} [options.title=''] - Optional panel header title
 * @param {string|HTMLElement} [options.content=''] - Panel inner content
 * @param {string} [options.variant='default'] - Visual variant ('default'|'card'|'bordered'|'highlight')
 * @param {string} [options.className=''] - Additional CSS classes
 */

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

export class Panel {
  constructor(options = {}) {
    this.title = options.title || '';
    this.content = options.content || '';
    this.variant = options.variant || 'default';
    this.className = options.className || '';
    this._element = null;
  }

  /**
   * Create and return the panel DOM element
   * @returns {HTMLElement}
   */
  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-panel pw-ui-panel--${this.variant} ${this.className}`.trim();

    if (this.title) {
      const headerEl = document.createElement('div');
      headerEl.className = 'pw-ui-panel-header';
      headerEl.textContent = this.title;
      el.appendChild(headerEl);
    }

    const bodyEl = document.createElement('div');
    bodyEl.className = 'pw-ui-panel-body';
    if (typeof this.content === 'string') {
      globalThis._pwSetHtmlSafe(bodyEl, this.content);
    } else if (this.content instanceof HTMLElement) {
      bodyEl.appendChild(this.content);
    }
    el.appendChild(bodyEl);

    this._element = el;
    return el;
  }

  getElement() {
    return this._element;
  }
}

