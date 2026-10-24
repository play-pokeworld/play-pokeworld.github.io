/**
 * @file MineSystem.js
 * @brief Grid-mining run, energy regeneration, collectible placement and loot persistence.
 */
import { FacilityStaffSystem } from './FacilityStaffSystem.js';
import { FacilityPurchase } from './facilities/FacilityPurchase.js';
import { MineBoardProjection } from './facilities/MineBoardProjection.js';
import { StaffRules } from '../config/StaffRules.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { MineLootDB } from '../data/items/MineLootDB.js';
import { MineDugEvent } from '../core/events/MineDugEvent.js';
import { MineChangedEvent } from '../core/events/MineChangedEvent.js';
import { LocationSystem } from './LocationSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { Random } from '../core/Random.js';
import { MineRules } from '../config/MineRules.js';
import { BonusSystem } from './BonusSystem.js';
import { BonusTypes } from '../config/BonusRules.js';
import { CONTENT_FEATURES } from '../config/ContentAccessRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export const MineResults = Object.freeze({
  READY: 'ready',
  NO_SAVE: 'no-save',
  FEATURE_LOCKED: 'feature-locked',
  NO_LAYER: 'no-layer',
  LAYER_ACTIVE: 'layer-active',
  SURVEY_COOLDOWN: 'survey-cooldown',
  INVALID_TOOL: 'invalid-tool',
  INVALID_COORDINATES: 'invalid-coordinates',
  NO_ROCK: 'no-rock',
  LOW_ENERGY: 'low-energy'
});

export class MineSystem extends BaseSystem {
  /** @private @type {MineSystem|null} */
  static _instance = null;

  /** @returns {MineSystem} */
  static getInstance() {
    if (!MineSystem._instance) MineSystem._instance = new MineSystem();
    return MineSystem._instance;
  }

  constructor() {
    super('MineSystem', 'System');
    /** @private @type {Random} */
    this._random = Random.default;
    this._autoElapsed = 0;
    this._unsubscribeWin = null;
  }

  /** @override */
  init() {
    if (this._unsubscribeWin) return;
    this._unsubscribeWin = EventBus.getInstance().subscribe(PokemonDefeatedEvent, (event) => {
      const save = SaveSystem.getInstance().getCurrentSave();
      if (!save || !event.wild || !this.isUnlocked()) return;
      this._regenerateEnergy(save.mine);
      save.mine.energy = Math.min(this._effectiveMaxEnergy(save.mine), save.mine.energy + MineRules.ENERGY_PER_WILD_WIN);
      this._dispatchChanged('energy');
      if (event.deferSave !== true) SaveSystem.getInstance().saveCurrent();
    });
  }
  /** @override */
  onDestroy() { this._unsubscribeWin?.(); this._unsubscribeWin = null; super.onDestroy(); }

