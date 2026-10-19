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
    /** @private @type {Map<string, UIButton>} */
    this._buttons = new Map();

    for (const tab of options.tabs || []) {
      const button = new UIButton({
        text: tab.label,
        icon: tab.icon || '',
        className: options.buttonClassName || '',
        onClick: () => this.select(tab.id, true)
      });
      this._buttons.set(tab.id, button);
      this.addChild(button);
    }
    this._selectedId = '';
    const first = (options.tabs || [])[0];
    this.select(options.selectedId || (first ? first.id : ''), false);
  }

  /**
   * Selects a tab.
   * @param {string} tabId
   * @param {boolean} [notify=true] - Calls onSelect when true
   */
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
