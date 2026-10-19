/**
 * @file BattlePanel.js
 * @brief Live battle window: idle scene, fighter cards, leave button and loot summary
 * (C++: class BattlePanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIButton } from '../ui/UIButton.js';
import { BattleCombatantCard } from './components/BattleCombatantCard.js';
import { BattleTimeline } from './components/BattleTimeline.js';
import { BattleSides } from '../config/BattleSides.js';
import { BattleAttackEvent } from '../core/events/BattleAttackEvent.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { AppShell } from '../ui/AppShell.js';
import { resolveLocationScene } from '../config/LocationBackgrounds.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

export class BattlePanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.BATTLE,
      column,
      title: t('win_battle'),
      icon: 'swords',
      bodyId: 'battle-center-panel',
      bodyClassName: 'pw-static-032',
      name: 'BattlePanel'
    });
    this._sessionMoney = 0;
    this._sessionExp = 0;

    this._idleScreen = new UIContainer({
      id: 'battle-idle-screen',
      className: 'pw-static-033 pw-battle-idle',
      children: [
        new UIContainer({ className: 'pw-static-034', children: [new UIIcon({ name: 'sparkle', className: 'idle-scene-icon' })] }),
        new UIText({ tagName: 'div', className: 'pw-static-035', text: t('idle_title') }),
        new UIText({ tagName: 'div', className: 'pw-static-036', richText: t('idle_desc') })
      ]
    });

    this._foeCard = new BattleCombatantCard({ side: BattleSides.FOE });
    this._playerCard = new BattleCombatantCard({ side: BattleSides.PLAYER });
    this._timeline = new BattleTimeline();
    this._activeScene = new UIContainer({
      id: 'battle-active-scene',
      // Visibility follows the original rule: `.is-live` shows the scene and hides the idle screen (design-system A.2).
      className: 'pw-static-037 pw-battle-active',
      children: [
        this._timeline,
        new UIContainer({ id: 'battle-team-row', className: 'team-container pw-battle-team-row', children: [this._foeCard, this._playerCard] }),
        new UIContainer({
          className: 'pw-battle-action-row',
          children: [new UIButton({
            id: 'leave-btn',
            className: 'pw-static-045',
            text: t('leave_battle_btn'),
            onClick: () => BattleSystem.getInstance().endBattle(false)
          })]
        })
      ]
    });

    this._lootText = new UIText({ id: 'battle-loot-inline', tagName: 'div', className: 'pw-static-040' });
    const lootRow = new UIContainer({
      id: 'battle-loot-row',
      className: 'pw-static-039 pw-battle-loot-row',
      children: [
        this._lootText,
        new UIContainer({
          className: 'pw-static-041',
          children: [new UIButton({ id: 'loot-open-btn', variant: 'hbtn', className: 'pw-static-044', text: t('loot_open_btn') })]
        })
      ]
    });

    this.addChildren([this._idleScreen, this._activeScene, lootRow]);

    this.listen(BattleStartedEvent, (event) => {
      this._timeline.clear();
      this._showBattle(event.playerPokemon, event.foePokemon);
    });
    this.listen(BattleAttackEvent, (event) => this._timeline.addAttack(event));
    this.listen(BattleStateChangedEvent, (event) => this._showBattle(event.playerPokemon, event.foePokemon));
    this.listen(BattleEndedEvent, (event) => this._onBattleEnded(event));
    this.listen(LocationChangedEvent, (event) => this._applyScene(event.locationId));
    this._applyScene(LocationSystem.getInstance().getCurrentLocationId());

    const battle = BattleSystem.getInstance();
    if (battle.isActive()) this._showBattle(battle.getPlayerPokemon(), battle.getCurrentFoe());
    this._renderLoot();
  }

  /**
   * Landscape of the location behind the idle screen and the wild Pokémon.
   * @private
   * @param {string|null} locationId
   */
  _applyScene(locationId) {
    const location = locationId ? LocationDB.getInstance().getById(locationId) : null;
    AppShell.setSceneBackground(resolveLocationScene(locationId, location?.kind ?? null));
  }

  /** @private */
  _showBattle(player, foe) {
    this._activeScene.addClass('is-live');
    this._playerCard.setPokemon(player, foe);
    this._foeCard.setPokemon(foe, player);
  }

  /**
   * @private
   * @param {BattleEndedEvent} event
   */
  _onBattleEnded(event) {
    this._activeScene.removeClass('is-live');
    this._sessionMoney += event.moneyGained;
    this._sessionExp += event.expGained;
    this._renderLoot();
  }

  /** @private */
  _renderLoot() {
    this._lootText.setRichText(t('battle_loot_summary'), { money: this._sessionMoney, exp: this._sessionExp });
  }
}
