import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { computeRequiredHatchKos } from '../src/domain/breeding/hatchery-rules.js';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 12 — day care: fossils in incubation, priority, deferred mode,
// auto-remplissage conditionnel ─────────────────────────────────────────────
const HATCHERY = fs.readFileSync(new URL('../src/application/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/ui/game/hatchery-ui.js', import.meta.url), 'utf8');
const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/ui/game/box-selector.js', import.meta.url), 'utf8');

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
    'usm-title': fakeNode(),
    'usm-grid': fakeNode(),
    'usm-search': { value: '' },
    'usm-subtab-bar': fakeNode(),
    'usm-filter-panel': fakeNode(),
    'usm-footer': fakeNode(),
    'quest-modal': fakeNode(),
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
      hatchery: [null],
      hatcheryMaxSlots: 2,
      hatcheryModes: ['breed', 'exp'],
      hatcheryQueues: [[], []],
      hatcheryAutomation: { slots: [
        { enabled: true, mode: 'breed', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
        { enabled: true, mode: 'exp', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', queue: [] },
      ] },
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
  // Vague 41 — hybride individuelle : classique = texte vm direct ;
  // converti ESM (box-selector, vague 41) = bundle isolé, globales via shim.
  for (const [label, src] of [
    ['src/application/breeding/hatchery.js', HATCHERY],
    ['src/ui/game/box-selector.js', BOX_SELECTOR],
  ]) {
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([label]) : src, sandbox, { filename: label });
  }
  return sandbox;
}

// ── 1. Deferred mode: cannot cancel an incubation ───────────────────────────

test('incubation → day care on occupied slot: change queued', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 3, stepsReq: 50, mode: 'breed' };
  env.toggleHatcherySlotMode(0);
  assert.equal(env.G.hatcheryModes[0], 'breed', 'the mode stays Incubation while the slot is occupied');
  assert.equal(env.G.hatcheryPendingModes[0], 'exp', 'pending change');
  assert.ok(env.notifs.some(([m]) => m.includes('hatchery_mode_deferred')), 'deferred-change notification');
  assert.equal(env.G.hatchery[0].mode, 'breed', 'incubation in progress not altered');
});

test('incubation in progress + switch: the waiting list is emptied right away', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 3, stepsReq: 50, mode: 'breed' };
  env.G.hatcheryQueues = [['u9', 'fossil:helix_fossil'], []];
  env.toggleHatcherySlotMode(0);
  assert.deepEqual([...env.G.hatcheryQueues[0]], [], 'list emptied upon request');
  assert.equal(env.G.hatcheryPendingModes[0], 'exp');
});

test('incubation done + switch: collect (hatch), mode applied, list emptied', () => {
  const env = makeEnv();
  env.G.hatchery[0] = {
    poke: { id: 25, level: 100, uid: 'u1', name: 'POKE_25', ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} },
    steps: 50, stepsReq: 50, mode: 'breed',
  };
  env.G.hatcheryQueues = [['u9'], []];
  env.toggleHatcherySlotMode(0);
  assert.equal(env.G.hatchery[0], null, 'slot emptied by collection');
  assert.ok(env.G.collection['25'], 'the result joins the box (incubation never cancelled)');
  assert.equal(env.G.hatcheryModes[0], 'exp', 'Day care applied immediately');
  assert.equal(env.G.hatcheryAutomation.slots[0].mode, 'exp');
  assert.deepEqual([...env.G.hatcheryQueues[0]], [], 'list emptied');
  assert.equal(env.G.hatcheryPendingModes[0], null, 'no pending change');
});

test('re-clicking the toggle cancels the pending change', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 3, stepsReq: 50, mode: 'breed' };
  env.toggleHatcherySlotMode(0);
  env.toggleHatcherySlotMode(0);
  assert.equal(env.G.hatcheryPendingModes[0], null, 'pending change cancelled');
  assert.equal(env.G.hatcheryModes[0], 'breed');
});

