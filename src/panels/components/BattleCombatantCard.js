/**
 * @file BattleCombatantCard.js
 * @brief Battle card of one fighter (C++: class BattleCombatantCard : public PokemonCardView).
 * Same markup as the original battle row (`.poke-card.pw-poke-card[.pw-enemy-card | .active]`).
 * The wild card (first of #battle-team-row) shows the location landscape behind the sprite.
 */

import { PokemonCardView } from './PokemonCardView.js';
import { BattleSides } from '../../config/BattleSides.js';

export class BattleCombatantCard extends PokemonCardView {
  /**
   * @param {Object} options
   * @param {string} options.side - BattleSides value
   */
  constructor(options) {
    const isFoe = options.side === BattleSides.FOE;
    super({
      className: `pw-poke-card ${isFoe ? 'pw-enemy-card' : 'active'}`,
      showXp: !isFoe,
      hpTextKey: 'hp_value_over_max',
      name: 'BattleCombatantCard'
    });
  }
}
