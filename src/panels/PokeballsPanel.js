/**
 * @file PokeballsPanel.js
 * @brief Poké Ball rules window: which ball is thrown for each capture case (C++: class PokeballsPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIImage } from '../ui/UIImage.js';
import { UIButton } from '../ui/UIButton.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { t } from '../localization/LocalizationManager.js';

/** Default capture rules until the inventory system is ported. */
const DEFAULT_BALL_RULES = Object.freeze([
  { id: 'not_caught', labelKey: 'ball_filter_new', ball: 'Pokeball', ballNameKey: 'ball_pokeball', quantity: 25, enabled: true },
  { id: 'caught', labelKey: 'ball_filter_already_caught', ball: 'Pokeball', ballNameKey: 'ball_pokeball', quantity: 25, enabled: true },
  { id: 'shiny', labelKey: 'ball_filter_shiny', ball: 'Ultraball', ballNameKey: 'ball_ultraball', quantity: 3, enabled: true }
]);

export class PokeballsPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.POKEBALLS,
      column,
      title: t('panel_pokeballs_title'),
      icon: 'pokeball',
      bodyId: 'pokeballs-window-body',
      bodyClassName: 'pw-static-022',
      name: 'PokeballsPanel'
    });

    const settings = new UIButton({
      className: 'pw-win-tool-btn',
      icon: 'settings',
      onClick: () => NotificationSystem.getInstance().notifyTemporary(
        t('feature_coming_soon', { name: t('ball_settings') }),
        { channel: NotificationChannels.GAMEPLAY }
      )
    });
    settings.setTooltip(t('ball_settings'));
    settings.setAriaLabel(t('ball_settings'));
    this.addHeaderAction(settings);

    this.addChild(new UIContainer({
      className: 'pw-ball-head',
      children: [
        new UIText({ className: 'pw-ball-head-name', text: t('ball_col_name') }),
        new UIText({ className: 'pw-ball-col', text: t('ball_col_ball') }),
        new UIText({ className: 'pw-ball-col', text: t('ball_col_qty') })
      ]
    }));

    for (const rule of DEFAULT_BALL_RULES) {
      const ballCell = new UIContainer({
        tagName: 'span',
        className: 'pw-ball-row-cell pw-ball-row-ball',
        children: [new UIImage({ src: AssetPaths.pokeball(rule.ball), alt: t(rule.ballNameKey), className: 'pw-ball-icon' })]
      });
      ballCell.setTooltip(t('ball_cycle_hint'));
      this.addChild(new UIContainer({
        className: `pw-ball-row ${rule.enabled ? '' : 'off'}`.trim(),
        children: [
          new UIText({ className: 'pw-ball-row-cell pw-ball-row-name', text: t(rule.labelKey) }),
          ballCell,
          new UIText({ className: 'pw-ball-row-cell pw-ball-row-qty', text: String(rule.quantity) })
        ]
      }));
    }
  }
}
