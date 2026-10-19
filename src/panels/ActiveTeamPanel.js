/**
 * @file ActiveTeamPanel.js
 * @brief Team window: one card per team member + "add a Pokémon" slot (C++: class ActiveTeamPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { TeamMemberCard } from './components/TeamMemberCard.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
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
    this.refresh();
    this.listen(TeamChangedEvent, () => this.refresh());
    this.listen(BattleStateChangedEvent, () => this.refresh());
    this.listen(BattleEndedEvent, () => this.refresh());
  }

  /** @private Opens the team management modal. */
  _openTeamModal() {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.TEAM));
  }

  /** Rebuilds the cards from the current save. */
  refresh() {
    this.clearChildren();
    const team = TeamSystem.getInstance().getTeam();

    team.forEach((pokemon, index) => {
      this.addChild(new TeamMemberCard({ pokemon, index, onClick: () => this._openTeamModal() }));
    });

    if (team.length < PlayerDefaults.TEAM_SIZE) {
      const addSlot = new UIContainer({
        className: 'pw-drop-zone',
        children: [
          new UIText({ tagName: 'div', className: 'pw-text-lg', text: t('add_slot_symbol') }),
          new UIText({ tagName: 'div', className: 'pw-text-sm pw-light2 pw-bold', text: t('add_pokemon') }),
          new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('value_over_max', { value: team.length, max: PlayerDefaults.TEAM_SIZE }) })
        ]
      });
      addSlot.addDomListener('click', () => this._openTeamModal());
      this.addChild(addSlot);
    }
  }
}
