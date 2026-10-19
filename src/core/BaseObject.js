/**
 * @file BaseObject.js
 * @brief Fundamental root base class (C++ equivalent: class Object / class BaseObject).
 * Provides unique ID generation, tagging, and virtual destruction lifecycle.
 */

let _nextObjectId = 1;

export class BaseObject {
  /**
   * @param {string} [name=''] - Object identification name (for debugging / logging)
   * @param {string} [tag='']  - Classification tag
   */
  constructor(name = '', tag = '') {
    /** @protected @type {number} */
    this._id = _nextObjectId++;

    /** @protected @type {string} */
    this._name = name || `${this.constructor.name}_${this._id}`;

    /** @protected @type {string} */
    this._tag = tag;

    /** @protected @type {boolean} */
    this._isDestroyed = false;
  }

  // --- C++ Style Getters and Setters ---

  /**
   * Process-unique numeric identifier of the object instance.
   * Named getObjectId() so it never collides with UIElement.getId() (DOM id).
   * @returns {number}
   */
  getObjectId() {
    return this._id;
  }

  /** @returns {string} */
  getName() {
    return this._name;
  }

  /** @param {string} name */
  setName(name) {
    this._name = name;
  }

  /** @returns {string} */
  getTag() {
    return this._tag;
  }

  /** @param {string} tag */
  setTag(tag) {
    this._tag = tag;
  }

  /** @returns {boolean} */
  isDestroyed() {
    return this._isDestroyed;
  }

  // --- Lifecycle & Virtual Destructor ---

  /**
   * Standard destructor (C++: virtual ~BaseObject()).
   * Triggers virtual onDestroy() hook and flags the object as destroyed.
   */
  destroy() {
    if (this._isDestroyed) return;
    this.onDestroy();
    this._isDestroyed = true;
  }

  /**
   * Virtual method to override in derived classes for resource cleanup.
   * @virtual
   */
  onDestroy() {
    // Overridden by derived classes
  }
}

