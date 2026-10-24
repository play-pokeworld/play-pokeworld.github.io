/** @file TeamPresetsPanel.js @brief Original full-screen twenty-slot preset manager, composed from stable shared widgets. */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIKeyedList } from '../../ui/UIKeyedList.js';
import { UIText } from '../../ui/UIText.js';
import { TeamPresetListCard } from '../team-presets/TeamPresetListCard.js';
import { TeamPresetSystem } from '../../systems/TeamPresetSystem.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { TeamPresetsChangedEvent } from '../../core/events/TeamPresetsChangedEvent.js';
import { TeamChangedEvent } from '../../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../../core/events/BoxChangedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels } from '../../config/NotificationConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class TeamPresetsPanel extends UIFullscreenPanel {
  constructor() {
    super({
      id: ModalIds.TEAM_PRESETS,
      title: t('panel_presets_title'),
      name: 'TeamPresetsPanel',
    });
    this.addClass('pw-team-presets-manager');
    this._rows = new UIKeyedList({
      key: (slot) => slot.id,
      className: 'preset-list pw-preset-grid',
      create: (slot) =>
        new TeamPresetListCard(slot, {
          rename: (id, name) => TeamPresetSystem.getInstance().rename(id, name),
          save: (id) => TeamPresetSystem.getInstance().saveCurrentToPreset(id),
          load: (id) => this._load(id),
          edit: (id) =>
            EventBus.getInstance().dispatch(
              new ModalOpenRequestedEvent(ModalIds.TEAM_PRESET_EDITOR, {
                presetId: id,
                returnToManager: true,
              }),
            ),
        }),
      update: (row, slot) =>
        row.setModel(slot, TeamPresetSystem.getInstance().getData()?.activeId),
    });
    this.setContent([
      new UIText({
        tagName: 'small',
        className: 'preset-manager-hint',
        text: t('presets_hint'),
      }),
      this._rows,
    ]);
    for (const type of [
      TeamPresetsChangedEvent,
      TeamChangedEvent,
      BoxChangedEvent,
    ])
      this.listen(type, () => {
        if (this.isOpen()) this._refresh();
      });
    for (const type of [SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent])
      this.listen(type, () => this.close());
  }
  /** @override */
  onOpen() {
    this._refresh();
  }
  /** @private */
  _refresh() {
    this._rows.setEntries(TeamPresetSystem.getInstance().getAll());
  }
  /** @private @param {string} id */
  _load(id) {
    const result = TeamPresetSystem.getInstance().load(id);
    NotificationSystem.getInstance().notifyTemporary(
      t(
        result.ok
          ? 'preset_loaded'
          : result.reason === 'battle'
            ? 'cannot_change_team_battle'
            : result.reason === 'not-found'
              ? 'preset_pokemon_not_found'
              : 'preset_empty',
        {
          name: TeamPresetSystem.getInstance().getPreset(id)?.name || '',
          count: result.count || 0,
        },
      ),
      { channel: NotificationChannels.GAMEPLAY },
    );
  }
}
