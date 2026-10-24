/**
 * @file BattlePanel.js
 * @brief Live battle window: idle scene, fighter cards, leave button and loot summary
 * (C++: class BattlePanel : public DraggablePanel).
 */

import { TrainingSystem } from '../systems/TrainingSystem.js';
import { TrainingBattleChangedEvent } from '../core/events/TrainingBattleChangedEvent.js';
import { TrainingBattleView } from './facilities/TrainingBattleView.js';
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIButton } from '../ui/UIButton.js';
import { BattleCombatantCard } from './components/BattleCombatantCard.js';
import { BattleTimeline } from './components/BattleTimeline.js';
import { BattleTrainerCard } from './components/BattleTrainerCard.js';
import { BattleZoneEffects } from './components/BattleZoneEffects.js';
import { CaptureAnimationView } from '../ui/CaptureAnimationView.js';
import { BattleLootStrip } from './components/BattleLootStrip.js';
import { RelaunchControls } from './components/RelaunchControls.js';
import { RelaunchRules } from '../config/RelaunchRules.js';
import { DungeonExpeditionPanel } from './components/DungeonExpeditionPanel.js';
import { BattleSides } from '../config/BattleSides.js';
import { BattleAttackEvent } from '../core/events/BattleAttackEvent.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { DungeonRunChangedEvent } from '../core/events/DungeonRunChangedEvent.js';
import { DungeonSystem } from '../systems/DungeonSystem.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { ModalIds } from '../config/ModalIds.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
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
      name: 'BattlePanel',
    });
    this._idleScreen = new UIContainer({
      id: 'battle-idle-screen',
      className: 'pw-static-033 pw-battle-idle',
      children: [
        new UIContainer({
          className: 'pw-static-034',
          children: [
            new UIIcon({ name: 'sparkle', className: 'idle-scene-icon' }),
          ],
        }),
        new UIText({
          tagName: 'div',
          className: 'pw-static-035',
          text: t('idle_title'),
        }),
        new UIText({
          tagName: 'div',
          className: 'pw-static-036',
          richText: t('idle_desc'),
        }),
      ],
    });

    this._relaunchGroup = new UIContainer({
      className: 'pw-relaunch-group',
      children: [
        new RelaunchControls(RelaunchRules.WILD, 'battle'),
        new RelaunchControls(RelaunchRules.DUNGEON, 'battle'),
      ],
    });

    this._foeCard = new BattleCombatantCard({
      side: BattleSides.FOE,
      showMoves: true,
    });
    this._teamCards = [];
    this._timeline = new BattleTimeline();
    this._trainerCard = new BattleTrainerCard();
    this._zoneEffects = new BattleZoneEffects();
    this._battleRow = new UIContainer({
      id: 'battle-team-row',
      className: 'team-container pw-battle-team-row',
      children: [this._foeCard, this._zoneEffects, ...this._teamCards],
    });
    this._activeScene = new UIContainer({
      id: 'battle-active-scene',
      // Visibility follows the original rule: `.is-live` shows the scene and hides the idle screen (design-system A.2).
      className: 'pw-static-037 pw-battle-active',
      children: [
        this._timeline,
        this._trainerCard,
        this._battleRow,
        new UIContainer({
          className: 'pw-battle-action-row',
          children: [
            new UIButton({
              id: 'leave-btn',
              className: 'pw-static-045',
              text: t('leave_battle_btn'),
              onClick: () =>
                DungeonSystem.getInstance().isActive()
                  ? DungeonSystem.getInstance().quitFromBattle()
                  : BattleSystem.getInstance().endBattle(false),
            }),
          ],
        }),
      ],
    });

    this._lootText = new BattleLootStrip({
      id: 'battle-loot-inline',
      className: 'pw-static-040',
    });
    this._dungeonPanel = new DungeonExpeditionPanel();
    this._captureAnimation = new CaptureAnimationView();
    this._lootRow = new UIContainer({
      id: 'battle-loot-row',
      className: 'pw-static-039 pw-battle-loot-row',
      children: [
        this._lootText,
        new UIContainer({
          className: 'pw-static-041',
          children: [
            new UIButton({
              id: 'loot-open-btn',
              variant: 'hbtn',
              className: 'pw-static-044',
              text: t('loot_open_btn'),
              onClick: () =>
                EventBus.getInstance().dispatch(
                  new ModalOpenRequestedEvent(ModalIds.BATTLE_SUMMARY),
                ),
            }),
          ],
        }),
      ],
    });

    this.addChildren([
      this._idleScreen,
      this._activeScene,
      new TrainingBattleView(),
      this._relaunchGroup,
      this._lootRow,
      this._dungeonPanel,
      this._captureAnimation,
    ]);

    this.listen(TrainingBattleChangedEvent, () =>
      this._syncActivityVisibility(),
    );
    this.listen(DungeonRunChangedEvent, () => this._syncActivityVisibility());
    this._syncActivityVisibility();
    this.listen(BattleStartedEvent, (event) => {
      this._timeline.clear();
      this._showBattle(event.playerPokemon, event.foePokemon);
      this._renderLoot();
    });
    this.listen(BattleAttackEvent, (event) => this._timeline.addAttack(event));
    this.listen(BattleStateChangedEvent, (event) => {
      this._showBattle(event.playerPokemon, event.foePokemon);
      this._renderLoot();
    });
    this.listen(TeamChangedEvent, () => {
      const battle = BattleSystem.getInstance();
      if (battle.isActive())
        this._showBattle(battle.getPlayerPokemon(), battle.getCurrentFoe());
      this._renderLoot();
    });
    this.listen(BattleEndedEvent, () => this._onBattleEnded());
    this.listen(SaveCreatedEvent, () => this._renderLoot());
    this.listen(SaveLoadedEvent, () => this._renderLoot());
    this.listen(LocationChangedEvent, (event) =>
      this._applyScene(event.locationId),
    );
    this._applyScene(LocationSystem.getInstance().getCurrentLocationId());

    const battle = BattleSystem.getInstance();
    if (battle.isActive())
      this._showBattle(battle.getPlayerPokemon(), battle.getCurrentFoe());
    this._renderLoot();
  }

  /** The training surface is independent of overworld loot and its idle scene. @private */
  _syncActivityVisibility() {
    const training = TrainingSystem.getInstance().isActive();
    this._idleScreen.setVisible(
      !training && !DungeonSystem.getInstance().isActive(),
    );
    this._lootRow.setVisible(!training);
  }

  /**
   * Landscape of the location behind the idle screen and the wild Pokémon.
   * @private
   * @param {string|null} locationId
   */
  _applyScene(locationId) {
    const location = locationId
      ? LocationDB.getInstance().getById(locationId)
      : null;
    AppShell.setSceneBackground(
      resolveLocationScene(locationId, location?.kind ?? null),
    );
  }

  /** @private @param {number} teamSize */
  _syncTeamCards(teamSize) {
    while (this._teamCards.length > teamSize) {
      const card = this._teamCards.pop();
      this._battleRow.removeChild(card);
      card.destroy();
    }
    while (this._teamCards.length < teamSize) {
      const index = this._teamCards.length;
      const card = new BattleCombatantCard({
        side: BattleSides.PLAYER,
        showMoves: false,
        onSwitch: () => this._switchPlayer(index),
      });
      this._teamCards.push(card);
      this._battleRow.addChild(card);
    }
  }

  /** @private */
  _showBattle(player, foe) {
    this._activeScene.addClass('is-live');
    const battle = BattleSystem.getInstance();
    const state = battle.getCombatState();
    this._trainerCard.setTrainer(battle.getTrainerPresentation());
    this._zoneEffects.setField(state?.field ?? null);

    this._foeCard.setPokemon(foe, player);
    this._foeCard.setMovesVisible(true);
    this._foeCard.setCombatant(state?.foe ?? null);

    const team = TeamSystem.getInstance().getTeam();
    this._syncTeamCards(team.length);
    this._teamCards.forEach((card, index) => {
      const pokemon = team[index] || null;
      const active = !!pokemon && pokemon === player;
      const combatant = active ? (state?.player ?? null) : null;
      card.setPokemon(pokemon, foe);
      card.setMovesVisible(active);
      card.setActive(active);
      card.setFainted(!!pokemon && pokemon.isFainted());
      card.setCombatant(combatant);
      card.setSwitchEnabled(!!pokemon && !active && !pokemon.isFainted());
    });
    this._refreshChargeProgress(state);
  }

  /** @private @param {Object|null} state */
  _refreshChargeProgress(state = BattleSystem.getInstance().getCombatState()) {
    if (!state) return;
    const percent = (remaining, total) =>
      total > 0
        ? Math.max(
            0,
            Math.min(100, ((total - Math.max(0, remaining)) / total) * 100),
          )
        : 100;
    const activeIndex = TeamSystem.getInstance()
      .getMemberUids()
      .indexOf(state.player.pokemon.uid);
    if (activeIndex >= 0) {
      this._teamCards[activeIndex]?.setChargeProgress(
        state.player.moveIndex,
        percent(state.playerCooldownMs, state.playerCooldownTotalMs),
      );
    }
    this._foeCard.setChargeProgress(
      state.foe.moveIndex,
      percent(state.foeCooldownMs, state.foeCooldownTotalMs),
    );
  }

  /** Progress bars are painted by the regular UI frame lifecycle, not by a second timer. @override */
  onUpdate(dt) {
    super.onUpdate(dt);
    if (BattleSystem.getInstance().isActive()) this._refreshChargeProgress();
  }

  /** @private @param {number} index */
  _switchPlayer(index) {
    const uid = TeamSystem.getInstance().getMemberUids()[index];
    if (uid) BattleSystem.getInstance().switchPlayerPokemonByUid(uid);
  }

  /** @private */
  _onBattleEnded() {
    this._activeScene.removeClass('is-live');
    this._renderLoot();
    const summary = BattleSystem.getInstance().getBattleSummary();
    if (summary.run?.battles > 0 && !DungeonSystem.getInstance().isActive()) {
      EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.BATTLE_SUMMARY),
      );
    }
  }

  /** @private */
  _renderLoot() {
    const summary = BattleSystem.getInstance().getBattleSummary();
    this._lootText.render(summary.run);
  }
}
