/**
 * PokeEngine — Text Component
 * Standardized text rendering with theme integration
 * 
 * Usage:
 *   new PokeText('Hello').toHTML()
 *   new PokeText({ content: 'Hello', bold: true, color: 'var(--light2)', size: 15 })
 */
(function() {
'use strict';

class Text {
  constructor(content, options = {}) {
    if (typeof content === 'object') {
      options = content;
      content = options.content ?? options.text ?? '';
    }
    this.content = String(content ?? '');
    this.size = options.size || 13;
    this.color = options.color || 'var(--light2)';
    this.bold = options.bold || false;
    this.align = options.align || 'left';
    this.font = options.font || "'Winky Sans','Segoe UI',system-ui,sans-serif";
    this.letterSpacing = options.letterSpacing ?? '0.5px';
    this.lineHeight = options.lineHeight || '1.5';
    this.shadow = options.shadow || false;
    this.uppercase = options.uppercase || false;
    this.className = options.className || '';
  }

  toHTML() {
    const vars = [
      `--pw-t-size:${this.size}px`,
      `--pw-t-color:${this.color}`,
      `--pw-t-weight:${this.bold ? 'bold' : '400'}`,
      `--pw-t-align:${this.align}`,
      `--pw-t-font:${this.font}`,
      `--pw-t-spacing:${this.letterSpacing}`,
      `--pw-t-height:${this.lineHeight}`,
    ];
    const text = this.uppercase ? this.content.toUpperCase() : this.content;
    const cls = this.className ? ` class="${this.className}${this.shadow ? ' pw-text-shadow' : ''}"` : (this.shadow ? ' class="pw-text-shadow"' : '');
    return `<span${cls} data-style="font-size:var(--pw-t-size);color:var(--pw-t-color);font-weight:var(--pw-t-weight);text-align:var(--pw-t-align);font-family:var(--pw-t-font);letter-spacing:var(--pw-t-spacing);line-height:var(--pw-t-height);" style="${vars.join(';')}">${text}</span>`;
  }

  createElement() {
    const el = document.createElement('span');
    el.textContent = this.uppercase ? this.content.toUpperCase() : this.content;
    el.style.cssText = [
      `font-size:${this.size}px`,
      `color:${this.color}`,
      `font-weight:${this.bold ? 'bold' : '400'}`,
      `text-align:${this.align}`,
      `font-family:${this.font}`,
      `letter-spacing:${this.letterSpacing}`,
      `line-height:${this.lineHeight}`,
    ].join(';');
    if (this.shadow) el.style.textShadow = '0 1px 3px rgba(0,0,0,0.3)';
    if (this.className) el.className = this.className;
    return el;
  }

  setText(text) {
    this.content = String(text ?? '');
    if (this._element) this._element.textContent = this.uppercase ? this.content.toUpperCase() : this.content;
  }

  get element() { return this._element; }
}

window.PokeText = Text;
if (!window.poke) window.poke = {};
window.poke.Text = Text;
})();
