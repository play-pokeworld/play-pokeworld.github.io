/**
 * @file MigrationOriginalToV1.js
 * @brief Save migration 0 -> 1: a save exported by the ORIGINAL game (state wrapped in `.G`)
 * becomes a rework v1 save (C++: struct MigrationOriginalToV1 : SaveMigration).
 *
 * Pure function of the raw JSON (only read-only repositories are used to translate ids).
 * Fields the v1 shape did not have yet (pokedex, inventory, statistics, quests, Pokémon uid /
 * talent / IVs…) are carried along: the next migrations keep them.
 * Not carried: form slots (the original numbers them, the remake names them), eggs, rolled
 * repeatable quests. Carried for MigrationV3ToV4: the PC box (`box`), the Poké Ball counts and
 * filters (`pokeballs: { counts, filters }`) and the duplicate catch counters.
 */
import { PokemonDB } from '../../pokemon/PokemonDB.js';

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

/**
 * @param {Object} G - Original game state
 * @returns {Object} Quest progress (schema 3 shape)
 */
function convertQuests(G) {
  const completed = Object.keys(G.completedQuests || {})
    .filter((key) => key.startsWith('side_'))
    .map((key) => `side.${key.substring('side_'.length)}`);
  // Main and side instances keep their progress; rolled repeatables (G.repeatables) are not carried.
  const active = {};
  for (const instance of Array.isArray(G.activeQuests) ? G.activeQuests : []) {
    if (!instance || (instance.cat !== 'main' && instance.cat !== 'side')) continue;
    active[`${instance.cat}.${instance.qid}`] = { progress: Math.max(0, Number(instance.progress) || 0) };
  }
  return { mainStep: { ...(G.mainStep || {}) }, active, completed, repeatablesCompleted: G.repeatablesCompleted || 0 };
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
    const currencies = {};
    for (const [field, id] of Object.entries(WALLET_FIELDS)) {
      if (Number.isFinite(G.wallet?.[field])) currencies[id] = G.wallet[field];
    }
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
      pokedex: convertPokedex(G.pokedex),
      inventory: { ...(G.inventory || {}) },
      pokeballs: convertPokeballs(G.pokeballs),
      statistics: {
        wildWins: { ...(G.wildWinsByLoc || {}) },
        trainerWins: { ...(G.questTrainerWins || {}) },
        duplicateCatches: convertDuplicateCatches(G.dupeCatches)
      },
      quests: convertQuests(G)
    };
  }
});
