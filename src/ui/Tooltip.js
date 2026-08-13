/**
 * PokeWorld UI Design System — Tooltip Component
 *
 * Lightweight hover tooltip for displaying additional stats or item descriptions.
 *
 * @module ui/Tooltip
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string|HTMLElement} [options.content=''] - Content displayed in tooltip
 * @param {string} [options.position='top'] - Position ('top'|'bottom'|'left'|'right')
 * @param {string} [options.className=''] - Additional CSS classes
 */

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

export class Tooltip {
  constructor(options = {}) {
    this.content = options.content || '';
    this.position = options.position || 'top';
    this.className = options.className || '';
    this._element = null;
  }

  /**
   * Attach tooltip behavior to has target element
   * @param {HTMLElement} targetEl
   */
  attach(targetEl) {
    if (!targetEl) return;
    targetEl.addEventListener('mouseenter', () => this.show(targetEl));
    targetEl.addEventListener('mouseleave', () => this.hide());
  }

  show(targetEl) {
    this.hide();
    const tip = document.createElement('div');
    tip.className = `pw-ui-tooltip pw-ui-tooltip--${this.position} ${this.className}`.trim();
    if (typeof this.content === 'string') {
      globalThis._pwSetHtmlSafe(tip, this.content);
    } else if (this.content instanceof HTMLElement) {
      tip.appendChild(this.content);
    }
    document.body.appendChild(tip);
    this._element = tip;

    const rect = targetEl.getBoundingClientRect();
    tip.style.position = 'fixed';
    tip.style.left = `${rect.left + rect.width / 2}px`;
    tip.style.top = `${rect.top - 8}px`;
    tip.style.transform = 'translate(-50%, -100%)';
    tip.style.zIndex = '9999';
  }

  hide() {
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
      this._element = null;
    }
  }
}

