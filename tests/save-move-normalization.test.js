import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// --- Extracting migrateSinglePokemon from src/application/save/save.js ------------
// Fully loading save.js in Node is impractical (timers at require
// time), so we extract the function's text and evaluate it in an
// isolated vm context with mocks for the data helpers.
const SRC = fs.readFileSync(new URL('../src/application/save/save.js', import.meta.url), 'utf8');
const FN = SRC.match(/function migrateSinglePokemon\(p, moveData\) \{[\s\S]*?\n\}/);
assert.ok(FN, 'migrateSinglePokemon extraction impossible from save.js');

// --- Test data (species 25 = Pikachu-like) -----------------------------------
const MOVE_DATA = {
  tackle: { power: 40 },
  quick_attack: { power: 40 },
  bite: { power: 60 },
  thunderbolt: { power: 90 },
  spark: { power: 65 },        // niveau 40
  charge: { power: 0 },        // niveau 60
  iron_tail: { power: 100 },   // training move (fullPool, outside level pool)
  volt_switch: { power: 70 },  // training move
  thunder: { power: 110 },     // CT uniquement
  fly: { power: 90 },          // CS uniquement
  hyper_beam: { power: 150 },  // impossible for the species
};

// Complete level pool (6 moves — exceeds the 4 slots)
const POOL = ['tackle', 'quick_attack', 'bite', 'thunderbolt', 'spark', 'charge'];
const LEARN_LEVELS = { tackle: 1, quick_attack: 5, bite: 15, thunderbolt: 25, spark: 40, charge: 60 };
const FULL_POOL = [...POOL, 'iron_tail', 'volt_switch']; // level + training
const TALENTS = ['static', 'lightning_rod'];

function makeEnv(overrides = {}) {
  const sandbox = {
    console,
    G: { unlockedTalents: {} },
    window: {
      ITEMS: {
        ct01: { type: 'ct', moveId: 'thunder' },
        cs01: { type: 'cs', moveId: 'fly' },
        potion: { type: 'heal' },
      },
    },
    TALENTS_FULL: { static: { name: 'Statik' }, lightning_rod: { name: 'Paratonnerre' } },
    getSpeciesMovePool: (nid) => (nid === 25 ? POOL.slice() : []),
    getSpeciesFullLearnablePool: (nid) => (nid === 25 ? FULL_POOL.slice() : []),
    getSpeciesTalents: (nid) => (nid === 25 ? TALENTS.slice() : []),
    getMoveLearnLevel: (nid, id) => LEARN_LEVELS[id] ?? 1,
    getMovesForLevel: (nid, level) => {
      if (nid !== 25) return [{ id: 'tackle' }];
      const count = level >= 30 ? 4 : level >= 10 ? 3 : 2;
      return POOL.slice(0, count).map((id) => ({ id }));
    },
    ...overrides,
  };
  vm.createContext(sandbox);
  vm.runInContext(FN[0], sandbox, { filename: 'save.js#migrateSinglePokemon' });
  assert.equal(typeof sandbox.migrateSinglePokemon, 'function');
  return sandbox;
}

function poke(moves, extra = {}) {
  return { id: 25, level: 30, talent: 'static', moves, ...extra };
}

// Host-side Array.from: arrays coming from the vm context have a different
// prototype, which would fail deepStrictEqual despite identical content.
const ids = (p) => Array.from(p.moves, (m) => m.id);

// -----------------------------------------------------------------------------

test('fills missing moves up to 4 at level 30', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('fills without exceeding the expected move count for the level', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }], { level: 5 });
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack']);
});

test('removes moves impossible for the species', () => {
  const env = makeEnv();
  const p = poke([
    { id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' },
    { id: 'thunderbolt' }, { id: 'hyper_beam' },
  ]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('keeps the moves learned from TMs or HMs', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }, { id: 'thunder' }, { id: 'fly' }]);
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.ok(ids(p).includes('thunder'), 'TM move kept');
  assert.ok(ids(p).includes('fly'), 'HM move kept');
});

test('keeps moves learned by training (fullPool)', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }, { id: 'iron_tail' }, { id: 'volt_switch' }]);
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.ok(ids(p).includes('iron_tail'), 'training move kept');
  assert.ok(ids(p).includes('volt_switch'), 'training move kept');
});

test('dedupes doubled moves', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }, { id: 'tackle' }, { id: 'bite' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.equal(new Set(ids(p)).size, ids(p).length, 'plus de doublon');
  assert.deepEqual(ids(p), ['tackle', 'bite', 'quick_attack', 'thunderbolt']);
});

test('converts legacy string-format moves and marks the save as modified', () => {
  const env = makeEnv();
  const p = poke(['tackle', 'bite']);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(p.moves.every((m) => typeof m === 'object' && m.id), 'format {id} partout');
  assert.deepEqual(ids(p), ['tackle', 'bite', 'quick_attack', 'thunderbolt']);
});

