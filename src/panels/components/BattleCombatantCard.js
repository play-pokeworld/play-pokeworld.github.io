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
   * @param {Function|null} [options.onSwitch=null] - Called for a selectable player team card
   */
  constructor(options) {
    const isFoe = options.side === BattleSides.FOE;
    super({
      className: `pw-poke-card ${isFoe ? 'pw-enemy-card' : 'battle-team-member'}`,
      showXp: !isFoe,
      showMoves: options.showMoves !== false,
      hpTextKey: 'hp_value_over_max',
      name: 'BattleCombatantCard'
    });
    this._onSwitch = isFoe ? null : (options.onSwitch || null);
    this._canSwitch = false;
    if (this._onSwitch) {
      this.setAttribute('role', 'button');
      this.setAttribute('tabindex', '0');
      this.addDomListener('click', (event) => {
        if (event.defaultPrevented || event.target?.closest?.('button, a, input, select')) return;
        this._requestSwitch();
      });
      this.addDomListener('keydown', (event) => {
        if (event.target?.closest?.('button, a, input, select')) return;
        if ((event.key === 'Enter' || event.key === ' ') && this._canSwitch) {
          event.preventDefault();
          this._requestSwitch();
        }
      });
    }
  }

  /** @override */
  setPokemon(pokemon, opponent = null) {
    super.setPokemon(pokemon, opponent);
    if (!pokemon) {
      this.setActive(false);
      this.setFainted(false);
      this.setSwitchEnabled(false);
      return;
    }
    this.setFainted(pokemon.isFainted());
    this.setAttribute('aria-label', this._onSwitch ? pokemon.getDisplayName() : '');
  }

  /** @param {import('../../systems/battle/BattleCombatant.js').BattleCombatant|null} combatant */
  setCombatant(combatant) {
    this.setBattleState(combatant);
  }

  /** @param {number} index @param {number} progressPercent */
  setChargeProgress(index, progressPercent) {
    this.setMoveProgress(index, progressPercent);
  }

  /** @param {boolean} active */
  setActive(active) {
    this.toggleClass('active', !!active);
    this.setAttribute('aria-current', active ? 'true' : 'false');
    if (active) this.setSwitchEnabled(false);
  }

  /** @param {boolean} fainted */
  setFainted(fainted) {
    this.toggleClass('fainted', !!fainted);
    if (fainted) this.setSwitchEnabled(false);
  }

  /** @param {boolean} enabled */
  setSwitchEnabled(enabled) {
    this._canSwitch = !!enabled && !!this._onSwitch;
    this.toggleClass('is-switchable', this._canSwitch);
    if (this._onSwitch) this.setAttribute('aria-disabled', this._canSwitch ? 'false' : 'true');
  }

  /** @private */
  _requestSwitch() {
    if (this._canSwitch && this._onSwitch) this._onSwitch();
  }
}
