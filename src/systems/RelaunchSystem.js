/** @file RelaunchSystem.js @brief Save-scoped transient relaunch countdowns, never alternate battle/dungeon simulation. */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { DungeonSystem } from './DungeonSystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationActivityRules } from '../data/world/LocationActivityRules.js';
import { RoamingSystem } from './RoamingSystem.js';
import { RelaunchRules } from '../config/RelaunchRules.js';
import { ModalIds } from '../config/ModalIds.js';
import { EventBus } from '../core/EventBus.js';
import { BattleRunFinishedEvent } from '../core/events/BattleRunFinishedEvent.js';
import { TrainingBattleChangedEvent } from '../core/events/TrainingBattleChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { DungeonRunChangedEvent } from '../core/events/DungeonRunChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { RelaunchChangedEvent } from '../core/events/RelaunchChangedEvent.js';
import { ModalCloseRequestedEvent } from '../core/events/ModalCloseRequestedEvent.js';
export class RelaunchSystem extends BaseSystem {
  static _instance = null;
  static getInstance() {
    return this._instance || (this._instance = new RelaunchSystem());
  }
  constructor() {
    super('RelaunchSystem', 'System');
    this._pending = null;
    this._cancelled = null;
    this._blocked = null;
    this._lastSecond = -1;
    this._subscriptions = [];
  }
  /** @override */
  init() {
    if (this._subscriptions.length) return;
    const bus = EventBus.getInstance();
    this._subscriptions = [
      bus.subscribe(BattleRunFinishedEvent, (e) => {
        if (
          e.kind === RelaunchRules.WILD &&
          e.natural &&
          e.outcome === 'defeat'
        )
          this.schedule(RelaunchRules.WILD, e.locationId);
      }),
      bus.subscribe(DungeonRunChangedEvent, (e) => {
        if (!e.active && ['cleared', 'wipe'].includes(e.reason))
          this.schedule(RelaunchRules.DUNGEON, e.locationId);
        else if (e.active || ['ascended', 'abandoned'].includes(e.reason))
          this.cancel(false);
      }),
      bus.subscribe(BattleStartedEvent, () => this.cancel(false)),
      bus.subscribe(TrainingBattleChangedEvent, () => {
        if (TrainingSystem.getInstance().isActive()) this.cancel(false);
      }),
      ...[
        SaveCreatedEvent,
        SaveLoadedEvent,
        SaveDeletedEvent,
        LocationChangedEvent,
      ].map((type) => bus.subscribe(type, () => this.reset())),
    ];
  }
  /** @param {string} kind @param {string} locationId @param {boolean} arming @returns {string|null} */
  blockedReason(kind, locationId, arming = false) {
    const save = SaveSystem.getInstance().getCurrentSave(),
      location = LocationDB.getInstance().getById(locationId);
    if (!save || !RelaunchRules.UPGRADES[kind]) return 'save';
    if (LocationSystem.getInstance().getCurrentLocationId() !== locationId)
      return 'away';
    if (
      LocationActivityRules.forLocation(
        location,
        LocationDB.getInstance().getEncounters(locationId).length,
        !!RoamingSystem.getSpeciesAt(locationId),
      ) !== kind
    )
      return 'location';
    if (!save.team.some((p) => !p.isFainted())) return 'team';
    if (TrainingSystem.getInstance().isActive()) return 'training';
    if (!arming && BattleSystem.getInstance().isActive()) return 'battle';
    if (DungeonSystem.getInstance().isActive()) return 'running';
    if (
      (kind === RelaunchRules.WILD && location.kind === 'dungeon') ||
      (kind === RelaunchRules.DUNGEON && location.kind !== 'dungeon')
    )
      return 'location';
    if (
      kind === RelaunchRules.DUNGEON &&
      save.currencies.get('dungeonToken') <
        DungeonSystem.getInstance().entryToll(locationId)
    )
      return 'tokens';
    return null;
  }
  /** @param {string} kind @returns {Object|null} Read-only view model. */
  getSnapshot(kind) {
    const save = SaveSystem.getInstance().getCurrentSave(),
      rule = RelaunchRules.UPGRADES[kind],
      data = save?.relaunch?.[kind];
    if (!save || !rule || !data) return null;
    const locationId = LocationSystem.getInstance().getCurrentLocationId(),
      location = LocationDB.getInstance().getById(locationId),
      pending = this._pending?.kind === kind ? this._pending : null;
    const visible =
      !!location &&
      LocationActivityRules.forLocation(
        location,
        LocationDB.getInstance().getEncounters(locationId).length,
        !!RoamingSystem.getSpeciesAt(locationId),
      ) === kind &&
      !TrainingSystem.getInstance().isActive();
    return {
      ...rule,
      kind,
      ...data,
      saveId: save.id,
      visible,
      currency: RelaunchRules.CURRENCY,
      canAfford: save.currencies.get(RelaunchRules.CURRENCY) >= rule.cost,
      remainingMs: pending ? Math.max(0, pending.readyAt - Date.now()) : 0,
      pending: !!pending,
      cancelled: this._cancelled === kind,
      blocked: this._blocked?.kind === kind ? this._blocked.reason : null,
      toll:
        kind === RelaunchRules.DUNGEON
          ? DungeonSystem.getInstance().entryToll(locationId)
          : 0,
    };
  }
  /** @param {string} kind @param {boolean} enabled @returns {boolean} */
  setEnabledFor(kind, enabled) {
    const save = SaveSystem.getInstance().getCurrentSave(),
      data = save?.relaunch?.[kind];
    if (!data?.purchased) return false;
    if (data.enabled === !!enabled) return true;
    data.enabled = !!enabled;
    if (!data.enabled && this._pending?.kind === kind) this.cancel(false);
    SaveSystem.getInstance().saveCurrent();
    this._emit(kind);
    return true;
  }
  /** @param {string} kind @param {string} locationId @returns {boolean} */
  schedule(kind, locationId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.relaunch?.[kind]?.enabled) return false;
    const reason = this.blockedReason(kind, locationId, true);
    if (reason) {
      this._blocked = { kind, reason };
      this._emit(kind);
      return false;
    }
    this._pending = {
      kind,
      locationId,
      saveId: save.id,
      readyAt: Date.now() + RelaunchRules.DELAY_MS,
    };
    this._cancelled = null;
    this._blocked = null;
    this._lastSecond = -1;
    this._emit(kind);
    return true;
  }
  /** Stops the current countdown, not the owned preference. @param {boolean} manual */
  cancel(manual = true) {
    const kind = this._pending?.kind;
    if (!kind) return false;
    this._pending = null;
    if (manual) this._cancelled = kind;
    this._emit(kind);
    return true;
  }
  /** Clears all transient UI state when the save or route changes. */
  reset() {
    this._pending = null;
    this._cancelled = null;
    this._blocked = null;
    this._lastSecond = -1;
    this._emit();
  }
  /** @override */
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || !this._pending) return;
    const pending = this._pending,
      save = SaveSystem.getInstance().getCurrentSave();
    if (save?.id !== pending.saveId || !save.relaunch[pending.kind].enabled) {
      this.reset();
      return;
    }
    const second = Math.ceil((pending.readyAt - Date.now()) / 1000);
    if (second !== this._lastSecond) {
      this._lastSecond = second;
      this._emit(pending.kind);
    }
    if (second > 0) return;
    this._pending = null;
    const reason = this.blockedReason(pending.kind, pending.locationId);
    if (reason) {
      this._blocked = { kind: pending.kind, reason };
      this._emit(pending.kind);
      return;
    }
    EventBus.getInstance().dispatch(
      new ModalCloseRequestedEvent(ModalIds.BATTLE_SUMMARY),
    );
    if (pending.kind === RelaunchRules.WILD)
      BattleSystem.getInstance().startBattle(pending.locationId);
    else
      DungeonSystem.getInstance().enter(pending.locationId, {
        autoMode: save.relaunch.dungeon.mode,
      });
    this._emit(pending.kind);
  }
  /** @private */
  _emit(kind = null) {
    EventBus.getInstance().dispatch(new RelaunchChangedEvent(kind));
  }
  /** @override */
  onDestroy() {
    for (const unsubscribe of this._subscriptions) unsubscribe();
    this._subscriptions = [];
    this.reset();
    super.onDestroy();
  }
}
