/**
 * @file SaveData.js
 * @brief One save file: composition of one model per domain (C++: class SaveData : public BaseModel).
 *
 * Serialized shape (config/SaveSchema.js, current version):
 *   { version, id, background, createdAt, updatedAt,
 *     player: PlayerData, currencies: CurrenciesData, pokedex: PokedexData,
 *     collection: PokemonCollectionData (every owned Pokémon, the PC box view),
 *     team: TeamMembersData (ordered uids of the active party), boxFilters: BoxFiltersData,
 *     inventory: InventoryData (Poké Balls included), ballFilters: BallFiltersData, teamPresets: TeamPresetsData,
 *     quests: QuestProgressData, statistics: StatisticsData, tutorial: TutorialProgressData,
 *     dungeons: DungeonData, hatchery: HatcheryData, mine: MineData,
 *     secretBase: SecretBaseData, access: ContentAccessData }
 *
 * deserialize() first runs SaveMigrator (original game exports, schema v1 through current), then every
 * domain model reads the current shape only. Uses the original save id format (PW-TIMESTAMP-RANDOM).
 * `save.team` is a derived, read-only view of the party Pokémon; party changes go through TeamSystem.
 */
import { ItemDB } from '../items/ItemDB.js';
import { ItemKinds } from '../items/ItemKinds.js';
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
import { FacilityStaffData } from './FacilityStaffData.js';
import { TrainingData } from './TrainingData.js';
import { TalentUnlockData } from './TalentUnlockData.js';
import { RelaunchData } from './RelaunchData.js';
import { MineData } from './MineData.js';
import { SecretBaseData } from './SecretBaseData.js';
import { AchievementsData } from './AchievementsData.js';
import { AtollData } from './AtollData.js';
import { ContentAccessData } from './ContentAccessData.js';
import { SaveThemes } from './SaveThemes.js';
import { SaveMigrator } from './migrations/SaveMigrator.js';
import { PokemonCollectionData } from './PokemonCollectionData.js';
import { TeamMembersData } from './TeamMembersData.js';
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
    /** @type {PokemonCollectionData} Every owned Pokémon (single owner of Pokémon data) */
    this.collection = new PokemonCollectionData();
    /** @type {TeamMembersData} Ordered uids of the active party */
    this.teamMembers = new TeamMembersData();
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
    this.relaunch=new RelaunchData();
    this.training = new TrainingData();
    this.talents = new TalentUnlockData();
    this.staff = new FacilityStaffData();
    /** @type {SecretBaseData} */
    this.secretBase = new SecretBaseData();
    /** @type {AchievementsData} */
    this.achievements = new AchievementsData();
    /** @type {AtollData} */
    this.atoll = new AtollData();
    /** @type {ContentAccessData} Sticky progression facts; evaluated by FeatureAccessSystem. */
    this.access = new ContentAccessData();
  }

  /**
   * Party Pokémon resolved from the collection, lead first. Read-only: party changes go through
   * TeamSystem (the frozen array rejects accidental pushes).
   * @returns {ReadonlyArray<import('../pokemon/PokemonData.js').PokemonData>}
   */
  get team() {
    return Object.freeze(this.teamMembers.getUids().map((uid) => this.collection.get(uid)).filter(Boolean));
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
    const starterPokemon = PokemonFactory.create(starter.species, PlayerDefaults.STARTER_LEVEL);
    save.collection.add(starterPokemon);
    save.talents.unlock(starterPokemon.species, starterPokemon.talent);
    save.teamMembers.setUids([starterPokemon.uid]);
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
      collection: this.collection.serialize(),
      team: this.teamMembers.serialize(),
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
      relaunch:this.relaunch.serialize(),
      training: this.training.serialize(),
      talents: this.talents.serialize(),
      staff: this.staff.serialize(),
      secretBase: this.secretBase.serialize(),
      achievements: this.achievements.serialize(),
      atoll: this.atoll.serialize(),
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
    this.collection = new PokemonCollectionData(data.collection);
    this.teamMembers = new TeamMembersData(data.team);
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
    this.relaunch=new RelaunchData(data.relaunch);
    this.training = new TrainingData(data.training);
    this.talents = new TalentUnlockData(data.talents);
    this.staff = new FacilityStaffData(data.staff);
    for (const pokemon of this.collection.getAll()) this.talents.unlock(pokemon.species, pokemon.talent);
    this.secretBase = new SecretBaseData(data.secretBase);
    this.achievements = new AchievementsData(data.achievements);
    this.atoll = new AtollData(data.atoll);
    this.access = new ContentAccessData(data.access);
    this._repairPokemonReferences();
    this.verifyLevelEvolutions();
  }

  /**
   * Verifies that every owned Pokémon whose level satisfies its evolution requirement
   * has evolved properly. Called automatically upon save load and deserialization.
   * @returns {number} Number of Pokémon that evolved during verification.
   */
  verifyLevelEvolutions() {
    if (!this.collection) return 0;
    let evolvedCount = 0;
    for (const pokemon of this.collection.getAll()) {
      const evolved = pokemon.checkLevelEvolution((species) => {
        if (this.pokedex) {
          this.pokedex.markCaught(species, pokemon.shiny, { deferSave: true });
        }
        if (this.talents) {
          this.talents.unlock(species, pokemon.talent);
        }
      });
      if (evolved) {
        evolvedCount++;
      }
    }
    return evolvedCount;
  }

  /**
   * Keeps uid references consistent with the collection: unknown uids are dropped and a Pokémon
   * housed in the daycare cannot also be a party member.
   * @private
   */
  _repairPokemonReferences() {
    const reserved = new Set();
    const take = (uid) => {
      if (!this.collection.has(uid) || reserved.has(uid)) return false;
      reserved.add(uid);
      return true;
    };
    this.hatchery.slots.forEach((slot, index) => {
      if (slot?.pokemonUid && !take(slot.pokemonUid)) this.hatchery.setSlot(index, null);
    });
    const fossilReservations = new Map();
    this.hatchery.queues = this.hatchery.queues.map((queue) => queue.filter((entry) => {
      if (entry.kind !== 'fossil') return take(entry.uid);
      const item = ItemDB.getInstance().getById(entry.itemId);
      const reservedCount = fossilReservations.get(entry.itemId) || 0;
      if (item?.kind !== ItemKinds.FOSSIL || item.futureOnly || !item.revives || this.inventory.count(entry.itemId) <= reservedCount) return false;
      fossilReservations.set(entry.itemId, reservedCount + 1);
      return true;
    }));
    this.training.slots.forEach((slot) => {
      if (slot.pokemonUid && !take(slot.pokemonUid)) { slot.pokemonUid = ''; slot.battle = null; }
      if (!slot.pokemonUid) slot.battle = null;
      slot.queue = slot.queue.filter(take);
    });
    const housed = new Set([...this.hatchery.getReservedUids(), ...this.training.slots.flatMap((slot) => slot.queue)]);
    this.teamMembers.setUids(this.teamMembers.getUids().filter((uid) => this.collection.has(uid) && !housed.has(uid)));
  }
}
