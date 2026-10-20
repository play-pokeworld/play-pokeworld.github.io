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
  }

  /** @private */
  _renderShortcuts() {
    this.clearChildren();
    for (const shortcut of SHORTCUTS) {
      if (shortcut.requiresChampionTitle && !this._accessSnapshot.championTitle) continue;
      const button = new UIButton({
        className: 'shortcut-action-btn',
        variant: shortcut.variant,
        icon: shortcut.icon,
        text: t(shortcut.labelKey),
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
