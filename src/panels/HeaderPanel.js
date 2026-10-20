/**
 * @file HeaderPanel.js
 * @brief Top bar of the game screen, matching the original #header structure.
 * Layout: brand, inline "Badges : current/total" counter, settings icon.
 */

import { UIElement } from '../ui/UIElement.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIImage } from '../ui/UIImage.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { FeatureAccessSystem } from '../systems/FeatureAccessSystem.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';

export class HeaderPanel extends UIElement {
  constructor() {
    super({ id: 'header', name: 'HeaderPanel', tag: 'Panel' });
    this.addClass('pw-header-panel');

    const brand = new UIContainer({ tagName: 'h1', className: 'pw-header-brand' });
    const brandMark = new UIContainer({ tagName: 'span', className: 'brand-mark pw-header-brand-mark' });
    brandMark.addChild(new UIImage({ src: AssetPaths.appIcon(), alt: t('app_name') }));
    brand.addChild(brandMark);
    brand.addChild(new UIText({ text: t('app_name') }));
    this.addChild(brand);

    const info = new UIContainer({ className: 'hinfo pw-static-002 pw-header-badges' });
    const badgeLine = new UIContainer({ tagName: 'span', className: 'pw-header-badges-line' });
    badgeLine.addChildren([
      new UIText({ tagName: 'span', text: t('badges_lbl') }),
      new UIText({ tagName: 'span', text: '\u00a0: ' }),
      this._badgesCount = new UIText({ id: 'h-badges', tagName: 'span' }),
      new UIText({ tagName: 'span', text: '/' }),
      this._badgesTotal = new UIText({ id: 'h-badges-total', tagName: 'span' })
    ]);
    info.addChild(badgeLine);

    // Kept hidden, as in the original header, for legacy consumers of #h-money.
    const legacyMoney = new UIText({ id: 'h-money', tagName: 'span', text: '0' });
    legacyMoney.setAttribute('hidden', '');
    legacyMoney.setAttribute('aria-hidden', 'true');
    info.addChild(legacyMoney);
    this.addChild(info);

    const settingsButton = new UIButton({
      id: 'settings-btn',
      variant: 'hbtn',
      className: 'icon-btn pw-header-settings',
      icon: 'settings',
      onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS))
    });
    settingsButton.setTooltip(t('settings_title'));
    settingsButton.setAriaLabel(t('settings_title'));
    this.addChild(settingsButton);

    const player = SaveSystem.getInstance().getCurrentSave()?.player;
    this._renderBadges(player?.getBadgeCount() ?? 0, this._getBadgeDisplayTotal());
    this.listen(BadgesChangedEvent, (event) => this._renderBadges(event.currentBadges, this._getBadgeDisplayTotal()));
    this.listen(ContentAccessChangedEvent, () => {
      const currentPlayer = SaveSystem.getInstance().getCurrentSave()?.player;
      this._renderBadges(currentPlayer?.getBadgeCount() ?? 0, this._getBadgeDisplayTotal());
    });
  }

  /** Number of badges shown in the original game's currently accessible regions. @private */
  _getBadgeDisplayTotal() {
    const regionCount = FeatureAccessSystem.getInstance().getSnapshot().regions.length || 1;
    return PlayerDefaults.TOTAL_BADGES * regionCount;
  }

  /**
   * Updates the separate count nodes to preserve the original visible wording and IDs.
   * @private
   * @param {number} count
   * @param {number} total
   */
  _renderBadges(count, total) {
    this._badgesCount.setText(String(Math.max(0, Number(count) || 0)));
    this._badgesTotal.setText(String(Math.max(0, Number(total) || 0)));
  }
}
