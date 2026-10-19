/**
 * @file UIDragPlaceholder.js
 * @brief Empty slot that keeps the place of a window being dragged (C++: class UIDragPlaceholder : public UIElement).
 * Its height is a runtime number, pushed as the --pw-placeholder-h CSS variable.
 */

import { UIElement } from './UIElement.js';

export class UIDragPlaceholder extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.className='pw-win-placeholder']
   */
  constructor(options = {}) {
    super({ className: options.className || 'pw-win-placeholder', name: 'UIDragPlaceholder' });
  }

  /** @param {number} heightPx */
  setHeight(heightPx) {
    this._setCssVariable('--pw-placeholder-h', `${Math.round(heightPx)}px`);
  }
}
