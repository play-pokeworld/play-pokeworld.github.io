/**
 * @file HeaderPanel.js
 * @brief Top bar of the game screen, the original #header (C++: class HeaderPanel : public UIElement).
 * Layout: brand (app icon + name), badge counter, settings button.
 */

import { UIElement } from '../ui/UIElement.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIImage } from '../ui/UIImage.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';

export class HeaderPanel extends UIElement {
  constructor() {
    super({ id: 'header', name: 'HeaderPanel', tag: 'Panel' });

    const brand = new UIContainer({ tagName: 'h1' });
    const brandMark = new UIContainer({ tagName: 'span', className: 'brand-mark' });
    brandMark.addChild(new UIImage({ src: AssetPaths.appIcon(), alt: t('app_name') }));
    brand.addChild(brandMark);
    brand.addChild(new UIText({ text: t('app_name') }));
    this.addChild(brand);

    const info = new UIContainer({ className: 'hinfo pw-static-002' });
    this._badgesText = new UIText({ id: 'h-badges' });
    info.addChild(this._badgesText);
    this.addChild(info);

    const settingsButton = new UIButton({
      id: 'settings-btn',
      variant: 'hbtn',
      className: 'icon-btn',
      icon: 'settings',
      onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS))
    });
    settingsButton.setTooltip(t('settings_title'));
    settingsButton.setAriaLabel(t('settings_title'));
    this.addChild(settingsButton);

    const player = SaveSystem.getInstance().getCurrentSave()?.player;
    this._renderBadges(player?.getBadgeCount() ?? 0, PlayerDefaults.TOTAL_BADGES);
    this.listen(BadgesChangedEvent, (event) => this._renderBadges(event.currentBadges, event.totalBadges));
  }

  /**
   * @private
   * @param {number} count
   * @param {number} total
   */
  _renderBadges(count, total) {
    this._badgesText.setRichText(t('header_badges'), { count, total });
  }
}
