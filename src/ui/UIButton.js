/**
 * @file UIButton.js
 * @brief Interactive button widget (C++ equivalent: class UIButton : public UIElement).
 * Fully decoupled from CSS: all visual styling is driven exclusively via CSS classes.
 */

import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';
import { UIIcon } from './UIIcon.js';

export class UIButton extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.text='']
   * @param {string} [options.icon='']
   * @param {string} [options.variant='primary'] ('primary'|'secondary'|'danger'|'success'|'ghost'|'tab'|'hbtn')
   * @param {string} [options.size='md'] ('sm'|'md'|'lg')
   * @param {string} [options.align='center'] ('left'|'center'|'right')
   * @param {string} [options.className='']
   * @param {boolean} [options.fullWidth=false]
   * @param {Function} [options.onClick=null]
   * @param {boolean} [options.disabled=false]
   */
  constructor(options = {}) {
    const baseClasses = ['pw-button', options.className || ''];
    if (options.variant === 'hbtn') {
      baseClasses.push('hbtn');
    }

    super({
      tagName: 'button',
      className: baseClasses.filter(Boolean).join(' '),
      id: options.id,
      name: options.name || 'UIButton',
      tag: 'Button'
    });

    this._dom.setAttribute('type', 'button');
    this._text = options.text ?? '';
    this._icon = options.icon || '';
    this._disabled = !!options.disabled;
    this._onClick = options.onClick || null;

    if (options.variant && options.variant !== 'hbtn') {
      this.setVariant(options.variant);
    }
    this.setSize(options.size || 'md');
    this.setTextAlign(options.align || 'center');

    if (options.fullWidth) {
      this.setFullWidth(true);
    }

    this._updateContent();

    if (this._disabled) {
      this.setEnabled(false);
    }

    this.addDomListener('click', (event) => {
      if (this._disabled) return;
      if (this._onClick) {
        this._onClick(event, this);
      }
    });
  }

  /**
   * Rebuilds the button content: optional icon + label (a UIText child).
   * The label is exposed through the `text` getter so callers can write
   * `button.text.setAlignment('center')` or `button.text.setColor('accent')`.
   * @private
   */
  _updateContent() {
    this.clearChildren();
    this._label = null;

    if (this._icon) {
      this.addChild(new UIIcon({ name: this._icon, className: 'pw-button-icon' }));
    }
    if (this._text !== '' && this._text != null) {
      this._label = new UIText({ text: this._text, className: 'pw-button-text' });
      this.addChild(this._label);
    }
  }

  /**
   * Label sub-widget (null when the button has no text).
   * @returns {UIText|null}
   */
  get text() {
    return this._label;
  }

  /**
   * Sets text content
   * @param {string} text
   */
  setText(text) {
    this._text = text;
    if (this._label && text) {
      this._label.setText(text);
    } else {
      this._updateContent();
    }
  }

  /**
   * Sets the icon (IconRegistry name, rendered by UIIcon).
   * @param {string} icon
   */
  setIcon(icon) {
    this._icon = icon;
    this._updateContent();
  }

  /**
   * Toggles the "active / selected" visual state.
   * @param {boolean} active
   */
  setActive(active) {
    this._dom.classList.toggle('active', !!active);
  }

  /**
   * Sets text alignment modifier class
   * @param {'left'|'center'|'right'} align
   */
  setTextAlign(align) {
    this._dom.classList.remove('pw-button--align-left', 'pw-button--align-center', 'pw-button--align-right');
    this._dom.classList.add(`pw-button--align-${align || 'center'}`);
  }

  /**
   * Sets visual variant modifier class
   * @param {'primary'|'secondary'|'danger'|'success'|'ghost'|'tab'} variant
   */
  setVariant(variant) {
    this._dom.classList.remove(
      'pw-button--primary', 'pw-button--secondary', 'pw-button--danger',
      'pw-button--success', 'pw-button--ghost', 'pw-button--tab'
    );
    this._dom.classList.add(`pw-button--${variant || 'primary'}`);
  }

  /**
   * Sets size modifier class
   * @param {'sm'|'md'|'lg'} size
   */
  setSize(size) {
    this._dom.classList.remove('pw-button--sm', 'pw-button--md', 'pw-button--lg');
    this._dom.classList.add(`pw-button--${size || 'md'}`);
  }

  /**
   * Sets 100% full width
   * @param {boolean} fullWidth
   */
  setFullWidth(fullWidth) {
    this._dom.classList.toggle('pw-button--full-width', !!fullWidth);
  }

  /**
   * Enables or disables the button
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._disabled = !enabled;
    if (this._disabled) {
      this._dom.setAttribute('disabled', 'disabled');
      this._dom.classList.add('is-disabled');
    } else {
      this._dom.removeAttribute('disabled');
      this._dom.classList.remove('is-disabled');
    }
  }

  /**
   * Replaces click callback
   * @param {Function} callback
   */
  setOnClick(callback) {
    this._onClick = callback;
  }
}

