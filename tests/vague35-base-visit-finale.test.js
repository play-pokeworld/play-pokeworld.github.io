import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Wave 35: user feedback — SECRET BASE THROUGH-LINE FINALE ───────────────
//  N1. GUIDANCE: after establishing, the game now TELLS the player how to
//      enter (toast: "Appuyez sur Visiter … ou « Entrer dans ma base »").
//      Before: the window's "Visiter" toggle was the only entry, never
//      mentioned anywhere ("on ne m'a jamais dit d'appuyer sur visiter").
//  N2. DIRECT ENTRY: the Location window of the base's OWN route renders a
//      real "Entrer dans ma base" button (was: plain text "Votre base ✓"
//      with no way in). Wired to the new engine action baseWindowVisitOwnBase.
//  N3. ORIENTATION: browsing OTHER routes, the panel states where the base
//      is ("établie ailleurs (Route X) — rendez-vous sur place").
//  N4. FURNISHING FINALE: placing the 26th item celebrates ONCE (persisted
//      flag) with a solemn fanfare toast inviting to visit the finished base.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ——— N1 — guidance after establishing —————————————————————————————————————
test('wave 35 N1: establishing the base TELLS the player how to enter', () => {
  const win = R('src/ui/game/base/base-window.js');
  const est = win.slice(win.indexOf('function baseWindowEstablishRouteLayout'), win.indexOf('function baseWindowGetRouteAlcoves') === -1 ? win.length : undefined);
  assert.ok(est.includes('établie sur cette route'), 'establishment toast kept (existing string, untouched)');
  assert.ok(est.includes('Appuyez sur Visiter'), 'FR guidance toast: press Visiter');
  assert.ok(est.includes('Entrer dans ma base'), 'FR guidance mentions the Location-window entry');
  assert.ok(est.includes('Press Visiter (Base window)'), 'EN guidance toast');
  assert.ok(est.includes("var(--yellow)"), 'guidance rendered as a distinct hint colour');
});

// ——— N2 — direct "enter my base" at the base's own route ——————————————————
test('wave 35 N2: the current alcove row offers a REAL enter button', () => {
  const view = R('src/ui/components/map-dressing.js');
  const currentRow = view.slice(view.indexOf('r.current'), view.indexOf('r.current') + 900);
  assert.ok(currentRow.includes("call: 'baseWindowVisitOwnBase'"), 'current row dispatches baseWindowVisitOwnBase');
  assert.ok(currentRow.includes('enterLabel'), 'label flows from the model');
  const model = R('src/ui/game/location-info.js');
  assert.ok(model.includes("bEn ? 'Enter my base' : 'Entrer dans ma base'"), 'model carries the FR/EN enter label');
  const win = R('src/ui/game/base/base-window.js');
  assert.ok(win.includes('function baseWindowVisitOwnBase'), 'action implemented');
  assert.ok(win.includes("PokeActions.register('baseWindowVisitOwnBase', baseWindowVisitOwnBase)"),
    'canonical export: engine action registry');
});

// ——— N3 — spatial orientation from other routes ————————————————————————————
test('wave 35 N3: other routes state WHERE the base is', () => {
  const model = R('src/ui/game/location-info.js');
  assert.ok(model.includes('établie ailleurs'), 'FR: established elsewhere');
  assert.ok(model.includes("getLocName(baseHere)"), 'names the base route');
  assert.ok(model.includes('rendez-vous sur place pour la visiter'), 'FR: travel-there guidance');
  assert.ok(model.includes('established elsewhere'), 'EN variant');
});

// ——— N4 — furnishing finale (text locks) ——————————————————————————————————
test('wave 35 N4: 26th item triggers the solemn finale, once', () => {
  const ed = R('src/ui/game/base/base-editor.js');
  assert.ok(ed.includes('function baseEditorCelebrateIfFurnished'), 'ceremony helper exists');
  assert.ok(ed.includes('st.furnishCelebrated'), 'persisted once-flag');
  assert.ok(ed.includes('BASE_ITEM_MAX_PLACED'), 'canonical cap (26, ROSA)');
  assert.ok(ed.includes('entièrement meublée'), 'FR fanfare text');
  assert.ok(ed.includes('fully furnished'), 'EN fanfare text');
  assert.ok(ed.includes('baseEditorCelebrateIfFurnished(st);'), 'called after a successful placement');
});

