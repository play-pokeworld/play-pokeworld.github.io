/**
 * @file SettingsSection.js
 * @brief Base block of the settings dialog: a titled `.settings-section` (C++: class SettingsSection : public UIContainer).
 * Subclasses implement build(); refresh() rebuilds the content (e.g. after a language change).
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { t } from '../../localization/LocalizationManager.js';

export class SettingsSection extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} options.titleKey - Localization key of the section title
   * @param {string} [options.id='']
   * @param {string} [options.className='']
   * @param {string} [options.name]
   */
  constructor(options) {
    super({ id: options.id, className: `settings-section ${options.className || ''}`.trim(), name: options.name || 'SettingsSection' });
    this._titleKey = options.titleKey;
  }

  /** Clears and rebuilds the section. */
  refresh() {
    this.clearChildren();
    this.addChild(new UIText({ tagName: 'h3', text: t(this._titleKey) }));
    this.build();
  }

  /** @abstract Adds the section widgets. */
  build() {}
}
