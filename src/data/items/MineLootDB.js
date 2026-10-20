/**
 * @file MineLootDB.js
 * @brief Read-only repository of grid shapes placed by the mine.
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { MINE_LOOT_TABLE } from '../raw/mine-loot-data.js';
import { ItemDB } from './ItemDB.js';
import { MineRules } from '../../config/MineRules.js';

export class MineLootDB extends DataRepository {
  /** @type {MineLootDB|null} */
  static _instance = null;

  /** @returns {MineLootDB} */
  static getInstance() {
    if (!MineLootDB._instance) MineLootDB._instance = new MineLootDB();
    return MineLootDB._instance;
  }

  constructor() {
    super('MineLootDB');
  }

  /** @protected @override */
  _build() {
    for (const raw of MINE_LOOT_TABLE) {
      this._entries.set(raw.itemId, deepFreeze({
        itemId: raw.itemId,
        region: raw.region,
        shape: raw.shape.map((row) => [...row])
      }));
    }
  }

  /** @override */
  validate() {
    const problems = [];
    const items = ItemDB.getInstance();
    for (const entry of this._entries.values()) {
      if (!items.has(entry.itemId)) problems.push(this._problem(entry.itemId, 'itemId', entry.itemId));
      if (!['kanto', MineRules.HOENN_REGION].includes(entry.region)) {
        problems.push(this._problem(entry.itemId, 'region', entry.region));
      }
      const width = entry.shape[0]?.length ?? 0;
      if (!width || entry.shape.length > MineRules.HEIGHT || width > MineRules.WIDTH) {
        problems.push(this._problem(entry.itemId, 'shape', entry.shape));
        continue;
      }
      if (entry.shape.some((row) => row.length !== width || row.some((cell) => cell !== 0 && cell !== 1))) {
        problems.push(this._problem(entry.itemId, 'shape', entry.shape));
      }
      if (!entry.shape.some((row) => row.includes(1))) problems.push(this._problem(entry.itemId, 'shape', entry.shape));
    }
    return problems;
  }
}
