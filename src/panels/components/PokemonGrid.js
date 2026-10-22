/**
 * @file PokemonGrid.js
 * @brief Shared, view-only grid container for PC, team roster views and the Pokédex.
 */
import { UIContainer } from '../../ui/UIContainer.js';

export class PokemonGrid extends UIContainer {
  /**
   * @param {{className?:string, ariaLabel?:string, name?:string, children?:Array<import('../../ui/UIElement.js').UIElement>}} [options={}]
   */
  constructor(options = {}) {
    super({
      className: `pw-pokemon-grid ${options.className || ''}`.trim(),
      name: options.name || 'PokemonGrid',
      children: options.children || []
    });
    if (options.ariaLabel) {
      this.setAttribute('role', 'group');
      this.setAriaLabel(options.ariaLabel);
    }
  }
}
