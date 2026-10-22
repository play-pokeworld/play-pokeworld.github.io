/**
 * @file ShortcutsPanel.js
 * @brief Shortcut buttons to the big game screens (C++: class ShortcutsPanel : public DraggablePanel).
 * The buttons come from config/Shortcuts.js; a shortcut opens its modal by request, or announces
 * "coming soon" while that screen is not implemented.
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIButton } from '../ui/UIButton.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { SHORTCUTS } from '../config/Shortcuts.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { FeatureAccessSystem } from '../systems/FeatureAccessSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class ShortcutsPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.SHORTCUTS,
      column,
      title: t('shortcuts_tab'),
      icon: 'link',
      bodyId: 'shortcuts-window-body',
      bodyClassName: 'pw-static-047',
      name: 'ShortcutsPanel'
    });

    this._accessSnapshot = FeatureAccessSystem.getInstance().getSnapshot();
    this._renderShortcuts();
    this.listen(ContentAccessChangedEvent, (event) => {
      this._accessSnapshot = event;
      this._renderShortcuts();
    });
    for (const eventClass of [BadgesChangedEvent, LocationChangedEvent, SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent]) {
      this.listen(eventClass, () => this._renderShortcuts());
    }
  }

  /** @private */
  _hasMarketAccess() {
    const save = SaveSystem.getInstance().getCurrentSave();
    return !!save && (save.player.badges.length > 0 || save.player.region === 'johto');
  }

  /** @private */
  _renderShortcuts() {
    this.clearChildren();
    for (const shortcut of SHORTCUTS) {
      if (shortcut.requiresChampionTitle && !this._accessSnapshot.championTitle) continue;
      if (shortcut.requiresMarketGate && !this._hasMarketAccess()) continue;
      const button = new UIButton({
        className: 'shortcut-action-btn',
        variant: shortcut.variant,
        icon: shortcut.icon,
        text: t(shortcut.labelKey),
        align: 'left',
        onClick: () => {
          if (shortcut.modalId) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(shortcut.modalId));
          else NotificationSystem.getInstance().notifyTemporary(
            t('feature_coming_soon', { name: t(shortcut.labelKey) }),
            { channel: NotificationChannels.GAMEPLAY }
          );
        }
      });
      button.setData('panel', shortcut.id);
      this.addChild(button);
    }
  }
}
