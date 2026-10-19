/**
 * @file Random.js
 * @brief Injectable random source (C++: class Random).
 * Game rules never call Math.random() directly: they take a Random so tests can replay a
 * sequence with Random.sequence([...]).
 */
export class Random {
  /** @private @type {Random|null} */
  static _default = null;

  /**
   * @param {() => number} [source=Math.random] - Returns a float in [0, 1)
   */
  constructor(source = Math.random) {
    /** @private */
    this._source = source;
  }

  /** @returns {number} Float in [0, 1) */
  next() {
    return this._source();
  }

  /**
   * Inclusive integer range (original `rand(min, max)`).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * @param {number} percent - 0..100
   * @returns {boolean} true with `percent`% probability (original `chance(p)`)
   */
  chance(percent) {
    return this.next() * 100 < percent;
  }

  /**
   * @template T
   * @param {ReadonlyArray<T>} list
   * @returns {T|undefined}
   */
  pick(list) {
    return list.length ? list[this.int(0, list.length - 1)] : undefined;
  }

  /** @returns {Random} Shared Math.random based instance */
  static get default() {
    if (!Random._default) Random._default = new Random();
    return Random._default;
  }

  /**
   * Deterministic source for tests: returns the values in order, then loops.
   * @param {number[]} values - Floats in [0, 1)
   * @returns {Random}
   */
  static sequence(values) {
    let index = 0;
    return new Random(() => values[index++ % values.length]);
  }
}
