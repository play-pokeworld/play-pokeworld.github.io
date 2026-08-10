import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';
import { computeRequiredHatchKos } from '../src/domain/breeding/hatchery-rules.js';

// ── Phase 31 — beta: fair day-care auto-fill ────────────────────────────────
//  User request: auto-fill must serve EMPTY SLOTS first
//  (FIFO draining of existing queues before any re-dealing), then fill the
//  queues ROUND-ROBIN: 1st element of each queue, then 2nd of each queue…
//  No more a slot + its queue full while another slot of the same mode is empty.
const HATCHERY = fs.readFileSync(new URL('../src/application/breeding/hatchery.js', import.meta.url), 'utf8');

function fakeNode() {
  return {
    innerHTML: '', textContent: '', value: '',
    replaceChildren() { this.innerHTML = ''; },
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
        sort: 'dex', // deterministic candidate order for tests (ascending id)
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
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle (hatchery ESM = bundle isolé, globales via shim).
  vm.runInContext(
    harnessIsEsm(HATCHERY) ? harnessBundleSource(['src/application/breeding/hatchery.js']) : HATCHERY,
    sandbox, { filename: 'hatchery.js' }
  );
  return sandbox;
}

// Utility: N Pokémon (ascending ids, chosen level) in the collection.
function seedCollection(env, startId, count, level = 50) {
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    env.G.collection['b' + id] = { id, level, uid: 'u' + id, name: 'P' + id, ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} };
  }
}

test('phase 31: empty slots served first, queues filled in strict round-robin', () => {
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
  // The 4 slots are ALL filled (rank 0 of each queue), in candidate order
  for (let i = 0; i < 4; i++) {
    assert.ok(env.G.hatchery[i], `slot ${i} rempli`);
    assert.equal(env.G.hatchery[i].poke.id, 10 + i, `slot ${i} = candidat #${i}`);
  }
  // Remainder: PERFECTLY balanced queues (2 each) and interleaved by rank
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u14', 'u18']);
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u15', 'u19']);
  assert.deepEqual([...env.G.hatcheryQueues[2]], ['u16', 'u20']);
  assert.deepEqual([...env.G.hatcheryQueues[3]], ['u17', 'u21']);
});

test('phase 31: a free slot receives the FIRST new candidate (not the tail behind another\'s queue)', () => {
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
  assert.equal(env.G.hatchery[1].poke.uid, 'u4', 'the empty slot is served by the first fresh candidate');
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u1', 'u5'], 'the occupied slot\'s queue only received rank 1');
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u6'], 'the next rank stays on the served slot');
});

test('phase 31: existing queues are never reordered (appends only at the end)', () => {
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
  // Occupied slots: queues only completed, never touched at the head
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u1', 'u2', 'u4'], 'head and middle intact, append at the end');
  assert.deepEqual([...env.G.hatcheryQueues[1]], ['u9', 'u3'], 'same for the other queue');
});

test('phase 31: PERFECTLY balanced queues with enlarged queue (cap 6)', () => {
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

test('phase 31: fossils and Incubation priority preserved by round-robin (1 fossil = 1 single spot)', () => {
  const env = makeEnv({ G: {
    hatcheryModes: ['breed', 'breed'],
    hatcheryQueues: [[], []],
    hatchery: [null, null],
  } });
  env.G.automation.autoSeedHatchery = true;
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.hatcheryAutomation.slots[1].priority = 'fossil';
  env.G.inventory = { helix_fossil: 1 }; // ONE single unit for TWO fossil-prioritized slots
  env.processHatcheryQueue();
  const inQueues = env.G.hatcheryQueues.flat().filter((e) => e === 'fossil:helix_fossil').length;
  const inSlots = env.G.hatchery.filter((s) => s && s.isFossil && s.fossilKey === 'helix_fossil').length;
  assert.ok(inQueues + inSlots <= 1, 'the unique copy exists in exactly ONE place');
  assert.equal(inSlots, 1, 'the first fossil-prioritized slot was served');
  assert.equal((env.G.inventory.helix_fossil || 0) + inQueues + inSlots, 1, 'conservation du stock');
});

test('phase 31: source contract — drain before restock, per-rank loop, exports', () => {
  const src = HATCHERY;
  const proc = src.slice(src.indexOf('function processHatcheryQueue'));
  const idxSanitize = proc.indexOf('sanitizeHatcheryFossilQueues() > 0');
  const idxDrain1 = proc.indexOf('drainHatcheryQueuesIntoSlots()) changed = true');
  const idxRefill = proc.indexOf('const added = refillHatcheryQueueFromRules();');
  const idxDrain2 = proc.lastIndexOf('drainHatcheryQueuesIntoSlots()) changed = true');
  assert.ok(idxSanitize !== -1 && idxDrain1 > idxSanitize, 'drain after the sanitize');
  assert.ok(idxRefill > idxDrain1, 'restock AFTER the first drain (empty slots first)');
  assert.ok(idxDrain2 > idxRefill, 'second drain AFTER the restock (slots served before their queues are stacked)');
  assert.ok(src.includes('for (let rank = 0; rank < cap; rank++)'), 'per-rank loop in the restock');
  assert.ok(src.includes('q.length !== rank'), 'restocks: never mid-queue');
  assert.ok(src.includes('window.drainHatcheryQueuesIntoSlots'), 'helper exported');
});

