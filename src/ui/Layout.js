/**
 * PokeWorld UI Design System — Layout Component
 *
 * Universal layout container supporting 'horizontal' (row), 'vertical' (column),
 * and 'grid' layouts. Switching variant changes display cleanly.
 *
 * @module ui/Layout
 */

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

export class Layout {
  /**
   * @param {Object} options
   * @param {string} [options.variant='vertical'] - 'horizontal' | 'vertical' | 'grid'
   * @param {number} [options.cols=3] - Number of columns if variant === 'grid'
   * @param {string} [options.gap='var(--pw-spacing-md, 12px)'] - Gap spacing
   * @param {string} [options.className='']
   * @param {Array<HTMLElement|string>} [options.items=[]] - Children elements
   */
  constructor(options = {}) {
    this.variant = options.variant || 'vertical';
    this.cols = Number(options.cols) || 3;
    this.gap = options.gap || 'var(--pw-spacing-md, 12px)';
    this.className = options.className || '';
    this.items = Array.isArray(options.items) ? options.items : [];
    this._element = null;
  }

  render() {
    const el = document.createElement('div');
    this._element = el;
    this._applyStyle();

    this.items.forEach((child) => {
      if (typeof child === 'string') {
        const wrap = document.createElement('div');
        globalThis._pwSetHtmlSafe(wrap, child);
        el.appendChild(wrap);
      } else if (child && child.nodeType) {
        el.appendChild(child);
      }
    });

    return el;
  }

  setVariant(variant, opts = {}) {
    this.variant = variant || 'vertical';
    if (opts.cols) this.cols = Number(opts.cols) || 3;
    if (opts.gap) this.gap = opts.gap;
    if (this._element) {
      this._applyStyle();
    }
  }

  _applyStyle() {
    if (!this._element) return;
    this._element.className = `pw-ui-layout pw-ui-layout--${this.variant} ${this.className}`.trim();
    this._element.style.display = (this.variant === 'grid') ? 'grid' : 'flex';
    this._element.style.gap = this.gap;
    if (this.variant === 'grid') {
      this._element.style.gridTemplateColumns = `repeat(${this.cols}, minmax(0, 1fr))`;
      this._element.style.flexDirection = '';
    } else if (this.variant === 'horizontal') {
      this._element.style.flexDirection = 'row';
      this._element.style.flexWrap = 'wrap';
      this._element.style.alignItems = 'center';
      this._element.style.gridTemplateColumns = '';
    } else {
      this._element.style.flexDirection = 'column';
      this._element.style.gridTemplateColumns = '';
    }
  }
}

