/**
 * @file UIProgressBar.js
 * @brief Horizontal gauge (C++ equivalent: class UIProgressBar : public UIElement).
 * Two styling modes:
 *  - default: the component skin (.pw-progress-bar + size / variant modifiers)
 *  - skin:    legacy game skins (e.g. trackClassName 'hp-bar' + fillClassName 'hp-fill')
 * The fill ratio is a runtime number pushed as the --pw-progress CSS variable (see ui-progressbar.css).
 */

import { UIElement } from './UIElement.js';

/** Fill states toggled by setFillState() (e.g. HP colour thresholds: .hp-fill.high). */
const FILL_STATES = Object.freeze(['high', 'medium', 'low', 'is-done']);

export class UIProgressBar extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.value=0]
   * @param {number} [options.max=100]
   * @param {string} [options.label='']          - Localized prefix of the value text
   * @param {string} [options.variant='hp']      - Default skin: 'hp'|'exp'|'energy'|'dungeon'|'gold'
   * @param {string} [options.size='md']         - Default skin: 'sm'|'md'|'lg'
   * @param {boolean} [options.showText=false]   - Shows "value / max" inside the bar
   * @param {string} [options.trackClassName=''] - Legacy skin of the track (disables the default skin)
   * @param {string} [options.fillClassName='']  - Legacy skin of the fill
   * @param {string} [options.className='']
   * @param {string} [options.id='']
   */
  constructor(options = {}) {
    const skinned = !!options.trackClassName;
    super({
      tagName: 'div',
      className: `pw-progress ${skinned ? options.trackClassName : 'pw-progress-bar'} ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIProgressBar',
      tag: 'Progress'
    });

    this._value = options.value ?? 0;
    this._max = options.max ?? 100;
    this._label = options.label || '';
    this._showText = !!options.showText;
    this._color = options.color || null;

    if (!skinned) {
      this.setSize(options.size || 'md');
      this.setVariant(options.variant || 'hp');
    }

    this._fill = new UIElement({ className: `pw-progress-fill ${options.fillClassName || ''}`.trim(), name: 'UIProgressBar:fill' });
    this.addChild(this._fill);
    this._text = null;
    if (this._showText) {
      this._text = new UIElement({ tagName: 'span', className: 'pw-progress-text', name: 'UIProgressBar:text' });
      this.addChild(this._text);
    }
    this._render();
  }

  /** @returns {UIElement} */
  getFillElement() {
    return this._fill;
  }

  /** @param {string|null} color */
  setColor(color) {
    this._color = color;
    this._render();
  }

  /** @returns {number} Fill ratio in percent, clamped to [0, 100] */
  getPercent() {
    if (!(this._max > 0)) return 0;
    return Math.max(0, Math.min(100, (this._value / this._max) * 100));
  }

  /** @private */
  _render() {
    const pct = `${this.getPercent()}%`;
    this._setCssVariable('--pw-progress', pct);
    this._fill._setCssVariable('--pct', pct);
    if (this._color) {
      this._fill._setCssVariable('--bg', this._color);
    }
    if (this._text) {
      const prefix = this._label ? `${this._label}: ` : '';
      const text = `${prefix}${Math.round(this._value)} / ${Math.round(this._max)}`;
      if (this._text.getDomElement().textContent !== text) this._text.getDomElement().textContent = text;
    }
  }

  /**
   * @param {number} value
   * @param {number} [max] - Keeps the current max when omitted
   */
  setValue(value, max) {
    const nextValue = Math.max(0, Number(value) || 0);
    const nextMax = max === undefined || max === null ? this._max : Math.max(0, Number(max) || 0);
    if (this._value === nextValue && this._max === nextMax) return;
    this._value = nextValue;
    this._max = nextMax;
    this._render();
  }

  /**
   * Sets a state class on the fill (only one at a time).
   * @param {'high'|'medium'|'low'|'is-done'|''} state
   */
  setFillState(state) {
    const next = FILL_STATES.includes(state) ? state : '';
    if (this._fillState === next) return;
    this._fillState = next;
    for (const name of FILL_STATES) this._fill.removeClass(name);
    if (next) this._fill.addClass(next);
  }

  /** @param {'sm'|'md'|'lg'} size */
  setSize(size) {
    this._dom.classList.remove('pw-progress-bar--sm', 'pw-progress-bar--md', 'pw-progress-bar--lg');
    this._dom.classList.add(`pw-progress-bar--${size || 'md'}`);
  }

  /** @param {'hp'|'exp'|'energy'|'dungeon'|'gold'} variant */
  setVariant(variant) {
    this._dom.classList.remove(
      'pw-progress-bar--hp', 'pw-progress-bar--exp',
      'pw-progress-bar--energy', 'pw-progress-bar--dungeon', 'pw-progress-bar--gold'
    );
    this._dom.classList.add(`pw-progress-bar--${variant || 'hp'}`);
  }

  /** @returns {number} */
  getValue() {
    return this._value;
  }

  /** @returns {number} */
  getMax() {
    return this._max;
  }
}
