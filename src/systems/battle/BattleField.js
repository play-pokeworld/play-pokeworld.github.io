/**
 * @file BattleField.js
 * @brief Weather and terrain of a battle (C++: class BattleField). As in the original, screens
 * and rooms share the weather slot; when a timed weather ends, the location default weather
 * (permanent) comes back.
 */
export class BattleField {
  /**
   * @param {string|null} [defaultWeather=null] - Permanent weather of the location
   */
  constructor(defaultWeather = null) {
    /** @type {string|null} */
    this.defaultWeather = defaultWeather;
    /** @type {string|null} */
    this.weather = defaultWeather;
    /** Remaining turns (Infinity for the default weather). */
    this.weatherTurns = defaultWeather ? Infinity : 0;
    /** @type {string|null} */
    this.terrain = null;
    this.terrainTurns = 0;
  }

  /** @param {string} weather @param {number} turns */
  setWeather(weather, turns) {
    this.weather = weather;
    this.weatherTurns = turns;
  }

  /** @param {string} terrain @param {number} turns */
  setTerrain(terrain, turns) {
    this.terrain = terrain;
    this.terrainTurns = turns;
  }

  /**
   * One turn passes (original doPlayerMove weather / terrain countdown).
   * @returns {{weatherEnded: boolean, terrainEnded: boolean}}
   */
  tick() {
    let weatherEnded = false;
    let terrainEnded = false;
    if (this.weather && this.weatherTurns !== Infinity) {
      this.weatherTurns--;
      if (this.weatherTurns <= 0) {
        this.weather = this.defaultWeather;
        this.weatherTurns = this.defaultWeather ? Infinity : 0;
        weatherEnded = true;
      }
    }
    if (this.terrain) {
      this.terrainTurns--;
      if (this.terrainTurns <= 0) {
        this.terrain = null;
        this.terrainTurns = 0;
        terrainEnded = true;
      }
    }
    return { weatherEnded, terrainEnded };
  }
}
