/**
 * @file SaveMenuPage.js
 * @brief Save selection screen — the page the game boots into (C++: class SaveMenuPage : public BasePage).
 * Built exclusively from UI widgets; every label comes from the localization tables and every
 * visual rule from the design-system `.save-menu-*` classes (save-menu.css only adds rework extras).
 */

import { BasePage } from './BasePage.js';
import { PageIds } from './PageIds.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIButton } from '../ui/UIButton.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UILink } from '../ui/UILink.js';
import { UIFileButton } from '../ui/UIFileButton.js';
import { UIContextMenu } from '../ui/UIContextMenu.js';
import { SaveCard } from '../ui/SaveCard.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { PromptDialog } from '../ui/PromptDialog.js';
import { FileDownload } from '../ui/FileDownload.js';
import { StarterModal } from '../panels/StarterModal.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { Engine } from '../core/Engine.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { SaveThemes } from '../data/save/SaveThemes.js';
import { GameConfig } from '../config/GameConfig.js';
import { DEFAULT_UI_THEME } from '../config/UiThemes.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';

export class SaveMenuPage extends BasePage {
  constructor() {
    // The save menu always uses the dark palette, whatever the theme chosen in game.
    super('SaveMenuPage', {}, { forcedTheme: DEFAULT_UI_THEME });

    /** @private @type {ConfirmDialog|null} */
    this._confirmDialog = null;
    /** @private @type {PromptDialog|null} */
    this._renameDialog = null;
    /** @private @type {UIContainer|null} */
    this._slotsContainer = null;
    /** @private @type {UIContextMenu|null} */
    this._contextMenu = null;
    /** @private @type {UIButton|null} */
    this._prevBtn = null;
    /** @private @type {UIButton|null} */
    this._nextBtn = null;

    this.setId('save-menu-screen');
    this.addClass('save-menu-screen');
    this.addClass('is-open');

    this.onInit();
  }

  /** Builds (or rebuilds after a language switch) the whole screen. */
  onInit() {
    this.clearChildren();

    this._buildModals();

    // Animated forest decor (absolute layer behind the panel)
    const bgLayer = new UIContainer({ className: 'save-menu-bg-layer' });
    bgLayer.setAttribute('aria-hidden', 'true');
    this.addChild(bgLayer);

    const panel = new UIContainer({ tagName: 'section', className: 'save-menu-panel' });
    panel.setAttribute('aria-labelledby', 'save-menu-title');
    panel.addChild(this._buildTitleBlock());
    panel.addChild(this._buildCarousel());
    panel.addChild(this._buildActions());
    panel.addChild(this._buildCommunity());
    panel.addChild(this._buildLanguageBar());
    this.addChild(panel);

    this._contextMenu = new UIContextMenu({
      id: 'save-card-context-menu',
      className: 'save-card-context-menu',
      itemClassName: 'save-context-item'
    });
    this.addChild(this._contextMenu);

    this.refreshSaveSlots();
  }

  onEnter() {
    super.onEnter();
    this.refreshSaveSlots();
  }

  // --- Builders -------------------------------------------------------------

  /** @private */
  _buildModals() {
    // Opened by request (ModalIds.STARTER) from the "New game" button
    this.addChild(new StarterModal({
      onStarterChosen: (trainerName, starterSpecies) => {
        this._handleCreateSave(trainerName, starterSpecies);
      }
    }));

    this._confirmDialog = new ConfirmDialog({ id: 'save-delete-modal' });
    this.addChild(this._confirmDialog);

    this._renameDialog = new PromptDialog({ id: 'save-rename-modal' });
    this.addChild(this._renameDialog);
  }

  /** @private @returns {UIContainer} */
  _buildTitleBlock() {
    const block = new UIContainer({ className: 'save-menu-title-block' });
    block.addChild(new UIText({ tagName: 'h1', id: 'save-menu-title', text: t('save_menu_title') }));
    block.addChild(new UIText({ tagName: 'p', id: 'save-menu-subtitle', text: t('save_menu_subtitle') }));
    return block;
  }

