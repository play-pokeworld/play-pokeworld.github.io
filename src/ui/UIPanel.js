/**
 * @file UIPanel.js
 * @brief Window container with PokéWorld's dash-win chrome (C++: class UIPanel : public UIElement).
 * Structure: header bar (.pw-win-hdr: icon, title, header actions), scrollable body (.win-body)
 * and optional footer. Content is added through widget methods only: addChild() targets the body,
 * addHeaderAction() / addFooterChild() target the chrome. The internal DOM is never exposed.
 */

import { UIElement } from './UIElement.js';
import { UIIcon } from './UIIcon.js';
import { UIText } from './UIText.js';

export class UIPanel extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']
   * @param {string} [options.title='']         - Localized header title
   * @param {string} [options.icon='']          - IconRegistry name shown before the title
   * @param {string} [options.variant='default'] - Adds .pw-panel--<variant>
   * @param {string} [options.className='']
   * @param {string} [options.bodyId='']        - id of the body (.win-body), for CSS hooks
   * @param {string} [options.bodyClassName=''] - Extra classes on the body
   * @param {boolean} [options.hasHeader]       - Defaults to true when a title is given
   * @param {boolean} [options.hasFooter=false]
   * @param {boolean} [options.collapsible=false]
   */
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: `dash-win pw-panel--${options.variant || 'default'} ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIPanel',
      tag: 'Panel'
    });

    this._hasHeader = options.hasHeader ?? !!options.title;
    this._isCollapsed = false;

    /** @protected @type {HTMLElement|null} */ this._headerDom = null;
    /** @private @type {HTMLElement|null} */ this._titleDom = null;
    /** @private @type {UIIcon|null} */ this._iconWidget = null;
    /** @private @type {HTMLElement|null} */ this._actionsDom = null;
    /** @protected @type {HTMLElement} */ this._bodyDom = null;
    /** @private @type {HTMLElement|null} */ this._footerDom = null;
    /** @private @type {Set<UIElement>} Children living in the chrome (header / footer) */
    this._chromeChildren = new Set();

    this._buildStructure(options);
    if (options.icon) this.setIcon(options.icon);
    if (options.title) this.setTitle(options.title);
    if (options.collapsible) this._enableCollapse();
  }

  /**
   * Builds header, body and footer containers.
   * @private
   * @param {Object} options
   */
  _buildStructure(options) {
    if (this._hasHeader) {
      this._headerDom = document.createElement('div');
      this._headerDom.className = 'pw-win-hdr';

      this._titleWrapDom = document.createElement('span');
      this._titleWrapDom.className = 'pw-win-hdr-title';
      this._titleDom = document.createElement('span');
      this._titleDom.className = 'pw-win-hdr-label';
      this._titleWrapDom.appendChild(this._titleDom);
      this._headerDom.appendChild(this._titleWrapDom);

      this._actionsDom = document.createElement('div');
      this._actionsDom.className = 'pw-win-hdr-tools';
      this._headerDom.appendChild(this._actionsDom);

      this._dom.appendChild(this._headerDom);
    }

    this._bodyDom = document.createElement('div');
    this._bodyDom.className = `win-body ${options.bodyClassName || ''}`.trim();
    if (options.bodyId) this._bodyDom.id = options.bodyId;
    this._dom.appendChild(this._bodyDom);

    if (options.hasFooter) {
      this._footerDom = document.createElement('div');
      this._footerDom.className = 'pw-panel-footer';
      this._dom.appendChild(this._footerDom);
    }
  }

  /** @private */
  _enableCollapse() {
    if (!this._headerDom) return;
    this._headerDom.classList.add('is-collapsible');
    this._headerDom.addEventListener('click', (event) => {
      if (event.target.closest('button, select, a, input, [data-stop-drag="true"]')) return;
      this.toggleCollapse();
    });
  }

  // --- Chrome ---

  /**
   * Sets the header title.
   * @param {string} title - Localized text
   */
  setTitle(title) {
    const value=title??'';
    if(this._titleDom&&this._titleDom.textContent!==value)this._titleDom.textContent=value;
  }

  /** Optional second header line; no-op when unchanged. @param {string} subtitle */
  setSubtitle(subtitle){
    const value=String(subtitle||'');if(!this._titleWrapDom||value===this._subtitleValue)return;
    this._subtitleValue=value;
    if(!this._subtitleWidget){this._subtitleWidget=new UIText({className:'pw-win-hdr-subtitle'});this._addChromeChild(this._subtitleWidget,this._titleWrapDom);}
    this._subtitleWidget.setText(value);this._subtitleWidget.setVisible(!!value);this._titleWrapDom.classList.toggle('has-subtitle',!!value);
  }

  /**
   * Sets the header icon.
   * @param {string} iconName - IconRegistry name ('' removes the icon)
   */
  setIcon(iconName) {
    if (!this._headerDom) return;
    if (!iconName) {
      if (this._iconWidget) this._removeChromeChild(this._iconWidget);
      this._iconWidget = null;
      return;
    }
    if (!this._iconWidget) {
      this._iconWidget = new UIIcon({ className: 'pw-win-hdr-icon' });
      this._addChromeChild(this._iconWidget, this._titleWrapDom);
      this._titleWrapDom.insertBefore(this._iconWidget.getDomElement(), this._titleDom);
    }
    this._iconWidget.setIcon(iconName);
  }

  /**
   * Appends a widget to the header tool area (buttons, dropdowns...).
   * @param {UIElement} widget
   * @returns {UIElement}
   */
  addHeaderAction(widget) {
    if (!this._actionsDom) return widget;
    return this._addChromeChild(widget, this._actionsDom);
  }

  /** Removes and destroys every header action. */
  clearHeaderActions() {
    for (const child of [...this._chromeChildren]) {
      if (child.getDomElement().parentNode === this._actionsDom) this._removeChromeChild(child);
    }
  }

  /**
   * Appends a widget to the footer (requires hasFooter).
   * @param {UIElement} widget
   * @returns {UIElement}
   */
  addFooterChild(widget) {
    if (!this._footerDom) return widget;
    return this._addChromeChild(widget, this._footerDom);
  }

  /**
   * Adds or removes a modifier class on the body container.
   * @param {string} className
   * @param {boolean} [enabled=true]
   */
  setBodyClass(className, enabled = true) {
    this._bodyDom.classList.toggle(className, enabled);
  }

  /** Collapses or expands the body (visibility handled by `.dash-win.is-collapsed`). */
  toggleCollapse() {
    this._isCollapsed = !this._isCollapsed;
    this._dom.classList.toggle('is-collapsed', this._isCollapsed);
  }

  // --- Hierarchy ---

  /**
   * Appends to the body by default.
   * @override
   * @param {UIElement} child
   * @param {HTMLElement} [customTarget=null]
   * @returns {UIElement}
   */
  addChild(child, customTarget = null) {
    return super.addChild(child, customTarget || this._bodyDom);
  }

  /**
   * Destroys the body content only; header and footer widgets are kept.
   * @override
   */
  clearChildren() {
    for (const child of [...this._children]) {
      if (!this._chromeChildren.has(child)) child.destroy(); // destroy() detaches from this panel
    }
    this._bodyDom.textContent = '';
  }

  /**
   * @private
   * @param {UIElement} widget
   * @param {HTMLElement} target
   * @returns {UIElement}
   */
  _addChromeChild(widget, target) {
    super.addChild(widget, target);
    this._chromeChildren.add(widget);
    return widget;
  }

  /**
   * @private
   * @param {UIElement} widget
   */
  _removeChromeChild(widget) {
    this._chromeChildren.delete(widget);
    this.removeChild(widget);
    widget.destroy();
  }
}
