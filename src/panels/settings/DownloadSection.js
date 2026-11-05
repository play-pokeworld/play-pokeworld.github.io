/** @file DownloadSection.js — platform-aware download information in Settings. */
import { SettingsSection } from './SettingsSection.js';
import { UIText } from '../../ui/UIText.js';
import { DownloadOptionsView } from '../../ui/downloads/DownloadOptionsView.js';
import { t } from '../../localization/LocalizationManager.js';

export class DownloadSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'settings_downloads_title', name: 'DownloadSection' });
  }

  /** @override */
  build() {
    this.addChild(new UIText({ text: t('download_prompt_intro') }));
    this.addChild(new DownloadOptionsView());
  }
}
