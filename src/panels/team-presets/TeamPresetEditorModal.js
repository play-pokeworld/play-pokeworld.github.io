/** @file TeamPresetEditorModal.js @brief Reference-style full-card editor with a fixed footer and canonical PC selection. */
import { StaticModalPanel } from '../../ui/StaticModalPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UISortableList } from '../../ui/UISortableList.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { TeamPresetMemberCard } from './TeamPresetMemberCard.js';
import { TeamPresetEditSystem } from '../../systems/TeamPresetEditSystem.js';
import { TeamPresetRules } from '../../config/TeamPresetRules.js';
import { ModalIds } from '../../config/ModalIds.js';
import { TeamPresetDraftChangedEvent } from '../../core/events/TeamPresetDraftChangedEvent.js';
import { TeamPresetsChangedEvent } from '../../core/events/TeamPresetsChangedEvent.js';
import { TeamChangedEvent } from '../../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../../core/events/BoxChangedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { EventBus } from '../../core/EventBus.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels } from '../../config/NotificationConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class TeamPresetEditorModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.TEAM_PRESET_EDITOR,
      title: '',
      size: 'custom',
      hasFooter: true,
      className: 'pw-preset-editor-window',
      bodyClassName: 'pw-preset-editor-body',
      name: 'TeamPresetEditorModal',
    });
    this.setIcon('team');
    this._returnToManager = false;
    this._cards = new Map();
    this._list = new UISortableList({
      className: 'pw-team-member-list',
      rowDrag: true,
      onReorder: (a, b) => TeamPresetEditSystem.getInstance().swap(a, b),
    });
    this._list.setAttribute('role', 'list');
    this._addSlotCount = new UIText({
      tagName: 'div',
      className: 'pw-text-sm pw-light1',
    });
    this._add = new UIContainer({
      className: 'pw-drop-zone preset-slot-empty',
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
    this._add.setAttribute('role', 'button');
    this._add.setAttribute('tabindex', '0');
    this._add.setAriaLabel(t('add_pokemon'));
    this._add.addDomListener('click', () => this._pickNext());
    this._add.addDomListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      this._pickNext();
    });
    this.addChildren([
      new UIText({
        tagName: 'small',
        className: 'atoll-prep-hint',
        text: t('preset_editor_hint'),
      }),
      new UIContainer({
        className: 'team-view',
        children: [this._list, this._add],
      }),
    ]);
    this._apply = new UIButton({
      className: 'hbtn',
      text: t('preset_apply_btn'),
      onClick: () => this._applyDraft(),
    });
    this._save = new UIButton({
      className: 'hbtn',
      text: t('preset_save_editor_btn'),
      onClick: () => {
        if (TeamPresetEditSystem.getInstance().save())
          this._notify('preset_saved');
      },
    });
    this.addFooterChild(
      new UIContainer({
        className: 'pw-preset-editor-actions',
        children: [
          this._apply,
          new UIButton({
            className: 'hbtn',
            icon: 'save',
            text: t('preset_save_current_label'),
            onClick: () => TeamPresetEditSystem.getInstance().useCurrent(),
          }),
          this._save,
        ],
      }),
    );
    for (const type of [
      TeamPresetDraftChangedEvent,
      TeamPresetsChangedEvent,
      TeamChangedEvent,
      BoxChangedEvent,
    ])
      this.listen(type, () => {
        if (!this.isOpen()) return;
        if (!TeamPresetEditSystem.getInstance().getSnapshot()) {
          this._returnToManager = false;
          this.close();
        } else this._refresh();
      });
    for (const type of [SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent])
      this.listen(type, () => {
        this._returnToManager = false;
        this.close();
      });
  }
  /** @override @param {Object} params */
  open(params = {}) {
    if (!TeamPresetEditSystem.getInstance().begin(params.presetId)) return;
    this._returnToManager = params.returnToManager === true;
    super.open(params);
    this._refresh();
  }
  /** @private */
  _refresh() {
    const state = TeamPresetEditSystem.getInstance().getSnapshot();
    if (!state) return;
    const index = TeamPresetRules.PRESET_IDS.indexOf(state.id);
    this._presetName =
      state.name ||
      t(TeamPresetRules.DEFAULT_NAME_KEYS[state.id] || 'preset_default_name', {
        n: index + 1,
      });
    this.setTitle(this._presetName);
    this.setSubtitle(
      t('preset_editor_heading', {
        count: state.members.length,
        max: TeamPresetRules.MAX_MEMBERS,
      }),
    );
    const entries = [];
    for (const entry of state.entries) {
      let card = this._cards.get(entry.uid);
      if (!card) {
        card = new TeamPresetMemberCard();
        this._cards.set(entry.uid, card);
      }
      card.setEntry(entry);
      entries.push({ key: entry.uid, row: card, handle: card.getDragHandle() });
    }
    this._addSlotCount.setText(t('team_count', { count: state.members.length }));
    this._add.setVisible(state.members.length < TeamPresetRules.MAX_MEMBERS);
    this._list.setItems(entries);
    for (const [uid] of this._cards)
      if (!state.members.includes(uid)) this._cards.delete(uid);
    this._apply.setEnabled(state.members.length > 0);
    this._save.setEnabled(state.dirty);
  }
  /** @private */
  _pickNext() {
    const state = TeamPresetEditSystem.getInstance().getSnapshot();
    if (state)
      TeamPresetEditSystem.getInstance().requestPokemon(state.members.length);
  }
  /** @private */
  _applyDraft() {
    const result = TeamPresetEditSystem.getInstance().apply();
    if (result.ok) this._notify('preset_loaded');
    else
      this._notify(
        result.reason === 'battle'
          ? 'cannot_change_team_battle'
          : result.reason === 'not-found'
            ? 'preset_pokemon_not_found'
            : 'preset_empty',
      );
  }
  /** @private @param {string} key */
  _notify(key) {
    NotificationSystem.getInstance().notifyTemporary(
      t(key, {
        name: this._presetName || '',
        count:
          TeamPresetEditSystem.getInstance().getSnapshot()?.members.length || 0,
      }),
      { channel: NotificationChannels.GAMEPLAY },
    );
  }
  /** @override */
  onExit() {
    super.onExit();
    TeamPresetEditSystem.getInstance().close();
    const back = this._returnToManager;
    this._returnToManager = false;
    if (back)
      EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.TEAM_PRESETS),
      );
  }
  /** @override */
  onDestroy() {
    this._returnToManager = false;
    this.close();
    super.onDestroy();
  }
}
