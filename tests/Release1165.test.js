/**
 * @file Release1165.test.js
 * @brief 1.16.5 — training: the league prerequisite reads the recorded league win (not a champion
 * badge that no save carries), and a session really uses the sparring-wave system (30 waves drawn
 * from the rank of the trainee, one reward every six waves) instead of the original six-species
 * type pools, which are gone.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { TrainingProgression } from '../src/systems/facilities/TrainingProgression.js';
import { TrainingOpponents } from '../src/systems/facilities/TrainingOpponents.js';
import { PokemonRankRules } from '../src/systems/box/PokemonRankRules.js';
import { TrainingRules } from '../src/config/TrainingRules.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { LeagueDB } from '../src/data/trainers/LeagueDB.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const GYM_BADGES = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
const GATED = TrainingRules.LEAGUE_GATED_MODES;

/** Save with the training centre unlocked, in Vermilion, with the eight Kanto badges. */
function kantoSave(name, { league = false, starter = 'charmander' } = {}) {
  TrainingSystem.getInstance().onDestroy();
  if (BattleSystem.getInstance().isActive()) BattleSystem.getInstance().endBattle(false);
  const save = SaveSystem.getInstance().createNewSave(name, starter);
  save.player.location = TrainingRules.LOCATION_ID;
  for (const id of ['training', 'hatchery', 'mine']) save.access.unlockFeature(id);
  for (const badge of GYM_BADGES) save.player.earnBadge(badge);
  if (league) save.statistics.recordLeague('kanto');
  return save;
}

describe('1.16.5 — the league prerequisite of the training modes', (test) => {
  test('a recorded league win unlocks the league-gated modes, without any champion badge', () => {
    const save = kantoSave('League gate', { league: true });
    assert.equal(save.player.hasBadge('champion'), false, 'the game never awards a champion badge');
    for (const mode of GATED) assert.equal(TrainingProgression.isModeUnlocked(save, mode), true, mode);
    assert.deepEqual(TrainingProgression.modes(save, null).filter((mode) => !mode.unlocked), []);
  });

  test('without a league win the league-gated modes stay locked, the other ones are open', () => {
    // Only the four Kanto gym modes are available before the league: 'level' and 'ev' need their
    // own badge, 'talent' and 'hidden' need a title.
    const save = kantoSave('No league gate');
    for (const mode of GATED) assert.equal(TrainingProgression.isModeUnlocked(save, mode), false, mode);
    for (const mode of TrainingRules.MODES.filter((id) => !GATED.includes(id))) {
      assert.equal(TrainingProgression.isModeUnlocked(save, mode), true, mode);
    }
  });

  test('a migrated save whose league win only lives in statistics.leaguesWon is accepted', () => {
    const raw = kantoSave('Migrated league title', { starter: 'bulbasaur' }).serialize();
    delete raw.player.badges;
    raw.player.badges = ['surge'];
    raw.statistics.leaguesWon = ['kanto'];
    const restored = SaveData.fromJson(raw);
    for (const mode of GATED) assert.equal(TrainingProgression.isModeUnlocked(restored, mode), true, mode);
  });

  test('a legacy save that still carries the champion badge id is accepted', () => {
    const save = kantoSave('Legacy champion badge');
    const badge = LeagueDB.getInstance().getAll().find((league) => league.region === 'kanto').badge;
    save.player.earnBadge(badge);
    for (const mode of GATED) assert.equal(TrainingProgression.isModeUnlocked(save, mode), true, mode);
  });
});

