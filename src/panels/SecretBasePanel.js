/**
 * @file SecretBasePanel.js
 * @brief Persistent base overview, decoration editor, NPC editor and exchange tools.
 * All persistent mutations are delegated to SecretBaseSystem.
 */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UITextInput } from '../ui/UITextInput.js';
import { UIDropdown } from '../ui/UIDropdown.js';
import { UIFileButton } from '../ui/UIFileButton.js';
import { FileDownload } from '../ui/FileDownload.js';
import { SecretBaseRoomView } from './components/SecretBaseRoomView.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { ModalIds } from '../config/ModalIds.js';
import { SecretBaseAccessSystem } from '../systems/SecretBaseAccessSystem.js';
import { SecretBaseSystem } from '../systems/SecretBaseSystem.js';
import { SecretBaseItemDB } from '../data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../data/base/SecretBaseLayoutDB.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';
import { SecretBasePlacementRules } from '../systems/secret-base/SecretBasePlacementRules.js';
import { SecretBaseExchangeRules } from '../systems/secret-base/SecretBaseExchangeRules.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { PreferencesSystem } from '../systems/PreferencesSystem.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { SecretBaseChangedEvent } from '../core/events/SecretBaseChangedEvent.js';
import { SecretBaseVisitChangedEvent } from '../core/events/SecretBaseVisitChangedEvent.js';
import { BonusChangedEvent } from '../core/events/BonusChangedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

const ITEMS = () => SecretBaseItemDB.getInstance();
const LAYOUTS = () => SecretBaseLayoutDB.getInstance();

