/**
 * @file SecretBaseData.js
 * @brief Persistent Hoenn secret-base layout, occupants, visit record and flag progress.
 */
import { BaseModel } from '../core/BaseModel.js';
import { SecretBaseRules } from '../../config/SecretBaseRules.js';

const EMPTY_FLAGS = Object.freeze({ count: 0, collectedIds: Object.freeze({}), lastRankNotified: 'normal' });

/** @param {*} value @param {number} fallback @param {number} minimum @param {number} maximum */
function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback;
}

/** @param {*} value @returns {string|null} */
function stableId(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(id) ? id : null;
}

/** @param {*} value @returns {number|string|null} */
function placementUid(value) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 80);
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** @param {*} raw @param {number} fallback @returns {number|null} */
function coordinate(raw, fallback = null) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && Math.abs(value) <= 10000 ? value : fallback;
}

/** @param {*} raw @param {number} index @returns {Object|null} */
function readDecoration(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const itemId = stableId(raw.itemId ?? raw.s ?? raw.slug);
  const x = coordinate(raw.x);
  const y = coordinate(raw.y);
  if (!itemId || x === null || y === null) return null;
  return {
    uid: placementUid(raw.uid) ?? `base-item-${index + 1}`,
    itemId,
    x,
    y,
    rotation: 0
  };
}

/** @param {*} raw @returns {Object|null} */
function readNpcPokemon(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const species = stableId(raw.species ?? raw.speciesId);
  const legacyDexId = boundedInteger(raw.legacyDexId ?? (species ? null : raw.id), 0, 0, 2000) || null;
  if (!species && !legacyDexId) return null;
  const moves = (Array.isArray(raw.moves) ? raw.moves : [])
    .map((move) => stableId(typeof move === 'string' ? move : move?.id))
    .filter(Boolean)
    .slice(0, 4);
  const pokemon = {
    species,
    level: boundedInteger(raw.level, 5, 1, 100),
    moves,
    talent: stableId(raw.talent),
    shiny: raw.shiny === true
  };
  const heldItem = stableId(raw.heldItem ?? raw.item);
  if (heldItem) pokemon.heldItem = heldItem;
  if (legacyDexId) pokemon.legacyDexId = legacyDexId;
  return pokemon;
}

/** @param {*} raw @param {number} index @returns {Object|null} */
function readNpc(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim()
    ? raw.id.trim().slice(0, 100)
    : `legacy-npc-${index + 1}`;
  const messages = raw.messages && typeof raw.messages === 'object' ? raw.messages : raw.msgs || {};
  return {
    id,
    name: typeof raw.name === 'string' ? raw.name.slice(0, SecretBaseRules.MAX_NPC_NAME_LENGTH) : '',
    sprite: SecretBaseRules.NPC_SPRITES.includes(stableId(raw.sprite))
      ? stableId(raw.sprite)
      : SecretBaseRules.DEFAULT_NPC_SPRITE,
    team: (Array.isArray(raw.team) ? raw.team : []).map(readNpcPokemon).filter(Boolean).slice(0, SecretBaseRules.MAX_NPC_TEAM),
    messages: {
      pre: typeof messages.pre === 'string' ? messages.pre.slice(0, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH) : '',
      win: typeof messages.win === 'string' ? messages.win.slice(0, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH) : '',
      lose: typeof messages.lose === 'string' ? messages.lose.slice(0, SecretBaseRules.MAX_NPC_MESSAGE_LENGTH) : ''
    },
    x: coordinate(raw.x),
    y: coordinate(raw.y)
  };
}

/** @param {*} raw @returns {Object} */
function readStock(raw) {
  const stock = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return stock;
  for (const [rawId, rawCount] of Object.entries(raw)) {
    const id = stableId(rawId);
    const count = boundedInteger(rawCount, 0, 0, 99);
    if (id && count > 0) stock[id] = count;
  }
  return stock;
}

/** @param {*} raw @returns {Object} */
function readCollectedIds(raw) {
  const ids = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ids;
  for (const [rawId, rawTimestamp] of Object.entries(raw)) {
    const id = String(rawId).trim().replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
    const timestamp = Number(rawTimestamp);
    if (id && Number.isFinite(timestamp) && timestamp >= 0) ids[id] = Math.floor(timestamp);
  }
  return ids;
}