test('the pending change applies when the slot empties (hatch)', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1', name: 'POKE_25', ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 } }, steps: 50, stepsReq: 50, mode: 'breed' };
  env.toggleHatcherySlotMode(0); // set pending
  env.hatchEgg(0);
  assert.equal(env.G.hatchery[0], null, 'slot emptied after hatching');
  assert.equal(env.G.hatcheryModes[0], 'exp', 'Day Care mode applied');
  assert.equal(env.G.hatcheryPendingModes[0], null);
  assert.equal(env.G.hatcheryAutomation.slots[0].mode, 'exp', 'automation config synced');
  assert.ok(env.G.collection['25'], 'the egg joins the box');
});

test('applyPendingHatcheryMode has no effect while the slot is occupied', () => {
  const env = makeEnv();
  env.ensureHatcheryAutomation(); // initialise G.hatcheryPendingModes
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 1, stepsReq: 50, mode: 'breed' };
  env.G.hatcheryPendingModes[0] = 'exp';
  env.applyPendingHatcheryMode(0);
  assert.equal(env.G.hatcheryModes[0], 'breed');
  assert.equal(env.G.hatcheryPendingModes[0], 'exp', 'still pending');
});

test('empty slot: immediate mode change (no pending)', () => {
  const env = makeEnv();
  env.toggleHatcherySlotMode(0); // breed → exp on an empty slot
  assert.equal(env.G.hatcheryModes[0], 'exp');
  assert.equal(env.G.hatcheryPendingModes[0], null);
});

test('day care → incubation on Pokémon < 100: ejected to PC + list emptied, mode switched (phase 14)', () => {
  const env = makeEnv();
  env.G.hatcheryModes[1] = 'exp';
  env.G.hatchery[1] = { poke: { id: 16, level: 50, uid: 'u2', name: 'Roucool' }, steps: 0, stepsReq: 25, mode: 'exp' };
  env.G.hatcheryQueues[1] = ['u9'];
  env.toggleHatcherySlotMode(1);
  assert.equal(env.G.hatcheryModes[1], 'breed', 'the mode flips (no more blocking)');
  assert.equal(env.G.hatchery[1], null, 'slot emptied');
  assert.ok(env.G.collection['16'] && env.G.collection['16'].uid === 'u2', 'Pokémon sent back to the PC');
  assert.equal(env.G.hatcheryQueues[1].length, 0, 'list emptied');
  assert.ok(env.notifs.some(([m]) => m.includes('hatchery_mode_ejected')), 'ejection notification');
});

test('day care → incubation on Lv. 100 Pokémon: conversion kept (legacy behavior)', () => {
  const env = makeEnv();
  env.G.hatcheryModes[1] = 'exp';
  env.G.hatchery[1] = { poke: { id: 25, level: 100, uid: 'u1', name: 'Pikachu' }, steps: 0, stepsReq: 25, mode: 'exp' };
  env.toggleHatcherySlotMode(1);
  assert.equal(env.G.hatcheryModes[1], 'breed');
  assert.ok(env.G.hatchery[1] && env.G.hatchery[1].poke && env.G.hatchery[1].poke.uid === 'u1', 'the Lv. 100 stays and is converted');
  assert.equal(env.G.hatchery[1].mode, 'breed');
});

// ── 2. Fossiles en incubation ───────────────────────────────────────────────

test('sendFossilToHatchery targets the requested slot (slot\'s fossil tab)', () => {
  const env = makeEnv();
  env.sendFossilToHatchery('helix_fossil', 0);
  const slot = env.G.hatchery[0];
  assert.ok(slot && slot.isFossil, 'fossil placed in slot 0');
  assert.equal(slot.fossilKey, 'helix_fossil');
  assert.equal(slot.reviveId, 138);
  assert.equal((env.G.inventory.helix_fossil || 0), 0, 'fossil consumed');
});

