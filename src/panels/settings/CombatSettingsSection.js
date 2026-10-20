/**
 * @file CombatSettingsSection.js
 * @brief Settings → capture and visual-feedback animation preferences.
 */

import { SettingsSection } from './SettingsSection.js';
import { UIButton } from '../../ui/UIButton.js';
import { AnimationPreferences } from '../../config/AnimationPreferences.js';
import { PreferencesSystem } from '../../systems/PreferencesSystem.js';
import { t } from '../../localization/LocalizationManager.js';

const OPTIONS = Object.freeze([
  Object.freeze({ id: AnimationPreferences.CAPTURE, labelKey: 'settings_capture_animations' }),
  Object.freeze({ id: AnimationPreferences.UI_FEEDBACK, labelKey: 'settings_ui_animations' })
]);

export class CombatSettingsSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'settings_combat_title', name: 'CombatSettingsSection' });
  }

  /** @override */
  build() {
    const preferences = PreferencesSystem.getInstance();
    for (const option of OPTIONS) {
      const enabled = preferences.getAnimationPreference(option.id);
      const button = new UIButton({
        variant: 'hbtn',
        className: 'pw-settings-animation-toggle',
        icon: enabled ? 'check' : 'close',
        text: t(option.labelKey),
        align: 'left',
        onClick: () => {
          preferences.setAnimationPreference(option.id, !preferences.getAnimationPreference(option.id));
          this.refresh();
        }
      });
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      this.addChild(button);
    }
  }
}
