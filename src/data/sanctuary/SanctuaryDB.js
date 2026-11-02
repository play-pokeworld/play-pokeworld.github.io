/**
 * @file SanctuaryDB.js
 * @brief Repository of all 21 Gen 1-3 Legendary and Mythical Sanctuaries.
 * Maps each boss to its canonical sanctuary location, relic item key,
 * difficulty scaling, moveset, connected farming locations, and field weather/terrain.
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';

/**
 * @typedef {Object} SanctuaryDefinition
 * @property {string} id - Sanctuary unique identifier
 * @property {string} species - Species identifier (e.g. 'articuno', 'ho-oh')
 * @property {string} locationId - Canonical world location (dungeon)
 * @property {ReadonlyArray<string>} farmLocations - Connected routes and areas where wild KOs charge the altar
 * @property {string} region - Region ('kanto', 'johto', 'hoenn')
 * @property {string} relicItem - Single-use relic key required to summon
 * @property {number} requiredKOs - Wild KOs required to forge +1 relic (default: 30)
 * @property {'tier2'|'tier3'|'mythical'} tier - Internal difficulty scaling tier
 * @property {number} level - Boss level (75 for tier2, 85 for tier3 & mythical)
 * @property {number} hpMultiplier - Boss HP multiplier (20 for tier2, 35 for tier3, 28 for mythical)
 * @property {Record<string, number>} statMultipliers - Temporary initial battle stat modifiers
 * @property {number} enrageLimitMs - Time limit before boss hard enrage wipes the team
 * @property {string|null} [weather] - Ambient boss weather
 * @property {string|null} [terrain] - Ambient boss terrain
 * @property {ReadonlyArray<string>} moves - Curated moveset
 */

