import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// --- Extraction de migrateSinglePokemon depuis src/game/save/save.js ---------
// Le chargement complet de save.js dans Node est impraticable (timers au
// require), on extrait donc le texte de la fonction et on l'évalue dans un
// contexte vm isolé avec des mocks pour les helpers de données.
const SRC = fs.readFileSync(new URL('../src/game/save/save.js', import.meta.url), 'utf8');
const FN = SRC.match(/function migrateSinglePokemon\(p, moveData\) \{[\s\S]*?\n\}/);
assert.ok(FN, 'extraction de migrateSinglePokemon impossible depuis save.js');

// --- Données de test (espèce 25 = Pikachu-like) ------------------------------
const MOVE_DATA = {
  tackle: { power: 40 },
  quick_attack: { power: 40 },
  bite: { power: 60 },
  thunderbolt: { power: 90 },
  spark: { power: 65 },        // niveau 40
  charge: { power: 0 },        // niveau 60
  iron_tail: { power: 100 },   // attaque d'entraînement (fullPool, hors pool niveau)
  volt_switch: { power: 70 },  // attaque d'entraînement
  thunder: { power: 110 },     // CT uniquement
  fly: { power: 90 },          // CS uniquement
  hyper_beam: { power: 150 },  // impossible pour l'espèce
};

// Pool de niveau complet (6 attaques — dépasse les 4 slots)
const POOL = ['tackle', 'quick_attack', 'bite', 'thunderbolt', 'spark', 'charge'];
const LEARN_LEVELS = { tackle: 1, quick_attack: 5, bite: 15, thunderbolt: 25, spark: 40, charge: 60 };
const FULL_POOL = [...POOL, 'iron_tail', 'volt_switch']; // niveau + entraînement
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

// Array.from côté hôte : les tableaux venant du contexte vm ont un prototype
// différent, ce qui ferait échouer deepStrictEqual malgré un contenu identique.
const ids = (p) => Array.from(p.moves, (m) => m.id);

// -----------------------------------------------------------------------------

test('complète les attaques manquantes jusqu\'à 4 au niveau 30', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('complète sans dépasser le nombre d\'attaques attendues au niveau', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }], { level: 5 });
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack']);
});

test('retire les attaques impossibles pour l\'espèce', () => {
  const env = makeEnv();
  const p = poke([
    { id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' },
    { id: 'thunderbolt' }, { id: 'hyper_beam' },
  ]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('conserve les attaques apprises par CT ou CS', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }, { id: 'thunder' }, { id: 'fly' }]);
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.ok(ids(p).includes('thunder'), 'attaque CT conservée');
  assert.ok(ids(p).includes('fly'), 'attaque CS conservée');
});

test('conserve les attaques apprises par entraînement (fullPool)', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }, { id: 'iron_tail' }, { id: 'volt_switch' }]);
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.ok(ids(p).includes('iron_tail'), 'attaque d\'entraînement conservée');
  assert.ok(ids(p).includes('volt_switch'), 'attaque d\'entraînement conservée');
});

