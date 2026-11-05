/** @file DownloadSection.js — single platform-aware download button in Settings. */
import { SettingsSection } from './SettingsSection.js';
import { DownloadOptionsView } from '../../ui/downloads/DownloadOptionsView.js';

export class DownloadSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'settings_downloads_title', name: 'DownloadSection' });
  }

  /** @override */
  build() {
    this.addChild(new DownloadOptionsView());
  }
}
