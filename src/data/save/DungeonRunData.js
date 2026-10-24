/**
 * @file DungeonRunData.js
 * @brief Persisted state of a multi-floor dungeon expedition.
 */
import { DungeonAutoRules } from '../../config/DungeonAutoRules.js';
import { BaseModel } from '../core/BaseModel.js';

const TILE_TYPES = new Set(['empty', 'combat', 'elite', 'chest', 'boss', 'ladder']);

/** @param {*} value @param {number} fallback @returns {number} */
function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

/** @param {*} raw @returns {Object|null} */
function readMap(raw) {
  if (!raw || typeof raw !== 'object' || !raw.tiles || typeof raw.tiles !== 'object') return null;
  const tiles = {};
  for (const [id, tile] of Object.entries(raw.tiles)) {
    if (!tile || typeof tile !== 'object') continue;
    const type = TILE_TYPES.has(tile.type) ? tile.type : 'empty';
    tiles[id] = {
      id,
      col: nonNegative(tile.col),
      row: nonNegative(tile.row),
      type,
      revealed: tile.revealed === true,
      done: tile.done === true
    };
  }
  const cols = nonNegative(raw.cols);
  const rows = nonNegative(raw.rows);
  if (!cols || !rows || !Object.keys(tiles).length) return null;
  return { grid: true, cols, rows, tiles };
}

/** @param {*} raw @returns {Object|null} */
function readLoot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const catches = Array.isArray(raw.catches) ? raw.catches.filter((entry) => entry && typeof entry === 'object').map((entry) => ({
    species: String(entry.species || ''),
    form: String(entry.form || ''),
    name: String(entry.name || ''),
    shiny: entry.shiny === true,
    duplicate: entry.duplicate === true,
    ballId: String(entry.ballId || '')
  })).filter((entry) => entry.species) : [];
  const items = {};
  for (const [itemId, quantity] of Object.entries(raw.items && typeof raw.items === 'object' ? raw.items : {})) {
    const amount = nonNegative(quantity);
    if (amount > 0) items[itemId] = amount;
  }
  return { catches, items, money: nonNegative(raw.money), tokens: nonNegative(raw.tokens) };
}

export class DungeonRunData extends BaseModel {
  /** @param {Object} [data] */
  constructor(data = {}) {
    super('DungeonRunData', 'Data');
    this.deserialize(data);
  }

  /** @override @returns {Object} */
  serialize() {
    return {
      active: this.active,
      locationId: this.locationId,
      badgeReq: this.badgeReq,
      toll: this.toll,
      depth: this.depth,
      floor: this.floor,
      wins: this.wins,
      totalWins: this.totalWins,
      bag: { ...this.bag },
      loot: { catches: this.loot.catches.map((entry) => ({ ...entry })), items: { ...this.loot.items }, money: this.loot.money, tokens: this.loot.tokens },
      bossDone: this.bossDone,
      bossDefeated: this.bossDefeated,
      bossTile: this.bossTile,
      startedAt: this.startedAt,
      map: this.map ? {
        grid: true,
        cols: this.map.cols,
        rows: this.map.rows,
        tiles: Object.fromEntries(Object.entries(this.map.tiles).map(([id, tile]) => [id, { ...tile }]))
      } : null,
      pos: this.pos,
      pendingNode: this.pendingNode,
      auto: this.auto
    };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this.active = raw.active !== false;
    this.locationId = String(raw.locationId || raw.loc || '');
    this.badgeReq = nonNegative(raw.badgeReq);
    this.toll = nonNegative(raw.toll);
    this.depth = Math.max(1, nonNegative(raw.depth, 1));
    this.floor = Math.min(this.depth, Math.max(1, nonNegative(raw.floor, 1)));
    this.wins = nonNegative(raw.wins);
    this.totalWins = nonNegative(raw.totalWins);
    const bag = raw.bag && typeof raw.bag === 'object' ? raw.bag : {};
    this.bag = { tokens: nonNegative(bag.tokens), money: nonNegative(bag.money) };
    this.loot = readLoot(raw.loot) || { catches: [], items: {}, money: 0, tokens: 0 };
    this.bossDone = raw.bossDone === true;
    this.bossDefeated = raw.bossDefeated === true;
    this.bossTile = typeof raw.bossTile === 'string' ? raw.bossTile : '';
    this.startedAt = nonNegative(raw.startedAt, Date.now());
    this.map = readMap(raw.map);
    this.pos = typeof raw.pos === 'string' && this.map?.tiles[raw.pos] ? raw.pos : '';
    this.pendingNode = typeof raw.pendingNode === 'string' && this.map?.tiles[raw.pendingNode] ? raw.pendingNode : null;
    this.auto=raw.auto===true?DungeonAutoRules.DEFAULT_MODE:DungeonAutoRules.MODES.includes(raw.auto)?raw.auto:false;
    if (!this.locationId) this.active = false;
  }
}
