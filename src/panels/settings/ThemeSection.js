/**
 * @file ThemeSection.js
 * @brief Settings → colour theme swatches (C++: class ThemeSection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { PreferencesSystem } from '../../systems/PreferencesSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { UI_THEMES, UiThemes } from '../../config/UiThemes.js';
import { t } from '../../localization/LocalizationManager.js';

export class ThemeSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'theme_title', name: 'ThemeSection' });
  }

  /** @override */
  build() {
    const current = PreferencesSystem.getInstance().getTheme();
    const grid = new UIContainer({ className: 'pw-settings-grid' });
    for (const themeId of UI_THEMES) {
      const swatch = new UIButton({
        className: `theme-swatch theme-swatch--${themeId}`,
        text: t(UiThemes.labelKey(themeId)),
        onClick: () => {
          PreferencesSystem.getInstance().setTheme(themeId);
          NotificationSystem.getInstance().notifyTemporary(
            t('notif_theme_applied', { theme: t(UiThemes.labelKey(themeId)) }),
            { channel: NotificationChannels.SYSTEM, tone: NotificationTones.ACCENT }
          );
          this.refresh();
        }
      });
      swatch.setActive(themeId === current);
      grid.addChild(swatch);
    }
    this.addChild(grid);
  }
}