describe('1.16.5 — the sparring-wave training system', (test) => {
  test('the original six-species type pools are gone', () => {
    for (const path of ['src/data/raw/training-opponents-data.js', 'src/data/training/TrainingOpponentDB.js']) {
      assert.equal(fs.existsSync(`${PROJECT_ROOT}${path}`), false, `${path} is removed`);
    }
  });

  test('a session is thirty waves of the rank of the trainee, never the same species twice', () => {
    const random = new SeededRandom(1165);
    for (const [species, level] of [['pikachu', 40], ['treecko', 25], ['machop', 30], ['dragonite', 55]]) {
      const trainee = PokemonFactory.create(species, level, { random });
      const waves = TrainingOpponents.create(trainee, 'ev', TrainingRules.OPPONENT_COUNT, random);
      assert.equal(waves.length, TrainingRules.OPPONENT_COUNT, `${species}: ${waves.length} waves`);
      const ids = waves.map((wave) => wave.species);
      assert.equal(new Set(ids).size, ids.length, `${species}: duplicate sparring partner`);
      assert.ok(!ids.includes(species), `${species}: fights itself`);
      const ownRank = waves.filter((wave) => PokemonRankRules.getRank(wave.species) === PokemonRankRules.getRank(trainee));
      assert.ok(ownRank.length >= Math.min(TrainingRules.OPPONENT_COUNT, TrainingOpponents.speciesOfRank(PokemonRankRules.getRank(trainee)).length - 1),
        `${species}: the rank of the trainee is used first`);
      for (const wave of waves) {
        assert.ok(!PokemonRules.LEGENDARY_DEX.includes(wave.getSpecies().dex), `${wave.species} is legendary`);
        assert.ok(wave.level >= TrainingRules.MIN_OPPONENT_LEVEL && wave.level <= PokemonRules.MAX_LEVEL);
      }
    }
  });

  test('the level ladder follows 60 % to 120 % of the trainee, shifted by the mode', () => {
    const level = 50;
    const first = TrainingOpponents.levelFor(level, 'level', 0, TrainingRules.OPPONENT_COUNT);
    const last = TrainingOpponents.levelFor(level, 'level', TrainingRules.OPPONENT_COUNT - 1, TrainingRules.OPPONENT_COUNT);
    const base = level + TrainingRules.MODE_LEVEL_OFFSETS.level;
    assert.ok(Math.abs(first - Math.round(base * TrainingRules.WAVE_LEVEL_FACTOR_MIN)) <= 1, `first wave ${first}`);
    assert.ok(Math.abs(last - Math.round(base * TrainingRules.WAVE_LEVEL_FACTOR_MAX)) <= 1, `last wave ${last}`);
    assert.ok(first < last, 'the ladder rises');
    assert.equal(TrainingOpponents.levelFor(1, 'move', 0, TrainingRules.OPPONENT_COUNT), TrainingRules.MIN_OPPONENT_LEVEL);
  });

  test('the training staff shortens the session to 24 waves at best, never below the floor', () => {
    assert.equal(TrainingOpponents.waveCount(1), TrainingRules.OPPONENT_COUNT);
    assert.equal(TrainingOpponents.waveCount(100), TrainingRules.OPPONENT_COUNT - TrainingRules.MAX_STAFF_OPPONENT_REDUCTION);
    assert.ok(TrainingOpponents.waveCount(100) >= TrainingRules.MIN_STAFF_OPPONENT_COUNT);
    assert.ok(TrainingRules.OPPONENT_COUNT > 20, 'the plan requires more than twenty waves');
  });

  test('a started session exposes its thirty waves and a ceiling that can hold them', () => {
    const save = kantoSave('Wave session', { league: true });
    const training = TrainingSystem.getInstance();
    training.setRandom(new SeededRandom(4242));
    training.init();
    try {
      const trainee = PokemonFactory.create('pikachu', 30);
      BoxSystem.getInstance().addPokemon(trainee, { deferSave: true });
      const started = training.startSession(trainee.uid, 'ev', 0, { persist: false });
      assert.equal(started.result, 'ready');
      assert.equal(started.opponentCount, TrainingRules.OPPONENT_COUNT);
      const snapshot = training.getSnapshot(0);
      assert.equal(snapshot.opponentCount, TrainingRules.OPPONENT_COUNT);
      assert.equal(snapshot.opponentsDefeated, 0);
      assert.ok(TrainingRules.MAX_SIMULATION_TICKS * TrainingRules.TICK_SECONDS >= 1800,
        'a thirty-wave session gets at least thirty minutes of battle time');
      training.cancelSession(0);
    } finally {
      training.onDestroy();
      if (BattleSystem.getInstance().isActive()) BattleSystem.getInstance().endBattle(false);
      assert.ok(save);
    }
  });

  test('a reward is granted every six waves defeated, and only from the real settlement', () => {
    const save = kantoSave('Reward cadence', { league: true });
    const training = TrainingSystem.getInstance();
    training.setRandom(new SeededRandom(777));
    training.init();
    try {
      const trainee = PokemonFactory.create('treecko', 30);
      BoxSystem.getInstance().addPokemon(trainee, { deferSave: true });
      training.startSession(trainee.uid, 'ev', 0, { persist: false });
      const session = training._sessions.get(0);
      // Twelve waves really defeated: two rewards, not one per wave.
      session.defeatedFoes = Array.from({ length: 12 }, () => session.foe.pokemon);
      session.outcome = 'victory';
      training.update(0.01);
      const result = save.training.slots[0].result;
      assert.equal(result.result, 'completed');
      assert.equal(result.rewards.length, 2, `${result.rewards.length} rewards for 12 waves`);
      const evs = result.rewards.reduce((sum, reward) => sum + (reward.evs || 0), 0);
      const current = save.collection.get(trainee.uid);
      const totalEvs = PokemonRules.STAT_KEYS.reduce((sum, stat) => sum + current.evs[stat], 0);
      assert.equal(totalEvs, evs, 'the EVs on the Pokémon are exactly the rewards of the session');
    } finally {
      training.onDestroy();
    }
  });
});
