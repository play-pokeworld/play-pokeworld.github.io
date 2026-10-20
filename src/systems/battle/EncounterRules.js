/**
 * @file EncounterRules.js
 * @brief Wild Pokémon draw (C++: class EncounterRules): weighted rarity draw in the encounter
 * table of a location, uniform level in [minLevel, maxLevel], shiny roll of the original
 * (collection.js rollShiny: base rate × team talent multipliers; the regional Shiny Charm is
 * not ported yet).
 */
import { BattleConfig } from '../../config/BattleConfig.js';
import { BattleRules } from '../../config/BattleRules.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../../data/pokemon/PokemonFactory.js';

export class EncounterRules {
  /**
   * Shiny probability of a wild Pokémon (0..1).
   * @param {ReadonlyArray<import('../../data/pokemon/PokemonData.js').PokemonData>} team
   * @returns {number}
   */
  static shinyRate(team) {
    const talents = new Set(team.map((pokemon) => pokemon.talent).filter(Boolean));
    let rate = BattleRules.SHINY_BASE_RATE;
    for (const [talent, mult] of Object.entries(BattleRules.SHINY_TALENT_MULTS)) {
      if (talents.has(talent)) rate *= mult;
    }
    return Math.min(1, rate);
  }

  /**
   * @param {ReadonlyArray<{species: string, minLevel: number, maxLevel: number, rarity?: string}>} encounters
   * @param {ReadonlyArray<import('../../data/pokemon/PokemonData.js').PokemonData>} team
   * @param {import('../../core/Random.js').Random} random
   * @param {{bucketHint?:'common'|'uncommon'|'rare'|null}} [options]
   * @returns {import('../../data/pokemon/PokemonData.js').PokemonData|null}
   */
  static drawWild(encounters, team, random, { bucketHint = null } = {}) {
    if (encounters.length === 0) return null;
    let candidates = encounters;
    if (['common', 'uncommon', 'rare'].includes(bucketHint)) {
      const priority = ['rare', 'uncommon', 'common'];
      const start = priority.indexOf(bucketHint);
      const bucket = priority.slice(start).find((rarity) => encounters.some((candidate) => (candidate.rarity || 'common') === rarity));
      candidates = bucket ? encounters.filter((candidate) => (candidate.rarity || 'common') === bucket) : encounters;
    }
    const weightOf = (entry) => BattleConfig.RARITY_WEIGHTS[entry.rarity] ?? BattleConfig.RARITY_WEIGHTS.common;
    let roll = random.next() * candidates.reduce((sum, entry) => sum + weightOf(entry), 0);
    const entry = candidates.find((candidate) => (roll -= weightOf(candidate)) < 0) || candidates[0];
    if (!PokemonDB.getInstance().has(entry.species)) return null;
    const level = random.int(entry.minLevel, entry.maxLevel);
    const shiny = random.next() < EncounterRules.shinyRate(team);
    return PokemonFactory.create(entry.species, level, { shiny, random });
  }
}
