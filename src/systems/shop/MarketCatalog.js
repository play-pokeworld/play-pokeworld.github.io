/** @file MarketCatalog.js @brief Read-only regional Pokémon offers, derived from stock, wild tables and evolution definitions. */
import { MarketRules } from '../../config/MarketRules.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { LocationDB } from '../../data/world/LocationDB.js';
import { SpeciesOwnership } from '../catch/SpeciesOwnership.js';
import { ShopOfferKinds } from './ShopOfferKinds.js';

export class MarketCatalog {
  /** @param {string} speciesId @returns {string} */
  static category(speciesId) {
    return (
      MarketRules.CATEGORY_ORDER.find((id) =>
        MarketRules.CATEGORIES[id]?.includes(speciesId),
      ) || 'other'
    );
  }
  /** @param {string} speciesId @returns {number} Quest points, never the obsolete money price. */
  static price(speciesId) {
    const species = PokemonDB.getInstance().getById(speciesId);
    if (!species) return 0;
    const band = MarketRules.REGION_PRICE_BANDS.find(
      (entry) => species.dex >= entry.minDex,
    );
    return band
      ? MarketRules.CATEGORIES.starter.includes(speciesId)
        ? band.starterPrice
        : band.otherPrice
      : 0;
  }
  /** @param {string} region @returns {string[]} Available species in native stock order. */
  static species(region) {
    const stockRegion = Object.hasOwn(MarketRules.STOCK, region)
      ? region
      : MarketRules.DEFAULT_REGION;
    const locations = LocationDB.getInstance();
    const wild = new Set(
      locations
        .getAll()
        .filter((location) => location.region === region)
        .flatMap((location) =>
          locations.getEncounters(location.id).map((entry) => entry.species),
        ),
    );
    const scope = MarketRules.EVOLUTION_SCOPES[region];
    const targets = new Set(
      PokemonDB.getInstance()
        .getAll()
        .filter(
          (species) =>
            !scope || (species.dex >= scope[0] && species.dex <= scope[1]),
        )
        .flatMap((species) =>
          species.evolutions.map((evolution) => evolution.to),
        ),
    );
    return MarketRules.STOCK[stockRegion]
      .filter((id) => PokemonDB.getInstance().has(id))
      .filter((id) => !wild.has(id) || MarketRules.WILD_EXEMPT.includes(id))
      .filter(
        (id) => !targets.has(id) || MarketRules.EVOLUTION_EXEMPT.includes(id),
      )
      .filter((id) => !MarketRules.BANNED[stockRegion]?.includes(id));
  }
  /** @param {Object} save @returns {Object[]} No writes or random draws. */
  static offers(save) {
    if (!save) return [];
    return MarketCatalog.species(save.player.region).map((id) => {
      const species = PokemonDB.getInstance().getById(id);
      return {
        key: id,
        kind: ShopOfferKinds.POKEMON,
        speciesId: id,
        region: save.player.region,
        dex: species.dex,
        category: MarketCatalog.category(id),
        types: species.types,
        currency: MarketRules.CURRENCY,
        unitPrice: MarketCatalog.price(id),
        owned: save.collection
          .getAll()
          .some((pokemon) => pokemon.species === id),
        seen: save.pokedex.isSeen(id),
        shiny: SpeciesOwnership.isShinyUnlocked(save, id),
        soldOut: false,
      };
    });
  }
}
