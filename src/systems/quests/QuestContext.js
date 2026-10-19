/**
 * @file QuestContext.js
 * @brief Read-only view of a save given to the quest objectives (C++: class QuestContext).
 * Objectives never touch SaveData directly: every question they may ask is a method here,
 * which keeps them testable with a fake context.
 */
import { LocationDB } from '../../data/world/LocationDB.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';

export class QuestContext {
  /**
   * @param {import('../../data/save/SaveData.js').SaveData} save
   */
  constructor(save) {
    /** @private */
    this._save = save;
  }

  /** @returns {string} Region the player is in */
  get region() {
    return this._save.player.region;
  }

  /**
   * @param {string} locationA
   * @param {string} locationB
   * @returns {boolean} Same location, or two locations of the same quest group
   */
  sameLocationGroup(locationA, locationB) {
    if (!locationA || !locationB) return false;
    const locations = LocationDB.getInstance();
    return locations.getGroup(locationA) === locations.getGroup(locationB);
  }

  /** @param {string} badgeId @returns {boolean} */
  hasBadge(badgeId) {
    return this._save.player.hasBadge(badgeId);
  }

  /** @param {string} itemId @returns {number} */
  itemCount(itemId) {
    return this._save.inventory.count(itemId);
  }

  /** @param {string} trainerId @returns {number} */
  trainerWins(trainerId) {
    return this._save.statistics.trainerWins[trainerId] || 0;
  }

  /** @param {string} region @returns {number} */
  wildWinsInRegion(region) {
    return this._save.statistics.wildWinsInRegion(region);
  }

  /**
   * @param {string} region
   * @returns {number} Species of the region marked caught in the Pokédex
   */
  caughtInRegion(region) {
    return PokemonDB.getInstance().getByRegion(region).filter((species) => this._save.pokedex.isCaught(species.id)).length;
  }

  /** @param {string} speciesId @returns {boolean} */
  ownsSpecies(speciesId) {
    return this._save.team.some((pokemon) => pokemon.species === speciesId);
  }

  /** @param {string} speciesId @returns {boolean} */
  hasCaught(speciesId) {
    return this._save.pokedex.isCaught(speciesId);
  }

  /** @param {string} region @returns {boolean} */
  hasWonLeague(region) {
    return this._save.statistics.leaguesWon.includes(region);
  }
}
