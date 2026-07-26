import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 31 — bêta : auto-remplissage pension équitable ────────────────────
//  Demande utilisateur : l'auto-fill doit servir les SLOTS VIDES en premier
//  (vidange FIFO des files existantes avant tout réassort), puis remplir les
//  files en ROUND-ROBIN : 1ᵉʳ élément de chaque file, puis 2ᵉ de chaque file…
//  Fini le slot + sa file pleins pendant qu'un autre slot du même mode est vide.
const HATCHERY = fs.readFileSync(new URL('../src/game/breeding/hatchery.js', import.meta.url), 'utf8');

function fakeNode() {
  return {
    innerHTML: '', textContent: '', value: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
}

function makeEnv(overrides = {}) {
  const notifs = [];
  const nodes = {
    'poke-modal': fakeNode(),
    'unified-selector-modal': fakeNode(),
    'settings-modal': fakeNode(),
  };
  const sandbox = {
    console,
    notifs,
    nodes,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (msg, color) => notifs.push([String(msg), color]),
    addBattleLog: () => {},
    saveGame: () => {},
    updateHeader: () => {},
    renderTeamWindow: () => {},
    renderHatcheryWindow: () => {},
    openHatcheryManagementMenu: () => {},
    t: (k) => k,
    tr: (k, o) => k + (o ? ':' + Object.values(o).join(',') : ''),
    rand: () => 0,
    rollShiny: () => false,
    xpForLevel: () => 0,
    recalcPokeStats: () => {},
    getItemName: (k) => 'ITEM_' + k,
    getPokeName: (id) => 'POKE_' + id,
    createPoke: (id, lvl, shiny) => ({ id, level: lvl, shinyActive: shiny, name: 'POKE_' + id, ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} }),
    unlockShinyForSpecies: () => {},
    speciesOwned: () => false,
    spriteImg: () => '',
    itemIcon: () => '',
    isSpeciesShiny: () => false,
    PD: {},
    ITEMS: { helix_fossil: { type: 'fossil' }, root_fossil: { type: 'fossil' } },
    G: {
      lang: 'fr',
      money: 999999,
      team: [],
      collection: {},
      inventory: { helix_fossil: 1 },
      hatchery: [null, null],
      hatcheryMaxSlots: 2,
      hatcheryModes: ['breed', 'exp'],
      hatcheryQueues: [[], []],
      hatcheryAutomation: {
        sort: 'dex', // ordre de candidats déterministe pour les tests (id croissant)
        slots: [
          { enabled: true, mode: 'breed', filterShiny: 'all', filterIv: 'all', sort: 'dex', priority: 'pokemon', queue: [] },
          { enabled: true, mode: 'exp', filterShiny: 'all', filterIv: 'all', sort: 'dex', priority: 'pokemon', queue: [] },
        ],
      },
      automation: { autoHatch: false, autoSeedHatchery: false },
      pokedex: {},
      badges: ['koga', 'x', 'y', 'z'],
    },
  };
  Object.assign(sandbox.G, overrides.G || {});
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(HATCHERY, sandbox, { filename: 'hatchery.js' });
  return sandbox;
}

// Utilitaire : N Pokémon (ids croissants, niveau choisi) dans la collection.
function seedCollection(env, startId, count, level = 50) {
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    env.G.collection['b' + id] = { id, level, uid: 'u' + id, name: 'P' + id, ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} };
  }
}

test('passe 31 : slots vides servis d’abord, files remplies en round-robin strict', () => {
  const env = makeEnv({ G: {
    hatcheryMaxSlots: 4,
    hatcheryModes: ['exp', 'exp', 'exp', 'exp'],
    hatcheryQueues: [[], [], [], []],
    hatchery: [null, null, null, null],
    hatcheryAutomation: { sort: 'dex', slots: [] },
  } });
  env.G.automation.autoSeedHatchery = true;
  seedCollection(env, 10, 12, 50); // 12 candidats niv. 50 (ids 10..21)
  env.processHatcheryQueue();
  // Les 4 slots sont TOUS remplis (rang 0 de chaque file), dans l'ordre des candidats
  for (let i = 0; i < 4; i++) {
    assert.ok(env.G.hatchery[i], `slot ${i} rempli`);
    assert.equal(env.G.hatchery[i].poke.id, 10 + i, `slot ${i} = candidat #${i}`);
  }
  // Reste : files PARFAITEMENT équilibrées (2 partout) et interleavées par rang
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u14', 'u18']);
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u15', 'u19']);
  assert.deepEqual([...env.G.hatcheryQueues[2]], ['u16', 'u20']);
  assert.deepEqual([...env.G.hatcheryQueues[3]], ['u17', 'u21']);
});

test('passe 31 : un slot libre reçoit le PREMIER nouveau candidat (pas la queue derrière la file d’un autre)', () => {
  const env = makeEnv({ G: {
    hatcheryModes: ['exp', 'exp'],
    hatcheryQueues: [['u1'], []],
    hatchery: [{ poke: { id: 30, level: 50, uid: 'occ' }, steps: 0, stepsReq: 35, mode: 'exp' }, null],
  } });
  env.G.automation.autoSeedHatchery = true;
  env.G.collection = {
    b1: { id: 1, level: 50, uid: 'u1', name: 'A', ivs: {}, evs: {} },
    b4: { id: 4, level: 50, uid: 'u4', name: 'D', ivs: {}, evs: {} },
    b5: { id: 5, level: 50, uid: 'u5', name: 'E', ivs: {}, evs: {} },
    b6: { id: 6, level: 50, uid: 'u6', name: 'F', ivs: {}, evs: {} },
  };
  env.processHatcheryQueue();
  assert.equal(env.G.hatchery[1].poke.uid, 'u4', 'le slot vide est servi par le premier candidat frais');
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u1', 'u5'], 'la file du slot occupé n’a reçu que le rang 1');
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u6'], 'le rang suivant reste au slot servi');
});

