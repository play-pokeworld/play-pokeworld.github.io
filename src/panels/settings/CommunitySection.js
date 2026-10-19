/**
 * @file CommunitySection.js
 * @brief Settings → Discord invite (C++: class CommunitySection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UILink } from '../../ui/UILink.js';
import { GameConfig } from '../../config/GameConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class CommunitySection extends SettingsSection {
  constructor() {
    super({ titleKey: 'settings_community_title', name: 'CommunitySection' });
  }

  /** @override */
  build() {
    this.addChild(new UILink({
      href: GameConfig.DISCORD_URL,
      text: t('discord_join_btn'),
      icon: 'discord',
      className: 'pw-discord-btn settings-discord-btn'
    }));
  }
}
