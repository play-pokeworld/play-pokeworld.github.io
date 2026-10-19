/**
 * @file UIIcon.js
 * @brief Vector icon widget rendered from the IconRegistry (C++ equivalent: class UIIcon : public UIElement).
 * Size and colour are CSS concerns: the icon inherits `currentColor` and is sized by .pw-icon modifiers.
 */

import { UIElement } from './UIElement.js';
import { IconRegistry } from './icons/IconRegistry.js';
import { t } from '../localization/LocalizationManager.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class UIIcon extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.name='']      - IconRegistry key
   * @param {string} [options.size='']      - 'sm' | 'md' | 'lg' (maps to .pw-icon--<size>)
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    super({
      tagName: 'span',
      className: `pw-icon ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name ? `UIIcon:${options.name}` : 'UIIcon',
      tag: 'Icon'
    });

    this._dom.setAttribute('aria-hidden', 'true');
    this._iconName = '';

    if (options.size) this.setSize(options.size);
    if (options.name) this.setIcon(options.name);
  }

  /**
   * Renders a registered icon.
   * @param {string} iconName
   */
  setIcon(iconName) {
    const def = IconRegistry.get(iconName);
    this._iconName = def ? iconName : '';
    this._dom.textContent = '';
    if (!def) {
      if (iconName) console.warn(t('debug_icon_unknown', { name: iconName }));
      return;
    }

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', def.viewBox);
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', `pw-icon-svg pw-icon-svg--${def.mode}`);
    for (const d of def.paths || []) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    }
    for (const shape of def.shapes || []) {
      const node = document.createElementNS(SVG_NS, shape.tag);
      for (const [attr, value] of Object.entries(shape.attrs)) {
        node.setAttribute(attr, String(value));
      }
      svg.appendChild(node);
    }
    this._dom.appendChild(svg);
  }

  /** @returns {string} */
  getIcon() {
    return this._iconName;
  }

  /**
   * @param {'sm'|'md'|'lg'} size
   */
  setSize(size) {
    this._dom.classList.remove('pw-icon--sm', 'pw-icon--md', 'pw-icon--lg');
    if (size) this._dom.classList.add(`pw-icon--${size}`);
  }
}
