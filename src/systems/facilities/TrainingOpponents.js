/**
 * @file TrainingOpponents.js
 * @brief Builds the sparring waves of a training session.
 *
 * Replaces the original six-species, type-matched pools (training-opponents-data.js): a session is
 * a ladder of TrainingRules.OPPONENT_COUNT waves drawn from the rank of the trained Pokémon
 * (PokemonRankRules: E–S by base stat total, the same rank the PC shows), with a level curve that
 * starts at WAVE_LEVEL_FACTOR_MIN and ends at WAVE_LEVEL_FACTOR_MAX of the trainee (plus the level
 * shift of the mode). Legendaries and the trainee's own species are never sparring partners, and a
 * species appears at most once per session.
 *
 * The wave count and the level curve are deterministic for a given Random, so the AFK replay of a
 * session is exact.
 */

import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../../data/pokemon/PokemonFactory.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { TrainingRules } from '../../config/TrainingRules.js';
import { PokemonRankRules } from '../box/PokemonRankRules.js';
import { StaffRules } from '../../config/StaffRules.js';

/** @type {Map<string, string[]>} species ids per rank, without legendaries */
const rankCache = new Map();

export class TrainingOpponents {
  /**
   * Species ids of a rank, without legendaries.
   * @param {string} rank @returns {string[]}
   */
  static speciesOfRank(rank) {
    if (!rankCache.has(rank)) {
      const db = PokemonDB.getInstance();
      rankCache.set(rank, db.getAll()
        .filter((species) => !PokemonRules.LEGENDARY_DEX.includes(species.dex) &&
          PokemonRankRules.getRank(species.id) === rank)
        .map((species) => species.id));
    }
    return rankCache.get(rank);
  }
  /**
   * Species of the trainee's rank first, then its neighbouring ranks: a tier is always taken as a
   * whole before falling back to the next one, so a session stays inside the class of the trainee
   * whenever that class has enough species.
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} trainee
   * @returns {string[][]} Species ids per tier, closest rank first
   */
  static tiers(trainee) {
    const traineeSpecies = trainee.species || trainee.getSpecies().id;
    const rank = PokemonRankRules.getRank(trainee);
    const order = PokemonRankRules.order;
    const index = Math.max(0, order.indexOf(rank));
    const ranks = [rank];
    for (let distance = 1; distance < order.length; distance++) {
      if (order[index + distance]) ranks.push(order[index + distance]);
      if (order[index - distance]) ranks.push(order[index - distance]);
    }
    return ranks
      .map((current) => TrainingOpponents.speciesOfRank(current).filter((id) => id !== traineeSpecies))
      .filter((ids) => ids.length > 0);
  }
  /**
   * All the species a trainee can meet, closest rank first.
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} trainee
   * @returns {string[]} Species ids
   */
  static candidates(trainee) {
    return TrainingOpponents.tiers(trainee).flat();
  }
  /**
   * Number of waves of a session, staff included: the best training staff member cuts
   * MAX_STAFF_OPPONENT_REDUCTION waves (30 at level 1, 24 at max level).
   * @param {number} [staffLevel=1] @returns {number}
   */
  static waveCount(staffLevel = 1) {
    const level = Math.max(1, Math.min(StaffRules.MAX_LEVEL, Number(staffLevel) || 1));
    const reduction = Math.round(TrainingRules.MAX_STAFF_OPPONENT_REDUCTION * (level - 1) / Math.max(1, StaffRules.MAX_LEVEL - 1));
    return Math.max(TrainingRules.MIN_STAFF_OPPONENT_COUNT, TrainingRules.OPPONENT_COUNT - reduction);
  }
  /**
   * Level of one wave.
   * @param {number} traineeLevel
   * @param {string} mode
   * @param {number} waveIndex - 0-based
   * @param {number} waveCount
   * @returns {number}
   */
  static levelFor(traineeLevel, mode, waveIndex, waveCount) {
    const base = Math.max(1, traineeLevel + (TrainingRules.MODE_LEVEL_OFFSETS[mode] || 0));
    const span = TrainingRules.WAVE_LEVEL_FACTOR_MAX - TrainingRules.WAVE_LEVEL_FACTOR_MIN;
    const ratio = waveCount <= 1 ? TrainingRules.WAVE_LEVEL_FACTOR_MIN
      : TrainingRules.WAVE_LEVEL_FACTOR_MIN + span * (waveIndex / (waveCount - 1));
    const variation = TrainingRules.LEVEL_VARIATION[waveIndex % TrainingRules.LEVEL_VARIATION.length];
    return Math.max(TrainingRules.MIN_OPPONENT_LEVEL,
      Math.min(PokemonRules.MAX_LEVEL, Math.round(base * ratio) + variation));
  }
  /**
   * Sparring waves of a session, in order (the last one is the hardest).
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} trainee
   * @param {string} mode
   * @param {number} waveCount
   * @param {import('../../core/Random.js').Random} random
   * @returns {import('../../data/pokemon/PokemonData.js').PokemonData[]}
   */
  static create(trainee, mode, waveCount, random) {
    const count = Math.max(1, waveCount);
    const waves = [];
    const picked = new Set();
    for (const tier of TrainingOpponents.tiers(trainee)) {
      // Deterministic shuffle of the tier (Fisher-Yates on the injected Random).
      const shuffled = [...tier];
      for (let index = shuffled.length - 1; index > 0; index--) {
        const swap = random.int(0, index);
        [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
      }
      for (const speciesId of shuffled) {
        if (waves.length >= count) break;
        if (picked.has(speciesId)) continue;
        picked.add(speciesId);
        const level = TrainingOpponents.levelFor(trainee.level, mode, waves.length, count);
        const foe = PokemonFactory.create(speciesId, level, { random });
        if (foe) waves.push(foe);
      }
      if (waves.length >= count) break;
    }
    return waves;
  }
}
