/**
 * @file BallFilterMatcher.js
 * @brief Does a wild Pokémon match a Poké Ball filter? (C++: class BallFilterMatcher, static),
 * port of the original filterMatches(). Every option present must hold; a filter without
 * options matches everything.
 */
export class BallFilterMatcher {
  /**
   * @param {import('../../data/save/BallFilterData.js').BallFilterData} filter
   * @param {import('./CatchEncounter.js').CatchEncounter} encounter
   * @returns {boolean}
   */
  static matches(filter, encounter) {
    const options = filter.options;
    if ('caught' in options && options.caught !== encounter.owned) return false;
    if ('shiny' in options && options.shiny !== encounter.shiny) return false;
    if ('caughtShiny' in options && options.caughtShiny !== encounter.shinyOwned) return false;
    if (options.type && !encounter.types.includes(options.type)) return false;
    if (options.encounter && options.encounter !== encounter.encounterKind) return false;
    return true;
  }
}
