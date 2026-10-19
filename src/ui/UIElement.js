/**
 * @file UIElement.js
 * @brief Base class for all user interface widgets (C++ equivalent: class UIElement : public BaseObject / QWidget).
 * Encapsulates the underlying DOM element, parent-child scene graph tree, and lifecycle.
 */

import { BaseObject } from '../core/BaseObject.js';
import { EventBus } from '../core/EventBus.js';
import { t } from '../localization/LocalizationManager.js';

export class UIElement extends BaseObject {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.tagName='div'] - HTML tag to instantiate
   * @param {string} [options.className='']  - Initial CSS classes
   * @param {string} [options.id='']         - Optional HTML id attribute
   * @param {string} [options.name='']       - Object name for debugging
   * @param {string} [options.tag='UI']      - Classification tag
   */
  constructor(options = {}) {
    super(options.name || '', options.tag || 'UI');

    const tagName = options.tagName || 'div';
    /** @protected @type {HTMLElement} */
    this._dom = document.createElement(tagName);
    this._dom.classList.add('pw-element');

    if (options.className) {
      const classes = options.className.split(' ').filter(Boolean);
      for (const cls of classes) {
        this._dom.classList.add(cls);
      }
    }

    if (options.id) {
      this._dom.id = options.id;
    }

    /** @protected @type {UIElement|null} */
    this._parent = null;

    /** @protected @type {UIElement[]} */
    this._children = [];

    /** @protected @type {boolean} */
    this._isVisible = true;

    /** @private @type {Array<{ event: string, handler: Function }>} */
    this._registeredDomListeners = [];

    /** @private @type {Function[]} EventBus unsubscribe handles released on destroy */
    this._busSubscriptions = [];
  }

  // --- DOM Accessors & Hierarchy (C++ Style) ---

  /** @returns {string} */
  getId() {
    return this._dom ? this._dom.id : '';
  }

  /** @param {string} id */
  setId(id) {
    if (this._dom) this._dom.id = id;
  }

  /** @returns {HTMLElement} The concrete DOM node */
  getDomElement() {
    return this._dom;
  }

  /** @returns {UIElement|null} */
  getParent() {
    return this._parent;
  }

  /** @returns {UIElement[]} Shallow copy of children */
  getChildren() {
    return [...this._children];
  }

  // --- Hierarchy Management (Parent / Children) ---

  /**
   * Appends a child component (C++: parent->addChild(childWidget))
   * @param {UIElement} child
   * @param {HTMLElement} [customTarget=null] - Specific target inside parent's DOM
   * @returns {UIElement} The added child (allows method chaining)
   */
  addChild(child, customTarget = null) {
    if (!(child instanceof UIElement)) {
      throw new TypeError(t('debug_ui_invalid_child'));
    }

    if (child._parent) {
      child._parent.removeChild(child);
    }

    child._parent = this;
    this._children.push(child);

    const targetDom = customTarget || this._dom;
    targetDom.appendChild(child.getDomElement());

    return child;
  }

  /**
   * Appends several children in order (falsy entries are skipped, which allows conditional lists).
   * @param {Array<UIElement|null|false>} children
   * @returns {this}
   */
  addChildren(children) {
    for (const child of children) {
      if (child) this.addChild(child);
    }
    return this;
  }

  /**
   * Inserts a child before one of the existing children (appends when `beforeChild` is null).
   * @param {UIElement} child
   * @param {UIElement|null} beforeChild
   * @returns {UIElement}
   */
  insertChildBefore(child, beforeChild) {
    if (!beforeChild || beforeChild._parent !== this || beforeChild === child) {
      return this.addChild(child);
    }
    if (child._parent) child._parent.removeChild(child);
    child._parent = this;
    this._children.splice(this._children.indexOf(beforeChild), 0, child);
    const beforeDom = beforeChild.getDomElement();
    beforeDom.parentNode.insertBefore(child.getDomElement(), beforeDom);
    return child;
  }

  /**
   * Returns the viewport rectangle of the element (layout query, read-only).
   * @returns {{left: number, top: number, width: number, height: number, right: number, bottom: number}}
   */
  getBounds() {
    return this._dom.getBoundingClientRect();
  }

  /**
   * Removes a child component
   * @param {UIElement} child
   */
  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
      child._parent = null;
      if (child.getDomElement().parentNode) {
        child.getDomElement().parentNode.removeChild(child.getDomElement());
      }
    }
  }

  /** Removes and destroys all child elements */
  clearChildren() {
    const children = this._children;
    this._children = [];
    for (const child of children) {
      child._parent = null;
      child.destroy();
    }
    this._dom.textContent = '';
  }

  // --- Visibility & Styling ---

  /** @returns {boolean} */
  isVisible() {
    return this._isVisible;
  }

  /**
   * Sets the visibility state (C++: setVisible(bool))
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._isVisible = !!visible;
    // Visibility is driven by the .is-hidden class only (see ui-element.css).
    this.toggleClass('is-hidden', !this._isVisible);
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }

  toggleVisibility() {
    this.setVisible(!this._isVisible);
  }

  /** @param {string} className */
  addClass(className) {
    // contains() first: classList.add/remove rewrite the attribute even when nothing changes
    if (className && !this._dom.classList.contains(className)) this._dom.classList.add(className);
  }

  /** @param {string} className */
  removeClass(className) {
    if (className && this._dom.classList.contains(className)) this._dom.classList.remove(className);
  }

  /** @param {string} className @param {boolean} [force] */
  toggleClass(className, force) {
    if (force !== undefined && this._dom.classList.contains(className) === !!force) return !!force;
    return this._dom.classList.toggle(className, force);
  }

  // --- Attributes & Runtime Layout Values ---

  /**
   * Sets an HTML attribute on the underlying node (C++: setProperty(name, value)).
   * @param {string} name
   * @param {string|number|boolean} value
   */
  setAttribute(name, value) {
    if (name) this._dom.setAttribute(name, String(value));
  }

  /** @param {string} name */
  removeAttribute(name) {
    if (name) this._dom.removeAttribute(name);
  }

  /**
   * Sets a data-* attribute (dataset entry).
   * @param {string} key - camelCase dataset key
   * @param {string|number} value
   */
  setData(key, value) {
    if (key) this._dom.dataset[key] = String(value);
  }

  /**
   * Sets the accessible label (aria-label). Pass an already localized string.
   * @param {string} label
   */
  setAriaLabel(label) {
    this._dom.setAttribute('aria-label', label || '');
  }

  /**
   * Places a floating element at viewport coordinates.
   * Only the two runtime numbers are pushed (as CSS custom properties);
   * the actual positioning rules live in CSS (.pw-floating).
   * @param {number} x - Left offset in px
   * @param {number} y - Top offset in px
   */
  setPosition(x, y) {
    this._dom.classList.add('pw-floating');
    this._setCssVariable('--pw-pos-x', `${Math.round(x)}px`);
    this._setCssVariable('--pw-pos-y', `${Math.round(y)}px`);
  }

  /**
   * Sets the native tooltip. Pass an already localized string.
   * @param {string} text
   */
  setTooltip(text) {
    if (text) this._dom.setAttribute('title', text);
    else this._dom.removeAttribute('title');
  }

  /** Gives keyboard focus to the element. */
  focus() {
    if (typeof this._dom.focus === 'function') this._dom.focus();
  }

  /**
   * Pushes a runtime value (percentage, coordinate...) to CSS through a
   * custom property. This is the ONLY bridge allowed between JS values and
   * CSS: static styling must always be expressed through classes.
   * @protected
   * @param {string} name - Custom property name (must start with --)
   * @param {string|null} value - null removes the property
   */
  _setCssVariable(name, value) {
    if (!this._dom.style || typeof this._dom.style.setProperty !== 'function') return;
    if (value === null || value === undefined) {
      this._dom.style.removeProperty(name);
      return;
    }
    const next = String(value);
    // Unchanged value: no style invalidation (drag frames, live gauges)
    if (typeof this._dom.style.getPropertyValue === 'function' && this._dom.style.getPropertyValue(name) === next) return;
    this._dom.style.setProperty(name, next);
  }

  /**
   * Registers a DOM event listener with automatic cleanup on destroy()
   * @param {string} event
   * @param {Function} handler
   */
  addDomListener(event, handler) {
    const bound = handler.bind(this);
    this._dom.addEventListener(event, bound);
    this._registeredDomListeners.push({ event, handler: bound });
  }

  /**
   * Subscribes to a typed EventBus event for the lifetime of this element:
   * the subscription is released automatically by destroy().
   * @param {Function} eventClass - Event class from src/core/events/
   * @param {Function} callback
   */
  listen(eventClass, callback) {
    this._busSubscriptions.push(EventBus.getInstance().subscribe(eventClass, callback, this));
  }

  // --- Virtual Lifecycle Hooks (C++ Virtual Methods) ---

  /**
   * Called once during initialization.
   * @virtual
   */
  onInit() {}

  /**
   * Called when the element or parent page becomes active/visible.
   * @virtual
   */
  onEnter() {
    for (const child of this._children) {
      child.onEnter();
    }
  }

  /**
   * Called each frame with deltaTime in seconds.
   * @virtual
   * @param {number} dt
   */
  onUpdate(dt) {
    for (const child of this._children) {
      if (child.isVisible()) {
        child.onUpdate(dt);
      }
    }
  }

  /**
   * Called when the element or parent page becomes inactive.
   * @virtual
   */
  onExit() {
    for (const child of this._children) {
      child.onExit();
    }
  }

  /**
   * Virtual destructor: cleans up DOM listeners, children and detaches DOM node.
   * @override
   */
  onDestroy() {
    for (const entry of this._registeredDomListeners) {
      this._dom.removeEventListener(entry.event, entry.handler);
    }
    this._registeredDomListeners = [];

    for (const unsubscribe of this._busSubscriptions) {
      unsubscribe();
    }
    this._busSubscriptions = [];

    const children = this._children;
    this._children = [];
    for (const child of children) {
      child._parent = null;
      child.destroy();
    }

    if (this._parent) {
      this._parent.removeChild(this);
    }

    if (this._dom.parentNode) {
      this._dom.parentNode.removeChild(this._dom);
    }

    super.onDestroy();
  }
}

