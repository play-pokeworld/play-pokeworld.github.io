/** @file DownloadOptionsView.js — one direct platform-specific download control. */
import { UIContainer } from '../UIContainer.js';
import { UIButton } from '../UIButton.js';
import { UILink } from '../UILink.js';
import { DownloadRules } from '../../config/DownloadRules.js';
import { detectDownloadTarget } from '../DownloadTarget.js';
import { t } from '../../localization/LocalizationManager.js';

export class DownloadOptionsView extends UIContainer {
  /** @param {{target?: string}} [options] */
  constructor(options = {}) {
    super({ className: 'pw-download-options', name: 'DownloadOptionsView' });
    const target = options.target || detectDownloadTarget();
    const href = DownloadRules.PLATFORM_DOWNLOAD_URLS[target] || '';
    if (href) {
      const link = new UILink({
        href,
        text: t('download_button'),
        icon: 'download',
        className: 'pw-download-button',
        external: false
      });
      link.setAttribute('download', '');
      this.addChild(link);
    } else {
      this.addChild(new UIButton({
        text: t('download_button'),
        icon: 'download',
        className: 'pw-download-button',
        disabled: true
      }));
    }
  }
}