test('passe 31 : les files existantes ne sont jamais réordonnées (ajouts uniquement en fin)', () => {
  const env = makeEnv({ G: {
    hatcheryModes: ['exp', 'exp'],
    hatcheryQueues: [['u1', 'u2'], ['u9']],
    hatchery: [
      { poke: { id: 30, level: 50, uid: 'occ1' }, steps: 0, stepsReq: 35, mode: 'exp' },
      { poke: { id: 31, level: 50, uid: 'occ2' }, steps: 0, stepsReq: 35, mode: 'exp' },
    ],
  } });
  env.G.automation.autoSeedHatchery = true;
  env.G.collection = {
    b1: { id: 1, level: 50, uid: 'u1', name: 'A', ivs: {}, evs: {} },
    b2: { id: 2, level: 50, uid: 'u2', name: 'B', ivs: {}, evs: {} },
    b9: { id: 9, level: 50, uid: 'u9', name: 'I', ivs: {}, evs: {} },
    b3: { id: 3, level: 50, uid: 'u3', name: 'C', ivs: {}, evs: {} },
    b4: { id: 4, level: 50, uid: 'u4', name: 'D', ivs: {}, evs: {} },
  };
  env.processHatcheryQueue();
  // Slots occupés : files seulement complétées, jamais touchées en tête
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u1', 'u2', 'u4'], 'tête et milieu intacts, ajout à la fin');
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u9', 'u3'], 'idem pour l’autre file');
});

test('passe 31 : files PARFAITEMENT équilibrées avec file agrandie (cap 6)', () => {
  const env = makeEnv({ G: {
    hatcheryModes: ['exp', 'exp'],
    hatcheryQueues: [[], []],
    hatchery: [null, null],
    hatcheryQueueUpgradeLevel: 1, // cap = 3 + 3 = 6
  } });
  env.G.automation.autoSeedHatchery = true;
  seedCollection(env, 10, 10, 50); // ids 10..19
  env.processHatcheryQueue();
  assert.equal(env.G.hatchery[0].poke.id, 10);
  assert.equal(env.G.hatchery[1].poke.id, 11);
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u12', 'u14', 'u16', 'u18'], 'alternance stricte 12/14/16/18');
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u13', 'u15', 'u17', 'u19'], 'alternance stricte 13/15/17/19');
});

test('passe 31 : fossiles et priorité Incubation préservés par le round-robin (1 fossile = 1 seule place)', () => {
  const env = makeEnv({ G: {
    hatcheryModes: ['breed', 'breed'],
    hatcheryQueues: [[], []],
    hatchery: [null, null],
  } });
  env.G.automation.autoSeedHatchery = true;
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.hatcheryAutomation.slots[1].priority = 'fossil';
  env.G.inventory = { helix_fossil: 1 }; // UNE seule unité pour DEUX slots priorisés fossile
  env.processHatcheryQueue();
  const inQueues = env.G.hatcheryQueues.flat().filter((e) => e === 'fossil:helix_fossil').length;
  const inSlots = env.G.hatchery.filter((s) => s && s.isFossil && s.fossilKey === 'helix_fossil').length;
  assert.ok(inQueues + inSlots <= 1, 'l’exemplaire unique n’existe qu’à UN seul endroit');
  assert.equal(inSlots, 1, 'le premier slot priorisé fossile a été servi');
  assert.equal((env.G.inventory.helix_fossil || 0) + inQueues + inSlots, 1, 'conservation du stock');
});

test('passe 31 : contrat source — vidange avant réassort, boucle par rang, exports', () => {
  const src = HATCHERY;
  const proc = src.slice(src.indexOf('function processHatcheryQueue'));
  const idxSanitize = proc.indexOf('sanitizeHatcheryFossilQueues() > 0');
  const idxDrain1 = proc.indexOf('drainHatcheryQueuesIntoSlots()) changed = true');
  const idxRefill = proc.indexOf('const added = refillHatcheryQueueFromRules();');
  const idxDrain2 = proc.lastIndexOf('drainHatcheryQueuesIntoSlots()) changed = true');
  assert.ok(idxSanitize !== -1 && idxDrain1 > idxSanitize, 'vidange après le sanitize');
  assert.ok(idxRefill > idxDrain1, 'réassort APRÈS la première vidange (slots vides d’abord)');
  assert.ok(idxDrain2 > idxRefill, 'seconde vidange APRÈS le réassort (slots servis avant d’empiler leurs files)');
  assert.ok(src.includes('for (let rank = 0; rank < cap; rank++)'), 'boucle par rang dans le réassort');
  assert.ok(src.includes('q.length !== rank'), 'se réassort : jamais en milieu de file');
  assert.ok(src.includes('window.drainHatcheryQueuesIntoSlots'), 'helper exporté');
});