// ——— N4 sim — the ceremony gate runs exactly once at the cap ———————————————
function makeEditorSandbox() {
  const notes = [];
  const saves = { n: 0 };
  const sandbox = {
    console, window: {},
    G: { lang: 'fr' },
    notify: (msg, color) => notes.push({ msg, color }),
    saveGame: () => { saves.n++; },
    t: (k) => k, tr: (k) => k,
    setTimeout: (cb) => setTimeout(cb, 0), clearTimeout() {},
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // T2-D: bundled IIFE (base-items-data.js is a REAL ES module since wave 36)
  vm.runInContext(harnessBundleSource(['src/data/base-items-data.js', 'src/ui/game/base/base-editor.js']), sandbox, { filename: 'vague35-editor [iife]' });
  return { sandbox, notes, saves };
}

test('wave 35 N4 sim: ceremony fires ONCE at 26/26, never before', () => {
  const { sandbox, notes, saves } = makeEditorSandbox();
  const nonAuto = (sandbox.BASE_ITEMS || []).filter((d) => d && d.acq !== 'auto').map((d) => d.s).slice(0, 26);
  assert.equal(nonAuto.length, 26, 'catalogue provides >= 26 non-auto items');
  // 25 items → nothing
  const st25 = { items: nonAuto.slice(0, 25).map((s, i) => ({ uid: i + 1, s, x: 0, y: 0, rot: 0 })) };
  vm.runInContext('baseEditorCelebrateIfFurnished', sandbox); // global presence
  sandbox.baseEditorCelebrateIfFurnished(st25);
  assert.equal(st25.furnishCelebrated, undefined, 'no celebration at 25/26');
  assert.equal(notes.length, 0, 'silent before the cap');
  // 26 items → exactly one fanfare
  const st26 = { items: nonAuto.map((s, i) => ({ uid: i + 1, s, x: 0, y: 0, rot: 0 })) };
  sandbox.baseEditorCelebrateIfFurnished(st26);
  assert.equal(st26.furnishCelebrated, 1, 'flag persisted in the base state');
  assert.equal(notes.length, 1, 'exactly one toast');
  assert.ok(notes[0].msg.includes('entièrement meublée'), 'FR fanfare delivered');
  assert.equal(notes[0].color, 'var(--yellow)', 'solemn colour');
  assert.equal(saves.n, 1, 'state saved');
  sandbox.baseEditorCelebrateIfFurnished(st26);
  assert.equal(notes.length, 1, 'never twice');
});

// ——— N2 sim — direct entry works, and refuses politely without a base ——————
const FULL_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/application/game-state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/application/base/base-core.js',
  'src/ui/game/base/base-visit.js',
  'src/ui/game/base/base-exchange.js',
  'src/ui/game/base/base-editor.js',
  'src/ui/game/base/base-window.js',
];

function makeFullSandbox() {
  const notes = [];
  const store = new Map();
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      head: { dataset: {} },
      documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      getElementById: () => ({
        style: {}, dataset: {}, hidden: false, disabled: false, value: '', textContent: '', innerHTML: '', options: [],
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        appendChild(c) { this.options.push(c); return c; }, addEventListener() {}, setAttribute() {}, remove() {},
        querySelector: () => null, querySelectorAll: () => [], getContext: () => null,
      }),
      querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, children: [], appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, addEventListener() {} }),
      addEventListener() {}, removeEventListener() {},
    },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() },
    navigator: { language: 'fr' },
    location: { href: 'http://localhost/', reload() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, addListener() {} }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    setInterval: () => 1, clearInterval() {}, setTimeout: (cb) => setTimeout(cb, 0), clearTimeout() {},
    notify: (msg, color) => notes.push({ msg, color }),
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // T2-D: same files, SAME order — bundled IIFE keeps vm parity AND tolerates ESM converts
  vm.runInContext(harnessBundleSource(FULL_FILES), sandbox, { filename: 'vague35-base [iife]' });
  // The classic bridge defines its own window.notify (DOM toasts) during eval —
  // re-assign the spy AFTER the files so calls land in the collector.
  sandbox.notify = (msg, color) => notes.push({ msg, color });
  return { sandbox, notes };
}

test('wave 35 N2 sim: baseWindowVisitOwnBase — polite refusal, then real visit', () => {
  const { sandbox, notes } = makeFullSandbox();
  sandbox.G = null; // force baseWindowState() empty path
  // no save loaded → window-level guard: state missing → silent return (no crash)
  sandbox.baseWindowVisitOwnBase();
  // now a real established base
  const s2 = makeFullSandbox();
  s2.sandbox.G.region = 'hoenn'; s2.sandbox.G.location = 'route111'; s2.sandbox.G.unlockedSecretBaseHoenn = true;
  const st = s2.sandbox.baseCreateDefault();
  s2.sandbox.G.base = st;
  // no layout yet → polite refusal
  s2.sandbox.baseWindowVisitOwnBase();
  assert.ok(s2.notes.some((n) => n.msg.includes('pas encore de Base Secrète')), 'refusal explains how to settle');
  // settle, then enter — the visit session derives from the PLAYER base
  s2.sandbox.baseRelocate(st, 'cave_1');
  st.routeId = 'route111';
  s2.sandbox.baseWindowVisitOwnBase();
  const ed = s2.sandbox.baseEditorGet();
  assert.equal(ed.mode, 'visit', 'visit mode active');
  assert.equal(ed.visitOwn, true, 'own-base session (not a temporary empty alcove)');
  assert.equal(ed.visit.st.layoutId, 'cave_1', 'the session derives from the PLAYER base layout');
  assert.ok(s2.notes.some((n) => String(n.msg).includes('ta propre base')), 'entry toasted (canonical FR welcome)');
});

