/**
 * @file ActiveTeamPanel.js
 * @brief Team window: one card per team member + "add a Pokémon" slot (C++: class ActiveTeamPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { TeamMemberCard } from './components/TeamMemberCard.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { WindowIds } from '../config/DashboardLayout.js';
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
      name: 'ActiveTeamPanel'
    });
    const presetButton = new UIButton({
      className: 'team-presets-open-btn',
      variant: 'hbtn',
      size: 'sm',
      text: t('teams_manager_open'),
      onClick: () => this._openPresetManager()
    });
    this._presetToolbar = new UIContainer({
      className: 'pw-team-toolbar',
      children: [presetButton]
    });
    this.addChild(this._presetToolbar);

    this.refresh();
    this.listen(TeamChangedEvent, () => this.refresh());
    this.listen(BattleStartedEvent, () => this.refresh());
    this.listen(BattleStateChangedEvent, () => this.refresh());
    this.listen(BattleEndedEvent, () => this.refresh());
  }

  /** @private Opens the team management modal. */
  _openTeamModal() {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.TEAM));
  }

  /** Opens the 20-slot manager directly from the team window. @private */
  _openPresetManager() {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.TEAM_PRESETS));
  }

  /** @private @param {number} teamIndex */
  _openPokemonInfo(teamIndex) {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, { teamIndex }));
  }

  /** @private @param {number} teamIndex */
  _openHeldItemPicker(teamIndex) {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.HELD_ITEM_PICKER, { teamIndex }));
  }

  /**
   * Synchronizes the cards with the current team. Existing cards are updated in place
   * (called on every battle tick); nodes are only created or removed when the team size changes.
   */
  refresh() {
    const team = TeamSystem.getInstance().getTeam();
    const foe = BattleSystem.getInstance().getCurrentFoe();
    if (!this._cards) this._cards = [];

    while (this._cards.length > team.length) {
      const card = this._cards.pop();
      this.removeChild(card);
      card.destroy();
    }
    team.forEach((pokemon, index) => {
      if (!this._cards[index]) {
        const card = new TeamMemberCard({
          index,
          onClick: () => this._openTeamModal(),
          onInfoClick: (teamIndex) => this._openPokemonInfo(teamIndex),
          onHeldItemClick: (teamIndex) => this._openHeldItemPicker(teamIndex)
        });
        this._cards.push(card);
        if (this._addSlot) this.insertChildBefore(card, this._addSlot);
        else this.addChild(card);
      }
      this._cards[index].setPokemon(pokemon, foe);
    });

    this._syncAddSlot(team.length);
  }

  /**
   * @private Shows the "add a Pokémon" slot while the team is not full.
   * @param {number} teamSize
   */
  _syncAddSlot(teamSize) {
    if (!this._addSlot) {
      this._addSlotCount = new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1' });
      this._addSlot = new UIContainer({
        className: 'pw-drop-zone',
        children: [
          new UIText({ tagName: 'div', className: 'pw-text-lg', text: t('add_slot_symbol') }),
          new UIText({ tagName: 'div', className: 'pw-text-sm pw-light2 pw-bold', text: t('add_pokemon') }),
          this._addSlotCount
        ]
      });
      this._addSlot.addDomListener('click', () => this._openTeamModal());
      this.addChild(this._addSlot);
    }
    this._addSlotCount.setText(t('value_over_max', { value: teamSize, max: PlayerDefaults.TEAM_SIZE }));
    if (teamSize < PlayerDefaults.TEAM_SIZE) this._addSlot.show();
    else this._addSlot.hide();
  }
}
