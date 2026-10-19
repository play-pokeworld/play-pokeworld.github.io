/**
 * @file LocationDB.js
 * @brief Read-only repository of the world locations (C++: class LocationDB : public DataRepository).
 * Joins three generated tables (tools/data/gen-world.mjs), all keyed by location id:
 *   LOCATIONS_TABLE  gameplay rules  { region, kind, connections[], group?, shop?, champion?,
 *                                      badgesRequired?, winsToClear?, weather? }
 *   MAP_LAYOUT_TABLE map rectangle   { x, y, w, h }
 *   ENCOUNTERS_TABLE wild slots      [{ species, minLevel, maxLevel, rarity }]
 * into one frozen LocationDefinition:
 *   { id, region, kind, connections[], group, shop|null, champion|null, badgesRequired,
 *     winsToClear, weather|null, layout|null, encounters[] }
 * Name: t('location.<id>').
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { LOCATIONS_TABLE as GENERATED_LOCATIONS } from '../raw/locations-data.js';
import { MAP_LAYOUT_TABLE as GENERATED_LAYOUT } from '../raw/map-layout-data.js';
import { ENCOUNTERS_TABLE as GENERATED_ENCOUNTERS } from '../raw/encounters-data.js';
import { LOCATIONS_CONTENT } from '../content/locations-content.js';
import { MAP_LAYOUT_CONTENT } from '../content/map-layout-content.js';
import { ENCOUNTERS_CONTENT } from '../content/encounters-content.js';
import { withContent } from '../core/ContentTables.js';

const LOCATIONS_TABLE = withContent(GENERATED_LOCATIONS, LOCATIONS_CONTENT);
const MAP_LAYOUT_TABLE = withContent(GENERATED_LAYOUT, MAP_LAYOUT_CONTENT);
const ENCOUNTERS_TABLE = withContent(GENERATED_ENCOUNTERS, ENCOUNTERS_CONTENT);
import { LocationKinds, EncounterRarities } from './LocationKinds.js';
import { Weathers } from '../battle/BattleFields.js';
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { REGIONS } from '../../config/Regions.js';
import { TrainerDB } from '../trainers/TrainerDB.js';
import { LeagueDB } from '../trainers/LeagueDB.js';
import { ShopDB } from '../shops/ShopDB.js';

export class LocationDB extends DataRepository {
  /** @type {LocationDB|null} */
  static _instance = null;

  /** @returns {LocationDB} */
  static getInstance() {
    if (!LocationDB._instance) LocationDB._instance = new LocationDB();
    return LocationDB._instance;
  }

  constructor() {
    super('LocationDB');
  }

  /** @protected @override */
  _build() {
    for (const [id, raw] of Object.entries(LOCATIONS_TABLE)) {
      const layout = MAP_LAYOUT_TABLE[id];
      this._entries.set(id, deepFreeze({
        id,
        region: raw.region,
        kind: raw.kind,
        connections: [...(raw.connections || [])],
        // Locations sharing a group count as one place for quests (route2 + route2_south).
        group: raw.group || id,
        shop: raw.shop || null,
        champion: raw.champion || null,
        badgesRequired: Number(raw.badgesRequired) || 0,
        winsToClear: Number(raw.winsToClear) || 0,
        weather: raw.weather || null,
        layout: layout ? { ...layout } : null,
        encounters: (ENCOUNTERS_TABLE[id] || []).map((slot) => ({ ...slot }))
      }));
    }
  }

  /**
   * @param {string} region - Regions id
   * @returns {Readonly<Object>[]} In table (map) order
   */
  getByRegion(region) {
    return this.getAll().filter((location) => location.region === region);
  }

  /**
   * @param {string} championId - Gym leader or league id
   * @returns {Readonly<Object>|null} Location holding that gym / league
   */
  getByChampion(championId) {
    return this.getAll().find((location) => location.champion === championId) ?? null;
  }

  /**
   * @param {string} id
   * @returns {ReadonlyArray<{species: string, minLevel: number, maxLevel: number, rarity: string}>}
   */
  getEncounters(id) {
    return this.getById(id)?.encounters || [];
  }

  /**
   * @param {string} id
   * @returns {string} Quest group of the location (its own id when it has none)
   */
  getGroup(id) {
    return this.getById(id)?.group || id;
  }

  /** @override */
  validate() {
    const problems = [];
    const regionIds = REGIONS.map((region) => region.id);
    const kinds = Object.values(LocationKinds);
    const rarities = Object.values(EncounterRarities);
    const weathers = Object.values(Weathers);
    const species = PokemonDB.getInstance();
    for (const location of this._entries.values()) {
      if (!regionIds.includes(location.region)) problems.push(this._problem(location.id, 'region', location.region));
      if (!kinds.includes(location.kind)) problems.push(this._problem(location.id, 'kind', location.kind));
      if (!location.layout) problems.push(this._problem(location.id, 'layout', null));
      if (location.champion && !TrainerDB.getInstance().has(location.champion) && !LeagueDB.getInstance().has(location.champion)) {
        problems.push(this._problem(location.id, 'champion', location.champion));
      }
      if (location.shop && !ShopDB.getInstance().has(location.shop)) problems.push(this._problem(location.id, 'shop', location.shop));
      if (location.weather && !weathers.includes(location.weather)) problems.push(this._problem(location.id, 'weather', location.weather));
      for (const target of location.connections) {
        if (!this.has(target)) problems.push(this._problem(location.id, 'connections', target));
      }
      for (const slot of location.encounters) {
        if (!species.has(slot.species)) problems.push(this._problem(location.id, 'encounters', slot.species));
        if (!rarities.includes(slot.rarity)) problems.push(this._problem(location.id, 'encounters', slot.rarity));
        if (!(slot.minLevel >= 1 && slot.maxLevel >= slot.minLevel)) problems.push(this._problem(location.id, 'encounters', slot));
      }
    }
    for (const id of [...Object.keys(MAP_LAYOUT_TABLE), ...Object.keys(ENCOUNTERS_TABLE)]) {
      if (!this.has(id)) problems.push(this._problem(id, 'id', id));
    }
    return problems;
  }
}
