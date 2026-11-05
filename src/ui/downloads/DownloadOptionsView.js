/** @file DownloadOptionsView.js — truthful platform-specific install/download choices. */
import { UIContainer } from '../UIContainer.js';
import { UIText } from '../UIText.js';
import { UILink } from '../UILink.js';
import { DownloadRules } from '../../config/DownloadRules.js';
import { detectDownloadTarget } from '../DownloadTarget.js';
import { t } from '../../localization/LocalizationManager.js';

export class DownloadOptionsView extends UIContainer {
  /** @param {{target?: string}} [options] */
  constructor(options = {}) {
    super({ className: 'pw-download-options', name: 'DownloadOptionsView' });
    const target = options.target || detectDownloadTarget();
    const platformKey = DownloadRules.PLATFORM_LABEL_KEYS[target] || DownloadRules.PLATFORM_LABEL_KEYS.OTHER;
    this.addChild(new UIText({ tagName: 'h3', className: 'pw-download-platform', text: t(platformKey) }));
    this.addChild(new UIText({ className: 'pw-download-unavailable', text: t('download_installers_unavailable') }));
    this.addChild(new UILink({
      href: DownloadRules.RELEASES_URL,
      text: t('download_releases_link'),
      icon: 'download',
      className: 'pw-download-release-link'
    }));
    this.addChild(new UILink({
      href: DownloadRules.WEBSITE_URL,
      text: t('download_web_link'),
      icon: 'link',
      className: 'pw-download-web-link'
    }));
  }
}
