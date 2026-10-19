/**
 * @file UISwitch.js
 * @brief On / off toggle with a written state (C++: class UISwitch : public UIElement).
 * Markup: button.pw-switch > span.pw-switch-state + span.pw-switch-track > span.pw-switch-thumb
 */

import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';
import { UIContainer } from './UIContainer.js';

export class UISwitch extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {boolean} [options.checked=false]
   * @param {string} [options.onLabel='']  - Localized "on" state text
   * @param {string} [options.offLabel=''] - Localized "off" state text
   * @param {string} [options.className='']
   * @param {Function} [options.onChange=null] - (checked) => void
   */
  constructor(options = {}) {
    super({ tagName: 'button', className: `pw-switch ${options.className || ''}`.trim(), name: options.name || 'UISwitch', tag: 'Switch' });
    this._dom.setAttribute('type', 'button');
    this._dom.setAttribute('role', 'switch');
    this._dom.setAttribute('data-stop-drag', 'true');
    this._onLabel = options.onLabel || '';
    this._offLabel = options.offLabel || '';
    this._onChange = options.onChange || null;

    this._state = new UIText({ className: 'pw-switch-state' });
    this.addChild(this._state);
    this.addChild(new UIContainer({ tagName: 'span', className: 'pw-switch-track', children: [new UIContainer({ tagName: 'span', className: 'pw-switch-thumb' })] }));

    this.setChecked(!!options.checked);
    this.addDomListener('click', () => {
      this.setChecked(!this._checked);
      if (this._onChange) this._onChange(this._checked);
    });
  }

  /** @returns {boolean} */
  isChecked() {
    return this._checked;
  }

  /** @param {boolean} checked */
  setChecked(checked) {
    this._checked = checked;
    this.toggleClass('is-on', checked);
    this._dom.setAttribute('aria-checked', String(checked));
    this._state.setText(checked ? this._onLabel : this._offLabel);
  }
}