export class SecretBasePanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.BASE,
      column,
      title: t('base_tab'),
      icon: 'home',
      bodyId: 'base-panel',
      bodyClassName: 'pw-base-body',
      name: 'SecretBasePanel'
    });
    this._editing = false;
    this._selectedStockId = null;
    this._selectedDecorationUid = null;
    this._selectedNpcId = null;
    this._createInputs = null;

    this._content = new UIContainer({ className: 'pw-secret-base-panel-content' });
    this.addChild(this._content);
    this.listen(SaveCreatedEvent, () => this._resetEditorAndRender());
    this.listen(SaveLoadedEvent, () => this._resetEditorAndRender());
    this.listen(SaveDeletedEvent, () => this._resetEditorAndRender());
    this.listen(QuestClaimedEvent, () => this._render());
    this.listen(SecretBaseChangedEvent, () => this._render());
    this.listen(SecretBaseVisitChangedEvent, (event) => {
      if (event.reason === 'started' || event.reason === 'save-context-changed') this._resetEditorAndRender();
    });
    this.listen(BonusChangedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _resetEditorAndRender() {
    this._editing = false;
    this._selectedStockId = null;
    this._selectedDecorationUid = null;
    this._selectedNpcId = null;
    this._render();
  }

  /** @private */
  _render() {
    const system = SecretBaseSystem.getInstance();
    const unlocked = SecretBaseAccessSystem.getInstance().isUnlocked();
    this.toggleClass('pw-secret-base-gated', !unlocked);
    this._content.clearChildren();
    if (!unlocked) return;

    const save = SaveSystem.getInstance().getCurrentSave();
    const base = system.getBase();
    if (!base?.isEstablished?.()) {
      this._editing = false;
      this._content.addChildren([
        new UIContainer({
          className: 'pw-secret-base-empty-card',
          children: [
            new UIText({ tagName: 'strong', text: t('win.title') }),
            new UIText({ text: t('win.not_established') }),
            new UIText({ className: 'pw-secret-base-hint', text: t('panel.find_alcove') })
          ]
        }),
        this._buildImportControls()
      ]);
      return;
    }

    const locationId = system.getBaseLocationId() || base.locationId;
    const layout = LAYOUTS().getById(base.layoutId);
    const flags = base.flags || { count: 0 };
    const rank = SecretBaseRules.FLAG_RANKS.reduce((current, row) => Number(flags.count) >= row.threshold ? row : current,
      SecretBaseRules.FLAG_RANKS[0]);
    const bonusSummary = this._bonusSummary(rank.id);
    const record = base.record || { visits: 0, wins: 0, losses: 0 };

    const overview = new UIContainer({
      className: 'pw-secret-base-overview',
      children: [
        new UIContainer({ className: 'pw-secret-base-overview-title', children: [
          new UIText({ tagName: 'strong', text: t(`win.layout.${base.layoutId}`) }),
          new UIText({ text: t(locationId ? `location.${locationId}` : 'win.title') })
        ] }),
        new UIContainer({ className: 'pw-secret-base-overview-stats', children: [
          new UIText({ text: t('pc.rank_summary', { rank: t(`flag.rank.${rank.id}`), count: flags.count || 0 }) }),
          new UIText({ text: t('edit.pc_record', { name: save?.player?.trainerName || '', v: record.visits || 0, w: record.wins || 0, l: record.losses || 0 }) }),
          new UIText({ className: 'pw-secret-base-bonus', text: bonusSummary })
        ] })
      ]
    });
    this._content.addChild(overview);

    const actions = new UIContainer({ className: 'pw-base-actions pw-secret-base-actions' });
    actions.addChildren([
      new UIButton({
        className: 'hbtn pw-btn-primary',
        text: t('edit.visit'),
        onClick: () => this._openOwnVisit()
      }),
      new UIButton({
        className: `hbtn ${this._editing ? 'pw-btn-primary' : ''}`,
        text: t(this._editing ? 'panel.stop_edit' : 'panel.edit'),
        onClick: () => {
          this._editing = !this._editing;
          this._selectedStockId = null;
          this._selectedDecorationUid = null;
          this._selectedNpcId = null;
          this._render();
        }
      }),
      new UIButton({ className: 'hbtn', text: t('edit.export'), onClick: () => this._exportBase(base, save) })
    ]);
    this._content.addChild(actions);
    this._content.addChild(this._buildImportControls());

    if (PreferencesSystem.getInstance().isDebugMode()) {
      this._content.addChild(new UIButton({
        className: 'hbtn pw-secret-base-debug-grant',
        text: t('debug.grant_button'),
        onClick: () => system.debugGrantAll()
      }));
    }

    if (this._editing) this._content.addChild(this._buildEditor(base));
    else this._content.addChild(new SecretBaseRoomView({
      className: 'pw-secret-base-room--overview',
      onCellClick: () => this._openOwnVisit()
    }));
    const room = this._content.getChildren()[this._content.getChildren().length - 1];
    if (room instanceof SecretBaseRoomView) {
      const playerSprite = save?.player?.trainerSprite || 'trainer-0';
      room.setView(base.serialize(), { mode: this._editing ? 'edit' : 'visit', playerSprite });
    }
  }

  /** @private @returns {UIContainer} */
  _buildImportControls() {
    return new UIContainer({
      className: 'pw-secret-base-exchange',
      children: [
        new UIText({ tagName: 'strong', text: t('panel.exchange_title') }),
        new UIFileButton({
          id: 'pw-secret-base-import-file',
          inputId: 'pw-secret-base-import-input',
          text: t('edit.import'),
          accept: '.json,application/json',
          className: 'pw-secret-base-import',
          onFileRead: (text) => {
            const result = SecretBaseSystem.getInstance().startImportedVisit(text);
            if (result.ok) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_VISIT));
          }
        })
      ]
    });
  }

  /** @private @param {Object} base @param {Object|null} save */
  _exportBase(base, save) {
    const portable = SecretBaseExchangeRules.buildExport(base, {
      id: save?.id || null,
      name: save?.player?.trainerName || ''
    }, `base-${save?.id || 'local'}`);
    const text = portable && SecretBaseExchangeRules.serializeExport(portable);
    if (!text) return;
    FileDownload.saveText('secret-base.json', text, 'application/json');
    NotificationSystem.getInstance().notifyTemporary(t('export_done'), { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.SUCCESS });
  }

  /** @private */
  _openOwnVisit() {
    const result = SecretBaseSystem.getInstance().startOwnVisit();
    if (result.ok) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_VISIT));
  }

  /** @private @param {string} rankId @returns {string} */
  _bonusSummary(rankId) {
    const rank = SecretBaseRules.FLAG_RANKS.find((entry) => entry.id === rankId) || SecretBaseRules.FLAG_RANKS[0];
    const parts = [];
    const bonuses = rank.bonuses || {};
    if (bonuses.money) parts.push(t('panel.bonus_money', { value: bonuses.money }));
    if (bonuses.xp) parts.push(t('panel.bonus_xp', { value: bonuses.xp }));
    if (bonuses.mineEnergyMax) parts.push(t('panel.bonus_mine', { value: bonuses.mineEnergyMax }));
    if (bonuses.routeLoot) parts.push(t('panel.bonus_route', { value: bonuses.routeLoot }));
    return parts.length ? `${t('panel.bonus_label')}: ${parts.join(' · ')}` : t('panel.no_bonus');
  }

  /** @private @param {Object} base @returns {UIContainer} */
  _buildEditor(base) {
    const system = SecretBaseSystem.getInstance();
    const editor = new UIContainer({ className: 'pw-secret-base-editor' });
    const selectionLabel = this._selectedStockId
      ? t('panel.selected_stock', { name: t(`i.${this._selectedStockId}`) })
      : this._selectedDecorationUid !== null
        ? t('panel.selected_decoration')
        : this._selectedNpcId
          ? t('panel.selected_npc')
          : t('panel.select_hint');
    editor.addChild(new UIText({ className: 'pw-secret-base-hint', text: selectionLabel }));
    const room = new SecretBaseRoomView({
      className: 'pw-secret-base-room--editor',
      onCellClick: (x, y) => this._onEditorCellClick(base, x, y)
    });
    room.setView(base.serialize(), {
      mode: 'edit',
      playerSprite: SaveSystem.getInstance().getCurrentSave()?.player?.trainerSprite || 'trainer-0',
      selectedUid: this._selectedDecorationUid,
      selectedNpcId: this._selectedNpcId
    });
    editor.addChild(room);

    const selectionActions = new UIContainer({ className: 'pw-secret-base-toolbar' });
    if (this._selectedDecorationUid !== null) {
      selectionActions.addChildren([
        new UIButton({ className: 'hbtn', text: t('edit.pickup'), onClick: () => {
          const result = system.pickupDecoration(this._selectedDecorationUid);
          if (result.ok) this._selectedDecorationUid = null;
        } }),
        new UIButton({ className: 'hbtn', text: t('panel.unselect'), onClick: () => {
          this._selectedDecorationUid = null;
          this._render();
        } })
      ]);
    } else if (this._selectedNpcId) {
      selectionActions.addChildren([
        new UIButton({ className: 'hbtn pw-btn-danger', text: t('panel.npc_remove'), onClick: () => {
          const result = system.deleteNpc(this._selectedNpcId);
          if (result.ok) this._selectedNpcId = null;
          this._render();
        } }),
        new UIButton({ className: 'hbtn', text: t('panel.unselect'), onClick: () => {
          this._selectedNpcId = null;
          this._render();
        } })
      ]);
    } else if (this._selectedStockId) {
      selectionActions.addChild(new UIButton({ className: 'hbtn', text: t('panel.cancel_place'), onClick: () => {
        this._selectedStockId = null;
        this._render();
      } }));
    }
    if (selectionActions.getChildren().length) editor.addChild(selectionActions);

    const pcMessage = new UITextInput({
      id: 'pw-base-pc-message',
      value: base.pcMessage || '',
      maxLength: SecretBaseRules.MAX_PC_MESSAGE_LENGTH,
      placeholder: t('pc.msg_placeholder')
    });
    editor.addChild(new UIContainer({ className: 'pw-secret-base-pc-editor', children: [
      new UIText({ tagName: 'strong', text: t('pc.msg_label') }),
      pcMessage,
      new UIButton({ className: 'hbtn', text: t('panel.pc_message_save'), onClick: () => system.setPcMessage(pcMessage.getValue()) })
    ] }));
    editor.addChild(new UIContainer({ className: 'pw-secret-base-stock-block', children: [
      new UIText({ tagName: 'strong', text: t('edit.stock') }),
      this._buildStock(base)
    ] }));
    editor.addChild(this._buildNpcEditor(base));
    return editor;
  }

  /** @private @param {Object} base @returns {UIContainer} */
  _buildStock(base) {
    const list = new UIContainer({ className: 'pw-secret-base-stock-list' });
    const rows = Object.entries(base.stock || {})
      .filter(([itemId, count]) => ITEMS().has(itemId) && Number(count) > 0 && ITEMS().getById(itemId).acquisition !== 'auto')
      .sort(([left], [right]) => left.localeCompare(right));
    if (!rows.length) {
      list.addChild(new UIText({ className: 'pw-secret-base-hint', text: t('edit.stock_empty') }));
      return list;
    }
    for (const [itemId, count] of rows) {
      const item = ITEMS().getById(itemId);
      const button = new UIButton({
        className: `pw-secret-base-stock-item ${this._selectedStockId === itemId ? 'is-selected' : ''}`,
        text: `${t(item.nameKey)} × ${count}`,
        onClick: () => {
          this._selectedStockId = itemId;
          this._selectedDecorationUid = null;
          this._selectedNpcId = null;
          this._render();
        }
      });
      list.addChild(button);
    }
    return list;
  }

  /** @private @param {Object} base @returns {UIContainer} */
  _buildNpcEditor(base) {
    const section = new UIContainer({ className: 'pw-secret-base-npc-editor' });
    section.addChild(new UIText({ tagName: 'strong', text: t('edit.pals') }));
    const inputs = new UIContainer({ className: 'pw-secret-base-npc-fields' });
    const selectedNpc = base.npcs.find((entry) => entry.id === this._selectedNpcId) || null;
    const name = new UITextInput({ id: 'pw-base-npc-name', maxLength: SecretBaseRules.MAX_NPC_NAME_LENGTH, value: selectedNpc?.name || '', placeholder: t('panel.npc_name_placeholder') });
    const pre = new UITextInput({ id: 'pw-base-npc-pre', maxLength: SecretBaseRules.MAX_NPC_MESSAGE_LENGTH, value: selectedNpc?.messages?.pre || '', placeholder: t('panel.npc_pre_placeholder') });
    const win = new UITextInput({ id: 'pw-base-npc-win', maxLength: SecretBaseRules.MAX_NPC_MESSAGE_LENGTH, value: selectedNpc?.messages?.win || '', placeholder: t('panel.npc_win_placeholder') });
    const lose = new UITextInput({ id: 'pw-base-npc-lose', maxLength: SecretBaseRules.MAX_NPC_MESSAGE_LENGTH, value: selectedNpc?.messages?.lose || '', placeholder: t('panel.npc_lose_placeholder') });
    const sprite = new UIDropdown({
      id: 'pw-base-npc-sprite',
      className: 'pw-secret-base-npc-sprite',
      value: selectedNpc?.sprite || SecretBaseRules.DEFAULT_NPC_SPRITE,
      options: SecretBaseRules.NPC_SPRITES.map((id) => ({ value: id, label: id }))
    });
    this._createInputs = { name, pre, win, lose, sprite };
    inputs.addChildren([name, sprite, pre, win, lose]);
    section.addChild(inputs);

    const submitLabel = selectedNpc ? t('panel.npc_save') : t('panel.npc_add');
    section.addChild(new UIButton({
      className: 'hbtn pw-btn-primary',
      text: submitLabel,
      onClick: () => {
        const draft = {
          name: name.getValue(),
          sprite: sprite.getValue(),
          messages: { pre: pre.getValue(), win: win.getValue(), lose: lose.getValue() }
        };
        const result = selectedNpc
          ? systemUpdateNpc(selectedNpc.id, draft)
          : SecretBaseSystem.getInstance().createNpc({ ...draft, team: SecretBaseSystem.getInstance().captureCurrentTeam() });
        if (result.ok) {
          this._selectedNpcId = result.id || selectedNpc?.id || null;
          this._selectedStockId = null;
          this._selectedDecorationUid = null;
          this._render();
        }
      }
    }));

    if (base.npcs.length) {
      const roster = new UIContainer({ className: 'pw-secret-base-npc-list' });
      for (const npc of base.npcs) {
        roster.addChild(new UIContainer({ className: `pw-secret-base-npc-row ${this._selectedNpcId === npc.id ? 'is-selected' : ''}`, children: [
          new UIButton({
            className: 'pw-secret-base-npc-select',
            text: `${npc.name || t('edit.npc_default_name')} · ${npc.team?.length || 0}`,
            align: 'left',
            onClick: () => {
              this._selectedNpcId = npc.id;
              this._selectedDecorationUid = null;
              this._selectedStockId = null;
              this._render();
            }
          }),
          new UIButton({
            className: 'pw-secret-base-npc-team',
            text: t('panel.npc_copy_team'),
            onClick: () => {
              SecretBaseSystem.getInstance().updateNpc(npc.id, { team: SecretBaseSystem.getInstance().captureCurrentTeam() });
            }
          })
        ] }));
      }
      section.addChild(roster);
    }
    return section;
  }

  /** @private @param {Object} base @param {number} x @param {number} y */
  _onEditorCellClick(base, x, y) {
    const system = SecretBaseSystem.getInstance();
    if (this._selectedStockId) {
      const itemId = this._selectedStockId;
      this._selectedStockId = null;
      const result = system.placeDecoration(itemId, x, y);
      if (!result.ok) this._selectedStockId = itemId;
      this._render();
      return;
    }
    if (this._selectedDecorationUid !== null) {
      const uid = this._selectedDecorationUid;
      const result = system.moveDecoration(uid, x, y);
      if (result.ok) this._selectedDecorationUid = null;
      this._render();
      return;
    }
    if (this._selectedNpcId) {
      const id = this._selectedNpcId;
      const result = system.updateNpc(id, { x, y });
      if (result.ok) this._selectedNpcId = null;
      this._render();
      return;
    }
    const data = system.getBaseSnapshot();
    const occupants = SecretBasePlacementRules.getOccupants(data, x, y);
    if (occupants.npc) {
      this._selectedNpcId = occupants.npc.id;
      this._render();
      return;
    }
    const decoration = [...occupants.decorations].reverse().find((entry) => {
      const item = ITEMS().getById(entry.itemId);
      return item && item.acquisition !== 'auto';
    });
    if (decoration) {
      this._selectedDecorationUid = decoration.uid;
      this._render();
    }
  }
}

/** @param {string} id @param {Object} patch */
function systemUpdateNpc(id, patch) {
  return SecretBaseSystem.getInstance().updateNpc(id, patch);
}
