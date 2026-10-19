/**
 * @file UIChip.js
 * @brief Filter chip with an optional counter (original filter-bar chip:
 * button.inv-tab.pw-chip > label + span.pw-chip-count). Active state through setActive().
 */
import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';

export class UIChip extends UIElement {
  /**
   * @param {Object} options
   * @param {string} options.text
   * @param {number|null} [options.count=null] - null hides the counter
   * @param {boolean} [options.active=false]
   * @param {Function} options.onClick
   */
  constructor({ text, count = null, active = false, onClick }) {
    super({ tagName: 'button', className: 'inv-tab pw-chip', name: 'UIChip', tag: 'Chip' });
    this._dom.setAttribute('type', 'button');
    this.addDomListener('click', (event) => onClick(event, this));
    this.addChild(new UIText({ className: 'pw-chip-label', text }));
    if (count !== null) this.addChild(new UIText({ className: 'inv-tab-count pw-chip-count', text: String(count) }));
    this.toggleClass('active', active);
  }
}
