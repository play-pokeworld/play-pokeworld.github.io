/**
 * @file UIModal.js
 * @brief Floating modal dialog window with backdrop overlay (C++ equivalent: class UIModal : public UIPanel).
 * Demonstrates inheritance hierarchy: UIModal -> UIPanel -> UIElement -> BaseObject.
 * A modal opens itself when a ModalOpenRequestedEvent carries its id (see config/ModalIds.js),
 * so the code asking for a window never holds a reference to it.
 */

import { UIPanel } from './UIPanel.js';
import { UIButton } from './UIButton.js';
import { EventBus } from '../core/EventBus.js';
import { ModalToggledEvent } from '../core/events/ModalToggledEvent.js';
import { ModalCloseRequestedEvent } from '../core/events/ModalCloseRequestedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class UIModal extends UIPanel {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']               - Id of the window (inner panel)
   * @param {string} [options.title='']
   * @param {string} [options.size='md'] ('sm'|'md'|'lg')
   * @param {string} [options.className='']        - Extra classes for the window
   * @param {string} [options.overlayId='']        - Id of the backdrop overlay
   * @param {string} [options.overlayClassName=''] - Extra classes for the backdrop overlay
   * @param {string} [options.bodyId='']
   * @param {string} [options.bodyClassName='']
   * @param {boolean} [options.hasHeader=true]     - Renders the .pw-win-hdr title bar
   * @param {boolean} [options.hasFooter=false]
   * @param {boolean} [options.closeOnBackdrop=true]
   * @param {boolean} [options.showCloseBtn=true]
   */
  constructor(options = {}) {
    const hasHeader = options.hasHeader !== false;
    const size = options.size || 'md';

    super({
      id: options.id,
      title: options.title || '',
      variant: 'modal-window',
      className: `pw-modal--${size} ${options.className || ''}`.trim(),
      // UIPanel only builds a header when hasHeader === true or a title exists.
      hasHeader: hasHeader ? true : false,
      hasFooter: options.hasFooter || false,
      bodyId: options.bodyId || '',
      bodyClassName: options.bodyClassName || '',
      name: options.name || 'UIModal',
    });

    this._size = size;
    this._closeOnBackdrop = options.closeOnBackdrop !== false;
    this._isOpen = false;

    // Root overlay container (private implementation detail of the widget)
    this._overlayDom = document.createElement('div');
    this._overlayDom.className = `pw-modal-backdrop ${options.overlayClassName || ''}`.trim();
    this._overlayDom.classList.add('is-hidden');
    if (options.overlayId) {
      this._overlayDom.id = options.overlayId;
    }
    this._overlayDom.setAttribute('role', 'dialog');
    this._overlayDom.setAttribute('aria-modal', 'true');

    // Wrap the panel DOM element inside the overlay
    this._overlayDom.appendChild(this._dom);

    // Standard close button in header (a regular UIButton in the header tool area)
    if (options.showCloseBtn !== false && this._headerDom) {
      this._closeButton = new UIButton({
        icon: 'close',
        className: 'pw-modal-close-btn',
        name: 'UIModal:close',
        onClick: (event) => {
          event.stopPropagation();
          this.close();
        }
      });
      this._closeButton.setAriaLabel(t('modal_close_btn'));
      this.addHeaderAction(this._closeButton);
    }

    // Backdrop click to close
    this._overlayDom.addEventListener('click', (e) => {
      if (this._closeOnBackdrop && e.target === this._overlayDom) {
        this.close();
      }
    });

    // Open on request (ModalIds): released automatically when the modal is destroyed
    this.listen(ModalCloseRequestedEvent,event=>{if(event.modalId===this.getId())this.close();});
    this.listen(ModalOpenRequestedEvent, (event) => {
      if (event.modalId && event.modalId === this.getId()) this.open(event.params);
    });

    this.hide();
  }

  /**
   * Mounts a child above this modal (e.g. its own confirmation dialog): the child DOM goes
   * into the full-screen backdrop instead of the window body.
   * @param {UIElement} child
   * @returns {UIElement}
   */
  addOverlayChild(child) {
    return this.addChild(child, this._overlayDom);
  }

  /**
   * Overrides getDomElement so the scene hierarchy mounts the backdrop overlay
   * @override
   */
  getDomElement() {
    return this._overlayDom;
  }

  /** @returns {boolean} */
  isOpen() {
    return this._isOpen;
  }

  /** @returns {string} ('sm'|'md'|'lg') */
  getSize() {
    return this._size;
  }

  /**
   * Opens the modal.
   * @param {Object} [params={}] - Optional data for subclasses (forwarded by open requests)
   */
  open(params = {}) {
    if (this._isOpen) return;
    this._isOpen = true;
    this._overlayDom.classList.remove('is-hidden');
    this._overlayDom.classList.add('is-open', 'open');
    this.show();
    this.onEnter(params);
    EventBus.getInstance().dispatch(new ModalToggledEvent(this.getName(), true));
  }

  /** Closes the modal */
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._overlayDom.classList.remove('is-open', 'open');
    this._overlayDom.classList.add('is-hidden');
    this.hide();
    this.onExit();
    EventBus.getInstance().dispatch(new ModalToggledEvent(this.getName(), false));
  }

  /**
   * Cleanup
   * @override
   */
  onDestroy() {
    if (this._overlayDom.parentNode) {
      this._overlayDom.parentNode.removeChild(this._overlayDom);
    }
    super.onDestroy();
  }
}
