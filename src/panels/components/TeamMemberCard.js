/**
 * @file TeamMemberCard.js
 * @brief Active-team card with information, held-item, and reorder handles.
 */
import { UIButton } from '../../ui/UIButton.js';
import { t } from '../../localization/LocalizationManager.js';
import { PokemonCardView } from './PokemonCardView.js';

export class TeamMemberCard extends PokemonCardView {
  /**
   * @param {Object} options
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} [options.pokemon=null]
   * @param {number} options.index - Current position in the team
   * @param {Function|null} [options.onClick=null] - Receives (pokemonUid, teamIndex)
   * @param {Function|null} [options.onInfoClick=null] - Receives (pokemonUid, teamIndex)
   * @param {Function|null} [options.onHeldItemClick=null] - Receives the current team index
   * @param {Function|null} [options.onStoreClick=null] - Receives (pokemonUid, teamIndex)
   * @param {Function|null} [options.onKeyboardReorder=null] - Receives (pokemonUid, delta)
   */
  constructor(options) {
    super({
      name: 'TeamMemberCard',
      hpTextKey: 'team_hp_value',
      showInfoButton: true,
      onInfoClick: () => options.onInfoClick?.(this._pokemonUid, this._index),
      onHeldItemClick: () => options.onHeldItemClick?.(this._index)
    });
    this.addClass('pw-poke-card');
    this.setAttribute('role', 'listitem');
    this._index = Number.isInteger(options.index) ? options.index : 0;
    this._pokemonUid = null;
    this._onInfoClick = typeof options.onInfoClick === 'function' ? options.onInfoClick : null;
    this.setData('index', String(this._index));

    this._dragHandle = new UIButton({
      icon: 'grip',
      variant: 'ghost',
      size: 'sm',
      className: 'pw-team-drag-handle',
      onClick: (event) => event.stopPropagation()
    });
    this._dragHandle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
    this._dragHandle.setTooltip(t('team_reorder_hint'));
    this._nameRow.addChild(this._dragHandle);

    this._storeButton = new UIButton({
      icon: 'box',
      variant: 'ghost',
      size: 'sm',
      className: 'pw-team-store-btn',
      onClick: (event) => {
        event.stopPropagation();
        options.onStoreClick?.(this._pokemonUid, this._index);
      }
    });
    this._storeButton.setAriaLabel(t('box_store_action'));
    this._storeButton.setTooltip(t('box_store_action'));
    this._nameRow.addChild(this._storeButton);
    this._dragHandle.addDomListener('contextmenu', (event) => event.stopPropagation());
    this._dragHandle.addDomListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      event.stopPropagation();
      options.onKeyboardReorder?.(this._pokemonUid, event.key === 'ArrowUp' ? -1 : 1);
    });

    if (typeof options.onClick === 'function') {
      this.addDomListener('click', (event) => options.onClick(this._pokemonUid, this._index, event));
    }
    this.addDomListener('contextmenu', (event) => {
      if (!this._onInfoClick) return;
      if (event.target?.closest?.('button, a, input, select')) return;
      event.preventDefault();
      event.stopPropagation();
      this._onInfoClick(this._pokemonUid, this._index);
    });
    if (options.pokemon) this.setPokemon(options.pokemon, null, this._index);
  }

  /** @returns {UIButton} */
  getDragHandle() {
    return this._dragHandle;
  }

  /** @param {import('../../data/pokemon/PokemonData.js').PokemonData|null} pokemon @param {Object|null} [opponent=null] @param {number} [index=this._index] @param {number} [teamSize=2] */
  setPokemon(pokemon, opponent = null, index = this._index, teamSize = 2) {
    this._index = Number.isInteger(index) ? index : this._index;
    this._pokemonUid = pokemon?.uid || null;
    this.setData('index', String(this._index));
    this.setData('pokemonUid', this._pokemonUid || '');
    this._dragHandle.setAriaLabel(t('team_reorder_aria', {
      name: pokemon?.getDisplayName?.() || t('pokemon_info_no_pokemon'),
      position: this._index + 1
    }));
    this._dragHandle.setData('focusKey', this._pokemonUid ? `team-drag-${this._pokemonUid}` : 'team-drag-empty');
    this._infoButton?.setData('focusKey', this._pokemonUid ? `team-info-${this._pokemonUid}` : 'team-info-empty');
    this._itemBadge.setData('focusKey', this._pokemonUid ? `team-item-${this._pokemonUid}` : 'team-item-empty');
    this._storeButton.setData('focusKey', this._pokemonUid ? `team-store-${this._pokemonUid}` : 'team-store-empty');
    this._storeButton.setEnabled(Number.isInteger(teamSize) ? teamSize > 1 : true);
    super.setPokemon(pokemon, opponent);
  }
}
