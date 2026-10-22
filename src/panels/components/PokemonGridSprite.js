/**
 * @file PokemonGridSprite.js
 * @brief Shared circular Pokémon sprite tile with optional level/Dex marker and shiny star.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';

export class PokemonGridSprite extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} options.species
   * @param {string} [options.form='']
   * @param {boolean} [options.shiny=false]
   * @param {string} [options.alt='']
   * @param {string} [options.marker=''] - Level or Pokédex number chip
   * @param {string} [options.markerClassName='']
   * @param {string} [options.shinyClassName='']
   * @param {string} [options.className='']
   * @param {string} [options.title='']
   * @param {string} [options.ariaLabel='']
   * @param {string} [options.focusKey='']
   * @param {Function|null} [options.onClick=null] - Makes the tile an accessible button
   * @param {boolean} [options.disabled=false]
   */
  constructor(options = {}) {
    const clickable = typeof options.onClick === 'function';
    super({
      tagName: clickable ? 'button' : 'div',
      className: `pw-pokemon-grid-sprite${clickable ? ' is-clickable' : ''} ${options.className || ''}`.trim(),
      name: 'PokemonGridSprite'
    });
    if (clickable) {
      this.setAttribute('type', 'button');
      this.setAriaLabel(options.ariaLabel || options.alt || '');
      this.setTooltip(options.title || '');
      if (options.disabled) {
        this.setAttribute('disabled', 'disabled');
        this.addClass('is-disabled');
      }
      if (options.focusKey) this.setData('focusKey', options.focusKey);
      this.addDomListener('click', (event) => {
        event.stopPropagation();
        if (!options.disabled) options.onClick(event);
      });
    }

    this.addChild(new UIPokemonSprite({
      species: options.species,
      form: options.form || '',
      shiny: options.shiny === true,
      alt: options.alt || '',
      size: PokemonSpriteSizes.CONTEXT,
      className: 'pw-pokemon-grid-sprite-image'
    }));

    if (options.marker) {
      this.addChild(new UIText({
        tagName: 'span',
        className: `pw-pokemon-grid-marker ${options.markerClassName || ''}`.trim(),
        text: options.marker
      }));
    }
    if (options.shiny) {
      this.addChild(new UIText({
        tagName: 'span',
        className: `pw-pokemon-grid-shiny ${options.shinyClassName || ''}`.trim(),
        text: '★'
      }));
    }
  }
}