  /** @override @param {number} dt */
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const current = SaveSystem.getInstance().getCurrentSave();
    if (!current || !this.isUnlocked()) { this._autoElapsed = 0; return; }
    if (!current.mine.hasGrid()) { this.ensureLayer(); return; }
    this._autoElapsed += dt;
    if (this._autoElapsed < MineRules.AUTOMATION_INTERVAL) return;
    this._autoElapsed = 0;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.mine.autoEnabled || !save.mine.autoPurchased || !this.isUnlocked() ||
      save.currencies.get(MineRules.CURRENCY_ID) < MineRules.AUTOMATION_FEE) return;
    this._regenerateEnergy(save.mine);
    if (save.mine.energy < this._energyCost(MineRules.DEFAULT_TOOL)) return;
    if (!save.mine.hasGrid()) this._generateLayer(save.mine);
    const cells = save.mine.grid.flatMap((row, y) => row.flatMap((depth, x) => depth > 0 ? [{ x, y }] : []));
    const target = this._random.pick(cells);
    if (!target) return;
    this.digAt(target.x, target.y, { toolId: MineRules.DEFAULT_TOOL, automatic: true });
  }

  /** @param {Random} random */
  setRandom(random) {
    this._random = random;
  }

  /** @returns {boolean} */
  isUnlocked() {
    return FeatureAccessSystem.getInstance().isFeatureUnlocked(CONTENT_FEATURES.MINE);
  }

  /** @returns {boolean} */
  canUseHere() {
    return this.isUnlocked();
  }

  /** Lightweight energy-only projection for live gauges. @returns {Object|null} */
  getEnergySnapshot() {
    const mine = SaveSystem.getInstance().getCurrentSave()?.mine;
    if (!mine) return null;
    const elapsed = Math.max(0, (Date.now() - mine.lastEnergyAt) / 1000);
    const maxEnergy = this._effectiveMaxEnergy(mine);
    return { energy: Math.min(maxEnergy, mine.energy + elapsed * MineRules.ENERGY_REGEN_PER_SECOND), maxEnergy };
  }

  /**
   * Read-only view model. Energy includes time accrued since the last save/action.
   * @returns {Object}
   */
  getSnapshot() {
    const mine = SaveSystem.getInstance().getCurrentSave()?.mine;
    if (!mine) return null;
    const elapsed = Math.max(0, (Date.now() - mine.lastEnergyAt) / 1000);
    const maxEnergy = this._effectiveMaxEnergy(mine);
    return {
      energy: Math.min(maxEnergy, mine.energy + elapsed * MineRules.ENERGY_REGEN_PER_SECOND),
      maxEnergy,
      tool: mine.tool,
      tools: Object.entries(MineRules.TOOLS).map(([id, rule]) => ({ id, energyCost: this._energyCost(id),
        power: rule.power, cost: rule.cost || 0, unlocked: mine.unlockedTools.includes(id), offsets: rule.offsets })),
      tiles: MineBoardProjection.create(mine, MineRules.TOOLS[mine.tool]),
      unlockedTools: [...mine.unlockedTools],
      energyLevel: mine.energyLevel,
      autoPurchased: mine.autoPurchased,
      autoEnabled: mine.autoEnabled,
      autoFee: MineRules.AUTOMATION_FEE,
      grid: mine.grid.map((row) => [...row]),
      items: mine.items.map((item) => ({ ...item, shape: item.shape.map((row) => [...row]) })),
      completedCount: mine.completedCount,
      hasLayer: mine.hasGrid(),
      layerComplete: this.isLayerComplete(mine),
      survey: this.getManualSurveySnapshot()
    };
  }

  /** Read-only absolute-time clock: viewing/reloading never resets a manual survey. @param {number} [now] */
  getManualSurveySnapshot(now=Date.now()) {
    const mine=SaveSystem.getInstance().getCurrentSave()?.mine;
    if(!mine)return null;
    const remainingMs=Math.max(0,mine.manualSurveyReadyAt-now);
    return {readyAt:mine.manualSurveyReadyAt,remainingSeconds:Math.ceil(remainingMs/1000),ready:remainingMs===0};
  }

  /** @param {import('../data/save/MineData.js').MineData} [mine] */
  isLayerComplete(mine = SaveSystem.getInstance().getCurrentSave()?.mine) {
    return !!mine?.hasGrid() && mine.items.length > 0 && mine.items.every((item) => item.collected);
  }

  /** Creates the first board when the Mine panel is opened, matching the original lazy initialization. */
  ensureLayer() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return { result: MineResults.NO_SAVE, lootCount: 0 };
    if (!this.isUnlocked()) return this._failure(MineResults.FEATURE_LOCKED);
    if (save.mine.hasGrid() && save.mine.items.length > 0 && !save.mine.items.every((item) => item.collected)) {
      return { result: MineResults.READY, lootCount: save.mine.items.length };
    }
    const lootCount = this._generateLayer(save.mine);
    this._dispatchChanged('layer-started');
    SaveSystem.getInstance().saveCurrent();
    return { result: MineResults.READY, lootCount };
  }

  /**
   * Starts a board, or advances once all loot on the current board has been found.
   * @returns {{result:string,lootCount:number}}
   */
  startNextLayer({discardCurrent=false}={}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(MineResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(MineResults.FEATURE_LOCKED);
    if (!discardCurrent&&save.mine.hasGrid() && save.mine.items.length > 0 && !save.mine.items.every((item) => item.collected)) {
      return this._failure(MineResults.LAYER_ACTIVE);
    }
    const now=Date.now(),survey=this.getManualSurveySnapshot(now);
    if(!survey.ready)return {...this._failure(MineResults.SURVEY_COOLDOWN),remainingSeconds:survey.remainingSeconds};
    const lootCount = this._generateLayer(save.mine);
    save.mine.manualSurveyReadyAt=now+MineRules.MANUAL_SURVEY_COOLDOWN_MS;
    this._dispatchChanged('layer-started');
    SaveSystem.getInstance().saveCurrent();
    return { result: MineResults.READY, lootCount };
  }

  /**
   * @param {'chisel'|'hammer'} toolId
   * @returns {{result:string,tool:string}}
   */
  setTool(toolId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(MineResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(MineResults.FEATURE_LOCKED);
    if (!save.mine.unlockedTools.includes(toolId)) return this._failure(MineResults.INVALID_TOOL);
    save.mine.tool = toolId;
    this._dispatchChanged('tool-changed');
    SaveSystem.getInstance().saveCurrent();
    return { result: MineResults.READY, tool: toolId };
  }

  /**
   * Hits a tile with the selected tool, reveals completed shapes, and awards all newly-found loot.
   * @param {number} x
   * @param {number} y
   * @returns {{result:string,energy:number,dug:string[],energyCost:number}}
   */
  digAt(x, y, { toolId = null, automatic = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(MineResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(MineResults.FEATURE_LOCKED);
    const mine = save.mine;
    this._regenerateEnergy(mine);
    if (!mine.hasGrid()) return this._failure(MineResults.NO_LAYER, mine.energy);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= MineRules.WIDTH || y < 0 || y >= MineRules.HEIGHT) {
      return this._failure(MineResults.INVALID_COORDINATES, mine.energy);
    }
    const selectedTool = toolId || mine.tool;
    const tool = mine.unlockedTools.includes(selectedTool) ? MineRules.TOOLS[selectedTool] : null;
    if (!tool) return this._failure(MineResults.INVALID_TOOL, mine.energy);
    const affected = tool.offsets
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(([tx, ty]) => tx >= 0 && tx < MineRules.WIDTH && ty >= 0 && ty < MineRules.HEIGHT && mine.grid[ty][tx] > 0);
    if (affected.length === 0) return this._failure(MineResults.NO_ROCK, mine.energy);
    const energyCost = this._energyCost(selectedTool);
    if (automatic && save.currencies.get(MineRules.CURRENCY_ID) < MineRules.AUTOMATION_FEE) return { result: 'insufficient-funds' };
    if (mine.energy < energyCost) return this._failure(MineResults.LOW_ENERGY, mine.energy);
    mine.energy = Math.max(0, mine.energy - energyCost);
    for (const [tx, ty] of affected) mine.grid[ty][tx] = Math.max(0, mine.grid[ty][tx] - tool.power);
    const dug = [];
    for (const loot of mine.items) {
      if (loot.collected || !this._isShapeExposed(mine.grid, loot)) continue;
      if (!save.inventory.add(loot.itemId, 1, { deferSave: true })) continue;
      loot.collected = true;
      mine.completedCount++;
      dug.push(loot.itemId);
      NotificationSystem.getInstance().notifyTemporary(t('mine_loot_found', { item: t(`item.${loot.itemId}.name`) }), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.SUCCESS
      });
    }
    if (automatic) save.currencies.add(MineRules.CURRENCY_ID, -MineRules.AUTOMATION_FEE);
    if (dug.length > 0) FacilityStaffSystem.getInstance().addXp('mine', dug.length);
    if (dug.length > 0) EventBus.getInstance().dispatch(new MineDugEvent(dug.length, { deferSave: true }));
    const layerFinished = mine.items.length > 0 && mine.items.every((item) => item.collected);
    if (layerFinished) {
      this._generateLayer(mine);
      NotificationSystem.getInstance().notifyTemporary(t('mine_layer_complete'), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.INFO
      });
    }
    this._dispatchChanged(layerFinished ? 'layer-refreshed' : 'dug');
    SaveSystem.getInstance().saveCurrent();
    return { result: MineResults.READY, energy: mine.energy, dug, energyCost };
  }

  /** @param {string} toolId */
  buyTool(toolId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const tool = MineRules.TOOLS[toolId];
    if (!save || !this.isUnlocked() || !tool?.cost || save.mine.unlockedTools.includes(toolId)) return { result: 'unavailable' };
    const result = FacilityPurchase.apply(save, tool.cost, MineRules.CURRENCY_ID, () => save.mine.unlockedTools.push(toolId));
    if (result.result === 'ready') this._commitManagement();
    return result;
  }
  /** @returns {Object} */
  upgradeEnergy() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked()) return { result: 'unavailable' };
    const result = FacilityPurchase.apply(save, MineRules.ENERGY_UPGRADE_COSTS[save.mine.energyLevel], MineRules.CURRENCY_ID, () => {
      this._regenerateEnergy(save.mine);
      save.mine.energyLevel++;
      save.mine.maxEnergy += MineRules.ENERGY_UPGRADE_STEP;
      save.mine.energy = Math.min(this._effectiveMaxEnergy(save.mine), save.mine.energy + MineRules.ENERGY_UPGRADE_STEP);
    });
    if (result.result === 'ready') this._commitManagement();
    return result;
  }
  /** @returns {Object} */
  buyAutomation() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked() || save.mine.autoPurchased) return { result: 'unavailable' };
    const result = FacilityPurchase.apply(save, MineRules.AUTOMATION_COST, MineRules.CURRENCY_ID, () => { save.mine.autoPurchased = true; });
    if (result.result === 'ready') this._commitManagement();
    return result;
  }
  /** @returns {boolean} */
  toggleAutomation() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.mine.autoPurchased || !this.isUnlocked()) return false;
    save.mine.autoEnabled = !save.mine.autoEnabled; this._autoElapsed = 0; this._commitManagement(); return true;
  }
  /** @private */
  _commitManagement() { SaveSystem.getInstance().saveCurrent(); this._dispatchChanged('management'); }
  /** @private @param {string} toolId @returns {number} */
  _energyCost(toolId) {
    const cost = MineRules.TOOLS[toolId]?.energyCost || 0;
    const discount = Math.min(StaffRules.ENERGY_DISCOUNT_MAX, FacilityStaffSystem.getInstance().getBonus('mine', 'mine_energy_cost'));
    return Math.max(1, Math.ceil(cost * (1 - discount)));
  }

  /** @private @param {import('../data/save/MineData.js').MineData} mine */
  _generateLayer(mine) {
    const region = LocationSystem.getInstance().getCurrentRegion();
    const allLoot = MineLootDB.getInstance().getAll();
    const eligible = region === MineRules.HOENN_REGION
      ? allLoot
      : allLoot.filter((entry) => entry.region !== MineRules.HOENN_REGION);
    const lootCount = this._random.int(MineRules.MIN_ITEMS_PER_LAYER, MineRules.MAX_ITEMS_PER_LAYER);
    const grid = Array.from({ length: MineRules.HEIGHT }, () =>
      Array.from({ length: MineRules.WIDTH }, () => this._random.int(MineRules.MIN_TILE_DURABILITY, MineRules.MAX_TILE_DURABILITY)));
    const placed = [];
    const occupied = new Set();
    const available = [...eligible];
    for (let index = 0; index < lootCount; index++) {
      const entry = available.splice(this._random.int(0, available.length - 1), 1)[0];
      const placement = this._placeShape(entry, occupied);
      if (!placement) continue;
      placed.push({ itemId: entry.itemId, ...placement, shape: entry.shape.map((row) => [...row]), collected: false });
    }
    mine.grid = grid;
    mine.items = placed;
    mine.lastEnergyAt = Date.now();
    return placed.length;
  }

  /** @private */
  _placeShape(entry, occupied) {
    const height = entry.shape.length;
    const width = entry.shape[0].length;
    for (let attempt = 0; attempt < MineRules.PLACEMENT_ATTEMPTS; attempt++) {
      const x = this._random.int(0, MineRules.WIDTH - width);
      const y = this._random.int(0, MineRules.HEIGHT - height);
      const cells = [];
      let overlap = false;
      for (let sy = 0; sy < height; sy++) {
        for (let sx = 0; sx < width; sx++) {
          if (!entry.shape[sy][sx]) continue;
          const key = `${x + sx},${y + sy}`;
          cells.push(key);
          if (occupied.has(key)) overlap = true;
        }
      }
      if (overlap) continue;
      for (const key of cells) occupied.add(key);
      return { x, y };
    }
    return null;
  }

  /** @private */
  _isShapeExposed(grid, item) {
    for (let y = 0; y < item.shape.length; y++) {
      for (let x = 0; x < item.shape[y].length; x++) {
        if (item.shape[y][x] && grid[item.y + y]?.[item.x + x] > 0) return false;
      }
    }
    return true;
  }

  /** @private @param {import('../data/save/MineData.js').MineData} mine */
  _regenerateEnergy(mine) {
    const now = Date.now();
    const elapsed = Math.max(0, (now - mine.lastEnergyAt) / 1000);
    if (elapsed > 0) {
      mine.energy = Math.min(this._effectiveMaxEnergy(mine), mine.energy + elapsed * MineRules.ENERGY_REGEN_PER_SECOND);
      mine.lastEnergyAt = now;
    }
  }

  /** @private @param {import('../data/save/MineData.js').MineData} mine */
  _effectiveMaxEnergy(mine) {
    const baseMax = Math.max(MineRules.MAX_ENERGY, Number(mine?.maxEnergy) || MineRules.MAX_ENERGY);
    return BonusSystem.getInstance().applyMultiplier(baseMax, BonusTypes.MINE_ENERGY_MAX);
  }

  /** @private @param {string} reason */
  _dispatchChanged(reason) {
    EventBus.getInstance().dispatch(new MineChangedEvent(reason));
  }

  /** @private @param {string} result @param {number} [energy=0] */
  _failure(result, energy = 0) {
    if (![MineResults.NO_SAVE, MineResults.INVALID_COORDINATES, MineResults.NO_ROCK].includes(result)) {
      const key = result === MineResults.FEATURE_LOCKED ? 'content_feature_locked' :
          result === MineResults.NO_LAYER ? 'mine_start_first' :
          result === MineResults.LAYER_ACTIVE ? 'mine_layer_active' :
            result === MineResults.LOW_ENERGY ? 'mine_not_enough_energy' : 'mine_action_unavailable';
      const params = result === MineResults.FEATURE_LOCKED ? { feature: t('mine_title') } : {};
      NotificationSystem.getInstance().notifyTemporary(t(key, params), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
    }
    return { result, energy, dug: [], energyCost: 0, lootCount: 0 };
  }
}
