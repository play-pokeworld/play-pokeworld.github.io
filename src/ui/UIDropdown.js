/**
 * @file UIDropdown.js
 * @brief Styled native select (C++: class UIDropdown : public UIElement).
 * Markup: div.pw-select-wrap > select.pw-dropdown-select (chevron drawn by CSS).
 */

import { UIElement } from './UIElement.js';

export class UIDropdown extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {Array<{value: string, label: string, disabled?: boolean}>} [options.options=[]]
   * @param {string} [options.value='']
   * @param {string} [options.className='']
   * @param {string} [options.id='']
   * @param {string} [options.name='UIDropdown']
   * @param {Function} [options.onChange=null]
   * @param {boolean} [options.disabled=false]
   */
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: `pw-select-wrap ${options.className || ''}`.trim(),
      id: options.id ? `${options.id}-wrap` : '',
      name: options.name || 'UIDropdown',
      tag: 'Dropdown'
    });

    /** @private @type {HTMLSelectElement} */
    this._selectEl = document.createElement('select');
    this._selectEl.className = 'pw-dropdown-select';
    if (options.id) {
      this._selectEl.id = options.id;
    }
    this._selectEl.setAttribute('data-stop-drag', 'true');

    this._dom.appendChild(this._selectEl);

    this._options = [];
    this._onChange = options.onChange || null;

    if (Array.isArray(options.options)) {
      this.setOptions(options.options);
    }

    if (options.value !== undefined) {
      this.setValue(options.value);
    }

    if (options.disabled) {
      this.setEnabled(false);
    }

    this._selectEl.addEventListener('change', (e) => {
      if (this._onChange) {
        this._onChange(this._selectEl.value, e);
      }
    });
  }

  /**
   * Updates dropdown options
   * @param {Array<{value: string, label: string, disabled?: boolean}>} opts
   */
  setOptions(opts) {
    this._options = opts || [];
    this._selectEl.replaceChildren();
    this._options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if (opt.disabled) {
        optionEl.disabled = true;
      }
      this._selectEl.appendChild(optionEl);
    });
  }

  /**
   * Gets current selected value
   * @returns {string}
   */
  getValue() {
    return this._selectEl.value;
  }

  /**
   * Sets current selected value
   * @param {string} val
   */
  setValue(val) {
    this._selectEl.value = val;
  }

  /**
   * Attaches change listener
   * @param {Function} cb
   */
  setOnChange(cb) {
    this._onChange = cb;
  }

  /**
   * Enables or disables dropdown
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._selectEl.disabled = !enabled;
    this._dom.classList.toggle('is-disabled', !enabled);
  }
}
