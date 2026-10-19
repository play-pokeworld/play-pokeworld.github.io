/**
 * @file UIText.js
 * @brief Dynamic label widget supporting rich text and inline symbols (C++ equivalent: class UIText : public UIElement).
 * Rich text is tokenized by TextFormatter and rendered node by node (never through innerHTML).
 * Every visual setter maps to a CSS modifier class (see ui-text.css): no inline style is ever written.
 */

import { UIElement } from './UIElement.js';
import { TextFormatter } from '../core/TextFormatter.js';

/** Semantic colour tokens accepted by UIText.setColor() (each maps to .pw-text--color-<token>). */
export const TEXT_COLORS = Object.freeze(['default', 'primary', 'secondary', 'muted', 'accent', 'danger', 'success']);

export class UIText extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.text='']
   * @param {string} [options.richText=''] - Template with {params}, {money}-style symbols and <b>/<i>/<br>
   * @param {Record<string, any>} [options.params={}] - Parameters for richText
   * @param {string} [options.tagName='span'] ('span'|'p'|'div'|'h1'|'h2'|'h3'|'h4'|'label'|'small')
   * @param {string} [options.id='']
   * @param {string} [options.className=''] - Extra component classes
   * @param {string} [options.align=''] ('left'|'center'|'right')
   * @param {string} [options.size=''] ('xs'|'sm'|'md'|'lg'|'xl')
   * @param {string} [options.color=''] - Semantic colour token (see TEXT_COLORS)
   * @param {boolean} [options.bold=false]
   * @param {string} [options.htmlFor=''] - Target input id when tagName is 'label'
   */
  constructor(options = {}) {
    super({
      tagName: options.tagName || 'span',
      className: `pw-text ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIText',
      tag: 'Text'
    });

    if (options.align) {
      this.setTextAlign(options.align);
    }
    if (options.size) {
      this.setSize(options.size);
    }
    if (options.bold) {
      this.setWeight('bold');
    }
    if (options.color) {
      this.setColor(options.color);
    }
    if (options.htmlFor) {
      this.setFor(options.htmlFor);
    }

    if (options.richText) {
      this.setRichText(options.richText, options.params);
    } else {
      this.setText(options.text ?? ''); // ?? keeps numeric 0 (e.g. "0 badges")
    }
  }

  /**
   * Sets plain, safe text content (escaped)
   * @param {string|number} text
   */
  setText(text) {
    this._dom.textContent = text != null ? String(text) : '';
  }

  /** @returns {string} */
  getText() {
    return this._dom.textContent || '';
  }

  /**
   * Sets rich text with inline symbol interpolation
   * Example: label.setRichText("Reward: {amount} {money}", { amount: 500 })
   * @param {string} template
   * @param {Record<string, any>} [params={}]
   */
  setRichText(template, params = {}) {
    this._dom.textContent = '';
    for (const segment of TextFormatter.parse(template, params)) {
      this._dom.appendChild(UIText._renderSegment(segment));
    }
  }

  /**
   * Builds the DOM node of one rich-text segment.
   * @private
   * @param {import('../core/TextFormatter.js').RichSegment} segment
   * @returns {Node}
   */
  static _renderSegment(segment) {
    if (segment.type === 'break') return document.createElement('br');
    if (segment.type === 'icon') {
      const img = document.createElement('img');
      img.className = `pw-inline-icon pw-inline-icon--${segment.variant}`;
      img.src = segment.src;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      return img;
    }
    let node = document.createTextNode(segment.text);
    if (segment.italic) {
      const em = document.createElement('em');
      em.appendChild(node);
      node = em;
    }
    if (segment.bold) {
      const strong = document.createElement('strong');
      strong.appendChild(node);
      node = strong;
    }
    return node;
  }

  /**
   * Sets text alignment modifier class
   * @param {'left'|'center'|'right'} align
   */
  setTextAlign(align) {
    this._dom.classList.remove('pw-text--align-left', 'pw-text--align-center', 'pw-text--align-right');
    this._dom.classList.add(`pw-text--align-${align || 'left'}`);
  }

  /**
   * Alias kept for API symmetry with UIButton (button.text.setAlignment('center')).
   * @param {'left'|'center'|'right'} align
   */
  setAlignment(align) {
    this.setTextAlign(align);
  }

  /**
   * Sets size modifier class
   * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
   */
  setSize(size) {
    this._dom.classList.remove('pw-text--xs', 'pw-text--sm', 'pw-text--md', 'pw-text--lg', 'pw-text--xl');
    if (size) this._dom.classList.add(`pw-text--${size}`);
  }

  /**
   * Sets font weight modifier
   * @param {'normal'|'bold'} weight
   */
  setWeight(weight) {
    this._dom.classList.toggle('pw-text--bold', weight === 'bold');
  }

  /**
   * Sets a semantic colour (class-based, theme aware).
   * @param {'default'|'primary'|'secondary'|'muted'|'accent'|'danger'|'success'} color
   */
  setColor(color) {
    for (const token of TEXT_COLORS) {
      this._dom.classList.remove(`pw-text--color-${token}`);
    }
    if (color && color !== 'default' && TEXT_COLORS.includes(color)) {
      this._dom.classList.add(`pw-text--color-${color}`);
    }
  }

  /**
   * Binds a <label> to its input (for attribute).
   * @param {string} inputId
   */
  setFor(inputId) {
    if (inputId) this._dom.setAttribute('for', inputId);
  }
}