const SANCTUARIES = [
  // ===== KANTO (5) =====
  {
    id: 'sanctuary_articuno',
    species: 'articuno',
    locationId: 'seafoamislands',
    farmLocations: ['seafoamislands', 'route19', 'route20'],
    region: 'kanto',
    relicItem: 'relic_ice',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.3, spa: 1.5, spd: 1.3, spe: 1.2 },
    enrageLimitMs: 75000,
    weather: 'hail',
    terrain: null,
    moves: ['blizzard', 'ice_beam', 'hurricane', 'drill_peck']
  },
  {
    id: 'sanctuary_zapdos',
    species: 'zapdos',
    locationId: 'powerplant',
    farmLocations: ['powerplant', 'route10', 'route9'],
    region: 'kanto',
    relicItem: 'relic_thunder',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.3, spa: 1.5, spd: 1.3, spe: 1.2 },
    enrageLimitMs: 75000,
    weather: 'rain',
    terrain: 'electric',
    moves: ['thunder', 'thunderbolt', 'drill_peck', 'hurricane']
  },
  {
    id: 'sanctuary_moltres',
    species: 'moltres',
    locationId: 'victoryroad',
    farmLocations: ['victoryroad', 'route23', 'route22'],
    region: 'kanto',
    relicItem: 'relic_fire',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.3, spa: 1.5, spd: 1.3, spe: 1.2 },
    enrageLimitMs: 75000,
    weather: 'sun',
    terrain: null,
    moves: ['fire_blast', 'flamethrower', 'hurricane', 'ancient_power']
  },
  {
    id: 'sanctuary_mewtwo',
    species: 'mewtwo',
    locationId: 'ceruleancave',
    farmLocations: ['ceruleancave', 'route24', 'route25', 'route4'],
    region: 'kanto',
    relicItem: 'relic_dna',
    requiredKOs: 30,
    tier: 'tier3',
    level: 85,
    hpMultiplier: 35,
    statMultipliers: { atk: 2.0, def: 1.5, spa: 2.0, spd: 1.5, spe: 1.4 },
    enrageLimitMs: 90000,
    weather: 'somber',
    terrain: 'psychic',
    moves: ['psychic', 'aura_sphere', 'shadow_ball', 'future_sight']
  },
  {
    id: 'sanctuary_mew',
    species: 'mew',
    locationId: 'pokemonmansion',
    farmLocations: ['pokemonmansion', 'route21', 'route20'],
    region: 'kanto',
    relicItem: 'relic_origin',
    requiredKOs: 30,
    tier: 'mythical',
    level: 85,
    hpMultiplier: 28,
    statMultipliers: { atk: 2.2, def: 1.6, spa: 2.2, spd: 1.6, spe: 1.6 },
    enrageLimitMs: 60000,
    weather: null,
    terrain: 'misty',
    moves: ['psychic', 'aura_sphere', 'dazzling_gleam', 'shadow_ball']
  },

  // ===== JOHTO (6) =====
  {
    id: 'sanctuary_raikou',
    species: 'raikou',
    locationId: 'burnedtower',
    farmLocations: ['burnedtower', 'jroute37', 'jroute38'],
    region: 'johto',
    relicItem: 'relic_storm',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.3, spa: 1.5, spd: 1.3, spe: 1.2 },
    enrageLimitMs: 75000,
    weather: null,
    terrain: 'electric',
    moves: ['thunder', 'thunderbolt', 'extrasensory', 'shadow_ball']
  },
  {
    id: 'sanctuary_entei',
    species: 'entei',
    locationId: 'mtmortar',
    farmLocations: ['mtmortar', 'jroute42', 'jroute43'],
    region: 'johto',
    relicItem: 'relic_volcano',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.3, spa: 1.5, spd: 1.3, spe: 1.2 },
    enrageLimitMs: 75000,
    weather: 'sun',
    terrain: null,
    moves: ['sacred_fire', 'flare_blitz', 'stone_edge', 'iron_head']
  },
  {
    id: 'sanctuary_suicune',
    species: 'suicune',
    locationId: 'tohjofalls',
    farmLocations: ['tohjofalls', 'jroute27', 'jroute26'],
    region: 'johto',
    relicItem: 'relic_wave',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.3, spa: 1.5, spd: 1.3, spe: 1.2 },
    enrageLimitMs: 75000,
    weather: 'rain',
    terrain: null,
    moves: ['hydro_pump', 'scald', 'ice_beam', 'extrasensory']
  },
  {
    id: 'sanctuary_lugia',
    species: 'lugia',
    locationId: 'whirlislands',
    farmLocations: ['whirlislands', 'jroute40', 'jroute41'],
    region: 'johto',
    relicItem: 'silver_wing',
    requiredKOs: 30,
    tier: 'tier3',
    level: 85,
    hpMultiplier: 35,
    statMultipliers: { atk: 1.8, def: 1.8, spa: 1.8, spd: 1.8, spe: 1.4 },
    enrageLimitMs: 90000,
    weather: 'rain',
    terrain: null,
    moves: ['aeroblast', 'psychic', 'hydro_pump', 'earth_power']
  },
  {
    id: 'sanctuary_ho_oh',
    species: 'ho-oh',
    locationId: 'tintower',
    farmLocations: ['tintower', 'jroute38', 'jroute39'],
    region: 'johto',
    relicItem: 'rainbow_wing',
    requiredKOs: 30,
    tier: 'tier3',
    level: 85,
    hpMultiplier: 35,
    statMultipliers: { atk: 2.0, def: 1.5, spa: 1.8, spd: 1.8, spe: 1.4 },
    enrageLimitMs: 90000,
    weather: 'sun',
    terrain: null,
    moves: ['sacred_fire', 'brave_bird', 'earthquake', 'ancient_power']
  },
  {
    id: 'sanctuary_celebi',
    species: 'celebi',
    locationId: 'ilexforest',
    farmLocations: ['ilexforest', 'jroute34', 'jroute33'],
    region: 'johto',
    relicItem: 'gs_ball_celebi',
    requiredKOs: 30,
    tier: 'mythical',
    level: 85,
    hpMultiplier: 28,
    statMultipliers: { atk: 2.2, def: 1.6, spa: 2.2, spd: 1.6, spe: 1.6 },
    enrageLimitMs: 60000,
    weather: null,
    terrain: 'grassy',
    moves: ['leaf_storm', 'psychic', 'dazzling_gleam', 'energy_ball']
  },

  // ===== HOENN (10) =====
  {
    id: 'sanctuary_regirock',
    species: 'regirock',
    locationId: 'desert_ruins',
    farmLocations: ['desert_ruins', 'route111'],
    region: 'hoenn',
    relicItem: 'relic_rock',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.5, def: 1.6, spa: 1.2, spd: 1.4, spe: 1.0 },
    enrageLimitMs: 75000,
    weather: 'sand',
    terrain: null,
    moves: ['stone_edge', 'rock_slide', 'earthquake', 'superpower']
  },
  {
    id: 'sanctuary_regice',
    species: 'regice',
    locationId: 'island_cave',
    farmLocations: ['island_cave', 'route105', 'route106'],
    region: 'hoenn',
    relicItem: 'relic_ice_golem',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.2, def: 1.4, spa: 1.5, spd: 1.6, spe: 1.0 },
    enrageLimitMs: 75000,
    weather: 'hail',
    terrain: null,
    moves: ['blizzard', 'ice_beam', 'thunderbolt', 'focus_blast']
  },
  {
    id: 'sanctuary_registeel',
    species: 'registeel',
    locationId: 'ancient_tomb',
    farmLocations: ['ancient_tomb', 'route120', 'route121'],
    region: 'hoenn',
    relicItem: 'relic_steel',
    requiredKOs: 30,
    tier: 'tier2',
    level: 75,
    hpMultiplier: 20,
    statMultipliers: { atk: 1.4, def: 1.6, spa: 1.4, spd: 1.6, spe: 1.0 },
    enrageLimitMs: 75000,
    weather: 'sand',
    terrain: null,
    moves: ['flash_cannon', 'iron_head', 'body_press', 'earthquake']
  },
  {
    id: 'sanctuary_latias',
    species: 'latias',
    locationId: 'southern_island',
    farmLocations: ['southern_island', 'route108', 'route109'],
    region: 'hoenn',
    relicItem: 'eon_ticket_latis',
    requiredKOs: 30,
    tier: 'mythical',
    level: 85,
    hpMultiplier: 28,
    statMultipliers: { atk: 1.8, def: 1.6, spa: 2.2, spd: 1.8, spe: 1.6 },
    enrageLimitMs: 60000,
    weather: null,
    terrain: 'misty',
    moves: ['mist_ball', 'draco_meteor', 'psychic', 'dragon_pulse']
  },
  {
    id: 'sanctuary_latios',
    species: 'latios',
    locationId: 'mirage_island',
    farmLocations: ['mirage_island', 'route130', 'route129'],
    region: 'hoenn',
    relicItem: 'eon_ticket_latis',
    requiredKOs: 30,
    tier: 'mythical',
    level: 85,
    hpMultiplier: 28,
    statMultipliers: { atk: 2.0, def: 1.5, spa: 2.4, spd: 1.6, spe: 1.6 },
    enrageLimitMs: 60000,
    weather: null,
    terrain: 'psychic',
    moves: ['luster_purge', 'draco_meteor', 'psychic', 'dragon_pulse']
  },
  {
    id: 'sanctuary_kyogre',
    species: 'kyogre',
    locationId: 'seafloor_cavern',
    farmLocations: ['seafloor_cavern', 'route128', 'route127'],
    region: 'hoenn',
    relicItem: 'blue_orb',
    requiredKOs: 30,
    tier: 'tier3',
    level: 85,
    hpMultiplier: 35,
    statMultipliers: { atk: 1.8, def: 1.5, spa: 2.2, spd: 1.6, spe: 1.4 },
    enrageLimitMs: 90000,
    weather: 'rain',
    terrain: null,
    moves: ['hydro_pump', 'surf', 'ice_beam', 'thunder']
  },
  {
    id: 'sanctuary_groudon',
    species: 'groudon',
    locationId: 'cave_of_origin',
    farmLocations: ['cave_of_origin', 'route126', 'route124'],
    region: 'hoenn',
    relicItem: 'red_orb',
    requiredKOs: 30,
    tier: 'tier3',
    level: 85,
    hpMultiplier: 35,
    statMultipliers: { atk: 2.2, def: 1.6, spa: 1.8, spd: 1.5, spe: 1.4 },
    enrageLimitMs: 90000,
    weather: 'sun',
    terrain: null,
    moves: ['earthquake', 'earth_power', 'fire_blast', 'solar_beam']
  },
  {
    id: 'sanctuary_rayquaza',
    species: 'rayquaza',
    locationId: 'sky_pillar',
    farmLocations: ['sky_pillar', 'route131', 'route132'],
    region: 'hoenn',
    relicItem: 'relic_green_orb',
    requiredKOs: 30,
    tier: 'tier3',
    level: 85,
    hpMultiplier: 35,
    statMultipliers: { atk: 2.2, def: 1.5, spa: 2.2, spd: 1.5, spe: 1.5 },
    enrageLimitMs: 90000,
    weather: 'fog',
    terrain: null,
    moves: ['dragon_ascent', 'outrage', 'extreme_speed', 'v_create']
  },
  {
    id: 'sanctuary_jirachi',
    species: 'jirachi',
    locationId: 'mt_pyre',
    farmLocations: ['mt_pyre', 'route122', 'route123'],
    region: 'hoenn',
    relicItem: 'relic_star',
    requiredKOs: 30,
    tier: 'mythical',
    level: 85,
    hpMultiplier: 28,
    statMultipliers: { atk: 2.2, def: 1.6, spa: 2.2, spd: 1.6, spe: 1.6 },
    enrageLimitMs: 60000,
    weather: null,
    terrain: 'misty',
    moves: ['doom_desire', 'iron_head', 'psychic', 'dazzling_gleam']
  },
  {
    id: 'sanctuary_deoxys',
    species: 'deoxys',
    locationId: 'birth_island',
    farmLocations: ['birth_island', 'route114', 'route113'],
    region: 'hoenn',
    relicItem: 'meteorite_shard_delta',
    requiredKOs: 30,
    tier: 'mythical',
    level: 85,
    hpMultiplier: 28,
    statMultipliers: { atk: 2.4, def: 1.4, spa: 2.4, spd: 1.4, spe: 1.8 },
    enrageLimitMs: 60000,
    weather: 'weirdroom',
    terrain: 'psychic',
    moves: ['psycho_boost', 'psychic', 'shadow_ball', 'superpower']
  }
];

