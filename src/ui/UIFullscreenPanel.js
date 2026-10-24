/**
 * @file UIFullscreenPanel.js
 * @brief Full-screen window of the original openFullscreenPanel() (shop, bag, PC box, badges…)
 * (C++ equivalent: class UIFullscreenPanel : public UIElement).
 * Same DOM as the original:
 *   div.pw-fullscreen-overlay                    (original #fullscreen-panel-modal)
 *     div.pw-modal-container
 *       div.modal-title > div.pw-row > div.pw-info-head-text > div.pw-info-name   + span.modal-close
 *       div.pw-modal-search-bar                  (filter bar, hidden while empty)
 *       div.pw-modal-body                        (content; the only scrolling area)
 *       div.pw-modal-footer                      (optional fixed actions, hidden while empty)
 * Opens on ModalOpenRequestedEvent(id); only one full-screen panel is open at a time (opening one
 * closes the previous one, as the original did). Subclasses fill these slots in onOpen(params).
 */
import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';
import { EventBus } from '../core/EventBus.js';
import { ModalToggledEvent } from '../core/events/ModalToggledEvent.js';
import { ModalCloseRequestedEvent } from '../core/events/ModalCloseRequestedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class UIFullscreenPanel extends UIElement {
  /** @private @type {UIFullscreenPanel|null} Panel currently open */
  static _current = null;

  /**
   * @param {Object} options
   * @param {string} options.id - ModalIds value
   * @param {string} options.title
   * @param {string} [options.name]
   */
  constructor({ id, title, name = 'UIFullscreenPanel' }) {
    super({ id, className: 'pw-fullscreen-overlay', name, tag: 'Modal' });
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this._isOpen = false;

    const container = new UIElement({ className: 'pw-modal-container' });
    const header = new UIElement({ className: 'modal-title' });
    const row = new UIElement({ className: 'pw-row' });
    const headText = new UIElement({ className: 'pw-info-head-text' });
    this._title = new UIText({ tagName: 'div', className: 'pw-info-name', text: title });
    headText.addChild(this._title);
    row.addChild(headText);
    header.addChild(row);
    const close = new UIText({ className: 'modal-close', text: '\u2715' });
    close.setAriaLabel(t('modal_close_btn'));
    close.addDomListener('click', () => this.close());
    header.addChild(close);
    this._filters = new UIElement({ className: 'pw-modal-search-bar' });
    this._body = new UIElement({ className: 'pw-modal-body' });
    this._footer = new UIElement({ className: 'pw-modal-footer' });
    this._footer.hide();
    container.addChildren([header, this._filters, this._body, this._footer]);
    this.addChild(container);

    this.addDomListener('click', (event) => {
      if (event.target === this._dom) this.close();
    });
    this.listen(ModalCloseRequestedEvent,event=>{if(event.modalId===this.getId())this.close();});
    this.listen(ModalOpenRequestedEvent, (event) => {
      if (event.modalId === this.getId()) this.open(event.params);
    });
    this.hide();
  }

  /** @returns {boolean} */
  isOpen() {
    return this._isOpen;
  }

  /** @param {string} title */
  setTitle(title) {
    this._title.setText(title);
  }

  /** @returns {string} */
  getTitle() {
    return this._title.getText();
  }

  /**
   * Replaces the filter bar content (the bar is shown only when it has children).
   * @param {UIElement[]} children
   */
  setFilters(children) {
    this._filters.clearChildren();
    this._filters.addChildren(children);
    this._filters.toggleClass('is-filled', children.length > 0);
  }

  /**
   * Replaces the body content.
   * @param {UIElement[]} children
   * @param {{preserveScroll?: boolean}} [options]
   */
  setContent(children, { preserveScroll = false } = {}) {
    const scrollTop = preserveScroll ? this._body.getDomElement().scrollTop : 0;
    this._body.clearChildren();
    this._body.addChildren(children);
    if (preserveScroll) this._body.getDomElement().scrollTop = scrollTop;
  }

  /**
   * Replaces the fixed footer content. An empty footer does not take up space.
   * @param {UIElement[]} children
   */
  setFooter(children) {
    this._footer.clearChildren();
    this._footer.addChildren(children);
    this._footer.toggleClass('is-filled', children.length > 0);
    if (children.length > 0) this._footer.show();
    else this._footer.hide();
  }

  /** @param {Object} [params] */
  open(params = {}) {
    if (UIFullscreenPanel._current && UIFullscreenPanel._current !== this) UIFullscreenPanel._current.close();
    UIFullscreenPanel._current = this;
    const wasOpen = this._isOpen;
    this._isOpen = true;
    this.addClass('is-open');
    this.show();
    this.onOpen(params);
    if (!wasOpen) EventBus.getInstance().dispatch(new ModalToggledEvent(this.getName(), true));
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    if (UIFullscreenPanel._current === this) UIFullscreenPanel._current = null;
    this.removeClass('is-open');
    this.hide();
    this.onClose();
    EventBus.getInstance().dispatch(new ModalToggledEvent(this.getName(), false));
  }

  /**
   * Fills the panel (subclasses). Called on every open.
   * @param {Object} params
   */
  onOpen(params) {}

  /** Called after closing (subclasses). */
  onClose() {}
}
