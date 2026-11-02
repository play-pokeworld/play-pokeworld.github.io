/**
 * @file FastForwardSystem.js
 * @brief AFK catch-up orchestrator.
 *
 * The catch-up replays only what the player had launched, through the systems that own the rules:
 * a battle that was running is finished, a training session that was started is advanced, an auto
 * dungeon run keeps being piloted, the paid mine automation keeps digging, an owned relaunch countdown
 * fires. Nothing is invented: no encounter is created because the player was away, and no currency,
 * loot, level or healing is granted outside the real settlement of those activities. With nothing
 * running, the catch-up does nothing at all.
 *
 * It runs in two phases, like the original game: a progress window while the replay grinds, then the
 * recap of what really happened.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { DungeonAutoSystem } from './DungeonAutoSystem.js';
import { MineSystem } from './MineSystem.js';
import { RelaunchSystem } from './RelaunchSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TimeSource } from '../core/TimeSource.js';
import { FastForwardRules } from '../config/FastForwardRules.js';
import { FastForwardCompletedEvent } from '../core/events/FastForwardCompletedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { CatchUpRecorder } from './fastforward/CatchUpRecorder.js';

/** Activity ids reported by `runningActivities()`. */
export const FastForwardActivities = Object.freeze({
  BATTLE: 'battle',
  TRAINING: 'training',
  DUNGEON_AUTO: 'dungeonAuto',
  MINE_AUTO: 'mineAuto',
  RELAUNCH: 'relaunch'
});

/** Simulated seconds replayed per inner chunk. */
const CHUNK_SECONDS = 5;
/** Wall-clock budget of one painted frame: the window stays responsive while the replay grinds. */
const CHUNK_WALL_MS = 40;
/** Minimum delay between two progress paints (the DOM is rebuilt on each one). */
const PROGRESS_PAINT_MS = 80;

export class FastForwardSystem extends BaseSystem {
  /** @private @type {FastForwardSystem|null} */
  static _instance = null;

  /** @returns {FastForwardSystem} */
  static getInstance() {
    if (!FastForwardSystem._instance) FastForwardSystem._instance = new FastForwardSystem();
    return FastForwardSystem._instance;
  }

  constructor() {
    super('FastForwardSystem', 'System');
    /** @private A catch-up never overlaps another one. */
    this._running = false;
    /** @private @type {Function[]} */
    this._unsubscribers = [];
  }

  /** @override */
  init() {
    this._unsubscribers.push(EventBus.getInstance().subscribe(SaveLoadedEvent, (event) => {
      // The absence is measured here, from the moment the save was written: a checkpoint fired during the
      // load must not erase it. The replay itself is queued for the next tick, once every other system has
      // restored the activity that survived in the save.
      const elapsedMs = this._elapsedSinceLastWrite(event?.save ?? SaveSystem.getInstance().getCurrentSave());
      if (elapsedMs <= 0) return;
      setTimeout(() => this.triggerCatchUp(elapsedMs), 0);
    }));
  }

  /** @override */
  onDestroy() {
    for (const unsubscribe of this._unsubscribers) unsubscribe();
    this._unsubscribers = [];
  }

  /**
   * @returns {string[]} The activities the player had actually launched and that are still running.
   *   Empty means "the player was simply away": there is nothing to replay.
   */
  runningActivities() {
    const activities = [];
    if (BattleSystem.getInstance().isActive()) activities.push(FastForwardActivities.BATTLE);
    if (TrainingSystem.getInstance().isActive()) activities.push(FastForwardActivities.TRAINING);
    if (DungeonAutoSystem.getInstance().isRunning()) activities.push(FastForwardActivities.DUNGEON_AUTO);
    if (MineSystem.getInstance().isAutoRunning()) activities.push(FastForwardActivities.MINE_AUTO);
    if (RelaunchSystem.getInstance().hasPending()) activities.push(FastForwardActivities.RELAUNCH);
    return activities;
  }

