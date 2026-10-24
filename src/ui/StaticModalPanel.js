/**
 * @file StaticModalPanel.js
 * @brief Static centered modal panel (C++: class StaticModalPanel : public UIModal).
 * Available in 3 discrete sizes, or 'custom' for a component-owned CSS geometry:
 *  - 'lg' : Large, nearly full-screen (width: min(96vw, 1180px), max-height: 92vh) for PC Box, Pokedex, Map
 *  - 'md' : Medium, centered window (width: min(90vw, 680px), max-height: 85vh) for Settings, Quests, Team
 *  - 'sm' : Small, compact alert/prompt (width: min(88vw, 420px), max-height: 70vh) for Confirm, Rename, Dialogs
 */

import { UIModal } from './UIModal.js';

export class StaticModalPanel extends UIModal {
  /**
   * @param {Object} [options={}]
   * @param {string} options.id
   * @param {string} [options.title='']
   * @param {string} [options.size='md'] - 'lg' | 'md' | 'sm' | 'custom'
   * @param {boolean} [options.closeOnBackdrop=true]
   * @param {boolean} [options.showCloseBtn=true]
   * @param {boolean} [options.hasFooter=false] - Optional fixed footer for editor actions.
   * @param {boolean} [options.hasHeader=true]
   * @param {string} [options.overlayId='']
   * @param {string} [options.overlayClassName='']
   * @param {string} [options.bodyClassName='']
   */
  constructor(options = {}) {
    const size = options.size || 'md';
    super({
      id: options.id,
      title: options.title || '',
      size: size,
      className: `pw-static-modal pw-static-modal--${size} ${options.className || ''}`.trim(),
      closeOnBackdrop: options.closeOnBackdrop !== false,
      showCloseBtn: options.showCloseBtn !== false,
      hasFooter:options.hasFooter===true,
      hasHeader: options.hasHeader !== false,
      overlayId: options.overlayId || '',
      overlayClassName: options.overlayClassName || '',
      bodyClassName: options.bodyClassName || '',
      name: options.name || 'StaticModalPanel'
    });

    this._panelSize = size;
    this._applySizeStyles();
  }

  /**
   * Sets the modal size dynamically ('lg'|'md'|'sm'|'custom')
   * @param {'lg'|'md'|'sm'|'custom'} size
   */
  setSize(size) {
    this._panelSize = size;
    this._applySizeStyles();
  }

  /** @returns {'lg'|'md'|'sm'|'custom'} */
  getSize() {
    return this._panelSize;
  }

  /**
   * Size is expressed only through the .pw-static-modal--<size> class
   * (see style.css); nothing is written inline.
   * @private
   */
  _applySizeStyles() {
    this._dom.classList.remove('pw-static-modal--sm','pw-static-modal--md','pw-static-modal--lg','pw-static-modal--custom');
    this._dom.classList.add(`pw-static-modal--${this._panelSize}`);
  }
}

