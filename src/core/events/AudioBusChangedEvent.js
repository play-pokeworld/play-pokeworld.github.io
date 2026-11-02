/**
 * @file AudioBusChangedEvent.js
 * @brief Emitted by PreferencesSystem when an audio bus volume or mute state changes.
 */

import { BaseEvent } from '../BaseEvent.js';

export class AudioBusChangedEvent extends BaseEvent {
  static TYPE = 'AudioBusChangedEvent';

  /**
   * @param {string} busId - One of AUDIO_BUSES ('music', 'sfx', 'cries')
   * @param {{on: boolean, volume: number}} state
   */
  constructor(busId, state) {
    super(AudioBusChangedEvent.TYPE);
    /** @type {string} */
    this.busId = busId;
    /** @type {{on: boolean, volume: number}} */
    this.state = state;
  }
}
