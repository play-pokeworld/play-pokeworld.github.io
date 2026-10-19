/**
 * @file CatchEncounter.js
 * @brief Facts about a defeated wild Pokémon that the Poké Ball filters and the special balls
 * read (C++: class CatchEncounter). Immutable value built by CatchSystem from the save and the
 * battle; the rules (BallFilterMatcher, BallRateRules) stay pure functions of it.
 */
import { ROAMING_SPECIES } from '../../data/catch/RoamingSpecies.js';
import { EncounterKinds } from '../../data/catch/EncounterKinds.js';
import { LocationKinds } from '../../data/world/LocationKinds.js';

/** Evolution item of the Moon Ball condition (original STONE_EVO[id].moonstone). */
const MOON_STONE_ITEM = 'moonstone';

export class CatchEncounter {
  /**
   * @param {Object} facts
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} facts.pokemon - Wild Pokémon
   * @param {boolean} facts.owned - Same species and form in the team or the box
   * @param {boolean} facts.shinyOwned - Species already owned as a shiny
   * @param {string|null} [facts.locationKind=null] - LocationKinds value of the battle location
   * @param {string|null} [facts.weather=null] - Weathers value on the battlefield
   * @param {number} [facts.foeTurns=0] - Moves used by the wild Pokémon
   * @param {number} [facts.playerAttacks=0] - Moves used by the player against it
   */
  constructor({ pokemon, owned, shinyOwned, locationKind = null, weather = null, foeTurns = 0, playerAttacks = 0 }) {
    this.pokemon = pokemon;
    this.owned = !!owned;
    this.shinyOwned = !!shinyOwned;
    this.locationKind = locationKind;
    this.weather = weather;
    this.foeTurns = foeTurns;
    this.playerAttacks = playerAttacks;
    Object.freeze(this);
  }

  /** @returns {boolean} The encounter itself is shiny */
  get shiny() {
    return !!this.pokemon.shiny;
  }

  /** @returns {string[]} Types of the wild Pokémon */
  get types() {
    return this.pokemon.getTypes();
  }

  /** @returns {string} EncounterKinds value (original enemyEncounterType) */
  get encounterKind() {
    if (ROAMING_SPECIES.has(this.pokemon.species)) return EncounterKinds.ROAMING;
    return this.locationKind === LocationKinds.DUNGEON ? EncounterKinds.DUNGEON : EncounterKinds.ROUTE;
  }

  /** @returns {boolean} The species evolves with a Moon Stone */
  get evolvesWithMoonStone() {
    return (this.pokemon.getSpecies()?.evolutions ?? []).some((evolution) => evolution.item === MOON_STONE_ITEM);
  }

  /** @returns {boolean} Ultra Beast (no species of the data has the flag, as in the original) */
  get ultraBeast() {
    return this.pokemon.getSpecies()?.ultraBeast === true;
  }
}
