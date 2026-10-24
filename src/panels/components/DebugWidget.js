/**
 * @file DebugWidget.js
 * @brief Floating debug drawer and toggle button matching the main interface.
 * Displayed when developer mode is active in settings.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';
import { AppShell } from '../../ui/AppShell.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { BoxSystem } from '../../systems/BoxSystem.js';
import { TeamSystem } from '../../systems/TeamSystem.js';
import { BattleSystem } from '../../systems/BattleSystem.js';
import { SecretBaseSystem } from '../../systems/SecretBaseSystem.js';
import { HatcherySystem } from '../../systems/HatcherySystem.js';
import { TrainingSystem } from '../../systems/TrainingSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemKinds } from '../../data/items/ItemKinds.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { MineChangedEvent } from '../../core/events/MineChangedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class DebugWidget extends UIContainer {
  constructor() {
    super({
      id: 'debug-widget',
      className: 'pw-static-066',
      name: 'DebugWidget'
    });

    /** @private @type {number} */
    this._daytimeIndex = 0;

    this._drawer = new UIContainer({
      id: 'debug-drawer',
      className: 'pw-static-067'
    });

    const header = new UIContainer({
      className: 'pw-static-068',
      children: [
        new UIText({ tagName: 'span', text: t('debug_menu_title_short') }),
        new UIButton({
          id: 'debug-drawer-close-btn',
          className: 'pw-static-069',
          text: '✕',
          ariaLabel: t('modal_close_btn'),
          onClick: () => this._drawer.removeClass('open')
        })
      ]
    });

    this._x10StateSpan = new UIText({ id: 'debug-x10-state', tagName: 'span', text: 'OFF' });
    this._daytimeStateSpan = new UIText({ id: 'debug-daytime-state', tagName: 'span', text: 'AUTO' });

    const x10Button = new UIButton({
      id: 'debug-btn-speed-x10',
      className: 'hbtn pw-static-074',
      onClick: () => this._toggleSpeedX10()
    });
    x10Button.addChild(new UIText({ tagName: 'span', text: `${t('debug_speed_x10')} ` }));
    x10Button.addChild(this._x10StateSpan);

    const daytimeButton = new UIButton({
      id: 'debug-btn-daytime',
      className: 'hbtn pw-static-074',
      onClick: () => this._cycleDaytime()
    });
    daytimeButton.addChild(new UIText({ tagName: 'span', text: `${t('debug_daytime')} ` }));
    daytimeButton.addChild(this._daytimeStateSpan);

    this._drawer.addChildren([
      header,
      new UIButton({
        id: 'debug-btn-money',
        className: 'hbtn pw-static-070',
        text: t('debug_give_money'),
        onClick: () => this._giveMoney()
      }),
      new UIButton({
        id: 'debug-btn-candies',
        className: 'hbtn pw-static-071',
        text: t('debug_candies'),
        onClick: () => this._giveCandies()
      }),
      new UIButton({
        id: 'debug-btn-badges',
        className: 'hbtn pw-static-072',
        text: t('debug_badges'),
        onClick: () => this._unlockBadges()
      }),
      new UIButton({
        id: 'debug-btn-mine',
        className: 'hbtn pw-static-073',
        text: t('debug_mine'),
        onClick: () => this._fillMine()
      }),
      new UIButton({
        id: 'debug-btn-base-grant',
        className: 'hbtn pw-static-073',
        text: t('debug_base_grant'),
        onClick: () => this._baseGrantAll()
      }),
      new UIButton({
        id: 'debug-btn-base-npc',
        className: 'hbtn pw-static-073',
        text: t('debug_base_npc'),
        onClick: () => this._baseAddNpc()
      }),
      new UIButton({
        id: 'debug-btn-ctcs',
        className: 'hbtn pw-static-200',
        text: t('debug_ctcs'),
        onClick: () => this._giveCtCs()
      }),
      new UIButton({
        id: 'debug-btn-afk',
        className: 'hbtn pw-static-073',
        text: t('debug_afk'),
        onClick: () => this._afkSkip()
      }),
      new UIButton({
        id: 'debug-btn-all-items',
        className: 'hbtn pw-static-073',
        text: t('debug_all_items'),
        onClick: () => this._giveAllItems()
      }),
      new UIButton({
        id: 'debug-btn-all-items-shown',
        className: 'hbtn pw-static-073',
        text: t('debug_all_items_shown'),
        onClick: () => this._showAllItems()
      }),
      x10Button,
      daytimeButton,
      new UIButton({
        id: 'debug-btn-dedup',
        className: 'hbtn pw-static-073',
        text: t('debug_dedup'),
        onClick: () => this._cleanBoxDuplicates()
      })
    ]);

    const toggleBtn = new UIButton({
      id: 'debug-widget-toggle',
      className: 'pw-static-075',
      text: t('debug_toggle_btn'),
      onClick: () => this._drawer.toggleClass('open')
    });

    this.addChildren([this._drawer, toggleBtn]);
  }

  /** @private Gives 50,000 of every major currency. */
  _giveMoney() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    for (const id of ['money', 'dungeonToken', 'questPoint', 'diamond', 'battlePoint']) {
      save.currencies.add(id, 50000);
    }
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(t('legacy_message_n_50_000_ajout_s'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Adds 10 rare candies to the inventory. */
  _giveCandies() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    save.inventory.add('rarecandy', 10);
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(t('legacy_message_n_10_super_bonbons_ajout_s'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Unlocks all 8 Kanto gym badges. */
  _unlockBadges() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const kantoBadges = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
    for (const badge of kantoBadges) {
      save.player.earnBadge(badge, { deferSave: true });
    }
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(t('legacy_message_n_8_badges_d_bloqu_s'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Restores mine energy to 100. */
  _fillMine() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    save.mine.energy = 100;
    save.mine.lastRegenTimestamp = Date.now();
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new MineChangedEvent('energy'));
    NotificationSystem.getInstance().notifyTemporary(t('legacy_message_n_nergie_de_mine_restaur_e_100'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Grants all decorations for the secret base. */
  _baseGrantAll() {
    SecretBaseSystem.getInstance().debugGrantAll();
  }

  /** @private Adds a friend NPC with the current team into the secret base. */
  _baseAddNpc() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const baseSys = SecretBaseSystem.getInstance();
    if (!baseSys.isUnlocked(save)) {
      NotificationSystem.getInstance().notifyTemporary(t('content_feature_locked', { feature: 'Base' }), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
      return;
    }
    if (!save.secretBase?.isEstablished?.()) {
      save.player.location = 'route101';
      baseSys.establish('route101', 'tree_1');
    }
    const team = baseSys.captureCurrentTeam();
    if (!team.length) {
      NotificationSystem.getInstance().notifyTemporary(t('err.npc_team'), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
      return;
    }
    const name = t('debug.npc_name') || 'Copain';
    const res = baseSys.createNpc({
      name,
      sprite: 'youngster',
      team
    });
    if (res.ok) {
      NotificationSystem.getInstance().notifyTemporary(t('debug.npc_added', { name }), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.SUCCESS
      });
    } else {
      const msg = res.reason && typeof res.reason === 'string' ? t(res.reason) : t('err.npc_team');
      NotificationSystem.getInstance().notifyTemporary(msg, {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
    }
  }

  /** @private Adds +1 of every TM and HM to the inventory. */
  _giveCtCs() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const all = ItemDB.getInstance().getAll();
    for (const item of all) {
      if (item.kind === ItemKinds.TM || item.kind === ItemKinds.HM || /^(ct|cs)/.test(item.id)) {
        save.inventory.add(item.id, 1, { deferSave: true });
      }
    }
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(t('debug_ct_added'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Simulates a 30-minute AFK skip for mine, training and hatchery. */
  _afkSkip() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    save.mine.energy = Math.min(100, (save.mine.energy || 0) + 30);
    save.mine.lastRegenTimestamp = Date.now();
    EventBus.getInstance().dispatch(new MineChangedEvent('energy'));
    TrainingSystem.getInstance().update(1800);
    HatcherySystem.getInstance().update(1800);
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(t('debug_timeskip_10m'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Adds +1 of every item to inventory. */
  _giveAllItems() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const all = ItemDB.getInstance().getAll();
    for (const item of all) {
      save.inventory.add(item.id, 1, { deferSave: true });
    }
    SaveSystem.getInstance().saveCurrent();
    NotificationSystem.getInstance().notifyTemporary(t('debug_all_items'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private Opens the dictionary displaying all entries. */
  _showAllItems() {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY, { debugShowAll: true }));
    NotificationSystem.getInstance().notifyTemporary(t('debug_all_items_shown'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.INFO
    });
  }

  /** @private Toggles the battle speed multiplier between 1x and 10x. */
  _toggleSpeedX10() {
    const mult = BattleSystem.getInstance().toggleSpeedMultiplierX10();
    const isX10 = mult === 10;
    if (this._x10StateSpan) this._x10StateSpan.setText(isX10 ? 'ON' : 'OFF');
    NotificationSystem.getInstance().notifyTemporary(
      isX10 ? t('debug_x10_on') : t('debug_x10_off'),
      { channel: NotificationChannels.SYSTEM, tone: isX10 ? NotificationTones.SUCCESS : NotificationTones.INFO }
    );
  }

  /** @private Cycles day/night phases. */
  _cycleDaytime() {
    const phases = ['auto', 'dawn', 'day', 'dusk', 'night'];
    this._daytimeIndex = (this._daytimeIndex + 1) % phases.length;
    const phase = phases[this._daytimeIndex];
    AppShell.setDaytime(phase);
    if (this._daytimeStateSpan) this._daytimeStateSpan.setText(phase.toUpperCase());
    NotificationSystem.getInstance().notifyTemporary(
      `${t('debug_daytime')} ${phase.toUpperCase()}`,
      { channel: NotificationChannels.SYSTEM, tone: NotificationTones.INFO }
    );
  }

  /** @private Scans the PC box collection and cleans duplicate Pokémon UIDs. */
  _cleanBoxDuplicates() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const box = BoxSystem.getInstance();
    const uids = new Set();
    let removed = 0;
    for (const pokemon of [...box.getAll()]) {
      if (uids.has(pokemon.uid)) {
        box.removePokemon(pokemon.uid);
        removed++;
      } else {
        uids.add(pokemon.uid);
      }
    }
    SaveSystem.getInstance().saveCurrent();
    const msg = removed > 0 ? `${removed} doublon(s) supprimé(s)` : t('debug_dedup');
    NotificationSystem.getInstance().notifyTemporary(msg, {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }
}
