/**
 * @file CatchUpRecorder.js
 * @brief Collects the real outcome of an AFK catch-up from the events the systems already emit.
 *
 * The shape follows the historical AFK recap of the original game: how many wild Pokémon were defeated,
 * how much money came in, how many team members fainted, which Pokémon were caught (with their shiny
 * flag) and which items were picked up. Nothing is estimated: every figure comes from an event the
 * systems dispatched while they were replaying, or from a before/after measurement of the bag.
 */

import { EventBus } from '../../core/EventBus.js';
import { PokemonDefeatedEvent } from '../../core/events/PokemonDefeatedEvent.js';
import { BattlePlayerFaintedEvent } from '../../core/events/BattlePlayerFaintedEvent.js';
import { BattleEndedEvent } from '../../core/events/BattleEndedEvent.js';
import { PokemonCaughtEvent } from '../../core/events/PokemonCaughtEvent.js';
import { HatcheryLevelUpEvent } from '../../core/events/HatcheryLevelUpEvent.js';
import { TrainingSessionCompletedEvent } from '../../core/events/TrainingSessionCompletedEvent.js';
import { MineDugEvent } from '../../core/events/MineDugEvent.js';
import { DungeonRunChangedEvent } from '../../core/events/DungeonRunChangedEvent.js';
import { DungeonBattleResolvedEvent } from '../../core/events/DungeonBattleResolvedEvent.js';

export class CatchUpRecorder {
  /** @param {import('../../data/save/SaveData.js').SaveData} save */
  constructor(save) {
    this._save = save;
    this._before = this._bagSnapshot(save);
    this._tokensBefore = this._tokenCount(save);
    this._dungeonBefore = this._dungeonSnapshot();
    this._wins = 0;
    this._fainted = 0;
    this._runs = 0;
    this._lost = false;
    this._exp = 0;
    this._money = 0;
    this._captures = [];
    this._training = 0;
    this._daycareLevels = 0;
    this._mineDigs = 0;
    this._dungeon = { fights: 0, floors: 0, runs: 0, cleared: false, wiped: false, clears: 0, wipes: 0 };
    this._unsubscribe = [
      EventBus.getInstance().subscribe(PokemonDefeatedEvent, (event) => {
        if (event.wild) this._wins++;
      }),
      EventBus.getInstance().subscribe(BattlePlayerFaintedEvent, () => {
        this._fainted++;
      }),
      EventBus.getInstance().subscribe(BattleEndedEvent, (event) => {
        this._runs++;
        this._exp += Math.max(0, Number(event.expGained) || 0);
        this._money += Math.max(0, Number(event.moneyGained) || 0);
        if (!event.victory) this._lost = true;
      }),
      EventBus.getInstance().subscribe(PokemonCaughtEvent, (event) => {
        this._captures.push({ species: event.speciesId, shiny: event.shiny === true });
      }),
      EventBus.getInstance().subscribe(TrainingSessionCompletedEvent, () => {
        this._training++;
      }),
      EventBus.getInstance().subscribe(HatcheryLevelUpEvent, () => {
        this._daycareLevels++;
      }),
      EventBus.getInstance().subscribe(MineDugEvent, (event) => {
        this._mineDigs += Math.max(1, Number(event.count) || 1);
      }),
      EventBus.getInstance().subscribe(DungeonBattleResolvedEvent, () => {
        this._dungeon.fights++;
      }),
      EventBus.getInstance().subscribe(DungeonRunChangedEvent, (event) => {
        if (event.reason === 'entered') this._dungeon.runs++;
        else if (event.reason === 'descended') this._dungeon.floors++;
        else if (event.reason === 'cleared') {
          this._dungeon.cleared = true;
          this._dungeon.clears++;
        } else if (event.reason === 'wipe') {
          this._dungeon.wiped = true;
          this._dungeon.wipes++;
        }
      })
    ];
  }

  /** @private @param {Object} save @returns {Map<string, number>} */
  _bagSnapshot(save) {
    const snapshot = new Map();
    const inventory = save?.inventory;
    if (!inventory || typeof inventory.entries !== 'function') return snapshot;
    for (const entry of inventory.entries()) snapshot.set(entry.id, entry.quantity);
    return snapshot;
  }

  /** @private @param {Object} save @returns {number} Dungeon tokens held in the bag and in the run. */
  _tokenCount(save) {
    const run = save?.dungeons?.run;
    return (Number(run?.bag?.tokens) || 0) + (Number(run?.loot?.tokens) || 0);
  }

  /** @private @returns {Object} */
  _dungeonSnapshot() {
    const run = this._save?.dungeons?.run;
    return { floor: Number(run?.floor) || 0, depth: Number(run?.depth) || 0, active: run?.active === true };
  }

  /** @returns {Object} */
  stop() {
    for (const unsubscribe of this._unsubscribe) unsubscribe();
    this._unsubscribe = [];

    const items = [];
    const inventory = this._save?.inventory;
    if (inventory && typeof inventory.entries === 'function') {
      for (const entry of inventory.entries()) {
        const delta = entry.quantity - (this._before.get(entry.id) || 0);
        if (delta > 0) items.push({ itemId: entry.id, quantity: delta });
      }
    }

    const tokens = this._tokenCount(this._save) - this._tokensBefore;
    const run = this._save?.dungeons?.run;
    const dungeon = this._dungeon.fights > 0 || this._dungeon.runs > 0
      ? {
          ...this._dungeon,
          tokens: Math.max(0, tokens),
          active: run?.active === true,
          floor: Number(run?.floor) || this._dungeonBefore.floor,
          depth: Number(run?.depth) || this._dungeonBefore.depth,
          pilot: run?.active === true && run?.auto === true
        }
      : null;

    return {
      runs: this._runs,
      wins: this._wins,
      fainted: this._fainted,
      lost: this._lost,
      expEarned: this._exp,
      money: this._money,
      captures: this._captures.length,
      captureList: this._captures,
      items,
      training: this._training,
      daycareLevels: this._daycareLevels,
      mineDigs: this._mineDigs,
      dungeon
    };
  }
}
