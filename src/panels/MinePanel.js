/**
 * @file MinePanel.js
 * @brief Underground mine window: energy meter + diggable tile grid (C++: class MinePanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

const GRID_TILE_COUNT = 18; // 6 x 3 preview grid
const MAX_ENERGY = 50;

export class MinePanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.MINE,
      column,
      title: t('mine_window_title'),
      icon: 'pickaxe',
      bodyId: 'mine-window-body',
      bodyClassName: 'pw-static-025 pw-mine-body',
      name: 'MinePanel'
    });

    this.addChild(new UIContainer({
      className: 'pw-mine-energy-row',
      children: [
        new UIContainer({ tagName: 'span', children: [new UIIcon({ name: 'zap', size: 'sm' }), new UIText({ text: t('mine_energy') })] }),
        new UIText({ className: 'pw-mine-energy-value', text: t('value_over_max', { value: MAX_ENERGY, max: MAX_ENERGY }) })
      ]
    }));

    const grid = new UIContainer({ className: 'pw-mine-grid' });
    for (let i = 0; i < GRID_TILE_COUNT; i++) {
      const tile = new UIContainer({ className: 'pw-mine-tile' });
      tile.addDomListener('click', () => {
        tile.addClass('is-dug');
        NotificationSystem.getInstance().notifyTemporary(t('mine_dig_feedback'), { channel: NotificationChannels.GAMEPLAY });
      });
      grid.addChild(tile);
    }
    this.addChild(grid);
  }
}
