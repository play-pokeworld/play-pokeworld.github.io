/**
 * @file UIPokemonSprite.js
 * @brief Pokémon sprite drawn on the canonical dark disc (C++ equivalent: class UIPokemonSprite : public UIElement).
 * Port of the original game's buildSpriteCircle() helper: every Pokémon sprite
 * container should be built through this widget so the disc stays consistent.
 * Markup: span.pw-poke-circle-wrap > span.pw-poke-circle-bg + img.pw-poke-circle-img
 * Size is a CSS modifier class (.pw-poke-circle-wrap--<size>), never an inline style.
 */

import { UISpriteFrame } from './UISpriteFrame.js';
import { AssetPaths } from '../config/AssetPaths.js';

/** Allowed size tokens (pixel values live in ui-pokemon-sprite.css). */
export const PokemonSpriteSizes = Object.freeze({
  STANDARD: 'standard', // 56px
  LARGE: 'large',       // 72px (starter cards)
  TEAM: 'team',         // 96px
  HERO: 'hero',         // 132px (Pokemon detail sheet hero)
  CONTEXT: 'context'    // no size token: the surrounding component CSS sizes the disc
});

const VALID_SIZES = new Set(Object.values(PokemonSpriteSizes));

export class UIPokemonSprite extends UISpriteFrame {
  /**
   * @param {Object} options
   * @param {string} options.species             - Species slug, resolved through AssetPaths
   * @param {string} [options.form='']           - Optional form suffix (assets/images/pokemon/<species>_<form>.png)
   * @param {boolean} [options.shiny=false]      - Shiny variant
   * @param {string} [options.alt='']            - Localized alternative text
   * @param {string} [options.size='standard']   - One of PokemonSpriteSizes
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    super({
      ...options,
      src: options.species ? AssetPaths.pokemonSprite(options.species, options.form || '', options.shiny === true) : '',
      name: options.name || 'UIPokemonSprite'
    });

    this.setSize(options.size || PokemonSpriteSizes.STANDARD);
  }

  /** @param {string} size - One of PokemonSpriteSizes (unknown values fall back to 'standard') */
  setSize(size) {
    const token = VALID_SIZES.has(size) ? size : PokemonSpriteSizes.STANDARD;
    if (this._size === token) return;
    this._size = token;
    for (const s of VALID_SIZES) this.removeClass(`pw-poke-circle-wrap--${s}`);
    if (token !== PokemonSpriteSizes.CONTEXT) this.addClass(`pw-poke-circle-wrap--${token}`);
    this.setData('size', token);
  }

  /**
   * @param {string} species
   * @param {string} [form='']
   * @param {boolean} [shiny=false]
   */
  setSpecies(species, form = '', shiny = false) {
    this._image.setSource(species ? AssetPaths.pokemonSprite(species, form, shiny) : '');
  }

  /** @param {string} alt - Localized alternative text */
  setAlt(alt) {
    this._image.setAlt(alt);
  }
}
