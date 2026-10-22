/**
 * @file EncounterRules.js
 * @brief Pure rules for roaming and local wild encounters, uniform levels, and shiny rolls.
 */
import { BattleConfig } from '../../config/BattleConfig.js';
import { BattleRules } from '../../config/BattleRules.js';
import { RoamingRules } from '../../config/RoamingRules.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../../data/pokemon/PokemonFactory.js';

const BUCKET_PRIORITY = Object.freeze(['rare', 'uncommon', 'common']);
const VALID_BUCKETS = new Set(BUCKET_PRIORITY);

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
   * Resolve one wild encounter, retaining whether it was selected from the roaming pool.
   * Free spawns always consume the roaming roll, even on a route without a roamer, so scripted
   * Random streams stay consistent. A forced dungeon bucket suppresses roaming entirely.
   *
   * @param {ReadonlyArray<{species: string, minLevel: number, maxLevel: number, rarity?: string}>} encounters
   * @param {ReadonlyArray<import('../../data/pokemon/PokemonData.js').PokemonData>} team
   * @param {import('../../core/Random.js').Random} random
   * @param {{bucketHint?:'common'|'uncommon'|'rare'|null,roamingSpecies?:string|null}} [options]
   * @returns {{pokemon:import('../../data/pokemon/PokemonData.js').PokemonData,isRoaming:boolean,bucket:string}|null}
   */
  static drawWildEncounter(encounters, team, random, { bucketHint = null, roamingSpecies = null } = {}) {
    const forcedBucket = VALID_BUCKETS.has(bucketHint) ? bucketHint : null;
    if (!forcedBucket) {
      const roamingRoll = random.next();
      if (roamingSpecies && roamingRoll < RoamingRules.ENCOUNTER_CHANCE) {
        const species = PokemonDB.getInstance().getById(roamingSpecies);
        if (species) {
          const shiny = random.next() < EncounterRules.shinyRate(team);
          const pokemon = PokemonFactory.create(roamingSpecies, RoamingRules.ENCOUNTER_LEVEL, { shiny, random });
          if (pokemon) return { pokemon, isRoaming: true, bucket: 'roaming' };
        }
      }
    }
    if (encounters.length === 0) return null;

    let candidates = encounters;
    if (forcedBucket) {
      const priorityStart = BUCKET_PRIORITY.indexOf(forcedBucket);
      candidates = BUCKET_PRIORITY.slice(priorityStart)
        .map((bucket) => encounters.filter((entry) => (entry.rarity || 'common') === bucket))
        .find((bucketEntries) => bucketEntries.length > 0) || [...encounters];
    }
    const weightOf = (candidate) => BattleConfig.RARITY_WEIGHTS[candidate.rarity] ?? BattleConfig.RARITY_WEIGHTS.common;
    let roll = random.next() * candidates.reduce((sum, candidate) => sum + weightOf(candidate), 0);
    const entry = candidates.find((candidate) => (roll -= weightOf(candidate)) < 0) || candidates[0];
    if (!entry || !PokemonDB.getInstance().has(entry.species)) return null;

    const level = random.int(entry.minLevel, entry.maxLevel);
    const shiny = random.next() < EncounterRules.shinyRate(team);
    const pokemon = PokemonFactory.create(entry.species, level, { shiny, random });
    return pokemon ? { pokemon, isRoaming: false, bucket: entry.rarity || 'common' } : null;
  }

  /**
   * Draws a one-off local quest opponent uniformly from the supplied pool.
   * Unlike ordinary exploration, this flow does not roll rarity or shininess and never starts a chain.
   * @param {ReadonlyArray<{species:string,minLevel:number,maxLevel:number}>} encounters
   * @param {import('../../core/Random.js').Random} random
   * @returns {{pokemon:import('../../data/pokemon/PokemonData.js').PokemonData,encounter:Object}|null}
   */
  static drawQuestBattle(encounters, random) {
    if (!Array.isArray(encounters) || !random || typeof random.pick !== 'function' || typeof random.int !== 'function') return null;
    const candidates = encounters.filter((entry) => entry && PokemonDB.getInstance().has(entry.species));
    const entry = random.pick(candidates);
    if (!entry) return null;
    const minLevel = Math.max(1, Math.floor(Number(entry.minLevel) || 1));
    const maxLevel = Math.max(minLevel, Math.floor(Number(entry.maxLevel) || minLevel));
    const level = random.int(minLevel, maxLevel);
    const pokemon = PokemonFactory.create(entry.species, level, { random });
    return pokemon ? { pokemon, encounter: entry } : null;
  }

  /**
   * Compatibility convenience for callers that only need the Pokémon object.
   * @param {ReadonlyArray<{species: string, minLevel: number, maxLevel: number, rarity?: string}>} encounters
   * @param {ReadonlyArray<import('../../data/pokemon/PokemonData.js').PokemonData>} team
   * @param {import('../../core/Random.js').Random} random
   * @param {{bucketHint?:'common'|'uncommon'|'rare'|null,roamingSpecies?:string|null}} [options]
   * @returns {import('../../data/pokemon/PokemonData.js').PokemonData|null}
   */
  static drawWild(encounters, team, random, options = {}) {
    return EncounterRules.drawWildEncounter(encounters, team, random, options)?.pokemon ?? null;
  }

}
