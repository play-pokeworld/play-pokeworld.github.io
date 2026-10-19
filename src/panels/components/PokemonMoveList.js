/**
 * @file PokemonMoveList.js
 * @brief The four move slots of a Pokémon card (C++: class PokemonMoveList : public UIContainer).
 * Same markup as the original (`.poke-moves > .poke-move.type-<type>`, empty slots show "-").
 * Until the move system is ported, a Pokémon without moves shows the default battle move.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { BattleConfig } from '../../config/BattleConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class PokemonMoveList extends UIContainer {
  constructor() {
    super({ className: 'poke-moves', name: 'PokemonMoveList' });
  }

  /**
   * @param {import('../../data/PokemonData.js').PokemonData} pokemon
   */
  setPokemon(pokemon) {
    this.clearChildren();
    const moveIds = (pokemon.moves || []).map((move) => (typeof move === 'string' ? move : move?.id)).filter(Boolean);
    const moves = moveIds.length > 0 ? moveIds : [BattleConfig.DEFAULT_MOVE_ID];
    for (let slot = 0; slot < BattleConfig.MOVE_SLOTS; slot++) {
      const moveId = moves[slot];
      this.addChild(moveId ? this._createMove(moveId) : new UIText({ tagName: 'div', className: 'poke-move empty', text: t('move_slot_empty') }));
    }
  }

  /**
   * @private
   * @param {string} moveId
   * @returns {UIContainer}
   */
  _createMove(moveId) {
    const type = moveId === BattleConfig.DEFAULT_MOVE_ID ? BattleConfig.DEFAULT_MOVE_TYPE : '';
    return new UIContainer({
      className: `poke-move ${type ? `type-${type}` : ''}`.trim(),
      children: [
        new UIText({ className: 'move-name', text: t(`move.${moveId}`) }),
        type && new UIText({ className: `move-type type-${type}`, text: t(`type.${type}`) })
      ]
    });
  }
}
