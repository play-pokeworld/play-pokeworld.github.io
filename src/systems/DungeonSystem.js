/**
 * @file DungeonSystem.js
 * @brief Toll-paid, persistent grid expeditions and their risk/banking rules (DOM-free).
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { DungeonRunData } from '../data/save/DungeonRunData.js';
import { DungeonAutoRules } from '../config/DungeonAutoRules.js';
import { DungeonRules } from '../config/DungeonRules.js';
import { BonusSystem } from './BonusSystem.js';
import { BonusTypes } from '../config/BonusRules.js';
import { Random } from '../core/Random.js';
import { EventBus } from '../core/EventBus.js';
import { DungeonEnteredEvent } from '../core/events/DungeonEnteredEvent.js';
import { DungeonBattleResolvedEvent } from '../core/events/DungeonBattleResolvedEvent.js';
import { DungeonRunChangedEvent } from '../core/events/DungeonRunChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

const DIRECTIONS = Object.freeze([[1, 0], [-1, 0], [0, -1], [0, 1]]);
const TILE_TYPES = new Set(['empty', 'combat', 'elite', 'chest', 'boss', 'ladder']);

export class DungeonSystem extends BaseSystem {
  /** @private @type {DungeonSystem|null} */
  static _instance = null;

  /** @returns {DungeonSystem} */
  static getInstance() {
    if (!DungeonSystem._instance) DungeonSystem._instance = new DungeonSystem();
    return DungeonSystem._instance;
  }

  constructor() {
    super('DungeonSystem', 'System');
    this._random = Random.default;
    this._battleResolved = null;
    this._saveChanged = null;
    this._settledRunForBattle = null;
  }

  /** @override */
  init() {
    if (this._battleResolved) return;
    this._battleResolved = (event) => this._onBattleResolved(event);
    this._saveChanged = (event) => {
      this._settledRunForBattle = null;
      const save = SaveSystem.getInstance().getCurrentSave();
      const run = save?.dungeons.run;
      EventBus.getInstance().dispatch(new DungeonRunChangedEvent(run?.locationId ?? null, event.constructor.TYPE, !!run));
    };
    EventBus.getInstance().subscribe(DungeonBattleResolvedEvent, this._battleResolved);
    EventBus.getInstance().subscribe(SaveCreatedEvent, this._saveChanged);
    EventBus.getInstance().subscribe(SaveLoadedEvent, this._saveChanged);
  }

  /** @override */
  onDestroy() {
    const bus = EventBus.getInstance();
    if (this._battleResolved) bus.unsubscribe(DungeonBattleResolvedEvent, this._battleResolved);
    if (this._saveChanged) {
      bus.unsubscribe(SaveCreatedEvent, this._saveChanged);
      bus.unsubscribe(SaveLoadedEvent, this._saveChanged);
    }
    this._battleResolved = null;
    this._saveChanged = null;
    super.onDestroy();
  }

  /** @param {Random} random */
  setRandom(random) {
    this._random = random;
  }

  /** @returns {DungeonRunData|null} */
  getRun() {
    return SaveSystem.getInstance().getCurrentSave()?.dungeons.run ?? null;
  }

  /** @returns {Object|null} Immutable presentation snapshot of the active expedition. */
  getRunSummary() {
    const run = this.getRun();
    if (!run?.active) return null;
    return Object.freeze({
      locationId: run.locationId,
      totalWins: run.totalWins,
      startedAt: run.startedAt,
      bag: Object.freeze({ ...run.bag }),
      loot: Object.freeze({
        catches: Object.freeze(run.loot.catches.map((entry) => Object.freeze({ ...entry }))),
        items: Object.freeze({ ...run.loot.items }),
        money: run.loot.money,
        tokens: run.loot.tokens
      })
    });
  }

  /** @returns {Object|null} */
  getLastRun() {
    const last = SaveSystem.getInstance().getCurrentSave()?.dungeons.lastRun;
    return last ? JSON.parse(JSON.stringify(last)) : null;
  }

  /**
   * Returns the terminal expedition only for the battle that settled it; prevents a later
   * unrelated battle summary from inheriting an older persisted lastRun.
   * @param {string|null} battleRunId
   * @returns {Object|null}
   */
  getLastRunForBattle(battleRunId) {
    const pending = this._settledRunForBattle;
    if (!pending || typeof battleRunId !== 'string' || !battleRunId || pending.battleRunId !== battleRunId) return null;
    const current = SaveSystem.getInstance().getCurrentSave()?.dungeons.lastRun;
    if (!current || current.startedAt !== pending.summary.startedAt || current.endedAt !== pending.summary.endedAt) return null;
    return JSON.parse(JSON.stringify(pending.summary));
  }

  /** @returns {boolean} */
  isActive() {
    return !!this.getRun()?.active;
  }

  /** @param {string} locationId @returns {boolean} */
  isActiveAt(locationId) {
    const run = this.getRun();
    return !!run?.active && run.locationId === locationId;
  }

  /** @param {string} locationId @returns {number} */
  entryToll(locationId) {
    const location = LocationDB.getInstance().getById(locationId);
    return location?.kind === 'dungeon' ? DungeonRules.entryToll(location.badgesRequired) : 0;
  }

  /** @param {string} locationId @returns {boolean} */
  isAutoUnlocked(locationId){return (SaveSystem.getInstance().getCurrentSave()?.dungeons.clearCount(locationId)||0)>=DungeonRules.AUTO_UNLOCK_CLEARS;}
  /** @returns {Object|null} */
  getAutoSnapshot(){
    const run=this.getRun();if(!run?.active)return null;
    return {mode:run.auto,unlocked:this.isAutoUnlocked(run.locationId),clears:SaveSystem.getInstance().getCurrentSave().dungeons.clearCount(run.locationId),required:DungeonRules.AUTO_UNLOCK_CLEARS};
  }
  /** @param {string|boolean} mode @returns {boolean} */
  setAuto(mode){
    const save=SaveSystem.getInstance().getCurrentSave(),run=this.getRun();if(!run?.active)return false;
    const next=mode===true?DungeonAutoRules.DEFAULT_MODE:mode===false||mode==='off'?false:mode;
    if(next!==false&&(!DungeonAutoRules.MODES.includes(next)||!this.isAutoUnlocked(run.locationId)))return false;
    if(run.auto===next)return true;run.auto=next;if(next)save.relaunch.dungeon.mode=next;
    this._persistAndEmit(run.locationId,'auto-changed',true);return true;
  }

  /**
   * Pays the toll once and creates a resumable, saved expedition.
   * @param {string} locationId
   * @returns {boolean}
   */
  enter(locationId=LocationSystem.getInstance().getCurrentLocationId(),{autoMode=false}={}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const location = LocationDB.getInstance().getById(locationId);
    if (!save || !location || location.kind !== 'dungeon') return false;
    if (LocationDB.getInstance().getEncounters(locationId).length === 0) {
      this._notify('battle_no_wild_here', NotificationTones.WARNING);
      return false;
    }
    if (LocationSystem.getInstance().getCurrentLocationId() !== locationId) {
      this._notify('dungeon_wrong_location', NotificationTones.WARNING);
      return false;
    }
    if (BattleSystem.getInstance().isActive()) {
      this._notify('dungeon_battle_active', NotificationTones.WARNING);
      return false;
    }
    const existing = save.dungeons.run;
    if (existing?.active) {
      if (existing.locationId !== locationId) {
        this._notify('dungeon_locked_travel', NotificationTones.WARNING);
        return false;
      }
      if (!existing.map) {
        this._generateFloorMap(existing);
        this._persistAndEmit(locationId, 'map-restored', true);
      }
      if (existing.pendingNode) this._startPendingEncounter(existing);
      return true;
    }
    if (!save.team.some((pokemon) => !pokemon.isFainted())) {
      this._notify('dungeon_team_ko_blocked', NotificationTones.WARNING);
      return false;
    }
    const toll = DungeonRules.entryToll(location.badgesRequired);
    const have = save.currencies.get('dungeonToken');
    if (have < toll) {
      this._notify('dungeon_toll_blocked', NotificationTones.WARNING, {
        need: TextFormatter.formatNumber(toll),
        have: TextFormatter.formatNumber(have)
      });
      return false;
    }

    save.currencies.add('dungeonToken', -toll);
    const run = new DungeonRunData({
      active: true,
      locationId,
      badgeReq: location.badgesRequired,
      toll,
      depth: DungeonRules.depthFor(location.badgesRequired, locationId),
      floor: 1,
      wins: 0,
      totalWins: 0,
      bag: { tokens: 0, money: 0 },
      loot: { catches: [], items: {}, money: 0 },
      bossDone: false,
      bossDefeated: false,
      startedAt: Date.now()
    });
    if(DungeonAutoRules.MODES.includes(autoMode)&&this.isAutoUnlocked(locationId)){run.auto=autoMode;save.relaunch.dungeon.mode=autoMode;}
    this._generateFloorMap(run);
    save.dungeons.setRun(run);
    save.dungeons.exploredTotal++;
    save.dungeons.lastRun = null;
    this._settledRunForBattle = null;

    EventBus.getInstance().dispatch(new DungeonEnteredEvent(locationId, toll, location.winsToClear));
    SaveSystem.getInstance().saveCurrent();
    this._changed(locationId, 'entered', true);
    this._notify('dungeon_run_started', NotificationTones.ACCENT, { depth: String(run.depth) });
    return true;
  }

  /** @param {string} nodeId @returns {boolean} */
  moveTo(nodeId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const run = save?.dungeons.run;
    if (!run?.active || !run.map || !run.map.grid) return false;
    if (LocationSystem.getInstance().getCurrentLocationId() !== run.locationId) return false;
    if (BattleSystem.getInstance().isActive()) {
      this._notify('dungeon_map_move_blocked', NotificationTones.WARNING);
      return false;
    }
    const tile = run.map.tiles[nodeId];
    const here = run.map.tiles[run.pos];
    if (!tile || !here) return false;
    const adjacent = Math.abs(tile.col - here.col) + Math.abs(tile.row - here.row) === 1;
    if (!tile.revealed && !adjacent) return false;

    run.pos = nodeId;
    this._revealAround(run, nodeId);
    if (tile.type === 'chest' && !tile.done) {
      tile.done = true;
      const reward = DungeonRules.winLootFor(run.badgeReq);
      const multiplier = DungeonRules.multiplierFor(run.floor) * 2;
      const tokens = Math.round(reward.tokens * multiplier);
      const money = Math.round(reward.money * multiplier);
      run.bag.tokens += tokens;
      run.bag.money += money;
      this._notify('dungeon_chest_loot', NotificationTones.SUCCESS, {
        tokens: TextFormatter.formatNumber(tokens),
        money: TextFormatter.formatNumber(money)
      });
      this._persistAndEmit(run.locationId, 'chest', true);
      return true;
    }
    if (tile.type === 'ladder') return this.descend();
    if (TILE_TYPES.has(tile.type) && ['combat', 'elite', 'boss'].includes(tile.type) && !tile.done) {
      run.pendingNode = nodeId;
      const started = BattleSystem.getInstance().startBattle(run.locationId, {
        chain: false,
        healOnEnd: false,
        dungeon: { nodeId, tileType: tile.type, floor: run.floor, depth: run.depth }
      });
      if (!started) run.pendingNode = null;
      this._persistAndEmit(run.locationId, started ? 'encounter' : 'move', true);
      return started;
    }
    this._persistAndEmit(run.locationId, 'move', true);
    return true;
  }

  /** @param {'right'|'left'|'up'|'down'} direction @returns {boolean} */
  move(direction) {
    const delta = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[direction];
    const run = this.getRun();
    const tile = run?.map?.tiles?.[run.pos];
    if (!delta || !tile) return false;
    const nextId = this._nodeId(tile.col + delta[0], tile.row + delta[1]);
    if (!run.map.tiles[nextId]) {
      this._notify('dungeon_map_move_blocked', NotificationTones.WARNING);
      return false;
    }
    return this.moveTo(nextId);
  }

  /** @returns {boolean} */
  resumePendingEncounter() {
    const run = this.getRun();
    return !!run?.pendingNode && this._startPendingEncounter(run);
  }

  /** @private @param {DungeonRunData} run @returns {boolean} */
  _startPendingEncounter(run) {
    if (BattleSystem.getInstance().isActive()) return false;
    const nodeId = run.pendingNode;
    const tile = run.map?.tiles?.[nodeId];
    if (!tile || tile.done || !['combat', 'elite', 'boss'].includes(tile.type)) {
      run.pendingNode = null;
      return false;
    }
    return BattleSystem.getInstance().startBattle(run.locationId, {
      chain: false,
      healOnEnd: false,
      dungeon: { nodeId, tileType: tile.type, floor: run.floor, depth: run.depth }
    });
  }

  /** @returns {boolean} */
  descend() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const run = save?.dungeons.run;
    const tile = run?.map?.tiles?.[run.pos];
    if (!run?.active || !tile || tile.type !== 'ladder' || !run.bossDefeated || run.floor >= run.depth) {
      this._notify('dungeon_floor_not_cleared', NotificationTones.WARNING, {
        need: String(DungeonRules.quotaFor(run?.floor || 1)),
        have: String(run?.wins || 0)
      });
      return false;
    }
    run.floor++;
    run.wins = 0;
    this._generateFloorMap(run);
    this._persistAndEmit(run.locationId, 'descended', true);
    this._notify('dungeon_descend', NotificationTones.ACCENT, {
      floor: String(run.floor),
      depth: String(run.depth),
      mult: DungeonRules.multiplierFor(run.floor).toFixed(1)
    });
    return true;
  }

  /** Safely banks the satchel and closes the current expedition. @returns {boolean} */
  ascend() {
    return this._closeRun('ascended', { bank: true, rest: true });
  }

  /** Abandons an expedition without banking the satchel. @returns {boolean} */
  abandon() {
    return this._closeRun('abandoned', { bank: false, rest: true });
  }

  /**
   * The battle-window leave button is an explicit expedition abandon while inside a dungeon.
   * @returns {boolean}
   */
  quitFromBattle() {
    return this.abandon();
  }

  /** @private @param {DungeonBattleResolvedEvent} event */
  _onBattleResolved(event) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const run = save?.dungeons.run;
    if (!run?.active || run.locationId !== event.locationId) return;
    this._settledRunForBattle = null;
    const nodeId = event.nodeId || run.pendingNode;
    const tile = nodeId ? run.map?.tiles?.[nodeId] : null;
    if (!tile || tile.done || run.pendingNode !== nodeId) return;
    this._accumulateBattleLoot(run, event.battleRun);
    run.pendingNode = null;

    if (!event.victory) {
      const kept = {
        tokens: Math.floor(run.bag.tokens * DungeonRules.WIPE_KEEP_RATIO),
        money: Math.floor(run.bag.money * DungeonRules.WIPE_KEEP_RATIO)
      };
      const lost = { tokens: run.bag.tokens - kept.tokens, money: run.bag.money - kept.money };
      let refunded = 0;
      if (run.floor === 1 && run.toll > 0) {
        refunded = run.toll;
        kept.tokens += refunded;
      }
      this._closeRunWithSettlement(save, run, 'wipe', kept, lost, refunded, true);
      this._rememberSettledRun(event, save.dungeons.lastRun);
      this._notify('dungeon_wipe', NotificationTones.DANGER, {
        tokens: TextFormatter.formatNumber(kept.tokens),
        money: TextFormatter.formatNumber(kept.money)
      });
      return;
    }

    const base = DungeonRules.winLootFor(run.badgeReq);
    const mult = DungeonRules.multiplierFor(run.floor);
    const depleted = run.wins >= DungeonRules.quotaFor(run.floor) ? DungeonRules.EXHAUSTED_RATE : 1;
    const elite = tile?.type === 'elite' ? 2 : 1;
    run.bag.tokens += Math.max(1, Math.round(base.tokens * mult * depleted * elite));
    run.bag.money += Math.max(1, Math.round(base.money * mult * depleted * elite));
    run.wins++;
    run.totalWins++;
    if (tile) {
      tile.done = true;
      if (tile.type === 'boss') {
        if (run.floor < run.depth) {
          run.bossDefeated = true;
          tile.type = 'ladder';
          this._revealAll(run);
        } else {
          run.bossDone = true;
          const bonus = DungeonRules.winLootFor(run.badgeReq);
          const bonusMultiplier = DungeonRules.multiplierFor(run.depth) * DungeonRules.COMPLETION_BONUS;
          run.bag.tokens += Math.round(bonus.tokens * bonusMultiplier);
          run.bag.money += Math.round(bonus.money * bonusMultiplier);
          save.dungeons.recordClear(run.locationId);
          const kept = { ...run.bag };
          this._closeRunWithSettlement(save, run, 'cleared', kept, { tokens: 0, money: 0 }, 0, true);
          this._rememberSettledRun(event, save.dungeons.lastRun);
          this._notify('dungeon_cleared', NotificationTones.SUCCESS);
          return;
        }
      }
    }
    this._changed(run.locationId, 'battle-won', true);
  }

  /** @private @param {DungeonRunData} run @param {Object|null} report */
  _accumulateBattleLoot(run, report) {
    if (!report) return;
    run.loot.money += Math.max(0, Number(report.moneyGained) || 0);
    run.loot.tokens += Math.max(0, Number(report.tokensGained) || 0);
    for (const entry of report.catches || []) run.loot.catches.push({ ...entry });
    for (const entry of report.items || []) {
      const quantity = Math.max(0, Math.floor(Number(entry.quantity) || 0));
      if (entry.itemId && quantity > 0) run.loot.items[entry.itemId] = (run.loot.items[entry.itemId] || 0) + quantity;
    }
  }

  /** @private @param {string} outcome @param {{bank:boolean,rest:boolean}} options */
  _closeRun(outcome, { bank, rest }) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const run = save?.dungeons.run;
    if (!save || !run?.active) return false;
    const bag = { ...run.bag };
    const lost = bank ? { tokens: 0, money: 0 } : { ...bag };
    if (rest) this._restTeam(save);
    const credited = bank ? this._creditBag(save, bag) : { tokens: 0, money: 0 };
    const locationId = run.locationId;
    save.dungeons.lastRun = this._summary(run, outcome, credited, lost, 0);
    save.dungeons.setRun(null);
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) {
      battle.endBattle(false);
    } else {
      SaveSystem.getInstance().saveCurrent();
    }
    this._changed(locationId, outcome, false);
    const displayedBag = bank ? credited : bag;
    this._notify(outcome === 'ascended' ? 'dungeon_ascend' : 'dungeon_abandoned',
      outcome === 'ascended' ? NotificationTones.SUCCESS : NotificationTones.WARNING,
      { tokens: TextFormatter.formatNumber(displayedBag.tokens), money: TextFormatter.formatNumber(displayedBag.money), floor: String(run.floor) });
    return true;
  }

  /** @private */
  _closeRunWithSettlement(save, run, outcome, kept, lost, refunded, rest) {
    if (rest) this._restTeam(save);
    const credited = this._creditBag(save, kept);
    const locationId = run.locationId;
    save.dungeons.lastRun = this._summary(run, outcome, credited, lost, refunded);
    save.dungeons.setRun(null);
    this._changed(locationId, outcome, false);
  }

  /** @private @param {DungeonBattleResolvedEvent} event @param {Object|null} summary */
  _rememberSettledRun(event, summary) {
    const battleRunId = event.battleRun?.runId;
    if (!summary || typeof battleRunId !== 'string' || !battleRunId) return;
    this._settledRunForBattle = {
      battleRunId,
      summary: JSON.parse(JSON.stringify(summary))
    };
  }

  /** @private @param {DungeonRunData} run */
  _summary(run, outcome, banked, lost, refunded) {
    return {
      locationId: run.locationId,
      outcome,
      floor: run.floor,
      depth: run.depth,
      wins: run.totalWins,
      startedAt: run.startedAt,
      endedAt: Date.now(),
      banked: { tokens: banked.tokens, money: banked.money },
      lost: { tokens: lost.tokens, money: lost.money },
      tollRefunded: refunded,
      loot: {
        catches: run.loot.catches.map((entry) => ({ ...entry })),
        items: { ...run.loot.items },
        money: run.loot.money,
        tokens: run.loot.tokens
      }
    };
  }

  /** @private @param {import('../data/save/SaveData.js').SaveData} save @param {{tokens:number,money:number}} bag */
  _creditBag(save, bag) {
    const credited = { tokens: Math.max(0, Number(bag.tokens) || 0), money: 0 };
    if (credited.tokens > 0) save.currencies.add('dungeonToken', credited.tokens);
    if (bag.money > 0) {
      credited.money = BonusSystem.getInstance().applyMultiplier(bag.money, BonusTypes.MONEY);
      save.currencies.add(BonusTypes.MONEY, credited.money);
    }
    return credited;
  }

  /** @private @param {import('../data/save/SaveData.js').SaveData} save */
  _restTeam(save) {
    let rested = false;
    for (const pokemon of save.team) {
      if (pokemon.hp < pokemon.getMaxHp()) rested = true;
      pokemon.healFull();
    }
    if (rested) this._notify('dungeon_run_team_healed', NotificationTones.SUCCESS);
    return rested;
  }

  /** @private */
  _persistAndEmit(locationId, reason, active) {
    SaveSystem.getInstance().saveCurrent();
    this._changed(locationId, reason, active);
  }

  /** @private */
  _changed(locationId, reason, active) {
    EventBus.getInstance().dispatch(new DungeonRunChangedEvent(locationId, reason, active));
  }

  /** @private @param {string} key @param {string} tone @param {Object} [params={}] */
  _notify(key, tone, params = {}) {
    NotificationSystem.getInstance().notifyTemporary(t(key, params), {
      channel: NotificationChannels.GAMEPLAY,
      tone
    });
  }

  /** @private @param {DungeonRunData} run */
  _generateFloorMap(run) {
    const { cols, rows } = DungeonRules.gridSizeFor(run.badgeReq);
    const tiles = {};
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const id = this._nodeId(col, row);
        tiles[id] = { id, col, row, type: 'empty', revealed: false, done: false };
      }
    }
    const startId = this._nodeId(Math.floor(cols / 2), rows - 1);
    const start = tiles[startId];
    start.revealed = true;
    start.done = true;
    const startZone = new Set([startId, ...this._neighborsRaw(tiles, start).map((tile) => tile.id)]);
    const farIds = Object.keys(tiles).filter((id) => {
      const tile = tiles[id];
      if (tile.col < cols - 3 || startZone.has(id)) return false;
      return !this._neighborsRaw(tiles, tile).some((neighbor) => startZone.has(neighbor.id));
    });
    const bossId = this._random.pick(farIds) || this._nodeId(cols - 1, 0);
    tiles[bossId].type = 'boss';
    const guards = [];
    for (const neighbor of this._neighborsRaw(tiles, tiles[bossId])) {
      if (startZone.has(neighbor.id)) continue;
      neighbor.type = 'combat';
      guards.push(neighbor.id);
    }
    const corridor = this._bfs(tiles, startId, bossId) || [];
    const corridorSet = new Set();
    for (let index = 2; index < corridor.length - 1; index += 3) {
      const id = corridor[index];
      const tile = tiles[id];
      if (tile && tile.type === 'empty' && !startZone.has(id) && !guards.includes(id)) {
        tile.type = 'combat';
        corridorSet.add(id);
      }
    }
    const area = cols * rows;
    const pool = Object.keys(tiles).filter((id) => !startZone.has(id) && id !== bossId && !guards.includes(id) && !corridorSet.has(id));
    this._shuffle(pool);
    let cursor = 0;
    const chestCount = Math.max(5, Math.round(area * 0.1));
    const combatCount = Math.max(12, Math.round(area * 0.4));
    for (let count = 0; count < chestCount && cursor < pool.length; count++, cursor++) tiles[pool[cursor]].type = 'chest';
    for (let count = 0; count < combatCount && cursor < pool.length; count++, cursor++) {
      tiles[pool[cursor]].type = count < 2 ? 'elite' : 'combat';
    }
    run.map = { grid: true, cols, rows, tiles };
    run.pos = startId;
    run.pendingNode = null;
    run.bossDefeated = false;
    run.bossTile = bossId;
    this._revealAround(run, startId);
  }

  /** @private */
  _shuffle(values) {
    for (let index = values.length - 1; index > 0; index--) {
      const swap = this._random.int(0, index);
      [values[index], values[swap]] = [values[swap], values[index]];
    }
  }

  /** @private @returns {string} */
  _nodeId(col, row) {
    return `c${col}r${row}`;
  }

  /** @private */
  _neighborsRaw(tiles, tile) {
    return DIRECTIONS.map(([dc, dr]) => tiles[this._nodeId(tile.col + dc, tile.row + dr)]).filter(Boolean);
  }

  /** @private */
  _neighbors(run, id) {
    const tile = run.map?.tiles?.[id];
    return tile ? this._neighborsRaw(run.map.tiles, tile) : [];
  }

  /** @private */
  _bfs(tiles, fromId, toId) {
    if (fromId === toId) return [fromId];
    const previous = { [fromId]: null };
    const queue = [fromId];
    while (queue.length) {
      const currentId = queue.shift();
      const current = tiles[currentId];
      for (const neighbor of this._neighborsRaw(tiles, current)) {
        if (neighbor.id in previous) continue;
        previous[neighbor.id] = currentId;
        if (neighbor.id === toId) {
          const path = [toId];
          for (let parent = currentId; parent; parent = previous[parent]) path.unshift(parent);
          return path;
        }
        queue.push(neighbor.id);
      }
    }
    return null;
  }

  /** @private */
  _revealAround(run, nodeId) {
    const tile = run.map?.tiles?.[nodeId];
    if (!tile) return;
    tile.revealed = true;
    for (const neighbor of this._neighbors(run, nodeId)) neighbor.revealed = true;
  }

  /** @private */
  _revealAll(run) {
    for (const tile of Object.values(run.map?.tiles || {})) tile.revealed = true;
  }
}
