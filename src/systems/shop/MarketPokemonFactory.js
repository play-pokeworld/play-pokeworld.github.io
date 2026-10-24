/** @file MarketPokemonFactory.js @brief Prepare a whole purchase before payment; canonical creation with collision-safe UIDs. */
import { MarketRules } from '../../config/MarketRules.js';
import { PokemonFactory } from '../../data/pokemon/PokemonFactory.js';
import { SpeciesOwnership } from '../catch/SpeciesOwnership.js';
import { EncounterRules } from '../battle/EncounterRules.js';

export class MarketPokemonFactory {
  /** @param {Object} save @param {string} speciesId @param {number} quantity @param {Object} random @returns {Object[]|null} */
  static createBatch(save, speciesId, quantity, random) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
    const ids = new Set(save.collection.getAll().map((pokemon) => pokemon.uid));
    let shinyUnlocked = SpeciesOwnership.isShinyUnlocked(save, speciesId);
    const rate = EncounterRules.shinyRate(save.team),
      batch = [];
    for (let index = 0; index < quantity; index++) {
      const rolled = random.next() < rate;
      shinyUnlocked = shinyUnlocked || rolled;
      const pokemon = PokemonFactory.create(speciesId, MarketRules.LEVEL, {
        random,
        shiny: shinyUnlocked,
      });
      if (!pokemon) return null;
      const base = pokemon.uid;
      let suffix = 0;
      while (ids.has(pokemon.uid)) pokemon.uid = `${base}_${++suffix}`;
      ids.add(pokemon.uid);
      batch.push(pokemon);
    }
    if (shinyUnlocked)
      for (const pokemon of batch) if (!pokemon.shiny) pokemon.setShiny(true);
    return batch;
  }
}