test('converts camelCase ids to snake_case', () => {
  const env = makeEnv();
  const p = poke([{ id: 'quickAttack' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(ids(p).includes('quick_attack'));
  assert.ok(!ids(p).includes('quickAttack'));
});

test('removes moves absent from MOVES then re-fills', () => {
  const env = makeEnv();
  const p = poke([{ id: 'fake_move' }, { id: 'tackle' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(!ids(p).includes('fake_move'));
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('a healthy pokémon is not modified (no sorting, no truncation)', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke([{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, false);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
  assert.equal(p.movepool, undefined, 'no movepool created when nothing is missing');
});

test('legitimate choices kept + movepool covering the rest: unchanged', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  // Custom order + TM (thunder) + training (volt_switch/iron_tail).
  // The missing level moves are already in the movepool.
  const p = poke(
    [{ id: 'volt_switch' }, { id: 'thunder' }, { id: 'iron_tail' }, { id: 'tackle' }],
    { movepool: ['quick_attack', 'bite', 'thunderbolt'] }
  );
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, false);
  assert.deepEqual(ids(p), ['volt_switch', 'thunder', 'iron_tail', 'tackle']);
  assert.deepEqual(Array.from(p.movepool), ['quick_attack', 'bite', 'thunderbolt']);
});

test('a moveless pokémon receives its level\'s moves', () => {
  const env = makeEnv();
  const p = poke([]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('final guard: always at least one move', () => {
  const env = makeEnv({
    getSpeciesMovePool: () => [],
    getSpeciesFullLearnablePool: () => ['fly'], // fullPool effectively empty for unknown species
    getMovesForLevel: () => [{ id: 'fake' }],
  });
  const p = { id: 999, level: 50, moves: [{ id: 'fake_move' }] };
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(p.moves.length, 1);
  assert.equal(p.moves[0].id, 'tackle'); // repli ultime
});

// ── Learned moves (movepool of the old PokeChill saves) ───────────────

test('movepool: extra moves removed, missing level ones added (full current)', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke(
    [{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }],
    { movepool: ['iron_tail', 'hyper_beam', 'tackle', 'fly'] }
  );
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(!p.movepool.includes('hyper_beam'), 'impossible move removed from the movepool');
  assert.ok(p.movepool.includes('iron_tail'), 'training move kept');
  assert.ok(p.movepool.includes('fly'), 'HM move kept');
  assert.ok(p.movepool.includes('tackle'), 'level move kept in the movepool');
});

test('movepool: missing level moves added when current is full', () => {
  const env = makeEnv();
  // current full with 4 non-level moves -> the 4 level ones go into the movepool
  const p = poke(
    [{ id: 'iron_tail' }, { id: 'volt_switch' }, { id: 'thunder' }, { id: 'fly' }],
    { movepool: [] }
  );
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(p.moves.length, 4, 'the full current is not modified');
  assert.deepEqual(
    Array.from(p.movepool),
    ['tackle', 'quick_attack', 'bite', 'thunderbolt'],
    'level moves stored in the movepool'
  );
});

test('missing moves go into current while it has fewer than 4 moves', () => {
  const env = makeEnv();
  const p = poke([{ id: 'iron_tail' }], { movepool: ['tackle'] });
  env.migrateSinglePokemon(p, MOVE_DATA);
  // tackle is placed into current (even if already in the movepool),
  // then quick_attack and bite fill up to 4; thunderbolt stays in the movepool.
  assert.deepEqual(ids(p), ['iron_tail', 'tackle', 'quick_attack', 'bite']);
  assert.deepEqual(Array.from(p.movepool), ['tackle', 'thunderbolt']);
});

test('movepool: legacy camelCase strings converted, corrupted entries and duplicates removed', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke(
    [{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }],
    { movepool: ['quickAttack', 'fake_move', 'iron_tail', 'iron_tail', null] }
  );
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(Array.from(p.movepool), ['quick_attack', 'iron_tail']);
});

test('movepool created if level moves are missing and current is full', () => {
  const env = makeEnv();
  const p = poke([{ id: 'iron_tail' }, { id: 'volt_switch' }, { id: 'thunder' }, { id: 'fly' }]);
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(Array.from(p.movepool), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('no movepool created when current has room for everything', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke([{ id: 'tackle' }], { level: 5 });
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(p.movepool, undefined);
});

test('level 100: the whole level pool beyond the 4 slots goes to the movepool', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  // A well-formed level-100 Pokémon (4 best moves equipped)
  const p = poke([{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }], { level: 100 });
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true, 'assignment of the remaining level moves');
  assert.equal(p.moves.length, 4, 'current unchanged');
  assert.deepEqual(Array.from(p.movepool), ['spark', 'charge']);
});

test('movepool completion respects the learn level', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  // Level 45: spark (40) reachable, charge (60) not yet.
  const p = poke([{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }], { level: 45 });
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(Array.from(p.movepool), ['spark'], 'spark learned, charge level too high');
});

test('level 100: existing movepool completed with the whole level pool', () => {
  const env = makeEnv();
  const p = poke(
    [{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }],
    { level: 100, movepool: [] }
  );
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(Array.from(p.movepool), ['spark', 'charge']);
});

test('the learnableMoves field (variant) is normalized too', () => {
  const env = makeEnv();
  const p = poke(
    [{ id: 'iron_tail' }, { id: 'volt_switch' }, { id: 'thunder' }, { id: 'fly' }],
    { learnableMoves: ['hyper_beam', 'tackle'] }
  );
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.ok(!p.learnableMoves.includes('hyper_beam'), 'extra move removed');
  assert.ok(p.learnableMoves.includes('tackle'));
  assert.ok(p.learnableMoves.includes('quick_attack'), 'missing level added');
  assert.ok(p.learnableMoves.includes('thunderbolt'));
});