export class SecretBaseData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) {
    super('SecretBaseData', 'Data');
    this.deserialize(data);
  }

  /** @returns {boolean} Whether a room has been established. */
  isEstablished() {
    return !!this.layoutId;
  }

  /** @returns {number} Number of distinct base IDs with a collected flag record. */
  getUniqueBaseCount() {
    return Object.keys(this.flags.collectedIds).length;
  }

  /** @returns {string} The current ORAS flag rank id. */
  getFlagRankId() {
    let rank = SecretBaseRules.FLAG_RANKS[0];
    for (const candidate of SecretBaseRules.FLAG_RANKS) {
      if (this.flags.count >= candidate.threshold) rank = candidate;
    }
    return rank.id;
  }

  /** @override */
  serialize() {
    return {
      layoutId: this.layoutId,
      locationId: this.locationId,
      decorations: this.decorations.map((item) => ({ ...item })),
      stock: { ...this.stock },
      npcs: this.npcs.map((npc) => ({
        ...npc,
        team: npc.team.map((pokemon) => ({ ...pokemon, moves: [...pokemon.moves] })),
        messages: { ...npc.messages }
      })),
      npcStock: this.npcStock.map((npc) => ({
        ...npc,
        team: npc.team.map((pokemon) => ({ ...pokemon, moves: [...pokemon.moves] })),
        messages: { ...npc.messages }
      })),
      spawn: this.spawn ? { ...this.spawn } : null,
      nextUid: this.nextUid,
      record: { ...this.record },
      pcMessage: this.pcMessage,
      flags: {
        count: this.flags.count,
        collectedIds: { ...this.flags.collectedIds },
        lastRankNotified: this.flags.lastRankNotified
      }
    };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this.layoutId = stableId(raw.layoutId);
    this.locationId = stableId(raw.locationId ?? raw.routeId);

    const usedUids = new Set();
    let maxNumericUid = 0;
    this.decorations = (Array.isArray(raw.decorations) ? raw.decorations : Array.isArray(raw.items) ? raw.items : [])
      .map(readDecoration)
      .filter(Boolean)
      .map((item, index) => {
        let uid = item.uid;
        const key = `${typeof uid}:${uid}`;
        if (usedUids.has(key)) {
          let suffix = index + 1;
          do { uid = `base-item-${suffix++}`; } while (usedUids.has(`${typeof uid}:${uid}`));
        }
        usedUids.add(`${typeof uid}:${uid}`);
        if (typeof uid === 'number') maxNumericUid = Math.max(maxNumericUid, uid);
        return { ...item, uid };
      });

    this.stock = readStock(raw.stock);
    this.npcs = (Array.isArray(raw.npcs) ? raw.npcs : []).map(readNpc).filter(Boolean);
    this.npcStock = (Array.isArray(raw.npcStock) ? raw.npcStock : []).map(readNpc).filter(Boolean);
    const spawn = raw.spawn && typeof raw.spawn === 'object' ? raw.spawn : null;
    const spawnX = spawn ? coordinate(spawn.x) : null;
    const spawnY = spawn ? coordinate(spawn.y) : null;
    this.spawn = spawnX !== null && spawnY !== null ? { x: spawnX, y: spawnY } : null;
    this.nextUid = Math.max(maxNumericUid + 1, boundedInteger(raw.nextUid ?? raw.uidSeq, 1, 1, Number.MAX_SAFE_INTEGER));

    const record = raw.record && typeof raw.record === 'object' ? raw.record : {};
    this.record = {
      wins: boundedInteger(record.wins ?? record.w, 0, 0, Number.MAX_SAFE_INTEGER),
      losses: boundedInteger(record.losses ?? record.l, 0, 0, Number.MAX_SAFE_INTEGER),
      visits: boundedInteger(record.visits, 0, 0, Number.MAX_SAFE_INTEGER)
    };
    this.pcMessage = typeof raw.pcMessage === 'string'
      ? raw.pcMessage.slice(0, SecretBaseRules.MAX_PC_MESSAGE_LENGTH)
      : '';

    const flags = raw.flags && typeof raw.flags === 'object' ? raw.flags : {};
    const flagRank = stableId(flags.lastRankNotified) || EMPTY_FLAGS.lastRankNotified;
    this.flags = {
      count: boundedInteger(flags.count, 0, 0, Number.MAX_SAFE_INTEGER),
      collectedIds: readCollectedIds(flags.collectedIds),
      lastRankNotified: SecretBaseRules.FLAG_RANKS.some((rank) => rank.id === flagRank)
        ? flagRank
        : EMPTY_FLAGS.lastRankNotified
    };
  }
}
