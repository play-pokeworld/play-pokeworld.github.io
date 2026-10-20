/**
 * @file PokemonMoveList.js
 * @brief The four move slots of a Pokémon card (C++: class PokemonMoveList : public UIContainer).
 * Same markup as the original:
 *   .poke-moves > .poke-move.type-<type> > span.move-name + span.move-type.type-<type> [+ span.move-eff-badge.<tier>]
 * Empty slots show "-". The effectiveness badge is shown when an opponent is given
 * (the wild Pokémon during a battle).
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { BattleConfig } from '../../config/BattleConfig.js';
import { MoveDB } from '../../data/battle/MoveDB.js';
import { MoveLearnset } from '../../data/pokemon/MoveLearnset.js';
import { TypeChart } from '../../data/core/TypeChart.js';
import { effectivenessDisplay } from './EffectivenessDisplay.js';
import { t } from '../../localization/LocalizationManager.js';

export class PokemonMoveList extends UIContainer {
  constructor() {
    super({ className: 'poke-moves', name: 'PokemonMoveList' });
    /** @private @type {string|null} moves + opponent types currently rendered */
    this._shownKey = null;
  }

  /**
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData|null} [opponent=null]
   */
  setPokemon(pokemon, opponent = null) {
    const moves = MoveLearnset.activeMovesOf(pokemon);
    const opponentTypes = opponent ? MoveLearnset.typesOf(opponent) : null;
    // Same moves against the same types: keep the nodes (called on every battle tick)
    const key = `${moves.join('|')}#${opponentTypes ? opponentTypes.join('|') : ''}`;
    if (key === this._shownKey) return;
    this._shownKey = key;
    this.clearChildren();
    for (let slot = 0; slot < BattleConfig.MOVE_SLOTS; slot++) {
      const move = moves[slot] ? MoveDB.getInstance().getById(moves[slot]) : null;
      this.addChild(move
        ? this._createMove(move, opponentTypes)
        : new UIText({ tagName: 'div', className: 'poke-move empty', text: t('move_slot_empty') }));
    }
  }

  /**
   * Paints the live next-move charge on the existing row (the battle engine remains authoritative).
   * @param {number} index
   * @param {number} progressPercent
   */
  setBattleProgress(index, progressPercent) {
    const bounded = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    this.getChildren().forEach((move, slot) => {
      const element = move.getDomElement();
      if (!element.classList.contains('poke-move') || element.classList.contains('empty')) return;
      const charging = slot === index;
      move.toggleClass('charging', charging);
      move.toggleClass('ready', charging && bounded >= 99);
      element.style.setProperty('--charge-pct', charging ? `${bounded}%` : '0%');
    });
  }

  /**
   * @private
   * @param {Readonly<Object>} move - MoveDB definition
   * @param {string[]|null} opponentTypes
   * @returns {UIContainer}
   */
  _createMove(move, opponentTypes) {
    return new UIContainer({
      className: `poke-move type-${move.type}`,
      children: [
        new UIText({ className: 'move-name', text: t(`move.${move.id}`) }),
        new UIText({ className: `move-type type-${move.type}`, text: t(`type.${move.type}`) }),
        opponentTypes && this._createBadge(TypeChart.effectiveness(move.type, opponentTypes))
      ]
    });
  }

  /**
   * @private
   * @param {number} multiplier
   * @returns {UIText}
   */
  _createBadge(multiplier) {
    const display = effectivenessDisplay(multiplier);
    return new UIText({ className: `move-eff-badge ${display.badgeClass}`, text: t(display.labelKey) });
  }
}