  /** @private @returns {UIContainer} */
  _buildCarousel() {
    const shell = new UIContainer({ className: 'save-menu-list-shell' });

    this._prevBtn = new UIButton({
      id: 'save-menu-prev',
      className: 'hbtn save-menu-scroll-btn',
      icon: 'chevronLeft',
      onClick: () => this._scrollCarousel(-1)
    });
    this._prevBtn.setAriaLabel(t('save_menu_prev_aria'));
    shell.addChild(this._prevBtn);

    this._slotsContainer = new UIContainer({ id: 'save-menu-list', className: 'save-menu-list' });
    shell.addChild(this._slotsContainer);

    this._nextBtn = new UIButton({
      id: 'save-menu-next',
      className: 'hbtn save-menu-scroll-btn',
      icon: 'chevronRight',
      onClick: () => this._scrollCarousel(1)
    });
    this._nextBtn.setAriaLabel(t('save_menu_next_aria'));
    shell.addChild(this._nextBtn);

    return shell;
  }

  /** @private @returns {UIContainer} */
  _buildActions() {
    const actions = new UIContainer({ className: 'save-menu-actions' });

    actions.addChild(new UIButton({
      id: 'save-menu-new-btn',
      className: 'hbtn save-menu-action-primary',
      text: t('save_menu_new'),
      onClick: () => this._onNewGameClick()
    }));

    actions.addChild(new UIFileButton({
      id: 'save-menu-import-label',
      inputId: 'save-menu-import-file',
      className: 'hbtn save-menu-action-secondary',
      text: t('save_menu_import'),
      accept: GameConfig.SAVE_IMPORT_ACCEPT,
      onFileRead: (content) => this._importSave(content),
      onReadError: () => this._notifyImportError()
    }));

    return actions;
  }

  /** @private @returns {UIContainer} */
  _buildCommunity() {
    const community = new UIContainer({ className: 'save-menu-community' });
    // No `hbtn` here: the Discord button keeps its official brand colour (.pw-discord-btn).
    community.addChild(new UILink({
      href: GameConfig.DISCORD_URL,
      text: t('discord_join_btn'),
      icon: 'discord',
      className: 'pw-discord-btn save-menu-discord-btn'
    }));
    return community;
  }

  /** @private @returns {UIContainer} */
  _buildLanguageBar() {
    const currentLang = LocalizationManager.getInstance().currentLang;
    const bar = new UIContainer({ className: 'save-menu-lang-actions' });
    bar.setAttribute('role', 'group');
    bar.setAriaLabel(t('lang_switch_aria'));

    for (const lang of GameConfig.SUPPORTED_LANGUAGES) {
      const btn = new UIButton({
        className: 'hbtn lang-btn',
        text: t(`lang_label_${lang}`),
        onClick: () => this._switchLanguage(lang)
      });
      btn.setActive(lang === currentLang);
      bar.addChild(btn);
    }
    return bar;
  }

  // --- Save list --------------------------------------------------------------

  /** Refreshes the carousel from the SaveSystem library. */
  refreshSaveSlots() {
    if (!this._slotsContainer) return;
    this._slotsContainer.clearChildren();

    // listExistingSaves() returns wrappers { id, slotId, exists, data } — cards need `data`.
    const saves = SaveSystem.getInstance().listExistingSaves().map((entry) => entry.data);

    if (saves.length === 0) {
      this._slotsContainer.addChild(this._buildEmptyState());
    } else {
      for (const save of saves) {
        this._slotsContainer.addChild(new SaveCard({
          save,
          mode: 'menu',
          onClick: (s) => this._enterGameWithSave(s),
          onContextMenu: (s, e) => this._openContextMenu(s, e)
        }));
      }
    }
    this._updateScrollButtons(saves.length);
  }

  /** @private @returns {UIContainer} */
  _buildEmptyState() {
    const empty = new UIContainer({ className: 'save-menu-empty' });
    const iconRing = new UIContainer({ className: 'save-menu-empty-icon' });
    iconRing.addChild(new UIIcon({ name: 'emptyDiamond' }));
    empty.addChild(iconRing);
    empty.addChild(new UIText({ tagName: 'h2', text: t('save_menu_empty_title') }));
    empty.addChild(new UIText({ tagName: 'p', text: t('save_menu_empty_desc') }));
    return empty;
  }

  /** @private @param {number} count */
  _updateScrollButtons(count) {
    const hidden = count < GameConfig.SAVE_CAROUSEL_ARROWS_THRESHOLD;
    // `.is-invisible` keeps the grid track (visibility:hidden) — never `.is-hidden` here.
    this._prevBtn.toggleClass('is-invisible', hidden);
    this._nextBtn.toggleClass('is-invisible', hidden);
  }

