/**
 * @file SaveData.js
 * @brief One save file: composition of one model per domain (C++: class SaveData : public BaseModel).
 *
 * Serialized shape (config/SaveSchema.js, current version):
 *   { version, id, background, createdAt, updatedAt,
 *     player: PlayerData, currencies: CurrenciesData, pokedex: PokedexData, team: PokemonData[],
 *     box: PokemonData[] (PC box: catches made with a full team), boxFilters: BoxFiltersData,
 *     inventory: InventoryData (Poké Balls included), ballFilters: BallFiltersData, teamPresets: TeamPresetsData,
 *     quests: QuestProgressData, statistics: StatisticsData, tutorial: TutorialProgressData,
 *     dungeons: DungeonData, hatchery: HatcheryData, mine: MineData,
 *     secretBase: SecretBaseData, access: ContentAccessData }
 *
 * deserialize() first runs SaveMigrator (original game exports, schema v1 through current), then every
 * domain model reads the current shape only. Uses the original save id format (PW-TIMESTAMP-RANDOM).
 */
import { BaseModel } from '../core/BaseModel.js';
import { PlayerData } from './PlayerData.js';
import { CurrenciesData } from './CurrenciesData.js';
import { PokedexData } from './PokedexData.js';
import { BoxFiltersData } from './BoxFiltersData.js';
import { InventoryData } from './InventoryData.js';
import { BallFiltersData } from './BallFiltersData.js';
import { TeamPresetsData } from './TeamPresetsData.js';
import { QuestProgressData } from './QuestProgressData.js';
import { StatisticsData } from './StatisticsData.js';
import { TutorialProgressData } from './TutorialProgressData.js';
import { DungeonData } from './DungeonData.js';
import { HatcheryData } from './HatcheryData.js';
import { MineData } from './MineData.js';
import { SecretBaseData } from './SecretBaseData.js';
import { ContentAccessData } from './ContentAccessData.js';
import { SaveThemes } from './SaveThemes.js';
import { SaveMigrator } from './migrations/SaveMigrator.js';
import { PokemonData } from '../pokemon/PokemonData.js';
import { PokemonFactory } from '../pokemon/PokemonFactory.js';
import { STARTERS_BY_REGION, DEFAULT_STARTER_REGION, findStarter } from '../pokemon/StarterData.js';
import { PlayerDefaults } from '../../config/PlayerDefaults.js';
import { BallRules } from '../../config/BallRules.js';
import { SaveSchema } from '../../config/SaveSchema.js';
import { Random } from '../../core/Random.js';

/**
 * Generates a save id in the original PokeWorld format (e.g. PW-LM9Z20K-8A7F1)
 * @param {Random} [random=Random.default]
 * @returns {string}
 */
