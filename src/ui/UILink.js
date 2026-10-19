/**
 * @file UILink.js
 * @brief External link styled as a button (C++ equivalent: class UILink : public UIElement).
 * Always opens in a new tab with rel="noopener noreferrer".
 */

import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';
import { UIIcon } from './UIIcon.js';

export class UILink extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} options.href
   * @param {string} [options.text='']      - Localized label
   * @param {string} [options.icon='']      - IconRegistry key
   * @param {string} [options.className='']
   * @param {boolean} [options.external=true]
   */
  constructor(options = {}) {
    super({
      tagName: 'a',
      className: `pw-link ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UILink',
      tag: 'Link'
    });

    this._label = null;
    this._iconWidget = null;

    if (options.icon) {
      this._iconWidget = this.addChild(new UIIcon({ name: options.icon, className: 'pw-link-icon' }));
    }
    this._label = this.addChild(new UIText({ text: options.text ?? '', className: 'pw-link-label' }));

    this.setHref(options.href || '');
    if (options.external !== false) {
      this._dom.setAttribute('target', '_blank');
      this._dom.setAttribute('rel', 'noopener noreferrer');
    }
  }

  /** @param {string} href */
  setHref(href) {
    this._dom.setAttribute('href', href);
  }

  /** @param {string} text */
  setText(text) {
    this._label.setText(text);
  }

  /** @returns {UIText} Label sub-widget (link.text.setAlignment('center')). */
  get text() {
    return this._label;
  }
}
