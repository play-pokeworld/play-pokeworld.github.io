/**
 * @file UIContextMenu.js
 * @brief Floating right-click menu (C++ equivalent: class UIContextMenu : public UIElement).
 * Items are UIButtons; the menu closes on any outside click or on Escape.
 */

import { UIElement } from './UIElement.js';
import { UIButton } from './UIButton.js';

/** Viewport margin kept between the menu and the screen edges (px). */
const EDGE_MARGIN = 8;

export class UIContextMenu extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']
   * @param {string} [options.className='']
   * @param {string} [options.itemClassName='pw-context-item']
   */
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: `pw-context-menu ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIContextMenu',
      tag: 'ContextMenu'
    });

    this._itemClassName = options.itemClassName || 'pw-context-item';
    this._dom.setAttribute('role', 'menu');

    this._onOutsideClick = (event) => {
      if (!this._dom.contains(event.target)) this.close();
    };
    this._onKeyDown = (event) => {
      if (event.key === 'Escape') this.close();
    };

    this.setVisible(false);
  }

  /**
   * Opens the menu at the given viewport coordinates.
   * @param {number} x
   * @param {number} y
   * @param {Array<{ text: string, icon?: string, className?: string, onClick: Function }>} items
   */
  open(x, y, items) {
    this.clearChildren();
    for (const item of items) {
      this.addChild(new UIButton({
        className: `${this._itemClassName} ${item.className || ''}`.trim(),
        text: item.text,
        icon: item.icon || '',
        align: 'left',
        onClick: (event) => {
          event.stopPropagation();
          this.close();
          item.onClick();
        }
      }));
    }

    this.setVisible(true);
    this.addClass('open');

    // Clamp inside the viewport once the real size is known.
    const rect = this._dom.getBoundingClientRect ? this._dom.getBoundingClientRect() : { width: 0, height: 0 };
    const maxX = window.innerWidth - rect.width - EDGE_MARGIN;
    const maxY = window.innerHeight - rect.height - EDGE_MARGIN;
    this.setPosition(Math.max(EDGE_MARGIN, Math.min(x, maxX)), Math.max(EDGE_MARGIN, Math.min(y, maxY)));

    // Defer so the click that opened the menu does not close it immediately.
    setTimeout(() => {
      document.addEventListener('click', this._onOutsideClick);
      document.addEventListener('contextmenu', this._onOutsideClick);
      document.addEventListener('keydown', this._onKeyDown);
    }, 0);
  }

  /** Closes the menu and releases global listeners. */
  close() {
    this.removeClass('open');
    this.setVisible(false);
    document.removeEventListener('click', this._onOutsideClick);
    document.removeEventListener('contextmenu', this._onOutsideClick);
    document.removeEventListener('keydown', this._onKeyDown);
  }

  /** @override */
  onDestroy() {
    this.close();
    super.onDestroy();
  }
}
