/**
 * @file PokemonGridEntry.js
 * @brief Shared Pokédex-style circular tile used by collection grids.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { PokemonGridSprite } from './PokemonGridSprite.js';

export class PokemonGridEntry extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} options.species
   * @param {string} [options.form='']
   * @param {boolean} [options.shiny=false]
   * @param {string} [options.alt='']
   * @param {string} [options.marker='']
   * @param {string} [options.markerClassName='']
   * @param {string} [options.shinyClassName='']
   * @param {string} [options.className='dex-entry']
   * @param {string} [options.spriteClassName='dex-sprite pw-pokedex-sprite']
   * @param {string} [options.title='']
   * @param {string} [options.ariaLabel='']
   * @param {boolean|null} [options.ariaPressed=null]
   * @param {string} [options.focusKey='']
   * @param {string} [options.formBadge='']
   * @param {boolean} [options.disabled=false]
   * @param {Function|null} [options.onClick=null]
   */
  constructor(options = {}) {
    super({
      tagName: 'button',
      className: `pw-pokemon-grid-entry ${options.className || 'dex-entry'}`.trim(),
      name: 'PokemonGridEntry'
    });
    this.setAttribute('type', 'button');
    this.setAttribute('title', options.title || '');
    if (options.ariaLabel) this.setAriaLabel(options.ariaLabel);
    if (options.ariaPressed !== null && options.ariaPressed !== undefined) {
      this.setAttribute('aria-pressed', options.ariaPressed ? 'true' : 'false');
    }
    if (options.focusKey) this.setData('focusKey', options.focusKey);
    if (options.disabled) {
      this.setAttribute('disabled', 'disabled');
      this.addClass('is-disabled');
    }

    const sprite = new PokemonGridSprite({
      species: options.species,
      form: options.form || '',
      shiny: options.shiny === true,
      alt: options.alt || '',
      marker: options.marker || '',
      markerClassName: options.markerClassName || '',
      shinyClassName: options.shinyClassName || '',
      className: options.spriteClassName || 'dex-sprite pw-pokedex-sprite'
    });
    if (options.formBadge) {
      sprite.addChild(new UIText({
        tagName: 'span',
        className: 'pw-box-form-badge',
        text: options.formBadge
      }));
    }
    this.addChild(sprite);

    if (!options.disabled && typeof options.onClick === 'function') {
      this.addDomListener('click', options.onClick);
    }
  }
}
