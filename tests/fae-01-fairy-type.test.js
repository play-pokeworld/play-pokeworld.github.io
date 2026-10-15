import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { TYPE_CHART, typeEffect } from '../src/domain/battle/type-system.js';
import { MOVES } from '../src/data/moves.js';

// ── V7 · P0a · FAE-01 — the Fairy type exists from the START of the game ─────
// Decision D15: no "Fairy arrives with Kalos". The engine and the species
// data already carry the type; these tests FREEZE that state so no later
// pass (P7 Kalos, P8 megas) can regress it — and they pin the ONE type chart.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

// The 18 Gen 1–3 species retyped Fairy in X/Y (official), as the game has them.
const FAIRY_SPECIES = {
  35: ['Fairy', ''], 36: ['Fairy', ''], 39: ['Normal', 'Fairy'], 40: ['Normal', 'Fairy'],
  122: ['Psychic', 'Fairy'], 173: ['Fairy', ''], 174: ['Normal', 'Fairy'], 175: ['Fairy', ''], 176: ['Fairy', 'Flying'],
  183: ['Water', 'Fairy'], 184: ['Water', 'Fairy'], 209: ['Fairy', ''], 210: ['Fairy', ''],
  280: ['Psychic', 'Fairy'], 281: ['Psychic', 'Fairy'], 282: ['Psychic', 'Fairy'], 298: ['Normal', 'Fairy'], 303: ['Steel', 'Fairy'],
};

function loadPD() {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(R('src/data/pd-data.js'), sandbox, { filename: 'pd-data.js' });
  return sandbox.PD;
}

test('FAE-01 — the 18 Gen 1–3 Fairy species are typed Fairy in PD (frozen list)', () => {
  const PD = loadPD();
  for (const [id, [t1, t2]] of Object.entries(FAIRY_SPECIES)) {
    const d = PD[Number(id)];
    assert.ok(d, `PD[${id}] exists`);
    const types = [d[1], d[2]];
    assert.ok(types.includes('Fairy'), `#${id} ${d[0]} must have the Fairy type (got ${types.join('/')})`);
    assert.deepEqual(types, [t1, t2], `#${id} ${d[0]} typing`);
  }
  // Exactly 18 Fairy species among the base dex 1–386 (forms excluded).
  let count = 0;
  for (let id = 1; id <= 386; id++) { const d = PD[id]; if (d && (d[1] === 'Fairy' || d[2] === 'Fairy')) count++; }
  assert.equal(count, 18);
});

test('FAE-01 — the domain chart has 18 types and the official Fairy row + column', () => {
  assert.equal(Object.keys(TYPE_CHART).length, 18);
  assert.deepEqual(Object.keys(TYPE_CHART).sort(), [...TYPES].sort());
  // Fairy attacking:
  assert.deepEqual(TYPE_CHART.Fairy, { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 });
  // Fairy defending (column):
  const column = Object.fromEntries(TYPES.map((atk) => [atk, TYPE_CHART[atk]?.Fairy ?? 1]));
  assert.deepEqual(column, {
    Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0.5, Poison: 2, Ground: 1, Flying: 1,
    Psychic: 1, Bug: 0.5, Rock: 1, Ghost: 1, Dragon: 0, Dark: 0.5, Steel: 2, Fairy: 1,
  });
  // Acceptance: Fée > Dragon — Draco Meteor on Gardevoir does nothing, Moonblast on a Dragon hits ×2.
  assert.equal(typeEffect('Dragon', 'Psychic', 'Fairy'), 0);
  assert.equal(typeEffect('Fairy', 'Dragon', 'Flying'), 2);
  assert.equal(typeEffect('Fairy', 'Dark', 'Fighting'), 4);
});

test('FAE-01 — 22 Fairy moves and the `fairy` learn pool exist in MOVES', () => {
  const fairyMoves = Object.values(MOVES).filter((m) => m.type === 'Fairy');
  assert.equal(fairyMoves.length, 22);
  const pooled = Object.values(MOVES).filter((m) => Array.isArray(m.moveset) && m.moveset.includes('fairy'));
  assert.ok(pooled.length >= 20, `fairy pool: ${pooled.length}`);
  for (const key of ['moonblast', 'dazzling_gleam', 'play_rough', 'draining_kiss']) {
    assert.ok(MOVES[key] && MOVES[key].type === 'Fairy', `${key} is a Fairy move`);
  }
});

test('FAE-01 — the live battle chart (classic bridge → window.typeEff) IS the domain chart', () => {
  const bridge = R('src/engine/runtime/classic-bridge.js');
  assert.match(bridge, /import \{ TYPE_CHART as DOMAIN_TYPE_CHART \} from '\.\.\/\.\.\/domain\/battle\/type-system\.js'/);
  assert.doesNotMatch(bridge, /Fairy:\{Fire:\.5/, 'no literal chart copy left in the bridge');
  // Functional check: evaluate the bridge in a real DOM (jsdom) and compare cell by cell.
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  const sandbox = dom.getInternalVMContext();
  sandbox.G = {}; sandbox.battle = {};
  vm.runInContext(harnessBundleSource(['src/engine/runtime/classic-bridge.js']), sandbox, { filename: 'classic-bridge [iife]' });
  const live = sandbox.PokeWorldDomain && sandbox.PokeWorldDomain.typeSystem;
  assert.ok(live && live.TYPE_CHART, 'window.PokeWorldDomain.typeSystem.TYPE_CHART exposed');
  const diffs = [];
  for (const atk of TYPES) for (const def of TYPES) {
    const a = TYPE_CHART[atk]?.[def] ?? 1;
    const b = live.TYPE_CHART[atk]?.[def] ?? 1;
    if (a !== b) diffs.push(`${atk}→${def}: domain=${a} live=${b}`);
  }
  assert.deepEqual(diffs, [], 'the two charts must be identical cell by cell');
  // The 7 cells that were wrong in the old bridge copy, pinned explicitly.
  assert.equal(live.typeEffect('Ice', 'Fire'), 0.5);
  assert.equal(live.typeEffect('Ice', 'Steel'), 0.5);
  assert.equal(live.typeEffect('Ice', 'Fighting'), 1);
  assert.equal(live.typeEffect('Ice', 'Rock'), 1);
  assert.equal(live.typeEffect('Ghost', 'Fighting'), 1);
  assert.equal(live.typeEffect('Ghost', 'Dark'), 0.5);
  assert.equal(live.typeEffect('Bug', 'Poison'), 0.5);
  assert.equal(live.typeEffect('Dragon', 'Fairy'), 0);
});

test('FAE-01 — UI surface: CSS token, type icon and FR/EN labels for Fairy', () => {
  const css = fs.readdirSync(new URL('../src/assets/css', import.meta.url)).map((f) => R(`src/assets/css/${f}`)).join('\n')
    + fs.readdirSync(new URL('../src/assets/styles', import.meta.url)).map((f) => R(`src/assets/styles/${f}`)).join('\n');
  assert.match(css, /--type-fairy/);
  assert.match(R('src/data/ui-icons.js'), /type_fairy/);
  assert.match(R('src/localization/fr/types.js'), /"fairy"\s*:\s*"Fée"/);
  assert.match(R('src/localization/en/types.js'), /"fairy"\s*:\s*"Fairy"/);
});
