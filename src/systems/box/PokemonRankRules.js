/**
 * @file PokemonRankRules.js
 * @brief Original collection ranks, including explicit balance overrides and BST thresholds.
 */
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';

const RANK_ORDER = Object.freeze(['E', 'D', 'C', 'B', 'A', 'S', 'SS']);
const RANK_OVERRIDES = Object.freeze({
  10: 'E', 11: 'E', 13: 'E', 14: 'E', 129: 'E', 191: 'E',
  172: 'D', 173: 'D', 174: 'D', 175: 'D', 236: 'D', 238: 'D', 239: 'D', 240: 'D',
  132: 'B', 25: 'C', 83: 'C',
  113: 'A', 115: 'A', 122: 'A', 123: 'A', 127: 'A', 131: 'A', 143: 'A',
  149: 'S', 150: 'S', 151: 'S', 243: 'S', 244: 'S', 245: 'S', 248: 'S', 249: 'S', 250: 'S', 251: 'S'
});

export class PokemonRankRules {
  /** @param {string|import('../../data/pokemon/PokemonData.js').PokemonData} pokemon @returns {string} */
  static getRank(pokemon) {
    const speciesId = typeof pokemon === 'string' ? pokemon : pokemon?.species;
    const species = PokemonDB.getInstance().getById(speciesId);
    const dex = Number(species?.dex) || 0;
    if (RANK_OVERRIDES[dex]) return RANK_OVERRIDES[dex];
    const stats = species?.baseStats;
    const bst = stats
      ? Object.values(stats).reduce((sum, value) => sum + (Number(value) || 0), 0)
      : 300;
    if (bst < 250) return 'E';
    if (bst < 330) return 'D';
    if (bst < 420) return 'C';
    if (bst < 500) return 'B';
    if (bst < 580) return 'A';
    return 'S';
  }

  /** @param {string} rank @returns {number} Rank order; unknown values sort last */
  static rankValue(rank) {
    const index = RANK_ORDER.indexOf(rank);
    return index < 0 ? RANK_ORDER.length : index;
  }

  /** @returns {ReadonlyArray<string>} */
  static get order() {
    return RANK_ORDER;
  }
}
