/** @file DungeonAutoSystem.js @brief Live driver delegates every step, reward, fight and descent to DungeonSystem. */
import { BaseSystem } from './BaseSystem.js';
import { DungeonSystem } from './DungeonSystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { EventBus } from '../core/EventBus.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { BattleSystem } from './BattleSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { DungeonAutoRules } from '../config/DungeonAutoRules.js';
import { DungeonPilotRules } from './dungeon/DungeonPilotRules.js';
export class DungeonAutoSystem extends BaseSystem {
  static _instance = null;
  static getInstance() {
    return this._instance || (this._instance = new DungeonAutoSystem());
  }
  constructor() {
    super('DungeonAutoSystem', 'System');
    this._context = '';
    this._dueAt = 0;
    this._subscriptions = [];
  }
  /** @override */
  init() {
    if (!this._subscriptions.length)
      this._subscriptions = [
        SaveLoadedEvent,
        SaveCreatedEvent,
        SaveDeletedEvent,
        LocationChangedEvent,
      ].map((type) =>
        EventBus.getInstance().subscribe(type, () => {
          this._context = '';
          this._dueAt = 0;
        }),
      );
  }
  /** @override @param {number} dt */
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const save = SaveSystem.getInstance().getCurrentSave(),
      system = DungeonSystem.getInstance(),
      run = system.getRun();
    if (
      !save ||
      !run?.active ||
      !run.auto ||
      !system.isAutoUnlocked(run.locationId) ||
      LocationSystem.getInstance().getCurrentLocationId() !== run.locationId
    ) {
      this._context = '';
      this._dueAt = 0;
      return;
    }
    const now = Date.now(),
      context = `${save.id}:${run.startedAt}:${run.floor}:${run.auto}`;
    if (this._context !== context) {
      this._context = context;
      this._dueAt = now + DungeonAutoRules.START_DELAY_MS;
      return;
    }
    if (
      BattleSystem.getInstance().isActive() ||
      TrainingSystem.getInstance().isActive()
    ) {
      this._dueAt = now + DungeonAutoRules.START_DELAY_MS;
      return;
    }
    if (now < this._dueAt || !save.team.some((p) => !p.isFainted())) return;
    this._dueAt = now + DungeonAutoRules.STEP_DELAY_MS;
    if (run.pendingNode) {
      system.resumePendingEncounter();
      return;
    }
    const target = DungeonPilotRules.destination(run, run.auto);
    if (!target) return;
    if (run.map.tiles[target]?.type === 'chest')
      this._dueAt = now + DungeonAutoRules.CHEST_DELAY_MS;
    system.moveTo(target);
  }
  /** @override */
  onDestroy() {
    for (const unsubscribe of this._subscriptions) unsubscribe();
    this._subscriptions = [];
    this._context = '';
    this._dueAt = 0;
    super.onDestroy();
  }
}