export class SanctuaryDB extends DataRepository {
  /** @private @type {SanctuaryDB|null} */
  static _instance = null;

  /** @returns {SanctuaryDB} */
  static getInstance() {
    if (!SanctuaryDB._instance) SanctuaryDB._instance = new SanctuaryDB();
    return SanctuaryDB._instance;
  }

  constructor() {
    super('SanctuaryDB');
    /** @private @type {Map<string, SanctuaryDefinition>} */
    this._byLocation = new Map();
    /** @private @type {Map<string, SanctuaryDefinition>} */
    this._bySpecies = new Map();
    /** @private @type {Map<string, SanctuaryDefinition[]>} */
    this._byFarmLocation = new Map();

    for (const sanctuary of this._entries.values()) {
      this._byLocation.set(sanctuary.locationId, sanctuary);
      this._bySpecies.set(sanctuary.species, sanctuary);
      for (const farmLoc of sanctuary.farmLocations || []) {
        if (!this._byFarmLocation.has(farmLoc)) {
          this._byFarmLocation.set(farmLoc, []);
        }
        this._byFarmLocation.get(farmLoc).push(sanctuary);
      }
    }
  }

  /** @override */
  _build() {
    for (const raw of SANCTUARIES) {
      this._entries.set(raw.id, deepFreeze({ ...raw }));
    }
  }

  /**
   * @param {string} locationId
   * @returns {SanctuaryDefinition|null}
   */
  getByLocation(locationId) {
    return this._byLocation.get(locationId) ?? null;
  }

  /**
   * @param {string} locationId
   * @returns {ReadonlyArray<SanctuaryDefinition>}
   */
  getAllByLocation(locationId) {
    const list = [];
    for (const s of this._entries.values()) {
      if (s.locationId === locationId) list.push(s);
    }
    return Object.freeze(list);
  }

  /**
   * Returns all sanctuaries whose altar can be charged by wild KOs at this location.
   * @param {string} locationId
   * @returns {ReadonlyArray<SanctuaryDefinition>}
   */
  getByFarmLocation(locationId) {
    return Object.freeze(this._byFarmLocation.get(locationId) ?? []);
  }

  /**
   * @param {string} speciesId
   * @returns {SanctuaryDefinition|null}
   */
  getBySpecies(speciesId) {
    return this._bySpecies.get(speciesId) ?? null;
  }

  /**
   * @param {string} locationId
   * @returns {boolean}
   */
  hasLocation(locationId) {
    return this._byLocation.has(locationId) || this._byFarmLocation.has(locationId);
  }
}
