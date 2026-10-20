/**
 * @file LanguageSection.js
 * @brief Settings → language selector (C++: class LanguageSection : public SettingsSection).
 * Language selection uses visible buttons, with the selected language marked as active.
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { GameConfig } from '../../config/GameConfig.js';
import { LocalizationManager, t } from '../../localization/LocalizationManager.js';

export class LanguageSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'lang_title', name: 'LanguageSection' });
  }

  /** @override */
  build() {
    const activeLanguage = LocalizationManager.getInstance().currentLang;
    this.addChild(new UIContainer({
      className: 'pw-settings-choices pw-settings-language-buttons',
      children: GameConfig.SUPPORTED_LANGUAGES.map((lang) => {
        const button = new UIButton({
          text: t(`lang_name_${lang}`),
          className: 'pw-settings-choice lang-btn',
          variant: 'hbtn',
          onClick: () => LocalizationManager.getInstance().setLanguage(lang)
        });
        button.setAttribute('data-lang', lang);
        button.setActive(lang === activeLanguage);
        button.setAttribute('aria-pressed', lang === activeLanguage ? 'true' : 'false');
        return button;
      })
    }));
  }
}