export function generateSaveId(random = Random.default) {
  const suffix = Math.floor(random.next() * Math.pow(36, 5)).toString(36).padStart(5, '0').toUpperCase();
  return `PW-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export class SaveData extends BaseModel {
  /**
   * @param {string} [id] - Save id (a new one is generated when omitted)
   */
  constructor(id) {
    super(`SaveData_${id || 'new'}`, 'Save');
    this.id = typeof id === 'string' && id ? id : generateSaveId();
    this.background = SaveThemes.DEFAULT;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    /** @type {PlayerData} */
    this.player = new PlayerData();
    /** @type {CurrenciesData} */
    this.currencies = new CurrenciesData();
    /** @type {PokedexData} */
    this.pokedex = new PokedexData();
    /** @type {PokemonData[]} */
    this.team = [];
    /** @type {PokemonData[]} */
    this.box = [];
    /** @type {BoxFiltersData} */
    this.boxFilters = new BoxFiltersData();
    /** @type {InventoryData} */
    this.inventory = new InventoryData();
    /** @type {BallFiltersData} */
    this.ballFilters = new BallFiltersData();
    /** @type {TeamPresetsData} */
    this.teamPresets = new TeamPresetsData();
    /** @type {QuestProgressData} */
    this.quests = new QuestProgressData();
    /** @type {StatisticsData} */
    this.statistics = new StatisticsData();
    /** @type {TutorialProgressData} */
    this.tutorial = new TutorialProgressData();
    /** @type {DungeonData} */
    this.dungeons = new DungeonData();
    /** @type {HatcheryData} */
    this.hatchery = new HatcheryData();
    /** @type {MineData} */
    this.mine = new MineData();
    /** @type {SecretBaseData} */
    this.secretBase = new SecretBaseData();
    /** @type {ContentAccessData} Sticky progression facts; evaluated by FeatureAccessSystem. */
    this.access = new ContentAccessData();
  }

  /**
   * Creates a fresh save with the chosen starter.
   * @param {string} trainerName
   * @param {string} starterSpecies - PokemonDB id listed in StarterData
   * @param {string} [background] - SaveThemes id
   * @returns {SaveData}
   */
  static createNew(trainerName, starterSpecies, background = SaveThemes.DEFAULT) {
    const save = new SaveData();
    save.background = SaveThemes.normalize(background);
    save.player.trainerName = trainerName || PlayerDefaults.TRAINER_NAME;
    const starter = findStarter(starterSpecies) || STARTERS_BY_REGION[DEFAULT_STARTER_REGION][0];
    save.team = [PokemonFactory.create(starter.species, PlayerDefaults.STARTER_LEVEL)];
    const starterRegion = Object.keys(STARTERS_BY_REGION).find((region) =>
      STARTERS_BY_REGION[region].some((entry) => entry.species === starter.species)
    );
    if (starterRegion) save.access.unlockRegionStarter(starterRegion);
    save.pokedex = new PokedexData({ [starter.species]: { seen: true, caught: true, shiny: false } });
    save.inventory = new InventoryData({ ...BallRules.STARTING_BALLS });
    return save;
  }

  /**
   * @param {Object} json - Raw save of any version
   * @returns {SaveData}
   */
  static fromJson(json) {
    const save = new SaveData();
    save.deserialize(json);
    return save;
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      version: SaveSchema.VERSION,
      id: this.id,
      background: this.background,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      player: this.player.serialize(),
      currencies: this.currencies.serialize(),
      pokedex: this.pokedex.serialize(),
      team: this.team.map((pokemon) => pokemon.serialize()),
      box: this.box.map((pokemon) => pokemon.serialize()),
      boxFilters: this.boxFilters.serialize(),
      inventory: this.inventory.serialize(),
      ballFilters: this.ballFilters.serialize(),
      teamPresets: this.teamPresets.serialize(),
      quests: this.quests.serialize(),
      statistics: this.statistics.serialize(),
      tutorial: this.tutorial.serialize(),
      dungeons: this.dungeons.serialize(),
      hatchery: this.hatchery.serialize(),
      mine: this.mine.serialize(),
      secretBase: this.secretBase.serialize(),
      access: this.access.serialize()
    };
  }

  /**
   * @override
   * @param {Object} json - Raw save of any version
   */
  deserialize(json) {
    if (!json || typeof json !== 'object') return;
    const data = SaveMigrator.migrate(json);
    this.id = data.id || this.id;
    this.background = SaveThemes.normalize(data.background);
    this.createdAt = Number(data.createdAt) || Date.now();
    this.updatedAt = Number(data.updatedAt) || Date.now();
    this.player = new PlayerData(data.player);
    this.currencies = new CurrenciesData(data.currencies);
    this.pokedex = new PokedexData(data.pokedex);
    this.team = (Array.isArray(data.team) ? data.team : []).map((raw) => new PokemonData(raw));
    this.box = (Array.isArray(data.box) ? data.box : []).map((raw) => new PokemonData(raw));
    this.boxFilters = new BoxFiltersData(data.boxFilters);
    this.inventory = new InventoryData(data.inventory);
    this.ballFilters = new BallFiltersData(data.ballFilters);
    this.teamPresets = new TeamPresetsData(data.teamPresets);
    this.quests = new QuestProgressData(data.quests);
    this.statistics = new StatisticsData(data.statistics);
    this.tutorial = new TutorialProgressData(data.tutorial);
    this.dungeons = new DungeonData(data.dungeons);
    this.hatchery = new HatcheryData(data.hatchery);
    this.mine = new MineData(data.mine);
    this.secretBase = new SecretBaseData(data.secretBase);
    this.access = new ContentAccessData(data.access);
  }
}
