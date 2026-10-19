/**
 * @file AdvancedSection.js
 * @brief Settings → developer mode, unlocked by GameConfig.DEBUG_ACCESS_CODE (C++: class AdvancedSection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { PreferencesSystem } from '../../systems/PreferencesSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { GameConfig } from '../../config/GameConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class AdvancedSection extends SettingsSection {
  constructor() {
    super({ id: 'advanced-section', titleKey: 'settings_advanced_title', name: 'AdvancedSection' });
  }

  /** @override */
  build() {
    if (PreferencesSystem.getInstance().isDebugMode()) this._buildUnlocked();
    else this._buildLocked();
  }

  /** @private */
  _buildLocked() {
    const input = new UITextInput({
      id: 'debug-code-input',
      type: 'password',
      className: 'pw-input-sm',
      placeholder: t('settings_debug_code_placeholder'),
      onSubmit: () => submit()
    });
    const submit = () => {
      if (input.getValue().toUpperCase() === GameConfig.DEBUG_ACCESS_CODE) {
        this._setDebugMode(true, 'debug_mode_enabled', NotificationTones.SUCCESS);
        return;
      }
      input.setValue('');
      input.setInvalid(true);
      NotificationSystem.getInstance().notify(t('debug_code_wrong'), { channel: NotificationChannels.SYSTEM, tone: NotificationTones.DANGER });
    };

    this.addChild(new UIContainer({
      className: 'pw-settings-code-row',
      children: [
        new UIText({ tagName: 'label', className: 'pw-settings-label', text: t('settings_debug_code_label') }),
        input,
        new UIButton({ id: 'debug-code-submit-btn', className: 'hbtn', text: t('settings_debug_code_submit'), onClick: submit })
      ]
    }));
  }

  /** @private */
  _buildUnlocked() {
    this.addChild(new UIContainer({
      className: 'pw-settings-active-row',
      children: [
        new UIText({ className: 'pw-text-green pw-font-bold', text: t('settings_debug_on_label') }),
        new UIButton({
          id: 'debug-hide-btn',
          className: 'hbtn pw-btn-danger',
          text: t('settings_debug_hide_btn'),
          onClick: () => this._setDebugMode(false, 'debug_mode_disabled', NotificationTones.INFO)
        })
      ]
    }));
  }

  /** @private */
  _setDebugMode(enabled, messageKey, tone) {
    PreferencesSystem.getInstance().setDebugMode(enabled);
    NotificationSystem.getInstance().notify(t(messageKey), { channel: NotificationChannels.SYSTEM, tone });
    this.refresh();
  }
}
