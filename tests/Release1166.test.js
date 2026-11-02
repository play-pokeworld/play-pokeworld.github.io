/**
 * @file Release1166.test.js
 * @brief 1.16.6 — the debug "speed x10" button now drives every live simulation.
 *
 * The multiplier used to live inside BattleSystem, so it only scaled the wild/trainer battle loop:
 * a training session kept running at 1x. It is now owned by DebugTimeScale and read by both loops,
 * while the offline replay (AFK) always stays in real seconds.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { DebugTimeScale } from '../src/core/DebugTimeScale.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { Random } from '../src/core/Random.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { BattleAttackEvent } from '../src/core/events/BattleAttackEvent.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const GYM_BADGES = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];

/** Training-ready save in Vermilion with the league won. */
function trainingSave(name) {
  TrainingSystem.getInstance().onDestroy();
  if (BattleSystem.getInstance().isActive()) BattleSystem.getInstance().endBattle(false);
  const save = SaveSystem.getInstance().createNewSave(name, 'charmander');
  save.player.location = 'vermilion';
  for (const badge of GYM_BADGES) save.player.earnBadge(badge);
  save.statistics.recordLeague('kanto');
  for (const id of ['training', 'hatchery', 'mine']) save.access.unlockFeature(id);
  return save;
}

/** Runs one training session for `frames` frames of 0.1 s and reports its progress. */
function trainFrames(multiplier, frames = 20) {
  const save = trainingSave(`Speed x10 training ${multiplier}`);
  const training = TrainingSystem.getInstance();
  training.setRandom(new SeededRandom(1166));
  training.init();
  DebugTimeScale.getInstance().setMultiplier(multiplier);
  try {
    // A seeded trainee keeps IVs and talents identical between the two runs.
    const trainee = PokemonFactory.create('charizard', 60, { random: new SeededRandom(1166) });
    BoxSystem.getInstance().addPokemon(trainee, { deferSave: true });
    training.startSession(trainee.uid, 'move', 0, { persist: false });
    for (let index = 0; index < frames; index++) training.update(0.1);
    const slot = save.training.slots[0];
    const session = training._sessions.get(0);
    return { elapsed: slot.elapsed, waves: session ? session.defeatedFoes.length : null, save };
  } finally {
    training.cancelSession(0);
    training.onDestroy();
    DebugTimeScale.getInstance().reset();
  }
}

