/**
 * @file BaseEvent.js
 * @brief Base class for all game events (C++ equivalent: struct IEvent / class BaseEvent).
 */

export class BaseEvent {
  /**
   * @param {string} type - Unique identifier name of the event
   * @param {Object} [sender=null] - Optional sender instance reference
   */
  constructor(type, sender = null) {
    /** @public @type {string} */
    this.type = type;

    /** @public @type {Object|null} */
    this.sender = sender;

    /** @public @type {number} */
    this.timestamp = Date.now();
  }

  /**
   * Gets the event type name.
   * @returns {string}
   */
  getType() {
    return this.type;
  }
}

