/**
 * PokeEngine — Button Component
 * Standardized button with variants, icons, active states
 */
(function() {
'use strict';

class Button {
  /**
   * @param {object} options
   * @param {string} options.text - button label
   * @param {function} options.onClick - click handler
   * @param {string} options.variant - 'primary'|'secondary'|'danger'|'ghost'|'icon'
   * @param {string} options.icon - icon HTML or emoji
   * @param {boolean} options.active - active/pressed state
   * @param {boolean} options.disabled
   * @param {string} options.color - custom accent color
   * @param {string} options.className - extra CSS classes
   * @param {object} options.dataset - data-* attributes
   * @param {string} options.action - data-action attribute
   * @param {string} options.call - data-call for legacy
   */
  constructor(options = {}) {
    this.text = options.text || '';
    this.onClick = options.onClick || null;
    this.variant = options.variant || 'secondary';
    this.icon = options.icon || '';
    this.active = options.active || false;
    this.disabled = options.disabled || false;
    this.color = options.color || '';
    this.className = options.className || '';
    this.dataset = options.dataset || {};
    this.action = options.action || '';
    this.call = options.call || '';
    this.size = options.size || 'md'; // sm, md, lg
    this._element = null;
  }

  toHTML() {
    const cls = ['hbtn', 'poke-btn', 'poke-btn--' + this.variant, 'poke-btn--' + this.size];
    if (this.active) cls.push('is-active');
    if (this.disabled) cls.push('is-disabled');
    if (this.className) cls.push(this.className);
    
    const attrs = [];
    if (this.disabled) attrs.push('disabled');
    if (this.action) attrs.push(`data-action="${this.action}"`);
    if (this.call) attrs.push(`data-call="${this.call}"`);
    for (const [k, v] of Object.entries(this.dataset)) {
      attrs.push(`data-${k}="${v}"`);
    }
    if (this.color) attrs.push(`data-style="border-color:var(--btn-color);" style="--btn-color:${this.color};"`);

    return `<button class="${cls.join(' ')}" ${attrs.join(' ')}>
      ${this.icon ? `<span class="ui-btn-icon">${this.icon}</span>` : ''}
      ${this.text ? `<span class="ui-btn-label">${this.text}</span>` : ''}
    </button>`;
  }

  createElement() {
    const btn = document.createElement('button');
    const cls = ['hbtn', 'poke-btn', 'poke-btn--' + this.variant, 'poke-btn--' + this.size];
    if (this.active) cls.push('is-active');
    if (this.disabled) btn.disabled = true;
    if (this.className) cls.push(this.className);
    btn.className = cls.join(' ');
    
    if (this.color) btn.style.cssText = `--btn-color:${this.color};border-color:${this.color};`;
    if (this.action) btn.dataset.action = this.action;
    if (this.call) btn.dataset.call = this.call;
    for (const [k, v] of Object.entries(this.dataset)) btn.dataset[k] = String(v);
    
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'ui-btn-icon';
      iconSpan.innerHTML = this.icon;
      btn.appendChild(iconSpan);
    }
    if (this.text) {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'ui-btn-label';
      labelSpan.textContent = this.text;
      btn.appendChild(labelSpan);
    }
    
    if (this.onClick) btn.addEventListener('click', (e) => this.onClick(e, btn));
    
    this._element = btn;
    return btn;
  }

  setText(text) { this.text = text; if (this._element) { const l = this._element.querySelector('.ui-btn-label'); if (l) l.textContent = text; } }
  setActive(active) { this.active = active; if (this._element) this._element.classList.toggle('is-active', active); }
  setDisabled(disabled) { this.disabled = disabled; if (this._element) this._element.disabled = disabled; }

  get element() { return this._element; }

  // Pre-built variants
  static primary(text, onClick) { return new Button({ text, onClick, variant: 'primary' }); }
  static secondary(text, onClick) { return new Button({ text, onClick, variant: 'secondary' }); }
  static danger(text, onClick) { return new Button({ text, onClick, variant: 'danger' }); }
  static icon(iconHtml, onClick, label) {
    return new Button({ icon: iconHtml, onClick, variant: 'icon', text: label || '' });
  }
}

window.PokeButton = Button;
if (!window.poke) window.poke = {};
window.poke.Button = Button;
})();
