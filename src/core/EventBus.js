/**
 * @file EventBus.js
 * @brief Strongly typed event dispatcher (C++ equivalent: EventDispatcher / Observer pattern).
 * Subscriptions are keyed by event class (`EventBus.subscribe(SaveLoadedEvent, cb)`),
 * dispatches take an event instance (`EventBus.dispatch(new SaveLoadedEvent(...))`).
 * String event names are not supported: every event is a class in src/core/events/.
 */

import { BaseObject } from './BaseObject.js';
import { BaseEvent } from './BaseEvent.js';
// Circular import with LocalizationManager is safe: `t` is only called at runtime.
import { t } from '../localization/LocalizationManager.js';

export class EventBus extends BaseObject {
  /** @private @type {EventBus|null} */
  static _instance = null;

  constructor() {
    super('EventBus', 'Core');
    /** @private @type {Map<string, Array<{callback: Function, context: any}>>} */
    this._listeners = new Map();
  }

  /** @returns {EventBus} */
  static getInstance() {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * Resolves the bus key of an event class.
   * @private
   * @param {typeof BaseEvent} eventClass
   * @returns {string}
   */
  _resolveKey(eventClass) {
    if (typeof eventClass !== 'function' || !eventClass.TYPE) {
      throw new TypeError(t('debug_eventbus_invalid_class'));
    }
    return eventClass.TYPE;
  }

  /**
   * Subscribes to an event class (C++: connect<TEvent>(lambda)).
   * @param {typeof BaseEvent} eventClass
   * @param {Function} callback - Receives the event instance
   * @param {any} [context=null] - Optional `this` binding
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventClass, callback, context = null) {
    const key = this._resolveKey(eventClass);
    if (!this._listeners.has(key)) {
      this._listeners.set(key, []);
    }
    this._listeners.get(key).push({ callback, context });
    return () => this.unsubscribe(eventClass, callback);
  }

  /**
   * @param {typeof BaseEvent} eventClass
   * @param {Function} callback
   */
  unsubscribe(eventClass, callback) {
    const key = this._resolveKey(eventClass);
    const list = this._listeners.get(key);
    if (!list) return;
    const index = list.findIndex((entry) => entry.callback === callback);
    if (index !== -1) list.splice(index, 1);
    if (list.length === 0) this._listeners.delete(key);
  }

  /**
   * Dispatches a typed event instance to every subscriber of its class.
   * A failing listener never prevents the others from running.
   * @param {BaseEvent} event
   */
  dispatch(event) {
    if (!(event instanceof BaseEvent)) {
      console.warn(t('debug_eventbus_unknown_event'), event);
      return;
    }
    const list = this._listeners.get(event.type);
    if (!list || list.length === 0) return;

    for (const entry of [...list]) {
      try {
        entry.callback.call(entry.context, event);
      } catch (err) {
        console.error(t('debug_eventbus_listener_error', { event: event.type }), err);
      }
    }
  }

  /**
   * Number of listeners currently registered for an event class (diagnostics / tests).
   * @param {typeof BaseEvent} eventClass
   * @returns {number}
   */
  listenerCount(eventClass) {
    const list = this._listeners.get(this._resolveKey(eventClass));
    return list ? list.length : 0;
  }

  onDestroy() {
    this._listeners.clear();
  }
}