  /** @private @param {number} direction */
  _scrollCarousel(direction) {
    const dom = this._slotsContainer.getDomElement();
    dom.scrollBy({ left: GameConfig.SAVE_CAROUSEL_SCROLL_STEP * direction, behavior: 'smooth' });
  }

  // --- Flows ------------------------------------------------------------------

  /** @private */
  _onNewGameClick() {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.STARTER));
  }

  /**
   * @private
   * @param {string} trainerName
   * @param {string} starterSpecies
   * @returns {Object}
   */
  _handleCreateSave(trainerName, starterSpecies) {
    const newSave = SaveSystem.getInstance().createNewSave(trainerName, starterSpecies, SaveThemes.random());
    this._notify(t('notif_new_save_created', { name: newSave.player.trainerName }), NotificationTones.SUCCESS);
    this._enterGameWithSave(newSave);
    return newSave;
  }

  /** @private @param {Object} save */
  _enterGameWithSave(save) {
    if (!save || !save.id) return;
    SaveSystem.getInstance().loadSlot(save.id);
    Engine.getInstance().getPageManager().openPage(PageIds.GAME);
  }

  /** @private @param {string} content */
  _importSave(content) {
    let save = null;
    try {
      save = SaveSystem.getInstance().importFromJson(content);
    } catch (err) {
      console.error(t('debug_save_import_failed'), err);
    }
    if (!save) {
      this._notifyImportError();
      return;
    }
    this._notify(t('save_import_success', { name: save.player.trainerName }), NotificationTones.SUCCESS);
    this.refreshSaveSlots();
  }

  /** @private */
  _notifyImportError() {
    this._notify(t('save_import_invalid'), NotificationTones.DANGER);
  }

  /** @private @param {string} lang */
  _switchLanguage(lang) {
    LocalizationManager.getInstance().setLanguage(lang);
    this.onInit();
  }

  // --- Context menu & dialogs ------------------------------------------------

  /** @private */
  _openContextMenu(save, event) {
    this._contextMenu.open(event.clientX, event.clientY, [
      { text: t('save_context_rename'), icon: 'rename', onClick: () => this._promptRename(save) },
      { text: t('save_context_duplicate'), icon: 'duplicate', onClick: () => this._duplicateSave(save) },
      { text: t('save_context_export'), icon: 'download', className: 'dl-item', onClick: () => this._exportSave(save) },
      { text: t('save_context_delete'), icon: 'trash', className: 'danger', onClick: () => this._promptDelete(save) }
    ]);
  }

  /** @private */
  _promptRename(save) {
    this._renameDialog.ask({
      title: t('save_rename_title'),
      label: t('save_rename_prompt'),
      value: save.player?.trainerName || '',
      maxLength: GameConfig.TRAINER_NAME_MAX_LENGTH,
      onSubmit: (name) => {
        SaveSystem.getInstance().renameSlot(save.id, name);
        this.refreshSaveSlots();
        this._notify(t('save_renamed_success', { name }), NotificationTones.SUCCESS);
      }
    });
  }

  /** @private */
  _duplicateSave(save) {
    if (!SaveSystem.getInstance().duplicateSlot(save.id)) return;
    this.refreshSaveSlots();
    this._notify(t('save_duplicated_success'), NotificationTones.SUCCESS);
  }

  /** @private */
  _exportSave(save) {
    const json = SaveSystem.getInstance().exportSlotAsJson(save.id);
    if (!json) return;
    FileDownload.saveText(GameConfig.SAVE_EXPORT_FILENAME.replace('{id}', save.id), json);
    this._notify(t('save_exported_success'), NotificationTones.ACCENT);
  }

  /** @private */
  _promptDelete(save) {
    this._confirmDialog.ask({
      title: t('save_delete_title'),
      message: t('save_delete_prompt', { id: save.id, name: save.player?.trainerName || '' }),
      confirmLabel: t('btn_delete'),
      danger: true,
      onConfirm: () => {
        SaveSystem.getInstance().deleteSlot(save.id);
        this.refreshSaveSlots();
        this._notify(t('save_deleted_success'), NotificationTones.DANGER);
      }
    });
  }

  /**
   * @private
   * @param {string} message - Already localized
   * @param {string} tone - NotificationTones value
   */
  _notify(message, tone) {
    NotificationSystem.getInstance().notify(message, { channel: NotificationChannels.SYSTEM, tone });
  }
}
