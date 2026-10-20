/**
 * @file MigrationOriginalToV1.js
 * @brief Save migration 0 -> 1: a save exported by the ORIGINAL game (state wrapped in `.G`)
 * becomes a rework v1 save (C++: struct MigrationOriginalToV1 : SaveMigration).
 *
 * Pure function of the raw JSON (only read-only repositories are used to translate ids).
 * Fields the v1 shape did not have yet (pokedex, inventory, statistics, quests, Pokémon uid /
 * talent / IVs…) are carried along: the next migrations keep them.
 * Not carried: form slots (the original numbers them, the remake names them) and eggs. Accepted
 * repeatable quests and the complete board state (choices, reroll timestamp, slot upgrades and
 * unlock fact) are translated into QuestProgressData. Carried for MigrationV3ToV4: the PC box (`box`),
 * the Poké Ball counts and filters (`pokeballs: { counts, filters }`) and duplicate catch counters.
 */
import { PokemonDB } from '../../pokemon/PokemonDB.js';
import { ItemDB } from '../../items/ItemDB.js';
import { QuestDB } from '../../quests/QuestDB.js';
import { QuestCategories } from '../../quests/QuestCategories.js';
import { ObjectiveTypes } from '../../quests/ObjectiveTypes.js';
import { LocationDB } from '../../world/LocationDB.js';
import { HatcheryRules } from '../../../config/HatcheryRules.js';
import { QuestRules } from '../../../config/QuestRules.js';

/** Original wallet field -> CurrencyDefinitions id. */
const WALLET_FIELDS = Object.freeze({
  dungeonTokens: 'dungeonToken',
  questPoints: 'questPoint',
  diamonds: 'diamond',
  battlePoints: 'battlePoint',
  farmPoints: 'farmPoint',
  contestTokens: 'contestToken'
});

/** @param {number} dex @returns {string|null} */
const slugOf = (dex) => PokemonDB.getInstance().getByDex(dex)?.id ?? null;

/**
 * @param {Object} pokemon - Original team entry ({ id: dex, level, xp, currentHP, maxHP, moves: [{id}] … })
 * @returns {Object|null}
 */
function convertPokemon(pokemon) {
  const species = pokemon && slugOf(pokemon.id);
  if (!species) return null;
  return {
    species,
    nickname: pokemon.nickname || '',
    level: pokemon.level,
    hp: pokemon.currentHP,
    maxHp: pokemon.maxHP,
    totalExp: pokemon.xp,
    shiny: !!(pokemon.shinyActive || pokemon.shiny),
    uid: pokemon.uid,
    talent: pokemon.talent ? String(pokemon.talent).toLowerCase() : null,
    heldItem: pokemon.heldItem || null,
    moves: (pokemon.moves || []).map((move) => (typeof move === 'string' ? move : move?.id)).filter(Boolean),
    ivs: pokemon.ivs,
    evs: pokemon.evs
  };
}

/** @param {Object} G @returns {Object} */
function convertHatchery(G) {
  const source = Array.isArray(G.hatchery) ? G.hatchery :
    Array.isArray(G.hatchery?.slots) ? G.hatchery.slots : [];
  const requested = Number(G.hatcheryMaxSlots ?? G.hatchery?.maxSlots);
  const maxSlots = Math.max(HatcheryRules.DEFAULT_SLOT_COUNT, Math.min(HatcheryRules.MAX_SLOT_COUNT,
    Math.floor(requested || HatcheryRules.DEFAULT_SLOT_COUNT)));
  const slots = Array.from({ length: maxSlots }, (_, index) => {
    const slot = source[index];
    if (!slot || typeof slot !== 'object') return null;
    const pokemon = slot.poke || slot.pokemon;
    if (pokemon && typeof pokemon === 'object') {
      const converted = convertPokemon(pokemon);
      return converted ? {
        kind: 'daycare',
        pokemon: converted,
        knockouts: Math.max(0, Math.floor(Number(slot.knockouts ?? slot.steps) || 0))
      } : null;
    }
    const itemId = slot.fossilKey || slot.itemId;
    if (!itemId || !(slot.isFossil || slot.kind === 'fossil')) return null;
    const item = ItemDB.getInstance().getById(itemId);
    const speciesId = slugOf(Number(slot.reviveId)) || item?.revives;
    if (!speciesId) return null;
    const required = Math.max(HatcheryRules.MIN_FOSSIL_KOS, Math.min(HatcheryRules.MAX_FOSSIL_KOS,
      Math.floor(Number(slot.stepsReq) || HatcheryRules.MIN_FOSSIL_KOS)));
    return {
      kind: 'fossil',
      itemId,
      speciesId,
      knockouts: Math.max(0, Math.floor(Number(slot.knockouts ?? slot.steps) || 0)),
      required
    };
  });
  return { maxSlots, slots };
}

