/**
 * @file SecretBaseLayoutDB.js
 * @brief Hoenn secret-base alcove grids, legacy layout aliases, and location mapping.
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { SECRET_BASE_LAYOUT_SHAPES } from '../content/SecretBaseLayoutsContent.js';
import { SecretBaseRules } from '../../config/SecretBaseRules.js';

const CELL_TYPES = Object.freeze({
  '#': 'wall',
  '.': 'floor',
  E: 'floor',
  S: 'floor',
  o: 'hole',
  '^': 'floor',
  '=': 'cliff',
  a: 'floor'
});

/** @param {string} rawId @returns {string} */
function normalizeLegacyId(rawId) {
  const id = String(rawId || '').trim();
  const legacy = /^([a-z]+)_(square_a|wide_b|twolevel_a)$/.exec(id.toLowerCase());
  if (!legacy || !['cave', 'tree', 'bush'].includes(legacy[1])) return id.toLowerCase();
  const shape = { square_a: '1', wide_b: '2', twolevel_a: '3' }[legacy[2]];
  return `${legacy[1]}_${shape}`;
}

/** @param {Object} raw @returns {Readonly<Object>} */
function buildLayout(raw) {
  const rows = raw.rows.map((row) => String(row));
  const width = rows[0]?.length || 0;
  const height = rows.length;
  const cells = [];
  const stairAnchors = [];
  let spawn = null;
  let exit = null;

  for (let y = 0; y < height; y++) {
    const cellsRow = [];
    for (let x = 0; x < width; x++) {
      const marker = rows[y][x] || ' ';
      const type = CELL_TYPES[marker] || 'void';
      const cell = { type, elevation: marker === '^' ? 1 : 0 };
      if (marker === 'E') {
        cell.entrance = true;
        exit = { x, y };
      } else if (marker === 'S') {
        cell.spawnPoint = true;
        spawn = { x, y };
      } else if (marker === 'a') {
        cell.stairAnchor = true;
        stairAnchors.push({ x, y });
      }
      cellsRow.push(cell);
    }
    cells.push(cellsRow);
  }

  return deepFreeze({
    id: raw.id,
    theme: raw.theme,
    variant: raw.variant,
    shape: raw.shape,
    canonical: raw.canonical,
    width,
    height,
    rows,
    cells,
    spawn,
    exit,
    stairAnchors
  });
}

export class SecretBaseLayoutDB extends DataRepository {
  /** @private @type {SecretBaseLayoutDB|null} */
  static _instance = null;

  /** @returns {SecretBaseLayoutDB} */
  static getInstance() {
    if (!SecretBaseLayoutDB._instance) SecretBaseLayoutDB._instance = new SecretBaseLayoutDB();
    return SecretBaseLayoutDB._instance;
  }

  constructor() {
    super('SecretBaseLayoutDB');
  }

  /** @override @protected */
  _build() {
    this._aliases = new Map();
    for (const raw of SECRET_BASE_LAYOUT_SHAPES) {
      if (!raw || typeof raw.id !== 'string' || this._entries.has(raw.id)) continue;
      const layout = buildLayout(raw);
      this._entries.set(layout.id, layout);
      if (layout.canonical) this._aliases.set(layout.canonical.toLowerCase(), layout.id);
    }
  }

  /**
   * @override
   * @param {string} id
   * @returns {Readonly<Object>|null}
   */
  getById(id) {
    const normalized = normalizeLegacyId(id);
    const alias = this._aliases.get(normalized.toLowerCase());
    return this._entries.get(alias || normalized) || null;
  }

  /** @override @param {string} id @returns {boolean} */
  has(id) {
    return this.getById(id) !== null;
  }

  /** @param {string} locationId @returns {Readonly<Object>[]} */
  getAtLocation(locationId) {
    const ids = SecretBaseRules.ALCOVES_BY_LOCATION[String(locationId || '').toLowerCase()] || [];
    return ids.map((id) => this.getById(id)).filter(Boolean);
  }

  /** @param {string} locationId @returns {string[]} */
  getIdsAtLocation(locationId) {
    return [...(SecretBaseRules.ALCOVES_BY_LOCATION[String(locationId || '').toLowerCase()] || [])];
  }

  /** @returns {string[]} */
  getLocationIds() {
    return Object.keys(SecretBaseRules.ALCOVES_BY_LOCATION);
  }

  /** @override @returns {Array<Object>} */
  validate() {
    const problems = [];
    for (const layout of this.getAll()) {
      if (!layout.width || !layout.height) problems.push(this._problem(layout.id, 'dimensions', [layout.width, layout.height]));
      if (!layout.spawn) problems.push(this._problem(layout.id, 'spawn', null));
      if (!layout.exit) problems.push(this._problem(layout.id, 'exit', null));
      if (layout.rows.some((row) => row.length !== layout.width)) problems.push(this._problem(layout.id, 'rowWidth', layout.rows.map((row) => row.length)));
    }
    for (const [locationId, ids] of Object.entries(SecretBaseRules.ALCOVES_BY_LOCATION)) {
      for (const id of ids) {
        if (!this.has(id)) problems.push(this._problem(locationId, 'alcove', id));
      }
    }
    return problems;
  }
}