  /**
   * Replays an absence and reports it: a progress window while it grinds, then the recap.
   * @param {number} elapsedMs - Real time spent away
   * @param {{debug?:boolean}} [options]
   * @returns {Object|null} The running plan, or null when there is nothing to replay
   */
  triggerCatchUp(elapsedMs, { debug = false } = {}) {
    const plan = this._begin(elapsedMs, debug);
    if (!plan) return null;
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.AFK_SUMMARY, {
      mode: 'progress',
      progress: this._progressPayload(plan, 0)
    }));
    let lastPaintAt = 0;
    const tick = () => {
      let progressed = 0;
      try {
        // Fill one frame's worth of work instead of one fixed slice: a long absence then grinds as fast as
        // the machine allows, while the progress window keeps repainting every frame.
        const deadline = Date.now() + CHUNK_WALL_MS;
        do {
          const slice = this._advance(plan, CHUNK_SECONDS);
          progressed += slice;
          if (slice <= 0) break;
          if (plan.simulatedSeconds + 1e-6 >= plan.budgetSeconds || plan.steps >= FastForwardRules.MAX_STEPS) break;
        } while (Date.now() < deadline);
        // Stop as soon as nothing is left to replay: an exhausted activity ends the absence, it does not
        // need the whole budget to be walked through.
        if (progressed > 0 && plan.simulatedSeconds + 1e-6 < plan.budgetSeconds &&
          plan.steps < FastForwardRules.MAX_STEPS) {
          const now = Date.now();
          if (now - lastPaintAt >= PROGRESS_PAINT_MS) {
            lastPaintAt = now;
            EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.AFK_SUMMARY, {
              mode: 'progress',
              progress: this._progressPayload(plan, plan.simulatedSeconds / plan.budgetSeconds)
            }));
          }
          setTimeout(tick, 0);
          return;
        }
      } catch (error) {
        console.error(error);
      }
      const summary = this._finish(plan);
      if (summary) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.AFK_SUMMARY, { summary }));
    };
    setTimeout(tick, 0);
    return plan;
  }

  /**
   * Replays the running activities synchronously, for callers that do not paint anything.
   * @param {number} elapsedMs
   * @returns {Object|null} Summary, or null when nothing was running / no save
   */
  simulateOffline(elapsedMs) {
    const plan = this._begin(elapsedMs, false);
    if (!plan) return null;
    this._advance(plan, plan.budgetSeconds);
    return this._finish(plan);
  }

  /**
   * Developer shortcut behind the debug button: a 30-minute absence is replayed exactly like a return,
   * and the mine clock is shifted first so its own regeneration rule sees the same window.
   * @param {number} elapsedMs
   * @returns {Object|null}
   */
  debugSkip(elapsedMs) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return null;
    const span = Math.max(0, Math.floor(Number(elapsedMs) || 0));
    if (span <= 0) return null;
    // The mine only reads timestamps: moving its clock back is exactly what an absence does, and its own
    // regeneration rule then credits the energy (nothing is invented).
    save.mine.lastEnergyAt -= span;
    MineSystem.getInstance().settleEnergy();
    const plan = this.triggerCatchUp(span, { debug: true });
    return { replayed: !!plan, activities: plan ? [...plan.activities] : [] };
  }

  /**
   * Replays the absence that happened while the game was fully closed.
   * @returns {Object|null} Summary, or null when there is nothing to replay
   */
  resumeAfterReload() {
    const elapsedMs = this._elapsedSinceLastWrite(SaveSystem.getInstance().getCurrentSave());
    return elapsedMs > 0 ? this.triggerCatchUp(elapsedMs) : null;
  }

  /**
   * @private
   * @param {Object|null} save
   * @returns {number} Milliseconds since the save was written, 0 when it cannot be measured
   */
  _elapsedSinceLastWrite(save) {
    const lastSeen = Number(save?.updatedAt);
    if (!Number.isFinite(lastSeen) || lastSeen <= 0) return 0;
    return Math.max(0, Date.now() - lastSeen);
  }

  /**
   * Prepares a replay: budget, activities, recorder and the simulated clock.
   * @private
   * @param {number} elapsedMs
   * @param {boolean} debug
   * @returns {Object|null}
   */
  _begin(elapsedMs, debug) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || this._running) return null;
    const durationMs = Math.max(0, Math.floor(Number(elapsedMs) || 0));
    if (durationMs < FastForwardRules.MIN_ELAPSED_MS) return null;
    const activities = this.runningActivities();
    if (activities.length === 0) return null;

    const budgetSeconds = Math.min(durationMs / 1000, FastForwardRules.MAX_CATCH_UP_SECONDS);
    // Measured before the simulated clock moves: what the mine recovers over the same window.
    const energy = MineSystem.getInstance().projectEnergyGain(budgetSeconds);
    const plan = {
      save,
      debug: debug === true,
      durationMs,
      budgetSeconds,
      activities,
      energy,
      simulatedSeconds: 0,
      steps: 0,
      recorder: new CatchUpRecorder(save)
    };
    this._running = true;
    // The replay starts at the moment the player left and walks back to the present: timestamps written
    // by the systems are therefore real past instants, never future ones.
    TimeSource.setOffset(-budgetSeconds * 1000);
    return plan;
  }

  /**
   * @private
   * @param {Object} plan
   * @param {number} maxSeconds
   */
  _advance(plan, maxSeconds) {
    const limit = Math.min(plan.budgetSeconds, plan.simulatedSeconds + Math.max(0, maxSeconds));
    const startedAt = plan.simulatedSeconds;
    while (plan.simulatedSeconds + 1e-6 < limit && plan.steps < FastForwardRules.MAX_STEPS) {
      const consumed = this._step(limit - plan.simulatedSeconds);
      if (!(consumed > 0)) break;
      plan.simulatedSeconds += consumed;
      TimeSource.advance(consumed * 1000);
      plan.steps++;
    }
    return plan.simulatedSeconds - startedAt;
  }

  /**
   * Closes a replay: restores the clock, records the real outcome and builds the recap payload.
   * @private
   * @param {Object} plan
   * @returns {Object}
   */
  _finish(plan) {
    TimeSource.reset();
    this._running = false;
    const outcome = plan.recorder.stop();
    SaveSystem.getInstance().saveCurrent();

    const summary = {
      debug: plan.debug,
      durationMs: plan.durationMs,
      simulatedMs: Math.round(plan.simulatedSeconds * 1000),
      activities: plan.activities,
      // Historical recap figures (same shape as the original AFK panel).
      wins: outcome.wins,
      money: outcome.money,
      fainted: outcome.fainted,
      captures: outcome.captures,
      captureList: outcome.captureList,
      energy: plan.energy,
      training: outcome.training,
      mineDigs: outcome.mineDigs,
      daycareLevels: outcome.daycareLevels,
      dungeon: outcome.dungeon,
      items: outcome.items,
      roamers: 0,
      lost: outcome.lost,
      // Extra context kept for the recap notes.
      battles: outcome.runs,
      expEarned: outcome.expEarned
    };
    EventBus.getInstance().dispatch(new FastForwardCompletedEvent(summary));
    return summary;
  }

  /**
   * @private
   * @param {Object} plan
   * @param {number} ratio
   * @returns {Object} Progress payload for the first phase of the window.
   */
  _progressPayload(plan, ratio) {
    return {
      pct: Math.max(0, Math.min(100, Math.round(ratio * 100))),
      stage: plan.activities[0] || '',
      durationMs: plan.durationMs,
      simulatedMs: Math.round(plan.simulatedSeconds * 1000),
      debug: plan.debug
    };
  }

  /**
   * Advances the highest-priority running activity by up to `remaining` seconds.
   * @private
   * @param {number} remaining
   * @returns {number} Simulated seconds consumed (0 stops the replay)
   */
  _step(remaining) {
    const step = Math.min(FastForwardRules.STEP_SECONDS, remaining);

    if (BattleSystem.getInstance().isActive()) {
      return BattleSystem.getInstance().catchUp(remaining);
    }
    if (TrainingSystem.getInstance().isActive()) {
      return TrainingSystem.getInstance().catchUp(remaining);
    }
    if (DungeonAutoSystem.getInstance().isRunning()) {
      DungeonAutoSystem.getInstance().update(step);
      return step;
    }
    if (MineSystem.getInstance().isAutoRunning()) {
      MineSystem.getInstance().update(step);
      return step;
    }
    const relaunch = RelaunchSystem.getInstance();
    if (relaunch.hasPending()) {
      const wait = relaunch.pendingWaitSeconds();
      if (wait > remaining) return remaining;
      relaunch.update(0.01);
      return Math.min(remaining, wait + 0.01);
    }
    return 0;
  }
}
