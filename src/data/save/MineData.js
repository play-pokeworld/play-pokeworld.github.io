/**
 * @file MineData.js
 * @brief Persistent grid, loot and energy state of the mine.
 */
import { BaseModel } from '../core/BaseModel.js';
import { SaveValues } from '../core/SaveValues.js';
import { MineRules } from '../../config/MineRules.js';

/** @param {*} value @param {number} fallback @param {number} minimum @param {number} maximum */
function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(minimum, Math.min(maximum, Math.floor(parsed)))
    : fallback;
}

/** @param {*} raw @returns {Object|null} */
function readLoot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const itemId = raw.itemId || raw.key;
  const x = Math.floor(Number(raw.x));
  const y = Math.floor(Number(raw.y));
  const shape = Array.isArray(raw.shape)
    ? raw.shape.map((row) =>
        Array.isArray(row) ? row.map((cell) => (cell === 1 ? 1 : 0)) : [],
      )
    : [];
  const width = shape[0]?.length ?? 0;
  if (
    typeof itemId !== 'string' ||
    !itemId ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x + width > MineRules.WIDTH ||
    y + shape.length > MineRules.HEIGHT ||
    !width ||
    shape.some((row) => row.length !== width) ||
    !shape.some((row) => row.includes(1))
  )
    return null;
  return { itemId, x, y, shape, collected: raw.collected === true };
}

export class MineData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) {
    super('MineData', 'Data');
    this.deserialize(data);
  }

  /** @returns {boolean} Whether the current saved grid has the required dimensions. */
  hasGrid() {
    return (
      Array.isArray(this.grid) &&
      this.grid.length === MineRules.HEIGHT &&
      this.grid.every(
        (row) => Array.isArray(row) && row.length === MineRules.WIDTH,
      )
    );
  }

  /** @override */
  serialize() {
    return {
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      tool: this.tool,
      unlockedTools: [...this.unlockedTools],
      energyLevel: this.energyLevel,
      autoPurchased: this.autoPurchased,
      autoEnabled: this.autoEnabled,
      grid: this.grid.map((row) => [...row]),
      items: this.items.map((item) => ({
        ...item,
        shape: item.shape.map((row) => [...row]),
      })),
      completedCount: this.completedCount,
      lastEnergyAt: this.lastEnergyAt,
      manualSurveyReadyAt: this.manualSurveyReadyAt,
    };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    const maximum =
      MineRules.MAX_ENERGY +
      MineRules.ENERGY_UPGRADE_COSTS.length * MineRules.ENERGY_UPGRADE_STEP;
    this.maxEnergy = SaveValues.number(
      raw.maxEnergy,
      MineRules.MAX_ENERGY,
      MineRules.MAX_ENERGY,
      maximum,
    );
    const energy = Number(raw.energy);
    this.energy = Number.isFinite(energy)
      ? Math.max(0, Math.min(this.maxEnergy, energy))
      : MineRules.INITIAL_ENERGY;
    this.energyLevel = SaveValues.integer(
      raw.energyLevel,
      Math.max(
        0,
        Math.min(
          MineRules.ENERGY_UPGRADE_COSTS.length,
          Math.floor(
            (this.maxEnergy - MineRules.MAX_ENERGY) /
              MineRules.ENERGY_UPGRADE_STEP,
          ),
        ),
      ),
      0,
      MineRules.ENERGY_UPGRADE_COSTS.length,
    );
    this.unlockedTools = [
      ...new Set([
        'chisel',
        'hammer',
        ...SaveValues.ids(raw.unlockedTools).filter((id) =>
          Object.prototype.hasOwnProperty.call(MineRules.TOOLS, id),
        ),
      ]),
    ];
    this.autoPurchased = raw.autoPurchased === true;
    this.autoEnabled = this.autoPurchased && raw.autoEnabled === true;
    this.tool = Object.prototype.hasOwnProperty.call(MineRules.TOOLS, raw.tool)
      ? raw.tool
      : MineRules.DEFAULT_TOOL;
    if (!this.unlockedTools.includes(this.tool))
      this.tool = MineRules.DEFAULT_TOOL;
    const grid = Array.isArray(raw.grid) ? raw.grid : [];
    this.grid =
      grid.length === MineRules.HEIGHT &&
      grid.every((row) => Array.isArray(row) && row.length === MineRules.WIDTH)
        ? grid.map((row) =>
            row.map((cell) =>
              boundedInteger(cell, 0, 0, MineRules.MAX_TILE_DURABILITY),
            ),
          )
        : [];
    this.items = (Array.isArray(raw.items) ? raw.items : [])
      .map(readLoot)
      .filter(Boolean);
    this.completedCount = boundedInteger(
      raw.completedCount,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    );
    this.manualSurveyReadyAt = SaveValues.number(
      raw.manualSurveyReadyAt,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    );
    const timestamp = Number(raw.lastEnergyAt);
    this.lastEnergyAt =
      Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  }
}
