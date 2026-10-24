/**
 * @file ActiveTeamPanel.js
 * @brief Active team cards with drag/drop reorder, PC replacement, and team presets.
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UISortableList } from '../ui/UISortableList.js';
import { TeamMemberCard } from './components/TeamMemberCard.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { TeamBoxTransferSystem } from '../systems/TeamBoxTransferSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { t } from '../localization/LocalizationManager.js';

export class ActiveTeamPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.TEAM,
      column,
      title: t('team_btn'),
      icon: 'team',
      bodyId: 'team-window-body',
      bodyClassName: 'team-view',
      name: 'ActiveTeamPanel',
    });

    const presetButton = new UIButton({
      className: 'hbtn team-presets-open-btn',
      size: 'sm',
      text: t('teams_manager_open'),
      icon: 'team',
      onClick: () => this._openPresetManager(),
    });
    this.addChild(presetButton);

    this._cards = new Map();
    this._sortableList = new UISortableList({
      className: 'pw-team-member-list',
      name: 'ActiveTeamSortableList',
      rowDrag: true,
      followPointer: true,
      getContextKey: () =>
        JSON.stringify([
          SaveSystem.getInstance().getCurrentSave()?.id,
          TeamSystem.getInstance().getMemberUids(),
        ]),
      onReorder: (fromUid, toUid) =>
        TeamSystem.getInstance().swapMembers(fromUid, toUid),
    });
    this._sortableList.setAttribute('role', 'list');
    this._sortableList.setAriaLabel(t('team_reorder_list_aria'));
    this.addChild(this._sortableList);

    const boxButton = new UIButton({
      className: 'pw-win-tool-btn pc-box-open-btn',
      variant: 'ghost',
      size: 'sm',
      icon: 'box',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.BOX),
        ),
    });
    boxButton.setAriaLabel(t('shortcut_pc_box'));
    boxButton.setTooltip(t('shortcut_pc_box'));
    this.addHeaderAction(boxButton);

    this.refresh();
    for (const event of [SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent])
      this.listen(event, () => {
        this._sortableList.cancelDrag();
        this.refresh();
      });
    this.listen(TeamChangedEvent, () => this.refresh());
    this.listen(BattleStartedEvent, () => this.refresh());
    this.listen(BattleStateChangedEvent, () => this.refresh());
    this.listen(BattleEndedEvent, () => this.refresh());
  }

  /** @private Opens generic PC selection for the active team's empty slot. */
  _openBoxSelector() {
    return TeamBoxTransferSystem.getInstance().openWithdrawSelector();
  }

  /** @private Opens generic PC selection for the selected team member. */
  _openBoxReplacement(pokemonUid) {
    if (typeof pokemonUid !== 'string' || !pokemonUid) return false;
    return TeamBoxTransferSystem.getInstance().openReplacementSelector(
      pokemonUid,
    );
  }

  /** @private Stores a team member through the dedicated cross-system coordinator. */
  _storePokemon(pokemonUid) {
    if (typeof pokemonUid !== 'string' || !pokemonUid) return false;
    const team = TeamSystem.getInstance().getTeam();
    const removedIndex = team.findIndex(
      (pokemon) => pokemon.uid === pokemonUid,
    );
    if (!TeamBoxTransferSystem.getInstance().storeToBox(pokemonUid))
      return false;
    const remaining = TeamSystem.getInstance().getTeam();
    const focusUid =
      remaining[Math.min(Math.max(removedIndex, 0), remaining.length - 1)]?.uid;
    const nextHandle = focusUid
      ? this._cards.get(focusUid)?.getDragHandle().getDomElement()
      : null;
    nextHandle?.focus?.();
    return true;
  }

  /** @private Opens the selected Pokémon's information sheet by stable uid. */
  _openPokemonInfo(pokemonUid) {
    if (typeof pokemonUid !== 'string' || !pokemonUid) return;
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, { pokemonUid }),
    );
  }

  /** @private @param {number} teamIndex */
  _openHeldItemPicker(teamIndex) {
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.BAG, {
        mode: 'held-item',
        teamIndex,
      }),
    );
  }

  /** Opens the 20-slot manager directly from the team window. @private */
  _openPresetManager() {
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.TEAM_PRESETS),
    );
  }

  /** @private @param {string} pokemonUid @param {number} delta */
  _reorderByKeyboard(pokemonUid, delta) {
    const team = TeamSystem.getInstance().getTeam();
    const index = team.findIndex((pokemon) => pokemon.uid === pokemonUid);
    const target = team[index + delta];
    if (index < 0 || !target) return false;
    return TeamSystem.getInstance().swapMembers(pokemonUid, target.uid);
  }

  /**
   * Synchronizes cards with the current team. Rows are keyed by uid so HP/battle refreshes
   * update in place and drag/drop reorders never rebuild the card subtree.
   */
  refresh() {
    const team = TeamSystem.getInstance().getTeam();
    const foe = BattleSystem.getInstance().getCurrentFoe();
    const activeUids = new Set();
    const entries = [];

    team.forEach((pokemon, index) => {
      const uid = pokemon.uid;
      activeUids.add(uid);
      let card = this._cards.get(uid);
      if (!card) {
        card = new TeamMemberCard({
          index,
          onClick: (pokemonUid) => this._openBoxReplacement(pokemonUid),
          onInfoClick: (pokemonUid) => this._openPokemonInfo(pokemonUid),
          onHeldItemClick: (teamIndex) => this._openHeldItemPicker(teamIndex),
          onStoreClick: (pokemonUid) => this._storePokemon(pokemonUid),
          onKeyboardReorder: (pokemonUid, delta) =>
            this._reorderByKeyboard(pokemonUid, delta),
        });
        this._cards.set(uid, card);
      }
      card.setPokemon(pokemon, foe, index, team.length);
      entries.push({ key: uid, row: card, handle: card.getDragHandle() });
    });

    this._sortableList.setItems(entries);
    for (const [uid] of this._cards) {
      if (!activeUids.has(uid)) this._cards.delete(uid);
    }
    this._syncAddSlot(team.length);
  }

  /**
   * @private Shows the "add a Pokémon" slot while the team is not full.
   * @param {number} teamSize
   */
  _syncAddSlot(teamSize) {
    if (!this._addSlot) {
      this._addSlotCount = new UIText({
        tagName: 'div',
        className: 'pw-text-sm pw-light1',
      });
      this._addSlot = new UIContainer({
        className: 'pw-drop-zone',
        children: [
          new UIText({
            tagName: 'div',
            className: 'pw-text-lg',
            text: t('add_slot_symbol'),
          }),
          new UIText({
            tagName: 'div',
            className: 'pw-text-sm pw-light2 pw-bold',
            text: t('add_pokemon'),
          }),
          this._addSlotCount,
        ],
      });
      this._addSlot.addDomListener('click', () => this._openBoxSelector());
      this.addChild(this._addSlot);
    }
    this._addSlotCount.setText(t('team_count', { count: teamSize }));
    if (teamSize < PlayerDefaults.TEAM_SIZE) this._addSlot.show();
    else this._addSlot.hide();
  }
}
