/**
 * @file LanguageSection.js
 * @brief Settings → language selector (C++: class LanguageSection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UIDropdown } from '../../ui/UIDropdown.js';
import { GameConfig } from '../../config/GameConfig.js';
import { LocalizationManager, t } from '../../localization/LocalizationManager.js';

export class LanguageSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'lang_title', name: 'LanguageSection' });
  }

  /** @override */
  build() {
    this.addChild(new UIDropdown({
      id: 'settings-language-select',
      options: GameConfig.SUPPORTED_LANGUAGES.map((lang) => ({ value: lang, label: t(`lang_name_${lang}`) })),
      value: LocalizationManager.getInstance().currentLang,
      // The dialog rebuilds itself on LanguageChangedEvent.
      onChange: (lang) => LocalizationManager.getInstance().setLanguage(lang)
    }));
  }
}
