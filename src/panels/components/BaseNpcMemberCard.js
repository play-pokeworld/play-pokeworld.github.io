/**
 * @file BaseNpcMemberCard.js
 * @brief Pokémon card in the Secret Base NPC team builder (C++: class BaseNpcMemberCard : public PokemonCardView).
 * Brings NPC team cards into full parity with the game's active team presentation
 * (sprite, level, localized name, drag reorder grip, store/remove button, held item, HP bar, full moves list).
 */

import { PokemonCardView } from './PokemonCardView.js';
import { PokemonData } from '../../data/pokemon/PokemonData.js';
import { UIButton } from '../../ui/UIButton.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../../config/ModalIds.js';
import { t } from '../../localization/LocalizationManager.js';

export class BaseNpcMemberCard extends PokemonCardView {
  /**
   * @param {Object} options
   * @param {number} options.index - Slot index in team (0 to 5)
   * @param {Function|null} [options.onPick=null] - Callback to replace this slot
   * @param {Function|null} [options.onRemove=null] - Callback to remove this member
   * @param {Function|null} [options.onReorder=null] - Keyboard reorder (delta: -1 | 1)
   */
  constructor(options = {}) {
    super({
      name: 'BaseNpcMemberCard',
      className: 'pw-base-npced-mon-card',
      hpTextKey: 'team_hp_value',
      showInfoButton: true,
      showXp: false,
      showMoves: true,
      loading: 'eager',
      onInfoClick: () => this._openInfo(),
      onHeldItemClick: () => this._openHeldItem()
    });
    this.addClass('pw-poke-card');
    this.setAttribute('role', 'listitem');
    this._index = options.index ?? 0;
    this._mon = null;
    this._onPick = typeof options.onPick === 'function' ? options.onPick : null;
    this._onRemove = typeof options.onRemove === 'function' ? options.onRemove : null;
    this._onReorder = typeof options.onReorder === 'function' ? options.onReorder : null;

    this.setData('index', String(this._index));

    // 1. Drag grip handle matching TeamMemberCard
    this._dragHandle = new UIButton({
      icon: 'grip',
      variant: 'ghost',
      size: 'sm',
      className: 'pw-team-drag-handle',
      onClick: (event) => event.stopPropagation()
    });
    this._dragHandle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
    this._dragHandle.setTooltip(t('team_reorder_hint'));
    this._dragHandle.addDomListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      this._onReorder?.(this._index, event.key === 'ArrowUp' ? -1 : 1);
    });
    this._nameRow.addChild(this._dragHandle);

    // 2. Remove / store button matching TeamMemberCard
    this._removeBtn = new UIButton({
      icon: 'close',
      variant: 'ghost',
      size: 'sm',
      className: 'pw-team-store-btn pw-base-npced-mon-del',
      onClick: (event) => {
        event.stopPropagation();
        this._onRemove?.(this._index);
      }
    });
    this._removeBtn.setAriaLabel(t('npced.remove_mon'));
    this._removeBtn.setTooltip(t('npced.remove_mon'));
    this._nameRow.addChild(this._removeBtn);

    // 3. Left-click on the card opens Pokémon replacement picker
    this.addDomListener('click', (event) => {
      if (event.target?.closest?.('button, a, input, select, .poke-move, [data-stop-drag="true"]')) {
        return;
      }
      this._onPick?.(this._index);
    });

    // 4. Right-click contextmenu opens Pokémon info modal
    this.addDomListener('contextmenu', (event) => {
      if (event.target?.closest?.('button, a, input, select')) return;
      event.preventDefault();
      event.stopPropagation();
      this._openInfo();
    });
  }

  /** @returns {UIButton} */
  getDragHandle() {
    return this._dragHandle;
  }

  /**
   * Updates card display with the serialized NPC Pokémon configuration.
   * @param {Object} mon - { species, level, moves, shiny, heldItem, talent }
   * @param {number} [index]
   */
  setNpcPokemon(mon, index = this._index) {
    this._index = Number.isInteger(index) ? index : this._index;
    this._mon = mon;
    this.setData('index', String(this._index));
    if (!mon) {
      this.hide();
      return;
    }
    const pokemon = new PokemonData({
      species: mon.species,
      level: mon.level || 5,
      moves: mon.moves || [],
      shiny: mon.shiny === true,
      heldItem: mon.heldItem || null,
      talent: mon.talent || null
    });
    this._dragHandle.setAriaLabel(t('team_reorder_aria', {
      name: pokemon.getDisplayName(),
      position: this._index + 1
    }));
    this.setPokemon(pokemon, null, { resting: true });
  }

  /** @private */
  _openInfo() {
    if (!this._mon?.species) return;
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, {
        species: this._mon.species
      })
    );
  }

  /** @private */
  _openHeldItem() {
    this._onPick?.(this._index);
  }
}
