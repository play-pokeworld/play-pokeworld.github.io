/**
 * @file UISlider.js
 * @brief Range input with a filled track (C++: class UISlider : public UIElement).
 * The filled part is driven by the `--pw-fill` CSS variable (design-system `.pw-range`).
 */

import { UIElement } from './UIElement.js';

export class UISlider extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.min=0]
   * @param {number} [options.max=100]
   * @param {number} [options.step=1]
   * @param {number} [options.value=0]
   * @param {string} [options.className='']
   * @param {Function} [options.onInput=null] - (value) => void, on every move
   */
  constructor(options = {}) {
    super({ tagName: 'input', className: `pw-range ${options.className || ''}`.trim(), name: options.name || 'UISlider', tag: 'Slider' });
    this._min = options.min ?? 0;
    this._max = options.max ?? 100;
    this._dom.setAttribute('type', 'range');
    this._dom.setAttribute('min', String(this._min));
    this._dom.setAttribute('max', String(this._max));
    this._dom.setAttribute('step', String(options.step ?? 1));
    this._dom.setAttribute('data-stop-drag', 'true');
    this._onInput = options.onInput || null;

    this.setValue(options.value ?? this._min);
    this.addDomListener('input', () => {
      this._updateFill();
      if (this._onInput) this._onInput(this.getValue());
    });
  }

  /** @returns {number} */
  getValue() {
    return Number(this._dom.value);
  }

  /** @param {number} value */
  setValue(value) {
    this._dom.value = String(value);
    this._updateFill();
  }

  /** @param {boolean} disabled */
  setDisabled(disabled) {
    this._dom.disabled = !!disabled;
  }

  /** @private */
  _updateFill() {
    const range = this._max - this._min || 1;
    this._setCssVariable('--pw-fill', `${((this.getValue() - this._min) / range) * 100}%`);
  }
}