test('sendFossilToHatchery without slot: prefers an empty incubation-mode slot', () => {
  const env = makeEnv();
  env.G.hatcheryModes = ['exp', 'breed'];
  env.sendFossilToHatchery('helix_fossil');
  assert.ok(env.G.hatchery[1] && env.G.hatchery[1].isFossil, 'fossil to the incubation slot (index 1)');
  assert.equal(env.G.hatchery[0], null);
});

test('sendFossilToHatchery refuses an occupied slot', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, mode: 'breed' };
  env.sendFossilToHatchery('helix_fossil', 0);
  assert.equal(env.G.hatchery[0].isFossil, undefined, 'nothing is replaced');
  assert.equal(env.G.inventory.helix_fossil, 1, 'fossil not consumed');
  assert.ok(env.notifs.some(([m]) => m.includes('hatchery_full')));
});

test('queued fossil entry: consumed and placed when the slot frees up', () => {
  const env = makeEnv();
  env.G.hatcheryQueues = [['fossil:helix_fossil'], []];
  assert.equal(env.fillHatcherySlotFromQueue(0), true);
  assert.ok(env.G.hatchery[0].isFossil, 'fossil placed');
  assert.equal((env.G.inventory.helix_fossil || 0), 0, 'fossil consumed from the bag');
  assert.equal(env.fillHatcherySlotFromQueue(0), false, 'slot already occupied');
});

test('fossil entry skipped if the fossil is no longer in the bag', () => {
  const env = makeEnv();
  env.G.inventory = {}; // fossil used in the meantime
  env.G.hatcheryQueues = [['fossil:helix_fossil'], []];
  assert.equal(env.fillHatcherySlotFromQueue(0), false);
  assert.equal(env.G.hatchery[0], null);
});

test('cleanHatcheryQueue keeps in-stock fossils, purges depleted ones', () => {
  const env = makeEnv();
  env.G.hatcheryQueues = [['fossil:helix_fossil', 'fossil:root_fossil'], []];
  env.G.inventory = { helix_fossil: 1 }; // root exhausted
  env.cleanHatcheryQueue(0);
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['fossil:helix_fossil']);
});

// ── 3. Pokémon / Fossil priority ────────────────────────────────────────────

test('priority toggle: Pokémon ↔ Fossil flip', () => {
  const env = makeEnv();
  assert.equal(env.hatcherySlotPriority(0), 'pokemon');
  env.toggleHatcherySlotPriority(0);
  assert.equal(env.hatcherySlotPriority(0), 'fossil');
  env.toggleHatcherySlotPriority(0);
  assert.equal(env.hatcherySlotPriority(0), 'pokemon');
});

test('FIFO: with Fossil priority, a Pokémon already at the head goes first', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.G.hatcheryQueues = [['u1', 'fossil:helix_fossil'], []];
  env.fillHatcherySlotFromQueue(0);
  assert.ok(env.G.hatchery[0].poke, 'the leading Pokémon goes (not the fossil)');
});

test('FIFO: fossil at the head → the fossil goes, even with Pokémon priority', () => {
  const env = makeEnv();
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.G.hatcheryQueues = [['fossil:helix_fossil', 'u1'], []];
  env.fillHatcherySlotFromQueue(0);
  assert.ok(env.G.hatchery[0].isFossil, 'the leading fossil goes');
  assert.ok(!env.G.hatcheryQueues[0].includes('fossil:helix_fossil'), 'entry consumed');
  assert.ok(env.G.hatcheryQueues[0].includes('u1'), 'the Pokémon stays behind');
});

test('restock: Fossil priority fills the list with fossils (no Pokémon)', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.inventory = { helix_fossil: 2 };
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.refillHatcheryQueueFromRules();
  const q = [...env.G.hatcheryQueues[0]];
  assert.deepEqual(q, ['fossil:helix_fossil', 'fossil:helix_fossil', 'u1'],
    'fossils first, then the fallback Pokémon to complete');
  assert.equal(env.G.hatcheryAutomation.slots[0].priority, 'fossil', 'no flip (the preferred one served)');
});