describe('1.16.6 — the debug time multiplier', (test) => {
  test('the multiplier clamps, toggles and scales a delta', () => {
    const scale = DebugTimeScale.getInstance();
    try {
      assert.equal(scale.getMultiplier(), 1, 'the game starts at 1x');
      assert.equal(scale.setMultiplier(10), 10);
      assert.equal(scale.toggleX10(), 1, 'x10 toggles back to 1x');
      assert.equal(scale.toggleX10(), 10);
      assert.equal(scale.setMultiplier(0), 1, 'a stopped clock is not a speed');
      assert.equal(scale.setMultiplier(-4), 1);
      assert.equal(scale.setMultiplier(Number.NaN), 1);
      assert.equal(scale.setMultiplier(999), 10, 'the debug button never exceeds x10');
      assert.equal(scale.scale(0.1), 1);
      assert.equal(DebugTimeScale.MAX_MULTIPLIER, 10);
      scale.reset();
      assert.equal(scale.scale(0.1), 0.1);
    } finally {
      scale.reset();
    }
  });

  test('one owner only: BattleSystem no longer holds the multiplier and the widget reads the shared one', () => {
    const battle = fs.readFileSync(`${PROJECT_ROOT}src/systems/BattleSystem.js`, 'utf8');
    const widget = fs.readFileSync(`${PROJECT_ROOT}src/panels/components/DebugWidget.js`, 'utf8');
    assert.equal(/_speedMultiplier/.test(battle), false, 'BattleSystem still owns a private multiplier');
    assert.ok(battle.includes('DebugTimeScale.getInstance().scale(dt)'), 'the battle loop reads the shared owner');
    assert.ok(widget.includes('DebugTimeScale.getInstance().toggleX10()'), 'the button toggles the shared owner');
    assert.equal(/getSpeedMultiplier|setSpeedMultiplier/.test(battle), false, 'no duplicated accessor left behind');
  });

  test('a training session really runs ten times faster at x10', () => {
    const normal = trainFrames(1);
    const fast = trainFrames(10);
    assert.ok(Math.abs(normal.elapsed - 2) < 0.001, `1x: ${normal.elapsed}`);
    assert.ok(Math.abs(fast.elapsed - 20) < 0.001, `10x: ${fast.elapsed}`);
    assert.ok(Math.abs(fast.elapsed - normal.elapsed * 10) < 0.001, 'exactly ten times the simulated time');
    assert.ok(fast.waves > normal.waves, `${fast.waves} waves at x10 against ${normal.waves} at 1x`);
  });

  test('the offline replay is never inflated by the debug multiplier', () => {
    const replay = (multiplier) => {
      const save = trainingSave(`Speed x10 replay ${multiplier}`);
      const training = TrainingSystem.getInstance();
      training.setRandom(new SeededRandom(4242));
      training.init();
      DebugTimeScale.getInstance().setMultiplier(multiplier);
      try {
        const trainee = PokemonFactory.create('magikarp', 12, { random: new SeededRandom(1166) });
        BoxSystem.getInstance().addPokemon(trainee, { deferSave: true });
        training.startSession(trainee.uid, 'ev', 0, { persist: false });
        const consumed = training.catchUp(120);
        return { consumed, elapsed: save.training.slots[0].elapsed };
      } finally {
        training.cancelSession(0);
        training.onDestroy();
        DebugTimeScale.getInstance().reset();
      }
    };
    const normal = replay(1);
    const fast = replay(10);
    assert.ok(normal.consumed > 0, 'the absence was replayed');
    assert.equal(fast.consumed, normal.consumed, 'the same absence consumes the same real seconds');
    assert.equal(fast.elapsed, normal.elapsed, 'a two minute absence stays two minutes at x10');
    assert.ok(normal.elapsed <= 120.001, 'never more than the absence itself');
  });

  test('a live battle keeps the same multiplier (no regression on the original battle speed)', () => {
    // Same seed and same simulated duration: x10 for 5 frames must replay what 1x does in 50.
    const probe = (multiplier, frames) => {
      TrainingSystem.getInstance().onDestroy();
      const battle = BattleSystem.getInstance();
      if (battle.isActive()) battle.endBattle(false);
      const save = SaveSystem.getInstance().createNewSave(`Speed x10 battle ${multiplier}/${frames}`, 'charmander');
      save.player.location = 'route1';
      battle.setRandom(Random.sequence([0.2, 0.8, 0.5, 0.3, 0.7, 0.9, 0.1, 0.4, 0.6, 0.25, 0.15, 0.35]));
      let hits = 0;
      const unsubscribe = EventBus.getInstance().subscribe(BattleAttackEvent, () => { hits++; });
      DebugTimeScale.getInstance().setMultiplier(multiplier);
      try {
        assert.ok(battle.startBattle('route1', { chain: false }), 'the battle starts');
        for (let index = 0; index < frames; index++) battle.update(0.1);
        return { hits, active: battle.isActive() };
      } finally {
        unsubscribe();
        if (battle.isActive()) battle.endBattle(false);
        DebugTimeScale.getInstance().reset();
      }
    };
    const accelerated = probe(10, 5);
    const reference = probe(1, 50);
    const sameRealTime = probe(1, 5);
    assert.deepEqual(accelerated, reference, 'x10 replays the same battle in a tenth of the frames');
    assert.equal(sameRealTime.hits, 0, 'without the multiplier these five frames are too short');
    assert.equal(sameRealTime.active, true);
    assert.ok(accelerated.hits > sameRealTime.hits, `${accelerated.hits} hits against ${sameRealTime.hits}`);
  });
});
