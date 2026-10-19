/**
 * @file Engine.js
 * @brief Core application coordinator and main loop (C++ equivalent: class Engine : public BaseObject).
 * Manages the PageManager, subsystem registry, and frame update dispatching with deltaTime.
 */

import { BaseObject } from './BaseObject.js';
import { PageManager } from './PageManager.js';

export class Engine extends BaseObject {
  /** @private @type {Engine|null} */
  static _instance = null;

  constructor() {
    super('Engine', 'Core');

    /** @private @type {PageManager|null} */
    this._pageManager = null;

    /** @private @type {boolean} */
    this._isRunning = false;

    /** @private @type {number} */
    this._lastTimestamp = 0;

    /** @private @type {Map<string, any>} */
    this._systems = new Map();
  }

  /**
   * Singleton pattern
   * @returns {Engine}
   */
  static getInstance() {
    if (!Engine._instance) {
      Engine._instance = new Engine();
    }
    return Engine._instance;
  }

  /**
   * Initializes the engine and binds the root DOM container
   * @param {HTMLElement} rootContainer
   */
  init(rootContainer) {
    this._pageManager = new PageManager(rootContainer);
    this._isRunning = true;
    this._lastTimestamp = performance.now();

    // Start main game loop (C++: while(running) { tick(); })
    requestAnimationFrame((t) => this._loop(t));
  }

  /**
   * Registers a game subsystem
   * @param {string} name
   * @param {any} system
   */
  registerSystem(name, system) {
    this._systems.set(name, system);
    if (typeof system.init === 'function') {
      system.init();
    }
  }

  /**
   * Gets a registered subsystem
   * @param {string} name
   * @returns {any}
   */
  getSystem(name) {
    return this._systems.get(name);
  }

  /** @returns {PageManager} */
  getPageManager() {
    return this._pageManager;
  }

  /**
   * Main game loop running at display refresh rate
   * @private
   * @param {number} currentTimestamp
   */
  _loop(currentTimestamp) {
    if (!this._isRunning) return;

    const dt = Math.min((currentTimestamp - this._lastTimestamp) / 1000, 0.1);
    this._lastTimestamp = currentTimestamp;

    // Update active systems
    for (const system of this._systems.values()) {
      if (typeof system.update === 'function' && system.isEnabled()) {
        system.update(dt);
      }
    }

    // Update current active page
    if (this._pageManager) {
      this._pageManager.update(dt);
    }

    requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this._isRunning = false;
  }
}

