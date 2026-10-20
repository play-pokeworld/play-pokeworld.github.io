/**
 * @file TeamMemberCard.js
 * @brief Team window card of one Pokémon with info and held-item actions.
 */
import { PokemonCardView } from './PokemonCardView.js';

export class TeamMemberCard extends PokemonCardView {
  /**
   * @param {Object} options
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} [options.pokemon=null]
   * @param {number} options.index - Position in the team
   * @param {Function|null} [options.onClick=null] - Receives the team index
   * @param {Function|null} [options.onInfoClick=null] - Receives the team index
   * @param {Function|null} [options.onHeldItemClick=null] - Receives the team index
   */
  constructor(options) {
    super({
      name: 'TeamMemberCard',
      showInfoButton: true,
      onInfoClick: () => options.onInfoClick?.(options.index),
      onHeldItemClick: () => options.onHeldItemClick?.(options.index)
    });
    this._index = options.index;
    this.setData('index', String(options.index));
    if (options.onClick) this.addDomListener('click', () => options.onClick(this._index));
    if (options.pokemon) this.setPokemon(options.pokemon);
  }
}
