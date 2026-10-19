/**
 * @file UIContainer.js
 * @brief Generic layout container component (C++ equivalent: class UIContainer : public UIElement).
 * Encapsulates structural layout elements (flex rows, columns, grids, wrappers) using strictly CSS classes.
 */

import { UIElement } from './UIElement.js';

export class UIContainer extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.tagName='div']
   * @param {string} [options.className='']
   * @param {string} [options.id='']
   * @param {string} [options.layout=''] - Semantic layout ('row', 'col', 'grid', 'card', 'toolbar')
   * @param {string} [options.name='UIContainer']
   * @param {Array<UIElement|null|false>} [options.children=[]] - Initial children (falsy entries are skipped)
   */
  constructor(options = {}) {
    let classes = options.className || '';
    if (options.layout) {
      classes += ` pw-layout-${options.layout}`;
    }

    super({
      tagName: options.tagName || 'div',
      className: classes.trim(),
      id: options.id,
      name: options.name || 'UIContainer',
      tag: 'Container'
    });
    this.addChildren(options.children || []);
  }

  /**
   * Sets plain text content
   * @param {string} text
   */
  setText(text) {
    this._dom.textContent = text;
  }
}

