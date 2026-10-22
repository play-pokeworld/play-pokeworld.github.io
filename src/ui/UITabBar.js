/**
 * @file UITabBar.js
 * @brief Row of mutually exclusive tab buttons (C++ equivalent: class UITabBar : public UIElement).
 * The selected tab carries the `active` state class of UIButton.
 */
import { UIElement } from './UIElement.js';
import { UIButton } from './UIButton.js';

export class UITabBar extends UIElement {
  /**
   * @param {Object} options
   * @param {Array<{id: string, label: string, icon?: string}>} options.tabs - Labels already localized
   * @param {string} [options.selectedId] - Defaults to the first tab
   * @param {string} [options.className='']
   * @param {string} [options.buttonClassName='']
   * @param {Function} [options.onSelect=null] - (tabId) => void
   */
  constructor(options = {}) {
    super({ className: `pw-tab-bar ${options.className || ''}`.trim(), name: options.name || 'UITabBar' });
    this._onSelect = options.onSelect || null;
    this._buttonClassName = options.buttonClassName || '';
    /** @private @type {Map<string, UIButton>} */
    this._buttons = new Map();
    this._selectedId = '';
    this.setTabs(options.tabs || [], options.selectedId || '');
  }

  /**
   * Replaces the available tabs while preserving the selected id when possible.
   * @param {Array<{id: string, label: string, icon?: string}>} tabs
   * @param {string} [preferredId]
   */
  setTabs(tabs, preferredId = this._selectedId) {
    for (const button of this._buttons.values()) {
      this.removeChild(button);
      button.destroy();
    }
    this._buttons.clear();
    for (const tab of tabs || []) {
      const button = new UIButton({
        text: tab.label,
        icon: tab.icon || '',
        className: this._buttonClassName,
        onClick: () => this.select(tab.id, true)
      });
      this._buttons.set(tab.id, button);
      this.addChild(button);
    }
    this._selectedId = '';
    const selected = this._buttons.has(preferredId) ? preferredId : this._buttons.keys().next().value || '';
    if (selected) this.select(selected, false);
  }

  /** @param {string} tabId @param {boolean} [notify=true] */
  select(tabId, notify = true) {
    if (!this._buttons.has(tabId)) return;
    this._selectedId = tabId;
    for (const [id, button] of this._buttons) button.setActive(id === tabId);
    if (notify && this._onSelect) this._onSelect(tabId);
  }

  /** @returns {string} */
  getSelectedId() {
    return this._selectedId;
  }
}
