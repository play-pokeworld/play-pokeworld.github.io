/**
 * @file UISpriteFrame.js
 * @brief Canonical circular sprite frame shared by Pokémon and item media.
 */
import { UIElement } from './UIElement.js';
import { UIImage } from './UIImage.js';

export class UISpriteFrame extends UIElement {
  /** @param {{src:string,alt?:string,className?:string,imageClassName?:string,id?:string,name?:string}} options */
  constructor(options = {}) {
    super({ tagName: 'span', id: options.id,
      className: `pw-poke-circle-wrap ${options.className || ''}`.trim(),
      name: options.name || 'UISpriteFrame' });
    const disc = new UIElement({ tagName: 'span', className: 'pw-poke-circle-bg' });
    disc.setAttribute('aria-hidden', 'true');
    this._image = new UIImage({src:options.src,loading:options.loading,alt:options.alt||'',
      className: `pw-poke-circle-img sprite-img ${options.imageClassName || ''}`.trim(), pixelated: true });
    this.addChildren([disc, this._image]);
  }

  /** @param {string} src */
  setSource(src) { this._image.setSource(src); }
  /** @param {string} alt */
  setAlt(alt) { this._image.setAlt(alt); }
}
