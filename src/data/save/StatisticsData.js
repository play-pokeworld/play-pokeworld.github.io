/**
 * @file StatisticsData.js
 * @brief World progress counters of a save (C++: class StatisticsData : public BaseModel).
 * Written by the systems that own the action (BattleSystem, MineSystem…) BEFORE they dispatch
 * the matching event, so listeners (QuestSystem, achievements) always read up-to-date values.
 *
 * Serialized shape (save schema 12; league titles remain region ids, never Gym badge ids):
 *   { wildWins: { <locationId>: n }, capturesByLocation: { <locationId>: n },
 *     trainerWins: { <trainerId>: n }, solvedPuzzles: [ids], leaguesWon: [regions],
 *     caughtTotal, duplicateCatches: { <species>: n }, hatcheryLevel, trainingSessions }
 */
import { BaseModel } from '../core/BaseModel.js';
import { LocationDB } from '../world/LocationDB.js';

/** @param {*} raw @returns {Record<string, number>} */
const readCounters = (raw) => {
  const out = {};
  for (const [key, value] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
    const count = Math.floor(Number(value) || 0);
    if (count > 0) out[key] = count;
  }
  return out;
};

export class StatisticsData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('StatisticsData', 'Data');
    this.deserialize(data);
  }

  /** @param {string} locationId */
  recordWildWin(locationId) {
    this.wildWins[locationId] = (this.wildWins[locationId] || 0) + 1;
  }

  /** One more Pokémon caught (original G.stats caught counter), duplicates included. @param {string|null} [locationId] */
  recordCatch(locationId = null) {
    this.caughtTotal++;
    if (typeof locationId === 'string' && locationId) {
      this.capturesByLocation[locationId] = (this.capturesByLocation[locationId] || 0) + 1;
    }
  }

  /** @param {string} locationId @returns {number} Captures made at this location */
  capturesInLocation(locationId) {
    return this.capturesByLocation[locationId] || 0;
  }

  /**
   * A species already owned was caught again (original G.dupeCatches).
   * @param {string} species
   */
  recordDuplicateCatch(species) {
    this.duplicateCatches[species] = (this.duplicateCatches[species] || 0) + 1;
  }

  /** @param {string} trainerId */
  recordTrainerWin(trainerId) {
    this.trainerWins[trainerId] = (this.trainerWins[trainerId] || 0) + 1;
  }

  /** @param {number} [levels=1] */
  recordHatcheryLevels(levels = 1) {
    this.hatcheryLevel += Math.max(0, Math.floor(Number(levels) || 0));
  }

  /** @param {number} [sessions=1] */
  recordTrainingSession(sessions = 1) {
    this.trainingSessions += Math.max(0, Math.floor(Number(sessions) || 0));
  }

  /**
   * Shop purchase (Master Ball price steps, Honor Ball bonus).
   * @param {string} itemId
   * @param {number} quantity
   */
  recordPurchase(itemId, quantity) {
    this.purchases[itemId] = (this.purchases[itemId] || 0) + Math.max(0, Math.floor(quantity));
  }

  /** @param {string} puzzleId */
  recordPuzzle(puzzleId) {
    if (!this.solvedPuzzles.includes(puzzleId)) this.solvedPuzzles.push(puzzleId);
  }

  /** @param {string} region @returns {boolean} */
  hasWonLeague(region) {
    return typeof region === 'string' && this.leaguesWon.includes(region);
  }

  /** @param {string} region */
  recordLeague(region) {
    if (typeof region === 'string' && region && !this.leaguesWon.includes(region)) this.leaguesWon.push(region);
  }

  /**
   * @param {string} locationId
   * @returns {number} Wild wins at every location of the same group
   */
  wildWinsInGroup(locationId) {
    const locations = LocationDB.getInstance();
    const group = locations.getGroup(locationId);
    let total = 0;
    for (const [id, count] of Object.entries(this.wildWins)) if (locations.getGroup(id) === group) total += count;
    return total;
  }

  /**
   * @param {string} region
   * @returns {number} Wild wins in every location of the region
   */
  wildWinsInRegion(region) {
    const locations = LocationDB.getInstance();
    let total = 0;
    for (const [id, count] of Object.entries(this.wildWins)) if (locations.getById(id)?.region === region) total += count;
    return total;
  }

  /** @override */
  serialize() {
    return {
      wildWins: { ...this.wildWins },
      capturesByLocation: { ...this.capturesByLocation },
      trainerWins: { ...this.trainerWins },
      solvedPuzzles: [...this.solvedPuzzles],
      leaguesWon: [...this.leaguesWon],
      caughtTotal: this.caughtTotal,
      duplicateCatches: { ...this.duplicateCatches },
      purchases: { ...this.purchases },
      hatcheryLevel: this.hatcheryLevel,
      trainingSessions: this.trainingSessions
    };
  }

  /** @override */
  deserialize(data = {}) {
    const raw = data || {};
    /** @type {Record<string, number>} */
    this.wildWins = readCounters(raw.wildWins);
    /** @type {Record<string, number>} */
    this.capturesByLocation = readCounters(raw.capturesByLocation);
    /** @type {Record<string, number>} */
    this.trainerWins = readCounters(raw.trainerWins);
    /** @type {string[]} */
    this.solvedPuzzles = Array.isArray(raw.solvedPuzzles) ? raw.solvedPuzzles.filter((id) => typeof id === 'string') : [];
    /** @type {string[]} */
    this.leaguesWon = Array.isArray(raw.leaguesWon) ? raw.leaguesWon.filter((id) => typeof id === 'string') : [];
    this.caughtTotal = Math.max(0, Math.floor(Number(raw.caughtTotal) || 0));
    /** @type {Record<string, number>} */
    this.duplicateCatches = readCounters(raw.duplicateCatches);
    this.hatcheryLevel = Math.max(0, Math.floor(Number(raw.hatcheryLevel) || 0));
    this.trainingSessions = Math.max(0, Math.floor(Number(raw.trainingSessions) || 0));
    /** @type {Record<string, number>} Items bought in shops */
    this.purchases = readCounters(raw.purchases);
  }
}
