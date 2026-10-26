/**
 * @file SecretBasePanel.js
 * @brief Persistent Secret Base window (#win-base) with interactive 2D canvas,
 * toolbar, categorized stock drawer, direct in-canvas editing, and in-window visit mode.
 * Matches origin/main rendering and interaction while strictly adhering to Rules.md.
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIFileButton } from '../ui/UIFileButton.js';
import { FileDownload } from '../ui/FileDownload.js';
import { SecretBaseRoomView } from './components/SecretBaseRoomView.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { ModalIds } from '../config/ModalIds.js';
import { SecretBaseAccessSystem } from '../systems/SecretBaseAccessSystem.js';
import { SecretBaseSystem } from '../systems/SecretBaseSystem.js';
import { SecretBaseItemDB } from '../data/base/SecretBaseItemDB.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';
import { SecretBasePlacementRules } from '../systems/secret-base/SecretBasePlacementRules.js';
import { SecretBaseExchangeRules } from '../systems/secret-base/SecretBaseExchangeRules.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { SecretBaseChangedEvent } from '../core/events/SecretBaseChangedEvent.js';
import { SecretBaseVisitChangedEvent } from '../core/events/SecretBaseVisitChangedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

const STOCK_CATEGORIES = Object.freeze([
  'desks',
  'chairs',
  'plants',
  'objects',
  'mats',
  'wall',
  'dolls',
  'cushions',
  '__pals'
]);

export class SecretBasePanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.BASE,
      column,
      title: t('win.title'),
      icon: 'home',
      bodyId: 'base-panel',
      bodyClassName: 'win-body pw-base-body',
      name: 'SecretBasePanel'
    });

    /** @private @type {boolean} */
    this._visitMode = false;
    /** @private @type {number|null} */
    this._visitTimer = null;
    /** @private @type {string|null} */
    this._selectedStockId = null;
    /** @private @type {boolean} */
    this._selectedNpcPlacement = false;
    /** @private @type {string|null} */
    this._movingNpcId = null;
    /** @private @type {string|number|null} */
    this._selectedDecorationUid = null;
    /** @private @type {string|null} */
    this._selectedNpcId = null;
    /** @private @type {string} */
    this._stockTab = 'desks';
    /** @private @type {{x:number,y:number}|null} */
    this._hoverCell = null;

    /** @private @type {SecretBaseRoomView|null} */
    this._roomView = null;
    /** @private @type {UIContainer} */
    this._content = new UIContainer({ className: 'pw-secret-base-panel-content' });
    this.addChild(this._content);

    this.listen(SaveCreatedEvent, () => this._resetAndRender());
    this.listen(SaveLoadedEvent, () => this._resetAndRender());
    this.listen(SaveDeletedEvent, () => this._resetAndRender());
    this.listen(QuestClaimedEvent, () => this._render());
    this.listen(SecretBaseChangedEvent, () => this._render());
    this.listen(SecretBaseVisitChangedEvent, (event) => {
      if (event.reason === 'started') {
        if (event.snapshot?.fromLocation || event.snapshot?.source === 'alcove') return;
        this._visitMode = true;
        this._selectedStockId = null;
        this._selectedNpcPlacement = false;
        this._selectedDecorationUid = null;
        this._selectedNpcId = null;
        this._render();
      } else if (event.reason === 'save-context-changed') {
        this._stopVisitTicker();
        this._visitMode = false;
        this._resetAndRender();
      } else if (event.reason === 'stopped') {
        if (this._visitMode) {
          this._stopVisitTicker();
          this._visitMode = false;
          this._render();
        }
      }
    });

    this._render();
  }

  /** @private */
  _resetAndRender() {
    this._stopVisitTicker();
    this._visitMode = false;
    this._selectedStockId = null;
    this._selectedNpcPlacement = false;
    this._selectedDecorationUid = null;
    this._selectedNpcId = null;
    this._hoverCell = null;
    this._render();
  }

  /** @private */
  _render() {
    const system = SecretBaseSystem.getInstance();
    const unlocked = SecretBaseAccessSystem.getInstance().isUnlocked();
    this.toggleClass('pw-secret-base-gated', !unlocked);
    this._content.clearChildren();
    if (!unlocked) return;

    const base = system.getBase();
    const visitSnapshot = system.getVisitSnapshot();
    const isEstablished = base?.isEstablished?.() || Boolean(visitSnapshot);

    if (!isEstablished) {
      this._content.addChildren([
        new UIContainer({
          id: 'base-win-empty',
          className: 'base-win-empty pw-secret-base-empty-card',
          children: [
            new UIText({ tagName: 'strong', text: t('win.title') }),
            new UIText({ text: t('win.not_established') }),
            new UIText({ className: 'pw-secret-base-hint', text: t('panel.find_alcove') })
          ]
        }),
        new UIContainer({
          className: 'base-toolbar-empty',
          children: [
            new UIFileButton({
              id: 'base-ed-import',
              text: t('edit.import'),
              accept: '.json,application/json',
              className: 'hbtn',
              onFileRead: (text) => this._importBase(text)
            })
          ]
        })
      ]);
      return;
    }

    // Established or visiting base: render canvas, toolbar, and stock
    const activeData = visitSnapshot ? visitSnapshot.data : base.serialize();
    const save = SaveSystem.getInstance().getCurrentSave();
    const playerSprite = save?.player?.trainerSprite || 'trainer-0';

    // 1. Canvas 2D
    this._roomView = new SecretBaseRoomView({
      id: 'base-canvas-2d',
      onCellClick: (x, y) => this._onCanvasClick(x, y),
      onCellHover: (x, y) => this._onCanvasHover(x, y),
      onCellLeave: () => this._onCanvasLeave()
    });
    this._roomView.setView(activeData, {
      mode: this._visitMode ? 'visit' : 'edit',
      position: visitSnapshot?.position || null,
      path: visitSnapshot?.path || [],
      playerSprite,
      selectedUid: this._selectedDecorationUid,
      selectedNpcId: this._selectedNpcId,
      ghost: this._getGhost(activeData),
      hover: this._hoverCell
    });
    this._content.addChild(this._roomView);

    // 2. Toolbar
    this._content.addChild(this._buildToolbar(base, activeData));

    // 3. Stock drawer (hidden during visit)
    if (!this._visitMode) {
      this._content.addChild(this._buildStockDrawer(base));
    }
  }

  /**
   * @private
   * @param {Object} base
   * @param {Object} activeData
   * @returns {UIContainer}
   */
  _buildToolbar(base, activeData) {
    const system = SecretBaseSystem.getInstance();
    const toolbar = new UIContainer({ id: 'base-toolbar', className: 'base-toolbar' });

    // Pick up button
    const canPickup = !this._visitMode && (this._selectedDecorationUid !== null || this._selectedNpcId !== null);
    const pickupBtn = new UIButton({
      id: 'base-ed-pickup',
      className: 'hbtn pw-btn-danger',
      text: t('edit.pickup'),
      disabled: !canPickup,
      onClick: () => this._handlePickup()
    });
    toolbar.addChild(pickupBtn);

    // Edit NPC button (shown only when a placed NPC is selected)
    if (!this._visitMode && this._selectedNpcId) {
      const npcEditBtn = new UIButton({
        id: 'base-ed-npc-edit',
        className: 'hbtn',
        text: t('npced.edit_selected'),
        onClick: () => {
          EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_NPC, {
            npcId: this._selectedNpcId
          }));
        }
      });
      toolbar.addChild(npcEditBtn);
    }

    // Edit PC button (shown only when PC is selected)
    const isPcSelected = !this._visitMode && this._selectedDecorationUid !== null &&
      (activeData.decorations || []).some((d) => String(d.uid) === String(this._selectedDecorationUid) && d.itemId === SecretBaseRules.ITEM_IDS.PC);
    if (isPcSelected) {
      const pcEditBtn = new UIButton({
        id: 'base-ed-pc-edit',
        className: 'hbtn',
        text: t('pc.edit_selected'),
        onClick: () => {
          EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_PC));
        }
      });
      toolbar.addChild(pcEditBtn);
    }

    // Context hint text
    let hintText = '';
    if (this._visitMode) {
      hintText = t('edit.visit_hint');
    } else if (this._selectedStockId) {
      const item = SecretBaseItemDB.getInstance().getById(this._selectedStockId);
      const name = item ? t(item.nameKey) : this._selectedStockId;
      hintText = t('panel.selected_stock', { name });
    } else if (this._selectedNpcPlacement) {
      hintText = t('npced.place_hint');
    } else if (this._selectedDecorationUid !== null) {
      hintText = t('panel.selected_decoration');
    } else if (this._selectedNpcId) {
      hintText = t('panel.selected_npc');
    } else {
      hintText = t('edit.select_hint');
    }

    toolbar.addChild(new UIText({ id: 'base-ed-hint', className: 'base-ed-hint', text: hintText }));
    toolbar.addChild(new UIContainer({ className: 'base-toolbar-spacer' }));

    // Export button
    toolbar.addChild(new UIButton({
      id: 'base-ed-export',
      className: 'hbtn',
      text: t('edit.export'),
      disabled: this._visitMode,
      onClick: () => this._exportBase()
    }));

    // Import file button
    toolbar.addChild(new UIFileButton({
      id: 'base-ed-import',
      className: 'hbtn',
      text: t('edit.import'),
      accept: '.json,application/json',
      disabled: this._visitMode,
      onFileRead: (text) => this._importBase(text)
    }));

    // Visit / Stop visit toggle button
    const visitBtn = new UIButton({
      id: 'base-ed-visit',
      className: 'hbtn' + (this._visitMode ? ' pw-btn-primary' : ''),
      text: t(this._visitMode ? 'edit.visit_stop' : 'edit.visit'),
      onClick: () => {
        if (this._visitMode) {
          system.stopVisit();
          this._stopVisitTicker();
          this._visitMode = false;
          this._render();
        } else {
          const result = system.startOwnVisit();
          if (result.ok) {
            this._visitMode = true;
            this._selectedStockId = null;
            this._selectedNpcPlacement = false;
            this._selectedDecorationUid = null;
            this._selectedNpcId = null;
            this._render();
          }
        }
      }
    });
    toolbar.addChild(visitBtn);

    return toolbar;
  }

  /**
   * @private
   * @param {Object} base
   * @returns {UIContainer}
   */
  _buildStockDrawer(base) {
    const stockBox = new UIContainer({ id: 'base-stock', className: 'base-stock' });
    const itemsDb = SecretBaseItemDB.getInstance();
    const stock = base.stock || {};

    // 1. Category tabs
    const tabButtons = [];
    for (const cat of STOCK_CATEGORIES) {
      let count = 0;
      let label = '';

      if (cat === '__pals') {
        count = base.npcs?.length || 0;
        label = t('edit.pals');
      } else {
        const catItems = itemsDb.getByCategory(cat);
        count = catItems.reduce((acc, it) => acc + (Number(stock[it.id]) || 0), 0);
        label = t(`cat.${cat}`);
      }

      const isSel = this._stockTab === cat;
      const tabBtn = new UIButton({
        className: `base-stock-tab ${isSel ? 'sel' : ''}`,
        text: label,
        onClick: () => {
          this._stockTab = cat;
          this._selectedStockId = null;
          this._selectedNpcPlacement = false;
          this._render();
        }
      });

      const countPill = new UIText({
        className: 'base-stock-tab-count',
        text: String(count)
      });
      tabBtn.addChild(countPill);
      tabButtons.push(tabBtn);
    }

    stockBox.addChild(new UIContainer({ className: 'base-stock-tabs', children: tabButtons }));

    // 2. Active category page
    const page = new UIContainer({ className: 'base-stock-page' });

    if (this._stockTab === '__pals') {
      const palBtn = new UIButton({
        className: `base-stock-item ${this._selectedNpcPlacement ? 'sel' : ''}`,
        disabled: false,
        onClick: () => {
          this._selectedNpcPlacement = !this._selectedNpcPlacement;
          this._selectedStockId = null;
          this._selectedDecorationUid = null;
          this._selectedNpcId = null;
          this._render();
        }
      });

      palBtn.addChild(new UIImage({
        className: 'base-stock-img',
        src: AssetPaths.trainerSprite(SecretBaseRules.DEFAULT_NPC_SPRITE),
        alt: t('npced.place_npc')
      }));
      palBtn.addChild(new UIText({
        className: 'base-stock-name',
        text: t('npced.place_npc')
      }));
      palBtn.addChild(new UIText({
        className: 'base-stock-count',
        text: '∞'
      }));
      page.addChild(palBtn);
    } else {
      const catItems = itemsDb.getByCategory(this._stockTab);
      const availableItems = catItems.filter((item) => (Number(stock[item.id]) || 0) > 0);

      if (availableItems.length === 0) {
        page.addChild(new UIText({ className: 'base-stock-empty', text: t('edit.stock_empty') }));
      } else {
        for (const item of availableItems) {
          const count = Number(stock[item.id]) || 0;
          const isSelected = this._selectedStockId === item.id;

          const itemBtn = new UIButton({
            className: `base-stock-item ${isSelected ? 'sel' : ''}`,
            onClick: () => {
              this._selectedStockId = this._selectedStockId === item.id ? null : item.id;
              this._selectedNpcPlacement = false;
              this._selectedDecorationUid = null;
              this._selectedNpcId = null;
              this._render();
            }
          });

          itemBtn.addChild(new UIImage({
            className: 'base-stock-img',
            src: AssetPaths.secretBaseDecoration(item.id),
            alt: t(item.nameKey)
          }));
          itemBtn.addChild(new UIText({
            className: 'base-stock-name',
            text: t(item.nameKey)
          }));
          itemBtn.addChild(new UIText({
            className: 'base-stock-count',
            text: `×${count}`
          }));

          page.addChild(itemBtn);
        }
      }
    }

    stockBox.addChild(page);
    return stockBox;
  }

  /**
   * @private
   * @param {Object} data
   * @returns {Object|null}
   */
  _getGhost(data) {
    if (!this._hoverCell) return null;
    const { x, y } = this._hoverCell;

    if (this._selectedStockId) {
      const item = SecretBaseItemDB.getInstance().getById(this._selectedStockId);
      if (!item) return null;
      const fp = SecretBaseItemDB.getInstance().getFootprint(item);
      const chk = SecretBasePlacementRules.canPlaceDecoration(data, this._selectedStockId, x, y);
      return {
        x: chk.x ?? x,
        y: chk.y ?? y,
        w: fp.width,
        d: fp.depth,
        ok: chk.ok,
        itemId: this._selectedStockId
      };
    }

    if (this._selectedDecorationUid !== null) {
      const dec = (data.decorations || []).find((entry) => String(entry.uid) === String(this._selectedDecorationUid));
      if (dec) {
        const item = SecretBaseItemDB.getInstance().getById(dec.itemId);
        if (item) {
          const fp = SecretBaseItemDB.getInstance().getFootprint(item);
          const chk = SecretBasePlacementRules.canPlaceDecoration(data, dec.itemId, x, y, { ignoreUid: dec.uid });
          return {
            x: chk.x ?? x,
            y: chk.y ?? y,
            w: fp.width,
            d: fp.depth,
            ok: chk.ok,
            itemId: dec.itemId
          };
        }
      }
    }

    if (this._selectedNpcPlacement || this._selectedNpcId !== null) {
      const chk = SecretBasePlacementRules.canPlaceNpc(data, { id: this._selectedNpcId || 'preview' }, x, y, {
        ignoreNpcId: this._selectedNpcId || null
      });
      return {
        x,
        y,
        w: 1,
        d: 1,
        ok: chk.ok,
        isNpc: true
      };
    }

    return null;
  }

  /**
   * @private
   * @param {number} x
   * @param {number} y
   */
  _onCanvasClick(x, y) {
    const system = SecretBaseSystem.getInstance();

    if (this._visitMode) {
      const result = system.clickVisit(x, y);
      if (result.type === 'move') {
        this._startVisitTicker();
      } else if (result.type === 'interact') {
        this._handleVisitInteraction(result.target);
      }
      this._updateVisitRoomView();
      return;
    }

    // Edit mode
    const base = system.getBase();
    if (!base) return;

    if (this._selectedStockId) {
      const itemId = this._selectedStockId;
      const result = system.placeDecoration(itemId, x, y);
      if (result.ok) {
        this._selectedStockId = null;
        NotificationSystem.getInstance().notifyTemporary(
          t('edit.placed', { name: t(`i.${itemId}`) }),
          { tone: NotificationTones.SUCCESS }
        );
      } else {
        NotificationSystem.getInstance().notifyTemporary(t(result.reason || 'err.occupied'), {
          tone: NotificationTones.WARNING
        });
      }
      this._render();
      return;
    }

    if (this._selectedNpcPlacement) {
      const team = system.captureCurrentTeam();
      const result = system.createNpc({ x, y, team });
      if (result.ok) {
        this._selectedNpcPlacement = false;
        this._selectedNpcId = result.id;
        NotificationSystem.getInstance().notifyTemporary(
          t('edit.npc_placed', { name: t('edit.npc_default_name') }),
          { tone: NotificationTones.SUCCESS }
        );
      } else {
        NotificationSystem.getInstance().notifyTemporary(t(result.reason || 'err.occupied'), {
          tone: NotificationTones.WARNING
        });
      }
      this._render();
      return;
    }

    // If a decoration was already selected:
    if (this._selectedDecorationUid !== null) {
      const occupants = SecretBasePlacementRules.getOccupants(base.serialize(), x, y);
      const clickedDec = [...occupants.decorations].reverse()[0];
      if (clickedDec && String(clickedDec.uid) !== String(this._selectedDecorationUid)) {
        this._selectedDecorationUid = clickedDec.uid;
        this._selectedNpcId = null;
        this._render();
        return;
      }
      if (occupants.npc) {
        this._selectedNpcId = occupants.npc.id;
        this._selectedDecorationUid = null;
        this._render();
        return;
      }
      if (!clickedDec) {
        const result = system.moveDecoration(this._selectedDecorationUid, x, y);
        if (result.ok) {
          NotificationSystem.getInstance().notifyTemporary(
            t('edit.placed', { name: t(`i.${result.itemId}`) }),
            { tone: NotificationTones.SUCCESS }
          );
        } else {
          NotificationSystem.getInstance().notifyTemporary(t(result.reason || 'err.occupied'), {
            tone: NotificationTones.WARNING
          });
        }
        this._render();
        return;
      }
    }

    // If an NPC was already selected:
    if (this._selectedNpcId !== null) {
      const occupants = SecretBasePlacementRules.getOccupants(base.serialize(), x, y);
      if (occupants.npc && occupants.npc.id !== this._selectedNpcId) {
        this._selectedNpcId = occupants.npc.id;
        this._selectedDecorationUid = null;
        this._render();
        return;
      }
      const clickedDec = [...occupants.decorations].reverse()[0];
      if (clickedDec) {
        this._selectedDecorationUid = clickedDec.uid;
        this._selectedNpcId = null;
        this._render();
        return;
      }
      if (!occupants.npc) {
        const result = system.updateNpc(this._selectedNpcId, { x, y });
        if (result.ok) {
          NotificationSystem.getInstance().notifyTemporary(
            t('edit.npc_placed', { name: t('edit.npc_default_name') }),
            { tone: NotificationTones.SUCCESS }
          );
        } else {
          NotificationSystem.getInstance().notifyTemporary(t(result.reason || 'err.occupied'), {
            tone: NotificationTones.WARNING
          });
        }
        this._render();
        return;
      }
    }

    // Nothing was selected yet: click selects occupant!
    const occupants = SecretBasePlacementRules.getOccupants(base.serialize(), x, y);
    if (occupants.npc) {
      this._selectedNpcId = occupants.npc.id;
      this._selectedDecorationUid = null;
    } else {
      const dec = [...occupants.decorations].reverse()[0];
      if (dec) {
        this._selectedDecorationUid = dec.uid;
        this._selectedNpcId = null;
      } else {
        this._selectedDecorationUid = null;
        this._selectedNpcId = null;
      }
    }
    this._render();
  }

  /**
   * @private
   * @param {number} x
   * @param {number} y
   */
  _onCanvasHover(x, y) {
    if (this._visitMode) return;
    this._hoverCell = { x, y };
    if (this._roomView) {
      const base = SecretBaseSystem.getInstance().getBase();
      if (base) {
        this._roomView.updateOverlay({
          ghost: this._getGhost(base.serialize()),
          hover: this._hoverCell
        });
      }
    }
  }

  /** @private */
  _onCanvasLeave() {
    this._hoverCell = null;
    if (this._roomView) {
      this._roomView.updateOverlay({ ghost: null, hover: null });
    }
  }

  /** @private */
  _handlePickup() {
    const system = SecretBaseSystem.getInstance();
    if (this._selectedDecorationUid !== null) {
      const result = system.pickupDecoration(this._selectedDecorationUid);
      if (result.ok) {
        this._selectedDecorationUid = null;
        this._render();
      }
    } else if (this._selectedNpcId) {
      const result = system.deleteNpc(this._selectedNpcId);
      if (result.ok) {
        this._selectedNpcId = null;
        this._render();
      }
    }
  }

  /** @private */
  _startVisitTicker() {
    if (this._visitTimer) return;
    this._visitTimer = setInterval(() => {
      const system = SecretBaseSystem.getInstance();
      const tick = system.tickVisit();
      if (tick.interacted) {
        this._handleVisitInteraction(tick.target);
      }
      this._updateVisitRoomView();
      if (tick.done) {
        this._stopVisitTicker();
      }
    }, 120);
  }

  /** @private */
  _stopVisitTicker() {
    if (this._visitTimer) {
      clearInterval(this._visitTimer);
      this._visitTimer = null;
    }
  }

  /** @private */
  _updateVisitRoomView() {
    if (!this._roomView) return;
    const snapshot = SecretBaseSystem.getInstance().getVisitSnapshot();
    if (snapshot) {
      this._roomView.updateOverlay({
        position: snapshot.position,
        path: snapshot.path
      });
    }
  }

  /** @private @param {Object} target */
  _handleVisitInteraction(target) {
    if (!target) return;
    const system = SecretBaseSystem.getInstance();

    if (target.kind === 'npc') {
      const npc = target.npc;
      NotificationSystem.getInstance().notifyTemporary(
        t('edit.battle_challenge', { name: npc.name || t('edit.npc_default_name') }),
        { channel: NotificationChannels.GAMEPLAY }
      );
      system.challengeNpc(npc.id);
    } else if (target.kind === 'pc') {
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_PC));
    }
  }

  /** @private */
  _exportBase() {
    const system = SecretBaseSystem.getInstance();
    const base = system.getBase();
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!base) return;

    const portable = SecretBaseExchangeRules.buildExport(base, {
      id: save?.id || null,
      name: save?.player?.trainerName || ''
    }, `base-${save?.id || 'local'}`);

    const text = portable && SecretBaseExchangeRules.serializeExport(portable);
    if (!text) return;
    FileDownload.saveText('secret-base.json', text, 'application/json');
    NotificationSystem.getInstance().notifyTemporary(t('export_done'), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /** @private @param {string} text */
  _importBase(text) {
    const result = SecretBaseSystem.getInstance().startImportedVisit(text);
    if (result.ok) {
      this._visitMode = true;
      this._render();
    }
  }

  /** @override */
  onDestroy() {
    this._stopVisitTicker();
    super.onDestroy();
  }
}
