/**
 * @file BaseSystem.js
 * @brief Base class for engine subsystems (C++ equivalent: class ISystem : public BaseObject).
 * Manages subsystem lifecycle: init(), update(dt), and destroy().
 */

import { BaseObject } from '../core/BaseObject.js';

export class BaseSystem extends BaseObject {
  /**
   * @param {string} name
   * @param {string} [tag='System']
   */
  constructor(name = 'BaseSystem', tag = 'System') {
    super(name, tag);
    this._isEnabled = true;
  }

  /**
   * Called during engine initialization.
   * @virtual
   */
  init() {}

  /**
   * Called on every frame tick with deltaTime in seconds.
   * @virtual
   * @param {number} dt
   */
  update(dt) {}

  /**
   * Enables or disables the system.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._isEnabled = !!enabled;
  }

  /** @returns {boolean} */
  isEnabled() {
    return this._isEnabled;
  }

  /**
   * Destructor
   * @override
   */
  onDestroy() {
    this._isEnabled = false;
    super.onDestroy();
  }
}

