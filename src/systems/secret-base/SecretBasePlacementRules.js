/**
 * @file SecretBasePlacementRules.js
 * @brief Pure collision, placement, NPC reachability, and room traversal rules.
 */
import { SecretBaseRules } from '../../config/SecretBaseRules.js';
import { SecretBaseItemDB } from '../../data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../../data/base/SecretBaseLayoutDB.js';

const ITEM_DB = () => SecretBaseItemDB.getInstance();
const LAYOUT_DB = () => SecretBaseLayoutDB.getInstance();
const DIRECTIONS = Object.values(SecretBaseRules.DIRECTIONS);

/** @param {number} x @param {number} y @returns {string} */
function cellKey(x, y) {
  return `${x},${y}`;
}

/** @param {*} value @returns {boolean} */
function validCoordinate(value) {
  return Number.isSafeInteger(Number(value));
}

export class SecretBasePlacementRules {
  /**
   * @param {Object} data - SecretBaseData or compatible plain snapshot
   * @param {string} itemId
   * @param {number} x
   * @param {number} y
   * @param {{ignoreUid?:number|string|null}} [options]
   * @returns {{ok:boolean,reason?:string,x?:number,y?:number,footprint?:Object}}
   */
  static canPlaceDecoration(data, itemId, x, y, options = {}) {
    const items = ITEM_DB();
    const item = items.getById(itemId);
    if (!item) return { ok: false, reason: 'err.unknown' };
    const layout = LAYOUT_DB().getById(data?.layoutId);
    if (!layout) return { ok: false, reason: 'err.no_base' };
    if (!validCoordinate(x) || !validCoordinate(y)) return { ok: false, reason: 'err.out_of_bounds' };
    const ignoreUid = options.ignoreUid ?? null;
    const footprint = items.getFootprint(item);
    let px = Number(x);
    let py = Number(y);
    const occupancy = this._occupancy(data, { ignoreUid });

    if (item.effect === SecretBaseRules.EFFECTS.STAIRS) {
      let anchorY = py;
      if (!this._cell(layout, px, anchorY)?.stairAnchor) {
        if (this._cell(layout, px, py + footprint.depth - 1)?.stairAnchor) anchorY = py + footprint.depth - 1;
        else return { ok: false, reason: 'err.stairs_anchor' };
      }
      py = anchorY - (footprint.depth - 1);
      let startX = px;
      while (startX > 0 && this._cell(layout, startX - 1, anchorY)?.stairAnchor) startX--;
      const aligned = Array.from({ length: footprint.width }, (_, offset) =>
        this._cell(layout, startX + offset, anchorY)?.stairAnchor === true
      ).every(Boolean);
      if (aligned) px = startX;
      for (let dx = 0; dx < footprint.width; dx++) {
        if (!this._cell(layout, px + dx, anchorY)?.stairAnchor) {
          return { ok: false, reason: 'err.stairs_anchor' };
        }
      }
      for (let dy = 0; dy < footprint.depth; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const cell = this._cell(layout, px + dx, py + dy);
          if (!cell) return { ok: false, reason: 'err.out_of_bounds' };
          if (![SecretBaseRules.CELL_TYPES.FLOOR, SecretBaseRules.CELL_TYPES.CLIFF].includes(cell.type)) {
            return { ok: false, reason: 'err.floor_only' };
          }
          if (cell.entrance || cell.spawnPoint) return { ok: false, reason: 'err.entrance' };
          if (occupancy.floor.has(cellKey(px + dx, py + dy)) || occupancy.npcs.has(cellKey(px + dx, py + dy))) {
            return { ok: false, reason: 'err.occupied' };
          }
        }
      }
    } else if (item.effect === SecretBaseRules.EFFECTS.BOARD) {
      for (let dy = 0; dy < footprint.depth; dy++) {
        const cell = this._cell(layout, px, py + dy);
        if (!cell) return { ok: false, reason: 'err.out_of_bounds' };
        if (cell.entrance || cell.spawnPoint) return { ok: false, reason: 'err.entrance' };
        if (![SecretBaseRules.CELL_TYPES.FLOOR, SecretBaseRules.CELL_TYPES.HOLE].includes(cell.type)) {
          return { ok: false, reason: 'err.floor_only' };
        }
        if (occupancy.floor.has(cellKey(px, py + dy)) || occupancy.npcs.has(cellKey(px, py + dy))) {
          return { ok: false, reason: 'err.occupied' };
        }
      }
    } else {
      for (let dy = 0; dy < footprint.depth; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const cx = px + dx;
          const cy = py + dy;
          const cell = this._cell(layout, cx, cy);
          if (!cell) return { ok: false, reason: 'err.out_of_bounds' };
          if (item.layer === SecretBaseRules.LAYERS.WALL) {
            if (![SecretBaseRules.CELL_TYPES.WALL, SecretBaseRules.CELL_TYPES.CLIFF].includes(cell.type)) {
              return { ok: false, reason: 'err.wall_only' };
            }
            if (occupancy.wall.has(cellKey(cx, cy))) return { ok: false, reason: 'err.occupied' };
          } else if (item.layer === SecretBaseRules.LAYERS.SURFACE) {
            if (cell.type !== SecretBaseRules.CELL_TYPES.FLOOR) return { ok: false, reason: 'err.surface_only' };
            if (cell.entrance || cell.spawnPoint) return { ok: false, reason: 'err.entrance' };
            if (occupancy.surface.has(cellKey(cx, cy))) return { ok: false, reason: 'err.surface_taken' };
            const carrier = occupancy.carriers.get(cellKey(cx, cy));
            if (!carrier && (occupancy.floor.has(cellKey(cx, cy)) || occupancy.npcs.has(cellKey(cx, cy)))) {
              return { ok: false, reason: 'err.occupied' };
            }
            if (carrier && !carrier.acceptsSurface) return { ok: false, reason: 'err.occupied' };
          } else {
            if (cell.type !== SecretBaseRules.CELL_TYPES.FLOOR) return { ok: false, reason: 'err.floor_only' };
            if (cell.stairAnchor) return { ok: false, reason: 'err.stairs_anchor' };
            if (cell.entrance || cell.spawnPoint) return { ok: false, reason: 'err.entrance' };
            if (occupancy.floor.has(cellKey(cx, cy)) || occupancy.npcs.has(cellKey(cx, cy))) {
              return { ok: false, reason: 'err.occupied' };
            }
          }
        }
      }
      if (itemId === SecretBaseRules.ITEM_IDS.STAND || itemId === SecretBaseRules.ITEM_IDS.SLIDE) {
        let elevation = null;
        for (let dy = 0; dy < footprint.depth; dy++) {
          for (let dx = 0; dx < footprint.width; dx++) {
            const next = this._cell(layout, px + dx, py + dy)?.elevation ?? 0;
            if (elevation === null) elevation = next;
            else if (elevation !== next) return { ok: false, reason: 'err.uneven' };
          }
        }
      }
      if (item.layer === SecretBaseRules.LAYERS.WALL) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const wall = this._cell(layout, px + dx, py);
          const below = this._cell(layout, px + dx, py + footprint.depth);
          if (!wall || ![SecretBaseRules.CELL_TYPES.WALL, SecretBaseRules.CELL_TYPES.CLIFF].includes(wall.type) ||
              !below || below.type !== SecretBaseRules.CELL_TYPES.FLOOR) {
            return { ok: false, reason: 'err.wall_only' };
          }
        }
      }
    }

    const placed = Array.isArray(data?.decorations) ? data.decorations : [];
    const placedNonAuto = placed.filter((entry) => {
      if (entry.uid === ignoreUid) return false;
      const existing = items.getById(entry.itemId);
      return existing && existing.acquisition !== 'auto';
    }).length;
    if (item.acquisition !== 'auto' && placedNonAuto >= items.getMaxPlaced()) {
      return { ok: false, reason: 'err.max_placed' };
    }
    if (item.acquisition === 'auto' && placed.some((entry) => entry.itemId === itemId && entry.uid !== ignoreUid)) {
      return { ok: false, reason: 'err.already_placed' };
    }

    if (item.layer !== SecretBaseRules.LAYERS.WALL) {
      const candidate = { uid: '__base-placement-preview__', itemId, x: px, y: py, rotation: 0 };
      const testData = {
        ...data,
        decorations: placed.filter((entry) => entry.uid !== ignoreUid).concat(candidate)
      };
      const reachable = this._reachableCells(testData, layout, layout.spawn);
      if (!reachable.has(cellKey(layout.spawn.x, layout.spawn.y))) return { ok: false, reason: 'err.blocks_spawn' };
      const spawn = data?.spawn || layout.spawn;
      if (!reachable.has(cellKey(spawn.x, spawn.y))) return { ok: false, reason: 'err.blocks_spawn' };
      const pc = (testData.decorations || []).find((entry) => entry.itemId === SecretBaseRules.ITEM_IDS.PC);
      if (pc && !this._hasReachableAdjacent(reachable, pc.x, pc.y, items.getFootprint(SecretBaseRules.ITEM_IDS.PC))) {
        return { ok: false, reason: 'err.pc_unreachable' };
      }
    }
    return { ok: true, x: px, y: py, footprint };
  }

  /**
   * @param {Object} data
   * @param {Object} npc
   * @param {number} x
   * @param {number} y
   * @param {{ignoreNpcId?:string|null}} [options]
   * @returns {{ok:boolean,reason?:string}}
   */
  static canPlaceNpc(data, npc, x, y, options = {}) {
    const layout = LAYOUT_DB().getById(data?.layoutId);
    if (!layout) return { ok: false, reason: 'err.no_base' };
    if (!validCoordinate(x) || !validCoordinate(y)) return { ok: false, reason: 'err.out_of_bounds' };
    const cell = this._cell(layout, Number(x), Number(y));
    if (!cell || cell.type !== SecretBaseRules.CELL_TYPES.FLOOR || cell.stairAnchor) {
      return { ok: false, reason: 'err.occupied' };
    }
    const occupancy = this._occupancy(data, { ignoreNpcId: options.ignoreNpcId });
    const key = cellKey(Number(x), Number(y));
    if (occupancy.npcs.has(key)) return { ok: false, reason: 'err.occupied' };
    if (occupancy.floor.has(key) && !this._isWalkable(data, layout, Number(x), Number(y), 0, occupancy)) {
      return { ok: false, reason: 'err.occupied' };
    }
    const npcs = (data.npcs || []).filter((entry) => entry.id !== options.ignoreNpcId && entry.id !== npc?.id);
    const candidate = { ...npc, x: Number(x), y: Number(y) };
    const testData = { ...data, npcs: [...npcs, candidate] };
    const reachable = this._reachableCells(testData, layout, layout.spawn);
    if (!reachable.has(cellKey(layout.spawn.x, layout.spawn.y))) return { ok: false, reason: 'err.blocks_spawn' };
    const spawn = data.spawn || layout.spawn;
    if (!reachable.has(cellKey(spawn.x, spawn.y))) return { ok: false, reason: 'err.blocks_spawn' };
    const pc = (data.decorations || []).find((entry) => entry.itemId === SecretBaseRules.ITEM_IDS.PC);
    if (pc && !this._hasReachableAdjacent(reachable, pc.x, pc.y, ITEM_DB().getFootprint(SecretBaseRules.ITEM_IDS.PC))) {
      return { ok: false, reason: 'err.pc_unreachable' };
    }
    return { ok: true };
  }

  /**
   * Finds a shortest room path without mutating the supplied state.
   * @param {Object} data
   * @param {{x:number,y:number,elevation?:number}} start
   * @param {{x:number,y:number}} target
   * @returns {Array<{x:number,y:number,elevation:number}>|null}
   */
  static findPath(data, start, target) {
    const layout = LAYOUT_DB().getById(data?.layoutId);
    if (!layout || !start || !target) return null;
    const startCell = this._cell(layout, start.x, start.y);
    const startElevation = Number.isFinite(start.elevation) ? start.elevation : (startCell?.elevation || 0);
    const firstKey = `${start.x},${start.y},${startElevation}`;
    const previous = new Map();
    const queue = [{ x: start.x, y: start.y, elevation: startElevation }];
    const seen = new Set([firstKey]);
    let end = null;
    const occupancy = this._occupancy(data);
    while (queue.length) {
      const current = queue.shift();
      if (current.x === target.x && current.y === target.y) {
        end = current;
        break;
      }
      for (const next of this._neighbors(data, layout, current.x, current.y, current.elevation, occupancy)) {
        const key = `${next.x},${next.y},${next.elevation}`;
        if (seen.has(key)) continue;
        seen.add(key);
        previous.set(key, `${current.x},${current.y},${current.elevation}`);
        queue.push(next);
      }
    }
    if (!end) return null;
    const path = [];
    let key = `${end.x},${end.y},${end.elevation}`;
    while (key !== firstKey) {
      const [x, y, elevation] = key.split(',').map(Number);
      path.unshift({ x, y, elevation });
      key = previous.get(key);
      if (!key) return null;
    }
    return path;
  }

  /** @param {Object} data @param {number} x @param {number} y @returns {Object} */
  static getOccupants(data, x, y) {
    const layout = LAYOUT_DB().getById(data?.layoutId);
    const cell = this._cell(layout, x, y);
    const decorations = (data?.decorations || []).filter((entry) => this._containsVisual(entry, x, y));
    const npc = (data?.npcs || []).find((entry) => entry.x === x && entry.y === y) || null;
    return { cell, npc, decorations };
  }

  /** @param {Object} data @param {number} x @param {number} y @returns {Object|null} */
  static getSlideRamp(data, x, y) {
    const zone = this._zoneAt(data, x, y);
    if (zone?.item.itemId === SecretBaseRules.ITEM_IDS.SLIDE && zone.dx === 1 &&
        zone.dy >= 1 && zone.dy < zone.footprint.depth - 1) return zone.item;
    return null;
  }

  /** @private */
  static _containsVisual(entry, x, y) {
    const item = ITEM_DB().getById(entry.itemId);
    if (!item) return false;
    const footprint = ITEM_DB().getFootprint(item);
    const visualDepth = Number(item.depth) || footprint.depth;
    const visualTop = entry.y - (Number(item.overhang) || (item.behind ? visualDepth - footprint.depth : 0));
    return x >= entry.x && x < entry.x + item.width && y >= visualTop && y < visualTop + visualDepth;
  }

  /** @private */
  static _cell(layout, x, y) {
    return layout?.cells?.[y]?.[x] || null;
  }

  /** @private */
  static _occupancy(data, { ignoreUid = null, ignoreNpcId = null } = {}) {
    const floor = new Set();
    const wall = new Set();
    const surface = new Set();
    const carriers = new Map();
    const npcs = new Set();
    for (const decoration of data?.decorations || []) {
      if (decoration.uid === ignoreUid) continue;
      const item = ITEM_DB().getById(decoration.itemId);
      if (!item) continue;
      const footprint = ITEM_DB().getFootprint(item);
      const target = item.layer === SecretBaseRules.LAYERS.WALL
        ? wall
        : item.layer === SecretBaseRules.LAYERS.SURFACE
          ? surface
          : floor;
      for (let dy = 0; dy < footprint.depth; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const key = cellKey(decoration.x + dx, decoration.y + dy);
          target.add(key);
          if (item.layer === SecretBaseRules.LAYERS.FLOOR && item.acceptsSurface) carriers.set(key, item);
        }
      }
    }
    for (const npc of data?.npcs || []) {
      if (npc.id !== ignoreNpcId && npc.x != null && npc.y != null) npcs.add(cellKey(npc.x, npc.y));
    }
    return { floor, wall, surface, carriers, npcs };
  }

  /** @private @param {Object} data @param {Object} layout @param {Object} start */
  static _reachableCells(data, layout, start) {
    const reachable = new Set();
    if (!start) return reachable;
    const first = this._cell(layout, start.x, start.y);
    if (!first || !this._isWalkable(data, layout, start.x, start.y, first.elevation || 0)) return reachable;
    const queue = [{ x: start.x, y: start.y, elevation: first.elevation || 0 }];
    const seen = new Set([`${start.x},${start.y},${first.elevation || 0}`]);
    const occupancy = this._occupancy(data);
    while (queue.length) {
      const current = queue.shift();
      reachable.add(cellKey(current.x, current.y));
      for (const next of this._neighbors(data, layout, current.x, current.y, current.elevation, occupancy)) {
        const key = `${next.x},${next.y},${next.elevation}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    return reachable;
  }

  /** @private */
  static _neighbors(data, layout, x, y, elevation, occupancy) {
    const out = [];
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;
      const target = this._cell(layout, nx, ny);
      const source = this._cell(layout, x, y);
      if (!target || !source) continue;
      const targetPass = target.type === SecretBaseRules.CELL_TYPES.CLIFF && this._stairsPass(data, layout, nx, ny);
      if (targetPass) {
        out.push({ x: nx, y: ny, elevation });
        continue;
      }
      if (source.type === SecretBaseRules.CELL_TYPES.CLIFF && this._stairsPass(data, layout, x, y) &&
          target.type === SecretBaseRules.CELL_TYPES.FLOOR && target.elevation !== elevation &&
          this._isWalkable(data, layout, nx, ny, target.elevation || 0, occupancy)) {
        out.push({ x: nx, y: ny, elevation: target.elevation || 0 });
        continue;
      }
      if (this._isWalkable(data, layout, nx, ny, elevation, occupancy) &&
          this._zoneGateAllowed(data, x, y, nx, ny)) {
        out.push({ x: nx, y: ny, elevation });
      }
    }
    return out;
  }

  /** @private */
  static _isWalkable(data, layout, x, y, elevation, occupancy = null) {
    const cell = this._cell(layout, x, y);
    if (!cell) return false;
    const key = cellKey(x, y);
    const occ = occupancy || this._occupancy(data);
    const npc = occ.npcs.has(key);
    if (npc) return false;
    const zone = this._zoneAt(data, x, y);
    if (zone && this._zoneTop(zone) && !this._zoneBlocked(zone)) {
      const itemAt = (data.decorations || []).find((entry) => entry.uid !== zone.item.uid &&
        ITEM_DB().getById(entry.itemId)?.layer === SecretBaseRules.LAYERS.FLOOR &&
        this._contains(entry, x, y));
      return !itemAt || ITEM_DB().getById(itemAt.itemId)?.walkable === true;
    }
    if (cell.type === SecretBaseRules.CELL_TYPES.FLOOR) {
      if (elevation !== null && elevation !== undefined && (cell.elevation || 0) !== elevation) return false;
    } else if (cell.type === SecretBaseRules.CELL_TYPES.HOLE) {
      const board = (data.decorations || []).find((entry) => entry.itemId === SecretBaseRules.ITEM_IDS.BOARD && this._contains(entry, x, y));
      if (!board || elevation !== 0) return false;
    } else {
      return false;
    }
    if (!occ.floor.has(key)) return true;
    const itemAt = (data.decorations || []).find((entry) => {
      if (!this._contains(entry, x, y)) return false;
      const item = ITEM_DB().getById(entry.itemId);
      return item && item.layer === SecretBaseRules.LAYERS.FLOOR;
    });
    return !!itemAt && ITEM_DB().getById(itemAt.itemId)?.walkable === true && !this._zoneBlocked(zone);
  }

  /** @private */
  static _stairsPass(data, layout, x, y) {
    const current = this._cell(layout, x, y);
    const below = this._cell(layout, x, y + 1);
    if (current?.type !== SecretBaseRules.CELL_TYPES.CLIFF || !below?.stairAnchor) return false;
    return (data.decorations || []).some((entry) => {
      if (entry.itemId !== SecretBaseRules.ITEM_IDS.STAIRS) return false;
      const fp = ITEM_DB().getFootprint(SecretBaseRules.ITEM_IDS.STAIRS);
      return x >= entry.x && x < entry.x + fp.width && entry.y + fp.depth - 1 === y + 1;
    });
  }

  /** @private */
  static _contains(entry, x, y) {
    const footprint = ITEM_DB().getFootprint(entry.itemId);
    return x >= entry.x && x < entry.x + footprint.width && y >= entry.y && y < entry.y + footprint.depth;
  }

  /** @private */
  static _zoneAt(data, x, y) {
    for (const entry of data.decorations || []) {
      if (![SecretBaseRules.ITEM_IDS.STAND, SecretBaseRules.ITEM_IDS.SLIDE,
        SecretBaseRules.ITEM_IDS.RED_TENT, SecretBaseRules.ITEM_IDS.BLUE_TENT].includes(entry.itemId)) continue;
      const item = ITEM_DB().getById(entry.itemId);
      const footprint = ITEM_DB().getFootprint(item);
      const overhang = Number(item.overhang) || 0;
      const top = entry.y - overhang;
      const depth = footprint.depth + overhang;
      if (x >= entry.x && x < entry.x + footprint.width && y >= top && y < top + depth) {
        return { item: entry, definition: item, footprint: { width: footprint.width, depth }, dx: x - entry.x, dy: y - top };
      }
    }
    return null;
  }

  /** @private */
  static _zoneTop(zone) {
    if (zone.item.itemId === SecretBaseRules.ITEM_IDS.STAND) return zone.dy === 0;
    if (zone.item.itemId === SecretBaseRules.ITEM_IDS.SLIDE) return zone.dy <= 1 || (zone.dx === 1 && zone.dy < zone.footprint.depth - 1);
    return false;
  }

  /** @private */
  static _zoneStair(zone) {
    if (zone.item.itemId === SecretBaseRules.ITEM_IDS.STAND) return zone.dy === zone.footprint.depth - 1 &&
      (zone.dx === 0 || zone.dx === zone.footprint.width - 1);
    return zone.item.itemId === SecretBaseRules.ITEM_IDS.SLIDE && zone.dy === 2 && zone.dx === 0;
  }

  /** @private */
  static _zoneBlocked(zone) {
    if (!zone) return false;
    if (zone.item.itemId === SecretBaseRules.ITEM_IDS.STAND) return zone.dy === zone.footprint.depth - 1 &&
      zone.dx > 0 && zone.dx < zone.footprint.width - 1;
    if (zone.item.itemId === SecretBaseRules.ITEM_IDS.RED_TENT || zone.item.itemId === SecretBaseRules.ITEM_IDS.BLUE_TENT) return zone.dx !== 1;
    return false;
  }

  /** @private */
  static _zoneGateAllowed(data, x, y, nx, ny) {
    const from = this._zoneAt(data, x, y);
    const to = this._zoneAt(data, nx, ny);
    const isRamp = to?.item.itemId === SecretBaseRules.ITEM_IDS.SLIDE && to.dx === 1 && to.dy >= 1 && to.dy < to.footprint.depth - 1;
    if (isRamp) return !!from && from.item.uid === to.item.uid && from.dy <= 1 && ny >= y;
    const fromTop = from && this._zoneTop(from);
    const toTop = to && this._zoneTop(to);
    if (fromTop && toTop) return from.item.uid === to.item.uid;
    if (!fromTop && !toTop) return true;
    const high = fromTop ? from : to;
    const stair = fromTop ? to : from;
    return !!(stair && this._zoneStair(stair) && high.item.uid === stair.item.uid);
  }

  /** @private */
  static _hasReachableAdjacent(reachable, x, y, footprint = { width: 1, depth: 1 }) {
    for (let dy = -1; dy <= footprint.depth; dy++) {
      for (let dx = -1; dx <= footprint.width; dx++) {
        if (dx >= 0 && dx < footprint.width && dy >= 0 && dy < footprint.depth) continue;
        if (reachable.has(cellKey(x + dx, y + dy))) return true;
      }
    }
    return false;
  }
}
