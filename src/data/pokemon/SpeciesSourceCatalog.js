/**
 * @file SpeciesSourceCatalog.js
 * @brief Aggregates and localizes all obtainment sources for any Pokémon species (wild, roaming, starter, fossil, evolution, breeding, quest).
 */

import { LocationDB } from '../world/LocationDB.js';
import { RoamingRules } from '../../config/RoamingRules.js';
import { MarketRules } from '../../config/MarketRules.js';
import { RoamingSystem } from '../../systems/RoamingSystem.js';
import { FRAGMENT_LEGENDARIES_BY_REGION, LEGEND_FRAGMENT_COST } from '../atoll/AtollDB.js';
import { STARTERS_BY_REGION } from './StarterData.js';
import { ItemDB } from '../items/ItemDB.js';
import { ItemKinds } from '../items/ItemKinds.js';
import { QuestDB } from '../quests/QuestDB.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';
import { SanctuaryDB } from '../sanctuary/SanctuaryDB.js';
import { PokemonDB } from './PokemonDB.js';
import { LocalizationManager, t } from '../../localization/LocalizationManager.js';

export class SpeciesSourceCatalog {
  /**
   * Computes structured sources for a given species id.
   * @param {string} speciesId
   * @param {number} [now=Date.now()]
   * @returns {Array<Object>}
   */
  static getSources(speciesId, now = Date.now()) {
    if (!speciesId) return [];
    const sources = [];
    const locationDb = LocationDB.getInstance();
    const itemDb = ItemDB.getInstance();
    const pokemonDb = PokemonDB.getInstance();
    const questDb = QuestDB.getInstance();

    // 1. Wild encounters across all regions
    for (const loc of locationDb.getAll()) {
      const match = (loc.encounters || []).find((e) => e.species === speciesId);
      if (match) {
        const total = loc.encounters.reduce((acc, e) => acc + (e.weight || 1), 0);
        const chance = Number((((match.weight || 1) / total) * 100).toFixed(1));
        sources.push({
          kind: 'wild',
          locationId: loc.id,
          region: loc.region,
          chance,
          minLevel: match.minLevel || 1,
          maxLevel: match.maxLevel || match.minLevel || 1
        });
      }
    }

    // 2. Sanctuaries & Ancestral Relics
    const sanctuary = SanctuaryDB.getInstance().getBySpecies(speciesId);
    if (sanctuary) {
      sources.push({
        kind: 'sanctuary',
        locationId: sanctuary.locationId,
        region: sanctuary.region,
        relicItem: sanctuary.relicItem,
        level: sanctuary.level,
        tier: sanctuary.tier
      });
    }

    // 2b. Roaming legendaries
    for (const [region, rData] of Object.entries(RoamingRules.REGIONS || {})) {
      if ((rData.species || []).includes(speciesId)) {
        const routeInfo = RoamingSystem.getRouteForSpecies(speciesId, now);
        sources.push({
          kind: 'roaming',
          region,
          level: RoamingRules.ENCOUNTER_LEVEL,
          currentRoute: routeInfo?.locationId || null
        });
      }
    }

    // 3. Starters
    for (const [region, starters] of Object.entries(STARTERS_BY_REGION || {})) {
      if ((starters || []).some((s) => s.species === speciesId)) {
        sources.push({
          kind: 'starter',
          region
        });
      }
    }

    // 4. Marché Noir (Black Market)
    for (const [region, stock] of Object.entries(MarketRules.STOCK || {})) {
      if ((stock || []).includes(speciesId)) {
        sources.push({
          kind: 'market',
          region
        });
      }
    }

    // 5. Fossil revivals
    for (const item of itemDb.getAll()) {
      if (item.revives === speciesId || (item.kind === ItemKinds.FOSSIL && item.revives === speciesId)) {
        sources.push({
          kind: 'fossil',
          itemId: item.id
        });
      }
    }

    // 6. Evolutions from pre-evolutions
    for (const parent of pokemonDb.getAll()) {
      for (const evo of parent.evolutions || []) {
        if (evo.to === speciesId) {
          sources.push({
            kind: 'evolution',
            fromSpecies: parent.id,
            level: evo.level || null,
            item: evo.item || null,
            condition: evo.condition || null
          });
        }
      }
    }

    // 7. Daycare breeding / baby eggs
    for (const [parent, baby] of Object.entries(HatcheryRules.BABY_SPECIES || {})) {
      if (baby === speciesId) {
        sources.push({
          kind: 'egg',
          parentSpecies: parent
        });
      }
    }

    // 8. Quests
    for (const q of questDb.getAll()) {
      if (q.rewards?.pokemon?.species === speciesId || q.encounter?.species === speciesId) {
        sources.push({
          kind: 'quest',
          category: q.category,
          questId: q.id,
          key: q.key
        });
      }
    }

    // 9. Battle Atoll Legend Summoning
    const species = pokemonDb.getById(speciesId);
    if (species) {
      for (const [region, dexList] of Object.entries(FRAGMENT_LEGENDARIES_BY_REGION || {})) {
        if (dexList.includes(species.dex)) {
          sources.push({
            kind: 'atoll',
            region,
            cost: LEGEND_FRAGMENT_COST
          });
          break;
        }
      }
    }

    return sources;
  }

