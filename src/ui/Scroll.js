/**
 * PokeWorld UI Design System — Scroll Component
 *
 * Universal scrollable container for lists, modal bodies, and inventories.
 * Standardizes overflow behavior and scrollbar styling across all 4 themes.
 *
 * @module ui/Scroll
 */

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

export class Scroll {
  /**
   * @param {Object} options
   * @param {string|HTMLElement} [options.content=''] - Content inside scroll area
   * @param {string} [options.maxHeight='400px'] - Maximum CSS height
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    this.content = options.content || '';
    this.maxHeight = options.maxHeight || '400px';
    this.className = options.className || '';
    this._element = null;
  }

  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-scroll ${this.className}`.trim();
    el.style.maxHeight = this.maxHeight;
    el.style.overflowY = 'auto';

    if (typeof this.content === 'string') {
      globalThis._pwSetHtmlSafe(el, this.content);
    } else if (this.content && this.content.nodeType) {
      el.appendChild(this.content);
    }
    this._element = el;
    return el;
  }

  scrollToTop() {
    if (this._element) {
      try { this._element.scrollTop = 0; } catch (_) {}
    }
  }

  getScrollTop() {
    return this._element ? this._element.scrollTop : 0;
  }

  setScrollTop(top) {
    if (this._element) {
      try { this._element.scrollTop = Number(top) || 0; } catch (_) {}
    }
  }
}
