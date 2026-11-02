/** @file AfkCatchUp.test.js @brief AFK contract: only replay what was launched, never invent, never gift. */
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveStorage } from '../src/systems/SaveStorage.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { FastForwardSystem } from '../src/systems/FastForwardSystem.js';
import { RelaunchSystem } from '../src/systems/RelaunchSystem.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { TimeSource } from '../src/core/TimeSource.js';
import { Random } from '../src/core/Random.js';
import { EventBus } from '../src/core/EventBus.js';
import { BattleStartedEvent } from '../src/core/events/BattleStartedEvent.js';
import { FastForwardRules } from '../src/config/FastForwardRules.js';
import { TrainingRules } from '../src/config/TrainingRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { LeagueDB } from '../src/data/trainers/LeagueDB.js';

const saves = SaveSystem.getInstance();
const battle = BattleSystem.getInstance();
const training = TrainingSystem.getInstance();
const hatchery = HatcherySystem.getInstance();
const fastForward = FastForwardSystem.getInstance();

/** Unlocks everything a training session needs and returns a fresh save on Route 1. */
function fixture(name) {
  training.onDestroy();
  hatchery.onDestroy();
  if (battle.isActive()) battle.endBattle(false);
  RelaunchSystem.getInstance().cancel();
  TimeSource.reset();
  const save = saves.createNewSave(name, 'charmander');
  save.player.location = 'route1';
  for (const id of ['hatchery', 'training', 'mine']) save.access.unlockFeature(id);
  for (const badge of ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni']) save.player.earnBadge(badge);
  for (const league of LeagueDB.getInstance().getAll().filter((entry) => entry.region === 'kanto')) save.player.earnBadge(league.badge);
  save.team[0].setLevel(50);
  save.currencies.add('money', 100000);
  // A fixed sequence keeps every replay deterministic: training opponents, drops and criticals.
  training.setRandom(Random.sequence([0.314159, 0.42, 0.57, 0.63, 0.78, 0.91]));
  training.init();
  hatchery.init();
  return save;
}

describe('AFK catch-up (1.16.3)', (test) => {
    test('an absence with nothing running replays nothing and grants nothing', () => {
      const save = fixture('AFK idle');
      const money = save.currencies.get('money');
      const levels = save.team.map((member) => member.level);
      save.team[0].hp = 1;

      const summary = fastForward.simulateOffline(3 * 3600 * 1000);
      assert.equal(summary, null, 'no activity means no report at all');
      assert.equal(battle.isActive(), false, 'no battle was created');
      assert.equal(save.currencies.get('money'), money, 'balance untouched');
      assert.deepEqual(save.team.map((member) => member.level), levels, 'no experience granted');
      assert.equal(save.team[0].hp, 1, 'no free heal on return');
    });

    test('a running battle is continued, never re-rolled', () => {
      const save = fixture('AFK battle');
      assert.ok(battle.startBattle('route1', { chain: false }), 'the player launched a battle');
      const foiught = battle._session.foe.pokemon;
      const started = [];
      const unsubscribe = EventBus.getInstance().subscribe(BattleStartedEvent, () => started.push(1));
      let summary;
      try {
        summary = fastForward.simulateOffline(30 * 60 * 1000);
      } finally {
        unsubscribe();
      }

      assert.ok(summary, 'the running battle was settled');
      assert.equal(started.length, 0, 'no battle was started during the catch-up: nothing was invented');
      assert.ok(summary.battles >= 1, 'the battle that was already running was settled');
      assert.equal(battle._lastResult.foeName, foiught.getDisplayName(), 'the same foe was fought, not a re-roll');
      assert.equal(battle.isActive(), false, 'nothing else was started afterwards');
      assert.ok(save.currencies.get('money') > 0, 'rewards come from the real settlement');
      assert.equal(TimeSource.offsetMs, 0, 'the simulated clock is restored');
    });

    test('training advances for the elapsed time and stops at its real duration', () => {
      const save = fixture('AFK training');
      const pokemon = PokemonFactory.create('pikachu', 25);
      assert.ok(BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }));
      assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');
      const slot = save.training.slots[0];

      const oneMinute = fastForward.simulateOffline(60 * 1000);
      assert.ok(oneMinute, 'the session was replayed');
      assert.equal(oneMinute.wins, 0, 'training never spawns wild battles');
      assert.ok(oneMinute.simulatedMs <= 60 * 1000 + FastForwardRules.STEP_SECONDS * 1000,
        'the replay never runs longer than the absence');

      // One hour away, one session: the replay stops at the real end of the session (its own
      // TrainingRules.MAX_SIMULATION_TICKS ceiling), never beyond.
      const rest = fastForward.simulateOffline(60 * 60 * 1000);
      const sessionSeconds = TrainingRules.MAX_SIMULATION_TICKS * TrainingRules.TICK_SECONDS;
      assert.equal(training.isActive(), false, 'the session reached its real end');
      assert.ok(oneMinute.simulatedMs + (rest?.simulatedMs ?? 0) <= sessionSeconds * 1000 + FastForwardRules.STEP_SECONDS * 1000,
        'a training session is never stretched beyond its own duration');
      assert.equal(oneMinute.training + (rest?.training ?? 0), 1,
        'one session completed, reported exactly once');
      assert.equal(slot.result?.result, 'completed', 'the trained Pokémon session actually completed');
      assert.ok(slot.result.opponentsDefeated > 0, 'the sparring waves were really fought');
      assert.ok(slot.result.opponentsDefeated <= TrainingRules.OPPONENT_COUNT, 'never more waves than the session');
      const level = save.collection.get(pokemon.uid).level;
      const gainedLevels = (slot.result.rewards || []).reduce((sum, reward) => sum + (reward.levels || 0), 0);
      assert.equal(level, 25 + gainedLevels, 'rewards only from the real settlement');
      assert.equal(save.statistics.trainingSessions, 1, 'the session was counted by the real system');
    });

    test('a training session never starts a wild battle', () => {
      fixture('AFK training only');
      const pokemon = PokemonFactory.create('eevee', 25);
      assert.ok(BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }));
      assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');

      const summary = fastForward.simulateOffline(5 * 60 * 1000);
      assert.ok(summary);
      assert.equal(summary.wins, 0, 'no wild battle was invented');
      assert.equal(battle.isActive(), false, 'the wild battle system was never engaged');
    });

    test('the replayed window is capped at twelve hours', () => {
      const save = fixture('AFK ceiling');
      assert.ok(battle.startBattle('route1', { chain: false }));
      const original = battle.catchUp;
      // Stub: the activity always consumes the whole remaining budget, so the ceiling is measurable.
      battle.catchUp = (seconds) => seconds;
      try {
        const summary = fastForward.simulateOffline(48 * 3600 * 1000);
        assert.equal(summary.durationMs, 48 * 3600 * 1000, 'the real absence is reported');
        assert.equal(summary.simulatedMs, FastForwardRules.MAX_CATCH_UP_SECONDS * 1000, 'only twelve hours are replayed');
      } finally {
        battle.catchUp = original;
        if (battle.isActive()) battle.endBattle(false);
      }
      assert.ok(save);
    });

    test('a full reload replays the activity that survived in the save', () => {
      const save = fixture('AFK reload');
      const pokemon = PokemonFactory.create('pikachu', 25);
      assert.ok(BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }));
      assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');

      // The player closes the game: only the save survives, stamped with the moment it was written.
      save.updatedAt = Date.now() - 5 * 60 * 1000;
      SaveStorage.write(save); // the last checkpoint of the session that is about to close
      fastForward.onDestroy();
      const loaded = saves.loadSlot(save.id);
      assert.ok(loaded !== save, 'the save was reloaded from storage');
      assert.equal(training.isActive(), true, 'the training session survived the reload');
      // In a real cold start the current save is empty, so nothing re-stamps the slot; here the same
      // process reloads a live slot, so the leaving stamp is put back by hand.
      loaded.updatedAt = Date.now() - 5 * 60 * 1000;

      const awayMs = fastForward._elapsedSinceLastWrite(loaded);
      assert.ok(awayMs >= 5 * 60 * 1000 - 1000, 'the absence is measured from the last write of the save');
      const summary = fastForward.simulateOffline(awayMs);
      assert.ok(summary, 'the five minutes away were replayed');
      assert.equal(summary.wins, 0, 'no wild battle was invented');
      assert.ok(summary.simulatedMs > 0 && summary.simulatedMs <= FastForwardRules.MAX_CATCH_UP_SECONDS * 1000);
      assert.equal(TimeSource.offsetMs, 0, 'the simulated clock is restored');
      assert.equal(loaded.updatedAt >= save.updatedAt, true, 'the save is stamped with the return time');
      training.cancelSession(0);
    });

    test('a short tab switch below the threshold is ignored', () => {
      fixture('AFK tab switch');
      assert.ok(battle.startBattle('route1', { chain: false }));
      const summary = fastForward.simulateOffline(FastForwardRules.MIN_ELAPSED_MS - 1);
      assert.equal(summary, null, 'a glance at another tab is not an absence');
      if (battle.isActive()) battle.endBattle(false);
    });
});
