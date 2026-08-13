/**
 * PokeWorld UI Design System — Button Component
 *
 * Standardized UI button with support for variants, icon-only mode,
 * disabled and loading states, and semantic EventBus emission.
 *
 * @module ui/Button
 *
 * Expected props / options:
 * @param {Object} options - Configuration object
 * @param {string} [options.text=''] - Label text displayed inside button
 * @param {string} [options.variant='secondary'] - Variant ('primary'|'secondary'|'danger'|'icon'|'ghost')
 * @param {string} [options.icon=''] - Optional HTML icon or emoji
 * @param {string} [options.mode='standard'] - 'standard' or 'toggle'
 * @param {boolean} [options.toggled=false] - Initial toggle state if mode === 'toggle'
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {boolean} [options.loading=false] - Whether button is in loading state
 * @param {Function} [options.onClick] - Click event handler
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {Object} [options.dataset={}] - Data attributes to attach
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html); else el.innerHTML = html; };
}

import { eventBus } from '../core/event-bus.js';

export class Button {
  constructor(options = {}) {
    this.text = options.text || '';
    this.variant = options.variant || 'secondary';
    this.mode = options.mode || 'standard';
    this.toggled = Boolean(options.toggled);
    this.icon = options.icon || '';
    this.disabled = Boolean(options.disabled);
    this.loading = Boolean(options.loading);
    this.onClick = typeof options.onClick === 'function' ? options.onClick : null;
    this.className = options.className || '';
    this.dataset = options.dataset || {};
    this._element = null;
  }

  /**
   * Render and return the button element
   * @returns {HTMLButtonElement}
   */
  render() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pw-ui-btn pw-ui-btn--${this.variant} ${this.className}`.trim();
    btn.disabled = this.disabled || this.loading;
    if (this.mode === 'toggle' && this.toggled) {
      btn.classList.add('is-active', 'active');
    }

    for (const [key, value] of Object.entries(this.dataset)) {
      btn.dataset[key] = value;
    }

    if (this.loading) {
      btn.classList.add('is-loading');
      btn.textContent = '...';
    } else {
      let html = '';
      if (this.icon) {
        html += `<span class="pw-ui-btn-icon">${this.icon}</span>`;
      }
      if (this.text && this.variant !== 'icon') {
        html += `<span class="pw-ui-btn-text">${this.text}</span>`;
      }
      globalThis._pwSetHtmlSafe(btn, html);
    }

    btn.addEventListener('click', (e) => {
      if (this.disabled || this.loading) return;
      if (this.mode === 'toggle') {
        this.setToggleState(!this.toggled);
      }
      eventBus.emit('input:select', { target: btn, variant: this.variant, toggled: this.toggled });
      if (this.onClick) {
        this.onClick(e, btn, this.toggled);
      }
    });

    this._element = btn;
    return btn;
  }

  setToggleState(toggled) {
    this.toggled = Boolean(toggled);
    if (this._element) {
      this._element.classList.toggle('is-active', this.toggled);
      this._element.classList.toggle('active', this.toggled);
    }
  }

  isToggled() {
    return this.toggled;
  }

  setDisabled(disabled) {
    this.disabled = Boolean(disabled);
    if (this._element) {
      this._element.disabled = this.disabled || this.loading;
    }
  }

  setLoading(loading) {
    this.loading = Boolean(loading);
    if (this._element) {
      this._element.disabled = this.disabled || this.loading;
      this._element.classList.toggle('is-loading', this.loading);
    }
  }
}

