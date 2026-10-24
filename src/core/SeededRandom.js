/**
 * @file SeededRandom.js
 * @brief Serializable xorshift32 random stream for resumable finite battle sessions.
 */
import { Random } from './Random.js';

export class SeededRandom extends Random {
  /** @param {number} seed */
  constructor(seed) {
    super();
    this._state = Number(seed) >>> 0 || 1;
  }
  /** @override @returns {number} */
  next() {
    let value = this._state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this._state = value >>> 0;
    return this._state / 4294967296;
  }
  /** @returns {number} */
  getState() { return this._state; }
}
