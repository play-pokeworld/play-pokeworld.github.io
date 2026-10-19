/**
 * @file TeamMemberCard.js
 * @brief Team window card of one Pokémon (C++: class TeamMemberCard : public PokemonCardView).
 * Built once per team slot; ActiveTeamPanel calls setPokemon() to refresh it in place.
 */

import { PokemonCardView } from './PokemonCardView.js';

export class TeamMemberCard extends PokemonCardView {
  /**
   * @param {Object} options
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} [options.pokemon=null]
   * @param {number} options.index - Position in the team
   * @param {Function} [options.onClick=null] - Receives the team index
   */
  constructor(options) {
    super({ name: 'TeamMemberCard' });
    this._index = options.index;
    this.setData('index', String(options.index));
    if (options.onClick) this.addDomListener('click', () => options.onClick(this._index));
    if (options.pokemon) this.setPokemon(options.pokemon);
  }
}
