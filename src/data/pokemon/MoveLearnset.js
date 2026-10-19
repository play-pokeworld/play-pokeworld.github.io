/**
 * @file MoveLearnset.js
 * @brief Level-up moves of a Pokémon, derived from its types (C++: class MoveLearnset, static).
 *
 * Port of the original rules (game-helpers.js getSpeciesMovePool / getMovesForSpeciesLevel):
 * a move is in the pool of a species when its own type, or one of its `learnTypes`, matches a
 * type of the species (or learnTypes contains "all"). The pool is sorted: damaging same-type
 * moves first, then other damaging moves, then status moves; inside each group 100% accuracy
 * first, then lower rarity, then higher power. The first POOL_SIZE moves form the pool and a
 * Pokémon knows one more move every LEVEL_STEP levels (ACTIVE_SLOTS at most).
 */

import { MoveDB } from '../battle/MoveDB.js';
import { TypeChart } from '../core/TypeChart.js';
import { MoveConfig } from '../../config/MoveConfig.js';

/** @type {Map<string, string[]>} pool cache, keyed by the sorted type ids */
const poolCache = new Map();

/** Sort key of a move inside its group (original `sorter`). */
const compareMoves = (a, b) => {
  const aPerfect = (a.accuracy || 100) === 100;
  const bPerfect = (b.accuracy || 100) === 100;
  if (aPerfect !== bPerfect) return aPerfect ? -1 : 1;
  if (a.rarity !== b.rarity) return a.rarity - b.rarity;
  if (a.power !== b.power) return b.power - a.power;
  return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
};

export class MoveLearnset {
  /**
   * @param {string[]} types - Types of the species (any casing)
   * @returns {string[]} Move ids, best first (never empty)
   */
  static poolFor(types) {
    const typeIds = [...new Set((types || []).map((type) => TypeChart.normalize(type)).filter(Boolean))].sort();
    const key = typeIds.join('|');
    if (poolCache.has(key)) return poolCache.get(key);

    const sameType = [];
    const otherDamaging = [];
    const status = [];
    for (const move of MoveDB.getInstance().getAll()) {
      if (move.learnTypes.length === 0) continue; // signature moves are never drawn
      const isSameType = typeIds.includes(move.type);
      const isLearnable = isSameType || move.learnTypes.includes(MoveConfig.ANY_TYPE)
        || move.learnTypes.some((type) => typeIds.includes(type));
      if (!isLearnable) continue;
      if (move.power === 0) status.push(move);
      else if (isSameType) sameType.push(move);
      else otherDamaging.push(move);
    }
    const pool = [...sameType.sort(compareMoves), ...otherDamaging.sort(compareMoves), ...status.sort(compareMoves)]
      .slice(0, MoveConfig.POOL_SIZE)
      .map((move) => move.id);
    if (pool.length === 0) pool.push(MoveConfig.FALLBACK_MOVE_ID);
    poolCache.set(key, Object.freeze(pool));
    return poolCache.get(key);
  }

  /**
   * @param {number} level
   * @returns {number} Number of pool moves known at this level
   */
  static knownCountAt(level) {
    return Math.min(MoveConfig.POOL_SIZE, 1 + Math.floor((Math.max(1, level) - 1) / MoveConfig.LEVEL_STEP));
  }

  /**
   * @param {string[]} types
   * @param {number} level
   * @returns {string[]} Active moves (ACTIVE_SLOTS at most)
   */
  static movesForLevel(types, level) {
    const count = Math.min(MoveConfig.ACTIVE_SLOTS, MoveLearnset.knownCountAt(level));
    return MoveLearnset.poolFor(types).slice(0, count);
  }

  /**
   * Active moves of an owned or wild Pokémon: its stored moves when it has valid ones,
   * otherwise the level-up moves of its species.
   * @param {import('./PokemonData.js').PokemonData} pokemon
   * @returns {string[]}
   */
  static activeMovesOf(pokemon) {
    const db = MoveDB.getInstance();
    const stored = (pokemon.moves || [])
      .map((move) => (typeof move === 'string' ? move : move?.id))
      .filter((id) => id && db.getById(id))
      .slice(0, MoveConfig.ACTIVE_SLOTS);
    if (stored.length > 0) return stored;
    return MoveLearnset.movesForLevel(MoveLearnset.typesOf(pokemon), pokemon.level);
  }

  /**
   * Types of a Pokémon (of its form when it has one), lowercase ids.
   * @param {import('./PokemonData.js').PokemonData} pokemon
   * @returns {string[]}
   */
  static typesOf(pokemon) {
    return [...pokemon.getTypes()];
  }
}
