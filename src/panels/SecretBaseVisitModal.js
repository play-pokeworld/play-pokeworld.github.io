/**
 * @file SecretBaseVisitModal.js
 * @brief Interactive room visit, NPC challenge hand-off, PC/flag interaction and alcove setup.
 */
import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { SecretBaseRoomView } from './components/SecretBaseRoomView.js';
import { SecretBaseSystem } from '../systems/SecretBaseSystem.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';
import { SecretBaseVisitChangedEvent } from '../core/events/SecretBaseVisitChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';

export class SecretBaseVisitModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.SECRET_BASE_VISIT,
      size: 'lg',
      title: t('visit.title'),
      bodyId: 'pw-secret-base-visit-body',
      bodyClassName: 'pw-secret-base-visit-body',
      className: 'pw-secret-base-visit-modal',
      name: 'SecretBaseVisitModal',
      hasHeader: true,
      showCloseBtn: true,
      closeOnBackdrop: true
    });
    this._walking = false;
    this._walkElapsed = 0;
    this._resumeAfterBattle = false;
    this._pcOpen = false;

    this._intro = new UIText({ className: 'pw-secret-base-visit-hint', text: '' });
    this._room = new SecretBaseRoomView({
      className: 'pw-secret-base-room--visit',
      onCellClick: (x, y) => this._onRoomClick(x, y)
    });
    this._actions = new UIContainer({ className: 'pw-secret-base-toolbar' });
    this._pcPanel = new UIContainer({ className: 'pw-secret-base-pc' });
    this._body = new UIContainer({ className: 'pw-secret-base-visit-layout', children: [this._intro, this._room, this._actions, this._pcPanel] });
    this.addChild(this._body);

    this._confirm = new ConfirmDialog({ id: 'pw-secret-base-visit-confirm', name: 'SecretBaseVisitConfirm' });
    this.addOverlayChild(this._confirm);

    this.listen(SecretBaseVisitChangedEvent, (event) => {
      if (!this.isOpen()) return;
      if (event.reason === 'save-context-changed') {
        this._walking = false;
        this._resumeAfterBattle = false;
        this.close();
        return;
      }
      if (!event.snapshot) this._walking = false;
      this._render();
    });
    this.listen(BattleEndedEvent, () => {
      if (!this._resumeAfterBattle || !SecretBaseSystem.getInstance().getVisitSnapshot()) return;
      this._resumeAfterBattle = false;
      this.open();
    });
    this._render();
  }

  /** @override @param {Object} [params={}] */
  onEnter(params = {}) {
    super.onEnter(params);
    this._pcOpen = false;
    this._render();
  }

  /** @override */
  onExit() {
    this._walking = false;
    this._walkElapsed = 0;
    this._pcOpen = false;
    if (!this._resumeAfterBattle) {
      SecretBaseSystem.getInstance().stopVisit();
    }
    super.onExit();
  }

  /** @override */
  onUpdate(dt) {
    super.onUpdate(dt);
    if (!this.isOpen() || !this._walking) return;
    this._walkElapsed += Math.max(0, Number(dt) || 0) * 1000;
    while (this._walkElapsed >= SecretBaseRules.VISIT_STEP_MS && this._walking) {
      this._walkElapsed -= SecretBaseRules.VISIT_STEP_MS;
      const result = SecretBaseSystem.getInstance().tickVisit();
      this._walking = !result.done;
      if (result.interaction) this._handleInteraction(result.interaction);
      this._render();
    }
  }

  /** @private @param {number} x @param {number} y */
  _onRoomClick(x, y) {
    const result = SecretBaseSystem.getInstance().clickVisit(x, y);
    if (result.type === 'move') {
      this._walking = true;
      this._walkElapsed = 0;
      this._render();
    } else if (result.type === 'interact') {
      this._handleInteraction(result.interaction);
      this._render();
    } else if (result.type === 'blocked') {
      this._toast('edit.blocked', NotificationTones.WARNING);
    }
  }

  /** @private @param {Object} interaction */
  _handleInteraction(interaction) {
    if (!interaction) return;
    switch (interaction.type) {
      case 'npc-battle':
        this._askNpcChallenge(interaction.npc);
        break;
      case 'npc-idle':
        this._toast('edit.npc_no_team', NotificationTones.INFO, { name: interaction.npc?.name || t('edit.npc_default_name') });
        break;
      case 'pc':
        this._pcOpen = true;
        this._render();
        break;
      case 'message':
        this._toast(interaction.key, NotificationTones.INFO, interaction.params || {});
        break;
      case 'item': {
        const item = t(`i.${interaction.itemId}`);
        this._toast('visit.item', NotificationTones.INFO, { name: item });
        break;
      }
      default:
        break;
    }
  }

  /** @private @param {Object} npc */
  _askNpcChallenge(npc) {
    this._confirm.ask({
      title: t('edit.battle_challenge', { name: npc?.name || t('edit.npc_default_name') }),
      message: npc?.messages?.pre || t('visit.challenge_confirm', { name: npc?.name || '' }),
      confirmLabel: t('visit.challenge'),
      onConfirm: () => {
        const result = SecretBaseSystem.getInstance().challengeNpc(npc.id);
        if (result.ok) {
          this._resumeAfterBattle = true;
          this.close();
        }
      }
    });
  }

  /** @private @param {string} key @param {string} [tone] @param {Object} [params] */
  _toast(key, tone = NotificationTones.INFO, params = {}) {
    const message = t(key, params);
    if (!message || message === key) return;
    NotificationSystem.getInstance().notifyTemporary(message, { channel: NotificationChannels.GAMEPLAY, tone });
  }

  /** @private */
  _render() {
    const system = SecretBaseSystem.getInstance();
    const visit = system.getVisitSnapshot();
    if (!visit) {
      this.setTitle(t('visit.title'));
      this._intro.setText(t('visit.no_visit'));
      this._room.setView(null);
      this._actions.clearChildren();
      this._actions.addChild(new UIButton({
        className: 'hbtn',
        text: t('dlg.close'),
        onClick: () => this.close()
      }));
      this._pcPanel.clearChildren();
      return;
    }

    const layoutName = t(`win.layout.${visit.layoutId}`);
    this.setTitle(t('visit.title_named', { name: visit.name || layoutName }));
    this._intro.setText(t(visit.source === 'alcove' ? 'visit.hint_alcove' : 'edit.visit_hint'));
    const playerSprite = SaveSystem.getInstance().getCurrentSave()?.player?.trainerSprite || 'trainer-0';
    this._room.setView(visit.data, {
      mode: 'visit',
      position: visit.position,
      path: visit.path,
      playerSprite
    });

    this._actions.clearChildren();
    this._actions.addChild(new UIButton({
      className: 'hbtn pw-secret-base-toolbar-stop',
      text: t('edit.visit_stop'),
      onClick: () => {
        this._walking = false;
        this._walkElapsed = 0;
        system.stopVisit();
        this._pcOpen = false;
        this.close();
      }
    }));
    if (visit.source === 'alcove') this._addAlcoveAction(visit);
    if (visit.source === 'own') {
      this._actions.addChild(new UIText({ className: 'pw-secret-base-toolbar-meta', text: t('visit.own_room') }));
    }
    this._actions.addChild(new UIText({
      className: 'pw-secret-base-toolbar-meta',
      text: t('edit.visit_end', { w: visit.battlesWon, l: visit.battlesLost })
    }));
    this._renderPc(system.getPcViewModel());
  }

  /** @private @param {Object} visit */
  _addAlcoveAction(visit) {
    const system = SecretBaseSystem.getInstance();
    const base = system.getBase();
    if (!base?.isEstablished?.()) {
      this._actions.addChild(new UIButton({
        className: 'hbtn pw-btn-primary',
        text: t('action.establish'),
        onClick: () => {
          const result = system.establish(visit.locationId, visit.layoutId);
          if (!result.ok) return;
          this._walking = false;
          this._walkElapsed = 0;
          this._pcOpen = false;
          this.close();
        }
      }));
      return;
    }
    if (base.locationId === visit.locationId && base.layoutId === visit.layoutId) return;
    this._actions.addChild(new UIButton({
      className: 'hbtn pw-btn-danger',
      text: t('action.move'),
      onClick: () => this._confirm.ask({
        title: t('action.move_confirm_title'),
        message: t('action.move_confirm_message'),
        confirmLabel: t('action.move_confirm'),
        danger: true,
        onConfirm: () => {
          const result = system.relocate(visit.locationId, visit.layoutId);
          if (!result.ok) return;
          this._walking = false;
          this._walkElapsed = 0;
          this._pcOpen = false;
          this.close();
        }
      })
    }));
  }

  /** @private @param {Object|null} pc */
  _renderPc(pc) {
    this._pcPanel.clearChildren();
    if (!this._pcOpen || !pc) return;
    const rankName = t(pc.rankLabelKey);
    this._pcPanel.addChildren([
      new UIText({ tagName: 'strong', className: 'pw-secret-base-pc-title', text: t('pc.title') }),
      new UIText({ className: 'pw-secret-base-pc-message', text: pc.message || t('pc.no_message') }),
      new UIText({ className: 'pw-secret-base-pc-rank', text: t('pc.rank_summary', { rank: rankName, count: pc.flagCount }) }),
      new UIText({ className: 'pw-secret-base-pc-record', text: t('edit.pc_record', { name: pc.name || t('edit.npc_default_name'), v: pc.record.visits, w: pc.record.wins, l: pc.record.losses }) })
    ]);
    if (pc.nextThreshold !== null) {
      this._pcPanel.addChild(new UIText({ className: 'pw-secret-base-pc-next', text: t('pc.next_rank', { count: pc.flagCount, next: pc.nextThreshold }) }));
    }
    if (pc.onCooldown) {
      this._pcPanel.addChild(new UIText({ className: 'pw-secret-base-pc-cooldown', text: t('flag.cooldown', { remainingHours: pc.remainingHours }) }));
    }
    if (pc.canCollect) {
      this._pcPanel.addChild(new UIButton({
        className: 'hbtn pw-btn-primary',
        text: t('flag.collect'),
        onClick: () => {
          SecretBaseSystem.getInstance().collectFlag();
          this._render();
        }
      }));
    }
  }
}
