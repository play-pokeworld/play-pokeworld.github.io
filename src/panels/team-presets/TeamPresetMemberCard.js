/** @file TeamPresetMemberCard.js @brief Full shared Pokémon card in a preset draft; edits remain UID-only. */
import { PokemonCardView } from '../components/PokemonCardView.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';
import { TeamPresetEditSystem } from '../../systems/TeamPresetEditSystem.js';
import { TeamSystem } from '../../systems/TeamSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels } from '../../config/NotificationConfig.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class TeamPresetMemberCard extends PokemonCardView {
  constructor() {
    super({
      name: 'TeamPresetMemberCard',
      showInfoButton: true,
      loading: 'eager',
      hpTextKey: 'team_hp_value',
      onInfoClick: () => this._openInfo(),
      onHeldItemClick: () => this._openItem(),
    });
    this._uid = '';
    this._index = 0;
    this.addClass('pw-preset-member-card');
    this.setAttribute('role', 'listitem');
    this._top = this.getChildren()[0];
    this._dragHandle = new UIButton({
      icon: 'grip',
      variant: 'ghost',
      className: 'pw-preset-drag-handle',
      onClick: (event) => event.stopPropagation(),
    });
    this._dragHandle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
    this._dragHandle.addDomListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      TeamPresetEditSystem.getInstance().move(
        this._uid,
        event.key === 'ArrowUp' ? -1 : 1,
      );
    });
    this._remove = new UIButton({
      icon: 'close',
      variant: 'ghost',
      className: 'pw-preset-remove',
      onClick: (event) => {
        event.stopPropagation();
        TeamPresetEditSystem.getInstance().remove(this._uid);
      },
    });
    this._remove.setAriaLabel(t('preset_remove_member'));
    this._nameRow.addChildren([this._dragHandle, this._remove]);
    this._missing = new UIContainer({
      className: 'pw-drop-zone preset-slot-missing',
      children: [
        new UIText({ text: t('preset_missing_hint') }),
        new UIButton({
          className: 'hbtn pw-btn-danger',
          text: t('preset_remove_member'),
          onClick: () => TeamPresetEditSystem.getInstance().remove(this._uid),
        }),
      ],
    });
    this.addChild(this._missing);
    this.addDomListener('click', (event) => {
      if (
        event.target?.closest?.(
          'button, a, input, select, .poke-move, [data-stop-drag="true"]',
        )
      )
        return;
      TeamPresetEditSystem.getInstance().requestPokemon(this._index);
    });
    this.addDomListener('contextmenu', (event) => {
      if (event.target?.closest?.('button, input, select')) return;
      event.preventDefault();
      event.stopPropagation();
      this._openInfo();
    });
  }
  /** @returns {UIButton} */
  getDragHandle() {
    return this._dragHandle;
  }
  /** @param {Object} entry */
  setEntry(entry) {
    this._uid = entry.uid;
    this._index = entry.index;
    this.setData('pokemonUid', entry.uid);
    this.setData('presetSlot', entry.index);
    this._top.setVisible(!!entry.pokemon);
    this._moves.setVisible(!!entry.pokemon);
    this._missing.setVisible(!entry.pokemon);
    if (!entry.pokemon) return;
    super.setPokemon(entry.pokemon, null, { resting: entry.source !== 'team' });
    this._dragHandle.setAriaLabel(
      t('team_reorder_aria', {
        name: entry.pokemon.getDisplayName(),
        position: entry.index + 1,
      }),
    );
    this._dragHandle.setData('focusKey', `preset-drag-${entry.uid}`);
    this._itemBadge.setTooltip(
      entry.source === 'team'
        ? t('held_item_tooltip', {
            name: entry.pokemon.heldItem
              ? t(`item.${entry.pokemon.heldItem}.name`)
              : t('pokemon_info_no_item'),
          })
        : t('preset_items_team_only'),
    );
  }
  /** @private */
  _openInfo() {
    if (this._uid)
      EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, {
          pokemonUid: this._uid,
        }),
      );
  }
  /** @private The team/item systems recheck the actual current UID and usage locks. */
  _openItem() {
    const index = TeamSystem.getInstance()
      .getTeam()
      .findIndex((pokemon) => pokemon.uid === this._uid);
    if (index < 0) {
      NotificationSystem.getInstance().notifyTemporary(
        t('preset_items_team_only'),
        { channel: NotificationChannels.GAMEPLAY },
      );
      return;
    }
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.BAG, {
        mode: 'held-item',
        teamIndex: index,
      }),
    );
  }
}
