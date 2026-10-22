/**
 * @file PokedexRules.js
 * @brief Stable, view-only Pokédex filter keys and sort directions.
 * These values do not change the save or gameplay model.
 */

export const PokedexFilterKeys = Object.freeze({
  REGION: 'region',
  TYPE: 'type',
  SHINY: 'shiny',
  RANK: 'rank',
  SEARCH: 'search',
  SORT: 'sort'
});

export const PokedexFilterValues = Object.freeze({
  ALL: 'all',
  SHINY: 'shiny',
  NORMAL: 'normal'
});

export const PokedexSorts = Object.freeze({
  DEX_ASC: 'number',
  DEX_DESC: 'number_desc',
  NAME_ASC: 'name',
  NAME_DESC: 'name_desc',
  RANK_DESC: 'rank',
  RANK_ASC: 'rank_asc'
});

/** The original Pokédex rank filter stops at S; PC rank filtering has its own extended list. */
export const DEFAULT_POKEDEX_REGION = 'kanto';
export const POKEDEX_RANKS = Object.freeze(['E', 'D', 'C', 'B', 'A', 'S']);

export const DEFAULT_POKEDEX_FILTERS = Object.freeze({
  [PokedexFilterKeys.REGION]: PokedexFilterValues.ALL,
  [PokedexFilterKeys.TYPE]: PokedexFilterValues.ALL,
  [PokedexFilterKeys.SHINY]: PokedexFilterValues.ALL,
  [PokedexFilterKeys.RANK]: PokedexFilterValues.ALL,
  [PokedexFilterKeys.SEARCH]: '',
  [PokedexFilterKeys.SORT]: PokedexSorts.DEX_ASC
});
