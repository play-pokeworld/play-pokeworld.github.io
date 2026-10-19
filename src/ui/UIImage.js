/**
 * @file UIImage.js
 * @brief Image widget with built-in fallback source (C++ equivalent: class UIImage : public UIElement).
 * Replaces raw `<img>` markup and inline `onerror=` handlers.
 */

import { UIElement } from './UIElement.js';

export class UIImage extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} options.src
   * @param {string} [options.alt='']         - Localized alternative text
   * @param {string} [options.fallbackSrc=''] - Used once if `src` fails to load
   * @param {string} [options.className='']
   * @param {boolean} [options.pixelated=false] - Crisp pixel-art rendering (.pw-image--pixelated)
   */
  constructor(options = {}) {
    super({
      tagName: 'img',
      className: `pw-image ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIImage',
      tag: 'Image'
    });

    this._fallbackSrc = options.fallbackSrc || '';
    this._usedFallback = false;

    this._dom.setAttribute('draggable', 'false');
    this._dom.setAttribute('loading', 'lazy');
    if (options.pixelated) this.addClass('pw-image--pixelated');

    this.addDomListener('error', () => this._onLoadError());

    this.setAlt(options.alt || '');
    if (options.src) this.setSource(options.src);
  }

  /** @param {string} src */
  setSource(src) {
    this._usedFallback = false;
    this._dom.setAttribute('src', src || '');
  }

  /** @param {string} alt */
  setAlt(alt) {
    this._dom.setAttribute('alt', alt || '');
  }

  /** @private */
  _onLoadError() {
    if (this._usedFallback || !this._fallbackSrc) {
      this.addClass('is-broken');
      return;
    }
    this._usedFallback = true;
    this._dom.setAttribute('src', this._fallbackSrc);
  }
}