/**
 * @param {Object} legacyDex - Original `G.pokedex` ({ <dex>: { caught, shiny } })
 * @returns {Object} Pokédex entries keyed by species id
 */
function convertPokedex(legacyDex) {
  const entries = {};
  for (const [dex, raw] of Object.entries(legacyDex || {})) {
    const species = slugOf(Number(dex));
    if (!species || !raw || typeof raw !== 'object') continue;
    entries[species] = { seen: true, caught: !!raw.caught, shiny: !!raw.caught && !!raw.shiny };
  }
  return entries;
}

/**
 * @param {Object} legacyBalls - Original `G.pokeballs` ({ <ballId>: n, honorProgress, filters, presetVersion })
 * @returns {{counts: Object<string, number>, filters: Object[]|null}|null}
 */
function convertPokeballs(legacyBalls) {
  if (!legacyBalls || typeof legacyBalls !== 'object') return null;
  const counts = {};
  for (const [key, value] of Object.entries(legacyBalls)) {
    if (key.endsWith('ball') && Number.isFinite(value) && value > 0) counts[key] = Math.floor(value);
  }
  return { counts, filters: Array.isArray(legacyBalls.filters) ? legacyBalls.filters : null };
}

/**
 * @param {Object} legacyDupes - Original `G.dupeCatches` ({ <dex>: n })
 * @returns {Object<string, number>} Keyed by species id
 */
function convertDuplicateCatches(legacyDupes) {
  const out = {};
  for (const [dex, count] of Object.entries(legacyDupes || {})) {
    const species = slugOf(Number(dex));
    if (species && Number(count) > 0) out[species] = Math.floor(Number(count));
  }
  return out;
}

/** @param {*} value @returns {string|null} */
function repeatableTemplateId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  let id = String(value).trim();
  if (!id) return null;
  id = id.replace(/^repeatable[._]/, '').replace(/^r_/, '');
  return id || null;
}

/**
 * Gets progress from the stored counter plus the original location baseline, when present.
 * The old game derived repeatable defeat progress from `wildWinsByLoc - baseline` on read.
 * @param {Object} G
 * @param {Object} instance
 * @param {Readonly<Object>} quest
 * @param {LocationDB} locations
 * @returns {number}
 */
