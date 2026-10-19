/**
 * @file UIActionTile.js
 * @brief Location action tile (original locActionVNode): a clickable tile
 * `button.pw-loc-action-btn` or, without onClick, an informational row `div.pw-loc-action-row`
 * (locked entries), both made of an icon and a label.
 */
import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';
import { UIIcon } from './UIIcon.js';

/** Visual variants of a tile (each maps to a CSS class of design-system.css). */
export const ActionTileVariants = Object.freeze({
  DEFAULT: '',
  GYM: 'pw-loc-gym-btn',
  NPC: 'pw-loc-npc-btn',
  QUEST: 'pw-loc-quest-btn'
});

export class UIActionTile extends UIElement {
  /**
   * @param {Object} options
   * @param {string} options.text
   * @param {string} [options.icon=''] - IconRegistry name
   * @param {string} [options.variant=ActionTileVariants.DEFAULT]
   * @param {Function|null} [options.onClick=null] - null renders an informational row
   */
  constructor({ text, icon = '', variant = ActionTileVariants.DEFAULT, onClick = null }) {
    const clickable = typeof onClick === 'function';
    super({
      tagName: clickable ? 'button' : 'div',
      className: [clickable ? 'pw-loc-action-btn' : 'pw-loc-action-row', variant].filter(Boolean).join(' '),
      name: 'UIActionTile',
      tag: 'ActionTile'
    });
    if (clickable) {
      this._dom.setAttribute('type', 'button');
      this.addDomListener('click', (event) => onClick(event, this));
    }
    const iconBox = new UIElement({ tagName: 'span', className: 'pw-loc-action-icon' });
    iconBox.setAttribute('aria-hidden', 'true');
    if (icon) iconBox.addChild(new UIIcon({ name: icon }));
    this.addChild(iconBox);
    this._label = new UIText({ className: 'pw-loc-action-label pw-text-sm', text });
    this.addChild(this._label);
  }

  /** @returns {UIText} */
  get text() {
    return this._label;
  }
}
