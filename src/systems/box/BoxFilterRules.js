/**
 * @file BoxFilterRules.js
 * @brief Pure predicates for the original PC filters (region/type/shiny/evolution/favorite/lock/IV/EV/rank/forms/search).
 */
import { CaughtStatus } from '../../data/save/PokedexData.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { PokemonRankRules } from './PokemonRankRules.js';

const defaults = Object.freeze({
  region: 'all', type: 'all', shiny: 'all', evo: 'all', favorite: 'all', locked: 'all',
  iv: 'all', ev: 'all', rank: 'all', forms: 'all', search: ''
});

// The reference PC's "missing evolution" filter follows its established evolution target table,
// not every branch or trade/friendship evolution in the richer Rework evolution data. Keep these
// reference-specific omissions local to the PC predicate; they do not change gameplay evolution.
const FILTER_EXCLUDED_EVOLUTION_TARGETS = Object.freeze({
  eevee: Object.freeze(['espeon', 'umbreon']),
  golbat: Object.freeze(['crobat']),
  kadabra: Object.freeze(['alakazam']),
  machoke: Object.freeze(['machamp']),
  haunter: Object.freeze(['gengar']),
  chansey: Object.freeze(['blissey']),
  tyrogue: Object.freeze(['hitmonchan', 'hitmontop']),
  wurmple: Object.freeze(['cascoon']),
  nincada: Object.freeze(['shedinja'])
});

/** @param {Object} filters @param {string} key */
function filterValue(filters, key) {
  return typeof filters?.get === 'function' ? filters.get(key) : filters?.[key] ?? defaults[key];
}

/** @param {Object} pokemon @param {string} speciesId @param {Object} save @returns {boolean} */
function isOwnedOrCaught(save, speciesId) {
  return save.pokedex.isCaught(speciesId) ||
    save.collection.getAll().some((member) => member.species === speciesId);
}

/** @param {Object} spread @returns {number} */
function spreadTotal(spread) {
  return Object.values(spread || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export class BoxFilterRules {
  /**
   * @param {ReadonlyArray<import('../../data/pokemon/PokemonData.js').PokemonData>} entries
   * @param {Object} filters
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @param {{nameOf?:(pokemon:Object)=>string}} [options]
   * @returns {import('../../data/pokemon/PokemonData.js').PokemonData[]}
   */
  static filter(entries, filters, save, { nameOf = (pokemon) => pokemon.getDisplayName() } = {}) {
    const source = Array.isArray(entries) ? entries : [];
    return source.filter((pokemon) => BoxFilterRules.matches(pokemon, filters, save, { nameOf }));
  }

  /**
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {Object} filters
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @param {{nameOf?:(pokemon:Object)=>string}} [options]
   * @returns {boolean}
   */
  static matches(pokemon, filters, save, { nameOf = (entry) => entry.getDisplayName() } = {}) {
    if (!pokemon || !save) return false;
    const species = PokemonDB.getInstance().getById(pokemon.species);
    if (!species) return false;

    const region = filterValue(filters, 'region');
    if (region !== 'all' && species.region !== region) return false;
    const type = filterValue(filters, 'type');
    if (type !== 'all' && !pokemon.getTypes().includes(type)) return false;

    const speciesIsShiny = pokemon.shiny || save.pokedex.getCaughtStatus(pokemon.species) === CaughtStatus.SHINY;
    const shiny = filterValue(filters, 'shiny');
    if (shiny === 'shiny' && !speciesIsShiny) return false;
    if (shiny === 'normal' && speciesIsShiny) return false;

    if (filterValue(filters, 'forms') === 'forms' && !pokemon.form) return false;
    if (filterValue(filters, 'evo') === 'missing') {
      const excludedTargets = FILTER_EXCLUDED_EVOLUTION_TARGETS[species.id] || [];
      const hasMissingEvolution = species.evolutions.some((evolution) =>
        !excludedTargets.includes(evolution.to) && !isOwnedOrCaught(save, evolution.to)
      );
      if (!hasMissingEvolution) return false;
    }

    const favorite = filterValue(filters, 'favorite');
    if (favorite === 'favorite' && !pokemon.favorite) return false;
    if (favorite === 'not_favorite' && pokemon.favorite) return false;
    const locked = filterValue(filters, 'locked');
    if (locked === 'locked' && !pokemon.locked) return false;
    if (locked === 'unlocked' && pokemon.locked) return false;

    const ivTotal = spreadTotal(pokemon.ivs);
    if (filterValue(filters, 'iv') === 'complete' && ivTotal < 36) return false;
    if (filterValue(filters, 'iv') === 'incomplete' && ivTotal >= 36) return false;
    const evTotal = spreadTotal(pokemon.evs);
    if (filterValue(filters, 'ev') === 'complete' && evTotal < 36) return false;
    if (filterValue(filters, 'ev') === 'incomplete' && evTotal >= 36) return false;

    const rank = filterValue(filters, 'rank');
    if (rank !== 'all' && PokemonRankRules.getRank(pokemon) !== rank) return false;

    const query = String(filterValue(filters, 'search') || '').trim().toLocaleLowerCase();
    if (query) {
      const name = String(nameOf(pokemon) || '').toLocaleLowerCase();
      const haystack = `${name} ${pokemon.nickname || ''} ${pokemon.species} ${species.dex}`.toLocaleLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }

  /** @param {Object} pokemon @returns {number} */
  static ivTotal(pokemon) {
    return spreadTotal(pokemon?.ivs);
  }

  /** @param {Object} pokemon @returns {number} */
  static evTotal(pokemon) {
    return spreadTotal(pokemon?.evs);
  }
}
