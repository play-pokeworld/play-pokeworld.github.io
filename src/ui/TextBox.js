/**
 * PokeWorld UI Design System — TextBox Component
 *
 * Universal read-only text container for battle logs, descriptions,
 * dialogues, and lore entries. Guarantees high-contrast readability across all 4 themes.
 *
 * @module ui/TextBox
 */

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

export class TextBox {
  /**
   * @param {Object} options
   * @param {string|HTMLElement} [options.content=''] - Hand text or HTML content
   * @param {boolean} [options.bordered=true] - Whether to show border and background
   * @param {string} [options.variant='default'] - 'default' | 'combat_log' | 'dialogue' | 'dex_desc'
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    this.content = options.content || '';
    this.bordered = options.bordered !== false;
    this.variant = options.variant || 'default';
    this.className = options.className || '';
    this._element = null;
  }

  render() {
    const el = document.createElement('div');
    el.className = `pw-ui-textbox pw-ui-textbox--${this.variant} ${this.bordered ? 'is-bordered' : ''} ${this.className}`.trim();
    if (typeof this.content === 'string') {
      globalThis._pwSetHtmlSafe(el, this.content);
    } else if (this.content && this.content.nodeType) {
      el.appendChild(this.content);
    }
    this._element = el;
    return el;
  }

  setContent(newContent) {
    this.content = newContent;
    if (this._element) {
      if (typeof newContent === 'string') {
        globalThis._pwSetHtmlSafe(this._element, newContent);
      } else if (newContent && newContent.nodeType) {
        this._element.replaceChildren();
        this._element.appendChild(newContent);
      }
    }
  }
}

