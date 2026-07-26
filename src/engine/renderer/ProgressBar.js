/**
 * PokeEngine — Progress Bar Component
 * HP bars, XP bars, energy bars, cooldown bars
 */
(function() {
'use strict';

class ProgressBar {
  /**
   * @param {object} options
   * @param {number} options.value - current value
   * @param {number} options.max - maximum value
   * @param {number} options.w - width in px
   * @param {number} options.h - height in px
   * @param {string} options.color - fill color (default: auto HP colors)
   * @param {string} options.bgColor - background color
   * @param {boolean} options.showText - show "value/max" text
   * @param {string} options.variant - 'hp'|'xp'|'energy'|'cooldown'
   * @param {boolean} options.animated - animate fill changes
   */
  constructor(options = {}) {
    this._value = options.value ?? 0;
    this._max = options.max ?? 100;
    this.w = options.w || 120;
    this.h = options.h || 8;
    this.color = options.color || '';
    this.bgColor = options.bgColor || 'var(--dark1)';
    this.showText = options.showText ?? false;
    this.variant = options.variant || 'hp';
    this.animated = options.animated ?? true;
    this._element = null;
    this._fillEl = null;
    this._textEl = null;
  }

  get value() { return this._value; }
  set value(v) { this._value = Math.max(0, Math.min(v, this._max)); this._update(); }
  
  get max() { return this._max; }
  set max(m) { this._max = Math.max(1, m); this._update(); }

  get pct() { return this._max > 0 ? (this._value / this._max) * 100 : 0; }

  _getColor() {
    if (this.color) return this.color;
    const p = this.pct;
    if (p > 50) return '#60BE58';  // green
    if (p > 25) return '#FBA64C';  // orange
    return '#D3425F';               // red
  }

  toHTML() {
    const p = this.pct;
    const c = this._getColor();
    const anim = this.animated ? 'transition:width 0.3s ease;' : '';
    const txt = this.showText ? `<span class="poke-progressbar-text">${Math.floor(this._value)}/${this._max}</span>` : '';
    return `<div class="poke-progressbar" data-style="width:var(--pb-w);height:var(--pb-h);background:var(--pb-bg);border-radius:var(--pb-r);" style="--pb-w:${typeof this.w === 'number' ? this.w + 'px' : this.w};--pb-h:${this.h}px;--pb-bg:${this.bgColor};--pb-r:${this.h/2}px;">
      <div class="poke-progressbar-fill${this.animated ? ' is-animated' : ''}" data-style="background:var(--pb-c);border-radius:var(--pb-r);" data-pct="${p}" style="--pb-c:${c};--pb-r:${this.h/2}px;"></div>
      ${txt}
    </div>`;
  }

  createElement() {
    const container = document.createElement('div');
    container.className = 'poke-progressbar';
    container.style.cssText = `position:relative;width:${typeof this.w === 'number' ? this.w + 'px' : this.w};height:${this.h}px;background:${this.bgColor};border-radius:${this.h/2}px;overflow:hidden;`;

    this._fillEl = document.createElement('div');
    this._fillEl.className = 'poke-progressbar-fill';
    this._fillEl.style.cssText = `width:${this.pct}%;height:100%;background:${this._getColor()};border-radius:${this.h/2}px;`;
    if (this.animated) this._fillEl.style.transition = 'width 0.3s ease';
    container.appendChild(this._fillEl);

    if (this.showText) {
      this._textEl = document.createElement('span');
      this._textEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:bold;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.5);';
      this._textEl.textContent = `${Math.floor(this._value)}/${this._max}`;
      container.appendChild(this._textEl);
    }

    this._element = container;
    return container;
  }

  _update() {
    if (!this._fillEl) return;
    this._fillEl.style.width = this.pct + '%';
    this._fillEl.style.background = this._getColor();
    if (this._textEl) this._textEl.textContent = `${Math.floor(this._value)}/${this._max}`;
  }

  get element() { return this._element; }

  // ─── Factory methods ───
  static hp(current, max, w) {
    return new ProgressBar({ value: current, max, w, h: 8, variant: 'hp', showText: true });
  }
  static xp(current, next, w) {
    return new ProgressBar({ value: current || 0, max: next || 100, w, h: 4, variant: 'xp', color: '#539DDF' });
  }
}

window.PokeProgressBar = ProgressBar;
if (!window.poke) window.poke = {};
window.poke.ProgressBar = ProgressBar;
})();
