/**
 * @file SecretBasePanel.js
 * @brief Secret base window: room preview + visit / decorate actions (C++: class SecretBasePanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIButton } from '../ui/UIButton.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

export class SecretBasePanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
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

    const comingSoon = (labelKey) => () => NotificationSystem.getInstance().notifyTemporary(
      t('feature_coming_soon', { name: t(labelKey) }),
      { channel: NotificationChannels.GAMEPLAY }
    );

    this.addChildren([
      new UIContainer({
        className: 'pw-base-preview',
        children: [new UIContainer({ tagName: 'span', children: [new UIIcon({ name: 'tent', size: 'sm' }), new UIText({ text: t('base_room_preview') })] })]
      }),
      new UIContainer({
        className: 'pw-base-actions',
        children: [
          new UIButton({ variant: 'hbtn', icon: 'door', text: t('btn_visit'), onClick: comingSoon('btn_visit') }),
          new UIButton({ variant: 'hbtn', icon: 'sofa', text: t('secret_base_decor_btn'), onClick: comingSoon('secret_base_decor_btn') })
        ]
      })
    ]);
  }
}