  /**
   * Formats structured sources into localized readable descriptions.
   * @param {string} speciesId
   * @param {number} [now=Date.now()]
   * @returns {string[]}
   */
  static getFormattedSources(speciesId, now = Date.now()) {
    const sources = SpeciesSourceCatalog.getSources(speciesId, now);
    if (sources.length === 0) {
      return [t('pokedex_no_locations')];
    }

    const lines = [];
    const eggParents = [];

    for (const src of sources) {
      if (src.kind === 'wild') {
        const locName = t(`location.${src.locationId}`);
        lines.push(`${locName} (${src.chance} %, Nv. ${src.minLevel}–${src.maxLevel})`);
      } else if (src.kind === 'sanctuary') {
        const locName = t(`location.${src.locationId}`);
        const relicName = t(`item.${src.relicItem}.name`);
        lines.push(t('dex_src_sanctuary', { location: locName, relic: relicName, level: src.level }));
      } else if (src.kind === 'roaming') {
        const regionName = t(`region_${src.region}`);
        if (src.currentRoute) {
          const routeName = t(`location.${src.currentRoute}`);
          lines.push(t('dex_src_roaming_current', { region: regionName, route: routeName, chance: '1 %', level: src.level }));
        } else {
          lines.push(t('dex_src_roaming', { region: regionName, chance: '1 %', level: src.level }));
        }
      } else if (src.kind === 'starter') {
        const regionName = t(`region_${src.region}`);
        lines.push(t('dex_src_starter', { region: regionName }));
      } else if (src.kind === 'market') {
        const regionName = t(`region_${src.region}`);
        lines.push(t('dex_src_market', { region: regionName }));
      } else if (src.kind === 'fossil') {
        const itemName = t(`item.${src.itemId}.name`);
        lines.push(t('dex_src_fossil', { item: itemName }));
      } else if (src.kind === 'evolution') {
        const parentName = t(`pokemon.${src.fromSpecies}`);
        if (src.level) {
          lines.push(t('dex_src_evolution_level', { name: parentName, level: src.level }));
        } else if (src.item) {
          const itemName = t(`item.${src.item}.name`);
          lines.push(t('dex_src_evolution_item', { name: parentName, item: itemName }));
        } else {
          lines.push(t('dex_src_evolution_other', { name: parentName }));
        }
      } else if (src.kind === 'egg') {
        eggParents.push(t(`pokemon.${src.parentSpecies}`));
      } else if (src.kind === 'quest') {
        const titleKey = `quests.${src.category || 'main'}.${src.questId}.title`;
        const title = LocalizationManager.getInstance().has(titleKey) ? t(titleKey) : `#${src.questId}`;
        lines.push(t('dex_src_quest', { title }));
      } else if (src.kind === 'atoll') {
        lines.push(t('dex_src_atoll_legend', { cost: src.cost }));
      }
    }

    if (eggParents.length > 0) {
      lines.push(t('dex_src_egg', { parents: [...new Set(eggParents)].join(', ') }));
    }

    return lines;
  }
}