test('restock: Fossil priority exhausted → Pokémon fallback + toggle flips', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.inventory = {}; // no fossil left
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.refillHatcheryQueueFromRules();
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u1']);
  assert.equal(env.G.hatcheryAutomation.slots[0].priority, 'pokemon', 'the toggle flips');
});

test('restock: a new fossil takes the list\'s TAIL, never the head', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.hatcheryQueues = [['u1', 'u2'], []]; // two Pokémon already queued
  env.G.collection = {
    b1: { id: 25, level: 100, uid: 'u1', name: 'A' },
    b2: { id: 26, level: 100, uid: 'u2', name: 'B' },
  };
  env.G.inventory = { helix_fossil: 1 };
  env.refillHatcheryQueueFromRules();
  const q = [...env.G.hatcheryQueues[0]];
  assert.deepEqual(q, ['u1', 'u2', 'fossil:helix_fossil'], 'fossil added at the end');
});

test('restock: a slot with a pending mode change is not fed', () => {
  const env = makeEnv();
  env.ensureHatcheryAutomation();
  env.G.hatcheryPendingModes[0] = 'exp';
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.refillHatcheryQueueFromRules();
  assert.equal(env.G.hatcheryQueues[0].length, 0, 'no entry added while waiting');
});

// ── 4. Auto-remplissage conditionnel ────────────────────────────────────────

test('processHatcheryQueue without activation: nothing fills (neither slot nor queue)', () => {
  const env = makeEnv();
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  const changed = env.processHatcheryQueue();
  assert.equal(changed, false);
  assert.equal(env.G.hatchery[0], null, 'slot stayed empty');
  assert.equal(env.G.hatcheryQueues[0].length, 0, 'queue stayed empty');
  assert.equal(env.G.inventory.helix_fossil, 1, 'fossil not consumed');
});

test('processHatcheryQueue with activation: the incubation slot fills', () => {
  const env = makeEnv();
  env.G.automation.autoSeedHatchery = true;
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.processHatcheryQueue();
  assert.ok(env.G.hatchery[0], 'slot rempli');
});

test('contrat : renderHatcheryWindow et addPokemonToHatcheryQueue ne forcent plus le remplissage', () => {
  const render = HATCHERY_UI.match(/function renderHatcheryWindow\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(render, 'renderHatcheryWindow found');
  assert.ok(!/processHatcheryQueue\(true\)/.test(render[0]), 'no more forced call in renderHatcheryWindow');
  assert.ok(/processHatcheryQueue\(\)/.test(render[0]), 'unforced call kept');
  const add = HATCHERY.match(/function addPokemonToHatcheryQueue\(boxId[\s\S]*?\n\}/);
  assert.ok(add, 'addPokemonToHatcheryQueue found');
  assert.ok(!/processHatcheryQueue\(true\)/.test(add[0]), 'no more forced call in addPokemonToHatcheryQueue');
});

// ── 5. Selector: fossil tab for incubation slots ────────────────────────────

test('contract: the fossil tab is offered for hatchery_queue_N in incubation mode', () => {
  assert.ok(/startsWith\('hatchery_queue_'\)[\s\S]{0,200}hatcherySlotIsIncubation/.test(BOX_SELECTOR), 'showFossilTab extended');
  assert.ok(/_fossilSlotArg/.test(BOX_SELECTOR), 'the Incubate button passes the target slot');
});

test('selector of an incubation slot with Fossil priority: opens the fossils tab', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  vm.runInContext('closeFullscreenPanel = function(){}; closeBattleSummary = function(){};', env);
  env.openUnifiedSelectorModal('hatchery_queue_0');
  assert.equal(env._usmSubTab, 'fossil', 'fossil tab by default');
  assert.ok(env.nodes['usm-grid'].innerHTML.includes('fossil-card'), 'fossil grid shown');
});