function convertRepeatableProgress(G, instance, quest, locations) {
  const objective = quest.objective;
  const maxProgress = objective.count;
  const rawProgress = Number(instance.progress);
  let progress = Number.isFinite(rawProgress) ? Math.max(0, Math.floor(rawProgress)) : 0;
  const legacyDefinition = instance.def && typeof instance.def === 'object' ? instance.def : {};
  const locationId = legacyDefinition.loc || quest.location || objective.location;

  if (
    objective.type === ObjectiveTypes.KILL &&
    locationId &&
    typeof instance.baseline === 'number' &&
    Number.isFinite(instance.baseline)
  ) {
    const targetGroup = locations.getGroup(locationId);
    const wildWins = G.wildWinsByLoc && typeof G.wildWinsByLoc === 'object' ? G.wildWinsByLoc : {};
    const current = Object.entries(wildWins).reduce((total, [id, rawCount]) => {
      if (locations.getGroup(id) !== targetGroup) return total;
      const count = Number(rawCount);
      return total + (Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
    }, 0);
    progress = Math.max(progress, Math.max(0, Math.floor(current - instance.baseline)));
  }

  if (instance.done === true) progress = maxProgress;
  return Math.min(maxProgress, progress);
}

/**
 * @param {Object} G - Original game state
 * @returns {Object} Quest progress (schema 3 shape)
 */
function convertQuests(G) {
  const completed = Object.keys(G.completedQuests || {})
    .filter((key) => key.startsWith('side_'))
    .map((key) => `side.${key.substring('side_'.length)}`);
  const active = {};
  for (const instance of Array.isArray(G.activeQuests) ? G.activeQuests : []) {
    if (!instance || (instance.cat !== QuestCategories.MAIN && instance.cat !== QuestCategories.SIDE)) continue;
    active[`${instance.cat}.${instance.qid}`] = { progress: Math.max(0, Number(instance.progress) || 0) };
  }

  const questDb = QuestDB.getInstance();
  const locationDb = LocationDB.getInstance();
  for (const instance of Array.isArray(G.repeatables) ? G.repeatables : []) {
    if (!instance || typeof instance !== 'object' ||
        (instance.cat && instance.cat !== QuestCategories.REPEATABLE)) continue;
    const candidates = [instance.tplId, instance.def?.id, instance.qid];
    let quest = null;
    for (const candidate of candidates) {
      const templateId = repeatableTemplateId(candidate);
      if (!templateId) continue;
      quest = questDb.getById(QuestDB.keyOf(QuestCategories.REPEATABLE, templateId));
      if (quest) break;
    }
    if (!quest) continue;

    const progress = convertRepeatableProgress(G, instance, quest, locationDb);
    const previous = active[quest.key]?.progress || 0;
    active[quest.key] = { progress: Math.max(previous, progress) };
  }

  const rawCompletedCount = Number(G.repeatablesCompleted);
  const repeatablesCompleted = Number.isFinite(rawCompletedCount)
    ? Math.max(0, Math.floor(rawCompletedCount))
    : 0;
  const repeatableChoices = [];
  for (const rawId of Array.isArray(G.repeatableChoices) ? G.repeatableChoices : []) {
    const id = repeatableTemplateId(rawId);
    if (!id || !questDb.getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id)) || repeatableChoices.includes(id)) continue;
    repeatableChoices.push(id);
    if (repeatableChoices.length >= QuestRules.REPEATABLE_OFFER_COUNT) break;
  }
  const rawUpgrades = Number(G.repeatableSlotUpgrades);
  const rawMaxSlots = Number(G.maxRepeatables);
  const requestedUpgrades = Number.isFinite(rawUpgrades)
    ? rawUpgrades
    : Number.isFinite(rawMaxSlots)
      ? rawMaxSlots - QuestRules.REPEATABLE_SLOTS
      : 0;
  const repeatableSlotUpgrades = Math.max(0, Math.min(
    QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS.length,
    Math.floor(Number.isFinite(requestedUpgrades) ? requestedUpgrades : 0)
  ));
  const rawLastRollAt = Number(G.repeatableLastRollAt);
  const repeatableLastRollAt = Number.isFinite(rawLastRollAt) ? Math.max(0, Math.floor(rawLastRollAt)) : 0;
  const hasActiveRepeatable = Object.keys(active).some((key) => key.startsWith(`${QuestCategories.REPEATABLE}.`));
  const repeatableUnlocked = G.repeatableQuestsUnlocked === true ||
    (Array.isArray(G.badges) && G.badges.length > 0) || G.region === 'johto' ||
    hasActiveRepeatable || repeatablesCompleted > 0 || repeatableChoices.length > 0 || repeatableSlotUpgrades > 0;
  return {
    mainStep: { ...(G.mainStep || {}) },
    active,
    completed,
    repeatablesCompleted,
    repeatableUnlocked,
    repeatableChoices,
    repeatableLastRollAt,
    repeatableSlotUpgrades
  };
}

/** @param {Object} G Original game state @returns {string[]} Regions with a completed league */
function convertLeagueWins(G) {
  const wins = new Set(Object.entries(G.regionLeagueWon && typeof G.regionLeagueWon === 'object' ? G.regionLeagueWon : {})
    .filter(([, completed]) => completed === true)
    .map(([region]) => region));
  const defeated = G.defeatedChamps && typeof G.defeatedChamps === 'object' ? G.defeatedChamps : {};
  if (G.championTitle === true || G.leagueWon === true || defeated.elite4 === true) wins.add('kanto');
  for (const [key, completed] of Object.entries(defeated)) {
    const match = /^([a-z0-9]+)_elite4$/.exec(key);
    if (completed === true && match) wins.add(match[1]);
  }
  return [...wins];
}

