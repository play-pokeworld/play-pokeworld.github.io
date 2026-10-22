/**
 * @file UIMaskIcon.js
 * @brief Monochrome image glyph tinted by CSS (C++ equivalent: class UIMaskIcon : public UIElement).
 * The image is used as a CSS mask (`--pw-mask-icon`) over `background-color: currentColor`, so the
 * glyph always takes the text colour of its container. Size and colour remain CSS concerns.
 */

import { UIElement } from './UIElement.js';

export class UIMaskIcon extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} options.src            - Image path, always built by AssetPaths
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    super({
      tagName: 'span',
      className: `pw-mask-icon ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIMaskIcon',
      tag: 'MaskIcon'
    });
    this._dom.setAttribute('aria-hidden', 'true');
    this.setSource(options.src || '');
  }

  /** @param {string} src */
  setSource(src) {
    this._setCssVariable('--pw-mask-icon', src ? `url("${UIMaskIcon._absoluteUrl(src)}")` : null);
  }

  /**
   * A url() stored in a custom property is resolved against the stylesheet that substitutes it,
   * not against the page, so relative asset paths must be made absolute first.
   * @private
   * @param {string} src
   * @returns {string}
   */
  static _absoluteUrl(src) {
    const base = typeof document !== 'undefined' ? document.baseURI : '';
    if (!base) return src;
    try {
      return new URL(src, base).href;
    } catch {
      return src;
    }
  }
}
