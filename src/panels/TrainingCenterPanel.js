/**
 * @file TrainingCenterPanel.js
 * @brief Training room window (C++: class TrainingCenterPanel : public DraggablePanel).
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

export class TrainingCenterPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.TRAINING,
      column,
      title: t('training_center_title'),
      icon: 'dumbbell',
      bodyId: 'training-window-body',
      bodyClassName: 'pw-static-022 pw-training-body',
      name: 'TrainingCenterPanel'
    });

    this.addChild(new UIContainer({
      className: 'pw-training-card',
      children: [
        new UIContainer({ className: 'pw-training-title', children: [new UIIcon({ name: 'dumbbell', size: 'sm' }), new UIText({ text: t('training_dummy_title') })] }),
        new UIText({ tagName: 'div', className: 'pw-training-desc', text: t('training_dummy_desc') }),
        new UIButton({
          variant: 'hbtn',
          fullWidth: true,
          text: t('training_start_btn'),
          onClick: () => NotificationSystem.getInstance().notifyTemporary(
            t('feature_coming_soon', { name: t('training_center_title') }),
            { channel: NotificationChannels.GAMEPLAY }
          )
        })
      ]
    }));
  }
}