export const MigrationOriginalToV1 = Object.freeze({
  from: 0,
  to: 1,
  /**
   * @param {Object} raw - `{ G: {...}, id?, background? }`
   * @returns {Object}
   */
  migrate(raw) {
    const G = raw.G || {};
    const meta = G.saveMeta || {};
    const leaguesWon = convertLeagueWins(G);
    const currencies = {};
    for (const [field, id] of Object.entries(WALLET_FIELDS)) {
      if (Number.isFinite(G.wallet?.[field])) currencies[id] = G.wallet[field];
    }
    const legacyReveal = G.wallet?.revealed && typeof G.wallet.revealed === 'object' ? G.wallet.revealed : {};
    currencies.revealed = {
      money: true,
      dungeonToken: !!legacyReveal.dungeonTokens || (currencies.dungeonToken || 0) > 0,
      questPoint: !!legacyReveal.questPoints || (currencies.questPoint || 0) > 0,
      diamond: !!legacyReveal.diamonds || (currencies.diamond || 0) > 0,
      battlePoint: (currencies.battlePoint || 0) > 0,
      farmPoint: (currencies.farmPoint || 0) > 0,
      contestToken: (currencies.contestToken || 0) > 0
    };
    return {
      id: raw.id || meta.id,
      background: raw.background || meta.background,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      player: {
        trainerName: meta.name || G.trainerName,
        badges: Array.isArray(G.badges) ? [...G.badges] : [],
        region: G.region,
        location: G.location,
        playTimeSeconds: Math.floor((Number(G.playTimeMs || meta.playTimeMs) || 0) / 1000),
        money: Number(G.money) || 0
      },
      currencies,
      team: (G.team || []).map(convertPokemon).filter(Boolean),
      box: Object.values(G.collection || {}).map(convertPokemon).filter(Boolean),
      // v1.7 migration consumes these original ids after the other schema migrations.
      teamPresets: G.teamPresets && typeof G.teamPresets === 'object' ? { ...G.teamPresets } : null,
      activePresetId: G.activePresetId || null,
      pokedex: convertPokedex(G.pokedex),
      inventory: { ...(G.inventory || {}) },
      pokeballs: convertPokeballs(G.pokeballs),
      statistics: {
        wildWins: { ...(G.wildWinsByLoc || {}) },
        trainerWins: { ...(G.questTrainerWins || {}) },
        duplicateCatches: convertDuplicateCatches(G.dupeCatches),
        hatcheryLevel: Number(G.hatcheryLevel) || 0,
        trainingSessions: Number(G.trainingSessions) || 0,
        leaguesWon
      },
      hatchery: convertHatchery(G),
      mine: G.mine && typeof G.mine === 'object' ? { ...G.mine } : {},
      quests: convertQuests(G),
      tutorial: G.tutorial && typeof G.tutorial === 'object' ? { ...G.tutorial } : null,
      dungeons: {
        exploredTotal: Number(G.dungeonsExplored) || 0,
        clears: { ...(G.dungeonClears || {}) },
        run: G.dungeonRun && typeof G.dungeonRun === 'object' ? { ...G.dungeonRun } : null,
        lastRun: null
      },
      access: {
        // Preserve the original map's sticky reachability instead of rebuilding it from badge totals.
        unlockedLocations: Array.isArray(G.unlockedLocs)
          ? G.unlockedLocs.filter((id) => typeof id === 'string')
          : Object.entries(G.unlockedLocs && typeof G.unlockedLocs === 'object' ? G.unlockedLocs : {})
            .filter(([, unlocked]) => unlocked === true).map(([id]) => id),
        unlockedFeatures: {
          hatchery: G.hatcheryUnlocked === true,
          mine: G.mineUnlocked === true,
          training: G.trainingUnlocked === true
        },
        regionStarters: [
          ...(G.starterKanto || G.starter || G.regionStarter?.kanto ? ['kanto'] : []),
          ...(G.starterJohto || G.regionStarter?.johto ? ['johto'] : []),
          ...(G.starterHoenn || G.regionStarter?.hoenn ? ['hoenn'] : [])
        ],
        championTitle: leaguesWon.includes('kanto')
      }
    };
  }
});
