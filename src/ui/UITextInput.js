/**
 * @file UITextInput.js
 * @brief Single-line text field (C++ equivalent: class UITextInput : public UIElement).
 * Placeholder / labels must be passed already localized (t()).
 */

import { UIElement } from './UIElement.js';

export class UITextInput extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']
   * @param {string} [options.value='']
   * @param {string} [options.placeholder='']
   * @param {number} [options.maxLength=0]       - 0 = unlimited
   * @param {'text'|'password'|'number'} [options.type='text']
   * @param {number} [options.min] - Lowest value of a number input
   * @param {string} [options.className='']
   * @param {Function} [options.onInput=null]    - (value, input) => void
   * @param {Function} [options.onSubmit=null]   - Called on Enter: (value, input) => void
   * @param {Function} [options.onChange=null]   - Value committed (blur or Enter): (value, input) => void
   */
  constructor(options = {}) {
    super({
      tagName: 'input',
      className: `pw-input ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UITextInput',
      tag: 'Input'
    });

    this._dom.setAttribute('type', ['password', 'number'].includes(options.type) ? options.type : 'text');
    if (options.min !== undefined) this._dom.setAttribute('min', String(options.min));
    this._dom.setAttribute('autocomplete', 'off');
    this._dom.setAttribute('spellcheck', 'false');
    this._dom.setAttribute('data-stop-drag', 'true');

    this._onInput = options.onInput || null;
    this._onSubmit = options.onSubmit || null;
    this._onChange = options.onChange || null;

    if (options.maxLength) this.setMaxLength(options.maxLength);
    if (options.placeholder) this.setPlaceholder(options.placeholder);
    this.setValue(options.value || '');

    this.addDomListener('input', () => {
      this.setInvalid(false);
      if (this._onInput) this._onInput(this.getValue(), this);
    });
    this.addDomListener('change', () => {
      if (this._onChange) this._onChange(this.getValue(), this);
    });
    this.addDomListener('keydown', (event) => {
      if (event.key === 'Enter' && this._onSubmit) {
        event.preventDefault();
        this._onSubmit(this.getValue(), this);
      }
    });
  }

  /** @returns {string} Trimmed value */
  getValue() {
    return String(this._dom.value || '').trim();
  }

  /** @param {string} value */
  setValue(value) {
    this._dom.value = value != null ? String(value) : '';
  }

  /** @param {string} placeholder */
  setPlaceholder(placeholder) {
    this._dom.setAttribute('placeholder', placeholder || '');
  }

  /** @param {number} maxLength */
  setMaxLength(maxLength) {
    this._dom.setAttribute('maxlength', String(maxLength));
  }

  /**
   * Toggles the error state (.is-invalid) — e.g. empty required field.
   * @param {boolean} invalid
   */
  setInvalid(invalid) {
    this._dom.classList.toggle('is-invalid', !!invalid);
    this._dom.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  /** Selects the whole content. */
  selectAll() {
    if (typeof this._dom.select === 'function') this._dom.select();
  }
}
