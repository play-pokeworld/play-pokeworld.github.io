/**
 * @file LegacySecretBaseMigration.js
 * @brief Converts the original game's G.base and G.secretBaseFlags into Rework IDs and fields.
 */
import { PokemonDB } from '../../pokemon/PokemonDB.js';

/** @param {*} value @returns {string|null} */
function slug(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(id) ? id : null;
}

/** @param {*} value @returns {number|null} */
function safeCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && Math.abs(parsed) <= 10000 ? parsed : null;
}

/** @param {*} raw @returns {Object|null} */
function convertNpcPokemon(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dex = Number(raw.id ?? raw.legacyDexId);
  const species = slug(raw.species ?? raw.speciesId) ||
    (Number.isSafeInteger(dex) && dex > 0 ? PokemonDB.getInstance().getByDex(dex)?.id ?? null : null);
  const legacyDexId = species ? null : Number.isSafeInteger(dex) && dex > 0 ? dex : null;
  if (!species && !legacyDexId) return null;
  const moves = (Array.isArray(raw.moves) ? raw.moves : [])
    .map((move) => slug(typeof move === 'string' ? move : move?.id))
    .filter(Boolean)
    .slice(0, 4);
  const pokemon = {
    species,
    level: Math.max(1, Math.min(100, Math.floor(Number(raw.level) || 5))),
    moves,
    talent: slug(raw.talent),
    shiny: raw.shiny === true
  };
  const heldItem = slug(raw.heldItem ?? raw.item);
  if (heldItem) pokemon.heldItem = heldItem;
  if (legacyDexId) pokemon.legacyDexId = legacyDexId;
  return pokemon;
}

/** @param {*} raw @param {number} index @returns {Object|null} */
function convertNpc(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const sourceMessages = raw.messages && typeof raw.messages === 'object' ? raw.messages : raw.msgs || {};
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `legacy-npc-${index + 1}`,
    name: typeof raw.name === 'string' ? raw.name.slice(0, 18) : '',
    sprite: slug(raw.sprite) || 'trainer-0',
    team: (Array.isArray(raw.team) ? raw.team : []).map(convertNpcPokemon).filter(Boolean).slice(0, 6),
    messages: {
      pre: typeof sourceMessages.pre === 'string' ? sourceMessages.pre.slice(0, 80) : '',
      win: typeof sourceMessages.win === 'string' ? sourceMessages.win.slice(0, 80) : '',
      lose: typeof sourceMessages.lose === 'string' ? sourceMessages.lose.slice(0, 80) : ''
    },
    x: safeCoordinate(raw.x),
    y: safeCoordinate(raw.y)
  };
}

/** @param {*} raw @returns {Object} */
function convertLegacyBase(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const decorations = (Array.isArray(source.items) ? source.items : Array.isArray(source.decorations) ? source.decorations : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      uid: item.uid,
      itemId: slug(item.itemId ?? item.s ?? item.slug),
      x: item.x,
      y: item.y,
      rotation: 0
    }));
  const record = source.record && typeof source.record === 'object' ? source.record : {};
  return {
    layoutId: slug(source.layoutId),
    locationId: slug(source.locationId ?? source.routeId),
    decorations,
    stock: source.stock && typeof source.stock === 'object' && !Array.isArray(source.stock)
      ? { ...source.stock }
      : {},
    npcs: (Array.isArray(source.npcs) ? source.npcs : []).map(convertNpc).filter(Boolean),
    npcStock: (Array.isArray(source.npcStock) ? source.npcStock : []).map(convertNpc).filter(Boolean),
    spawn: source.spawn && typeof source.spawn === 'object'
      ? { x: source.spawn.x, y: source.spawn.y }
      : null,
    nextUid: source.nextUid ?? source.uidSeq ?? 1,
    record: {
      wins: record.wins ?? record.w ?? 0,
      losses: record.losses ?? record.l ?? 0,
      visits: record.visits ?? 0
    },
    pcMessage: typeof source.pcMessage === 'string' ? source.pcMessage.slice(0, 200) : ''
  };
}

/** @param {Object} legacyGame Original G object @returns {Object} */
export function migrateLegacySecretBase(legacyGame) {
  const game = legacyGame && typeof legacyGame === 'object' ? legacyGame : {};
  const rawFlags = game.secretBaseFlags && typeof game.secretBaseFlags === 'object'
    ? game.secretBaseFlags
    : {};
  return {
    ...convertLegacyBase(game.base),
    flags: {
      count: rawFlags.count ?? 0,
      collectedIds: rawFlags.collectedIds && typeof rawFlags.collectedIds === 'object'
        ? { ...rawFlags.collectedIds }
        : {},
      lastRankNotified: rawFlags.lastRankNotified || 'normal'
    }
  };
}
