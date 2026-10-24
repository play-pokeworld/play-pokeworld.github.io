/** @file FacilityCandidateRules.js @brief Pure reference filters and ordering, applied after canonical usage locks. */
import { PokemonRules } from '../../config/PokemonRules.js';
import { FacilityFilterRules } from '../../config/FacilityFilterRules.js';
import { TrainingProgression } from './TrainingProgression.js';
export class FacilityCandidateRules {
  /** @param {Object} pokemon @param {string} key @returns {number} */
  static total(pokemon, key) {
    return PokemonRules.STAT_KEYS.reduce(
      (sum, stat) => sum + (pokemon[key]?.[stat] || 0),
      0,
    );
  }
  /** @param {Object} pokemon @param {Object} filters @returns {boolean} */
  static matches(pokemon, filters) {
    const iv = this.total(pokemon, 'ivs'),
      ev = this.total(pokemon, 'evs');
    if (
      (filters.filterShiny === 'shiny' && !pokemon.shiny) ||
      (filters.filterShiny === 'non_shiny' && pokemon.shiny)
    )
      return false;
    const favorite = pokemon.favorite || pokemon.locked;
    if (
      (filters.filterFav === 'fav_only' && !favorite) ||
      (filters.filterFav === 'no_fav' && favorite)
    )
      return false;
    const completeIv =
        iv >= PokemonRules.IV_MAX * PokemonRules.STAT_KEYS.length,
      completeEv = ev >= PokemonRules.EV_TOTAL_MAX;
    if (
      (filters.filterIv === 'complete' && !completeIv) ||
      (filters.filterIv === 'incomplete' && completeIv)
    )
      return false;
    if (
      (filters.filterEv === 'complete' && !completeEv) ||
      (filters.filterEv === 'incomplete' && completeEv)
    )
      return false;
    if (
      (filters.filterRank === 'S_or_better' &&
        iv < FacilityFilterRules.RANK_IV_MIN) ||
      (filters.filterRank === 'A_or_worse' &&
        iv >= FacilityFilterRules.RANK_IV_MIN)
    )
      return false;
    const region = FacilityFilterRules.REGIONS.find(
      (entry) => pokemon.getSpecies().dex <= entry.max,
    )?.id;
    if (
      filters.filterRegion &&
      filters.filterRegion !== 'all' &&
      filters.filterRegion !== region
    )
      return false;
    return (
      !filters.filterType ||
      filters.filterType === 'all' ||
      pokemon.getTypes().includes(filters.filterType)
    );
  }
  /** @param {Object} save @param {Object[]} candidates @param {Object} filters @returns {Object[]} */
  static select(save, candidates, filters) {
    const records = candidates
      .filter((entry) => this.matches(entry.pokemon, filters))
      .map((entry) => {
        const pokemon = entry.pokemon,
          species = pokemon.getSpecies();
        return {
          ...entry,
          iv: this.total(pokemon, 'ivs'),
          ev: this.total(pokemon, 'evs'),
          dex: species.dex,
          missingTalents:
            filters.sort === 'talent_missing'
              ? species.talents.filter(
                  (id) =>
                    id !== species.hiddenTalent &&
                    !save.talents.has(species.id, id),
                ).length
              : 0,
          missingMoves:
            filters.sort === 'move_missing'
              ? TrainingProgression.availableMoves(pokemon).length
              : 0,
        };
      });
    if (filters.sort === 'legacy') return records;
    return records.sort((a, b) => {
      const level = a.pokemon.level - b.pokemon.level;
      const diff =
        filters.sort === 'iv_asc'
          ? a.iv - b.iv || a.dex - b.dex
          : filters.sort === 'iv_desc'
            ? b.iv - a.iv || -level
            : filters.sort === 'ev_desc'
              ? b.ev - a.ev || a.dex - b.dex
              : filters.sort === 'ev_asc'
                ? a.ev - b.ev || level
                : filters.sort === 'level_desc'
                  ? -level ||
                    (filters.filterIv != null ? b.iv - a.iv : a.ev - b.ev)
                  : filters.sort === 'level_asc'
                    ? level ||
                      (filters.filterIv != null ? a.iv - b.iv : a.ev - b.ev)
                    : filters.sort === 'talent_missing'
                      ? b.missingTalents - a.missingTalents || a.ev - b.ev
                      : filters.sort === 'move_missing'
                        ? b.missingMoves - a.missingMoves || a.ev - b.ev
                        : filters.sort === 'level_missing'
                          ? Number(b.pokemon.level < PokemonRules.MAX_LEVEL) -
                              Number(
                                a.pokemon.level < PokemonRules.MAX_LEVEL,
                              ) || level
                          : a.dex - b.dex;
      return diff;
    });
  }
}
