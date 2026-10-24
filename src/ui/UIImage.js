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
   * @param {'lazy'|'eager'} [options.loading='lazy'] - Critical small sprites may opt into eager loading.
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
    this._dom.setAttribute('loading',options.loading==='eager'?'eager':'lazy');
    if (options.pixelated) this.addClass('pw-image--pixelated');

    this.addDomListener('error', () => this._onLoadError());

    this.setAlt(options.alt || '');
    if (options.src) this.setSource(options.src);
  }

  /** @param {string} src */
  setSource(src) {
    const value = src || '';
    // Same image: keep the decoded bitmap (re-setting src restarts the load)
    if (value && this._dom.getAttribute('src') === value && !this._dom.classList.contains('is-broken')) return;
    this._usedFallback = false;
    if (!value) {
      // An empty src makes browsers request the current document and dispatch an error.
      // That poisoned a later held-item image with a stale `is-broken` visibility rule.
      this._dom.removeAttribute('src');
      this.removeClass('is-broken');
      return;
    }
    this.removeClass('is-broken');
    this._dom.setAttribute('src', value);
  }

  /** @param {string} alt */
  setAlt(alt) {
    const value = alt || '';
    if (this._dom.getAttribute('alt') === value) return;
    this._dom.setAttribute('alt', value);
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
