/**
 * @file MigrationV16ToV17.js
 * @brief Adds persistent facility management and species talent unlocks without moving Pokémon.
 */
import { PokemonDB } from '../../pokemon/PokemonDB.js';
import { TalentDB } from '../../pokemon/TalentDB.js';

export const MigrationV16ToV17 = Object.freeze({
  from: 16,
  to: 17,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const talents = Object.fromEntries(Object.entries(raw.talents || {})
      .map(([species, ids]) => [species, Array.isArray(ids) ? [...ids] : []]));
    for (const pokemon of Array.isArray(raw.collection) ? raw.collection : []) {
      if (!PokemonDB.getInstance().has(pokemon?.species) || !TalentDB.getInstance().has(pokemon?.talent)) continue;
      const ids = talents[pokemon.species] || (talents[pokemon.species] = []);
      if (!ids.includes(pokemon.talent)) ids.push(pokemon.talent);
    }
    return {
      ...raw,
      version: 17,
      hatchery: { ...raw.hatchery, queues: raw.hatchery?.queues || [], queueLevel: raw.hatchery?.queueLevel || 0 },
      mine: { ...raw.mine, unlockedTools: raw.mine?.unlockedTools || ['chisel', 'hammer'] },
      training: raw.training || { maxSlots: 1, queueLevel: 0, slots: [] },
      talents,
      staff: raw.staff || {}
    };
  }
});