test('dédoublonne les attaques en double', () => {
  const env = makeEnv();
  const p = poke([{ id: 'tackle' }, { id: 'tackle' }, { id: 'bite' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.equal(new Set(ids(p)).size, ids(p).length, 'plus de doublon');
  assert.deepEqual(ids(p), ['tackle', 'bite', 'quick_attack', 'thunderbolt']);
});

test('convertit les attaques au format string legacy et marque la save modifiée', () => {
  const env = makeEnv();
  const p = poke(['tackle', 'bite']);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(p.moves.every((m) => typeof m === 'object' && m.id), 'format {id} partout');
  assert.deepEqual(ids(p), ['tackle', 'bite', 'quick_attack', 'thunderbolt']);
});

test('convertit les ids camelCase en snake_case', () => {
  const env = makeEnv();
  const p = poke([{ id: 'quickAttack' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(ids(p).includes('quick_attack'));
  assert.ok(!ids(p).includes('quickAttack'));
});

test('retire les attaques absentes de MOVES puis recomplète', () => {
  const env = makeEnv();
  const p = poke([{ id: 'fake_move' }, { id: 'tackle' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(!ids(p).includes('fake_move'));
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('un pokémon sain n\'est pas modifié (pas de tri, pas de troncature)', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke([{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, false);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
  assert.equal(p.movepool, undefined, 'aucun movepool créé quand rien ne manque');
});

test('choix légitimes conservés + movepool couvrant le reste : inchangés', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  // Ordre personnalisé + CT (thunder) + entraînement (volt_switch/iron_tail).
  // Les attaques de niveau manquantes sont déjà dans le movepool.
  const p = poke(
    [{ id: 'volt_switch' }, { id: 'thunder' }, { id: 'iron_tail' }, { id: 'tackle' }],
    { movepool: ['quick_attack', 'bite', 'thunderbolt'] }
  );
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, false);
  assert.deepEqual(ids(p), ['volt_switch', 'thunder', 'iron_tail', 'tackle']);
  assert.deepEqual(Array.from(p.movepool), ['quick_attack', 'bite', 'thunderbolt']);
});

test('un pokémon sans attaque reçoit les attaques de son niveau', () => {
  const env = makeEnv();
  const p = poke([]);
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.deepEqual(ids(p), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('garde-fou final : toujours au moins une attaque', () => {
  const env = makeEnv({
    getSpeciesMovePool: () => [],
    getSpeciesFullLearnablePool: () => ['fly'], // fullPool vide de fait pour espèce inconnue
    getMovesForLevel: () => [{ id: 'fake' }],
  });
  const p = { id: 999, level: 50, moves: [{ id: 'fake_move' }] };
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(p.moves.length, 1);
  assert.equal(p.moves[0].id, 'tackle'); // repli ultime
});

// ── Attaques apprises (movepool des anciennes saves PokeChill) ───────────────

test('movepool : attaques en trop retirées, manquantes de niveau ajoutées (current plein)', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke(
    [{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }],
    { movepool: ['iron_tail', 'hyper_beam', 'tackle', 'fly'] }
  );
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true);
  assert.ok(!p.movepool.includes('hyper_beam'), 'attaque impossible retirée du movepool');
  assert.ok(p.movepool.includes('iron_tail'), 'attaque d\'entraînement conservée');
  assert.ok(p.movepool.includes('fly'), 'attaque CS conservée');
  assert.ok(p.movepool.includes('tackle'), 'attaque de niveau conservée dans le movepool');
});

test('movepool : attaques de niveau manquantes ajoutées quand le current est plein', () => {
  const env = makeEnv();
  // current plein avec 4 attaques hors niveau -> les 4 de niveau partent dans le movepool
  const p = poke(
    [{ id: 'iron_tail' }, { id: 'volt_switch' }, { id: 'thunder' }, { id: 'fly' }],
    { movepool: [] }
  );
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(p.moves.length, 4, 'le current plein n\'est pas modifié');
  assert.deepEqual(
    Array.from(p.movepool),
    ['tackle', 'quick_attack', 'bite', 'thunderbolt'],
    'attaques de niveau rangées dans le movepool'
  );
});

test('les attaques manquantes vont dans le current tant qu\'il n\'a pas 4 attaques', () => {
  const env = makeEnv();
  const p = poke([{ id: 'iron_tail' }], { movepool: ['tackle'] });
  env.migrateSinglePokemon(p, MOVE_DATA);
  // tackle est placé dans le current (même s'il est déjà dans le movepool),
  // puis quick_attack et bite complètent jusqu'à 4 ; thunderbolt reste dans le movepool.
  assert.deepEqual(ids(p), ['iron_tail', 'tackle', 'quick_attack', 'bite']);
  assert.deepEqual(Array.from(p.movepool), ['tackle', 'thunderbolt']);
});

test('movepool : strings legacy camelCase converties, corrompues et doublons retirés', () => {
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

test('movepool créé s\'il manque des attaques de niveau et que le current est plein', () => {
  const env = makeEnv();
  const p = poke([{ id: 'iron_tail' }, { id: 'volt_switch' }, { id: 'thunder' }, { id: 'fly' }]);
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(Array.from(p.movepool), ['tackle', 'quick_attack', 'bite', 'thunderbolt']);
});

test('aucun movepool créé quand le current a la place pour tout', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  const p = poke([{ id: 'tackle' }], { level: 5 });
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(p.movepool, undefined);
});

test('niveau 100 : tout le pool de niveau au-delà des 4 slots va dans le movepool', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  // Un pokémon niveau 100 bien formé (4 meilleures attaques équipées)
  const p = poke([{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }], { level: 100 });
  const changed = env.migrateSinglePokemon(p, MOVE_DATA);
  assert.equal(changed, true, 'attribution des attaques de niveau restantes');
  assert.equal(p.moves.length, 4, 'current inchangé');
  assert.deepEqual(Array.from(p.movepool), ['spark', 'charge']);
});

test('la complétion movepool respecte le niveau d\'apprentissage', () => {
  const env = makeEnv({
    G: { unlockedTalents: { 25: ['static', 'lightning_rod'] } },
  });
  // Niveau 45 : spark (40) accessible, charge (60) pas encore.
  const p = poke([{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }], { level: 45 });
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(Array.from(p.movepool), ['spark'], 'spark appris, charge trop haut niveau');
});

test('niveau 100 : movepool existant complété avec tout le pool de niveau', () => {
  const env = makeEnv();
  const p = poke(
    [{ id: 'tackle' }, { id: 'quick_attack' }, { id: 'bite' }, { id: 'thunderbolt' }],
    { level: 100, movepool: [] }
  );
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.deepEqual(Array.from(p.movepool), ['spark', 'charge']);
});

test('le champ learnableMoves (variante) est normalisé aussi', () => {
  const env = makeEnv();
  const p = poke(
    [{ id: 'iron_tail' }, { id: 'volt_switch' }, { id: 'thunder' }, { id: 'fly' }],
    { learnableMoves: ['hyper_beam', 'tackle'] }
  );
  env.migrateSinglePokemon(p, MOVE_DATA);
  assert.ok(!p.learnableMoves.includes('hyper_beam'), 'attaque en trop retirée');
  assert.ok(p.learnableMoves.includes('tackle'));
  assert.ok(p.learnableMoves.includes('quick_attack'), 'niveau manquant ajouté');
  assert.ok(p.learnableMoves.includes('thunderbolt'));
});

