import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── V7 · P0a — LNT-01 (no-undef everywhere) · OBS-01 (see the errors) ─────────

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ───────────────────────────── LNT-01 ────────────────────────────────────────

test('LNT-01 — eslint.config.js keeps `no-undef: error` on the whole src/ tree (no override block)', () => {
  const cfg = R('eslint.config.js');
  assert.match(cfg, /'no-undef':\s*'error'/);
  assert.doesNotMatch(cfg, /'no-undef':\s*'off'/, 'no file group may switch no-undef off');
  assert.doesNotMatch(cfg, /'src\/data\/\*\*'/, 'src/data is linted too');
  assert.match(cfg, /src-globals\.json/, 'the generated globals list is the source of the game surface');
});

test('LNT-01 — tools/src-globals.json is generated, sorted, and contains the classic surface', () => {
  const list = JSON.parse(R('tools/src-globals.json'));
  assert.ok(Array.isArray(list) && list.length > 2000, `expected > 2000 symbols, got ${list.length}`);
  const sorted = [...list].sort();
  assert.deepEqual(list, sorted, 'list is sorted (deterministic regeneration)');
  for (const sym of ['startLegendaryEncounter', 'createPoke', 'claimQuest', 'rollShiny', 'renderLocInfo', 'cancelBoxSwap', 'pwReportError', 'unlockTalentForSpecies']) {
    assert.ok(list.includes(sym), `${sym} must be on the surface`);
  }
  for (const ghost of ['renderLocationInfo', 'getPokeEmoji', 'cancelBoxSwapX', 'unlockSpeciesHiddenAbility', 'MOVE_DESCRIPTIONS', 'getItemSource']) {
    assert.ok(!list.includes(ghost), `${ghost} never existed and must not be whitelisted`);
  }
});

test('LNT-01 — npm test runs the linter (rule 2: eslint is part of npm test)', () => {
  const pkg = JSON.parse(R('package.json'));
  assert.match(pkg.scripts.test, /npm run lint/);
  assert.match(pkg.scripts.lint, /eslint \./);
  assert.match(pkg.scripts.lint, /gen-src-globals\.mjs/);
});

test('LNT-01 — the 15 phantom references are gone from the sources', () => {
  assert.doesNotMatch(R('src/application/combat/battle-encounter.js'), /rollShiny\(enemy\.id\)/);
  assert.doesNotMatch(R('src/ui/game/quest-ui.js'), /renderLocationInfo\(/);
  assert.doesNotMatch(R('src/ui/game/box-selector.js'), /getPokeEmoji/);
  assert.doesNotMatch(R('src/ui/game/poke-modal.js'), /MOVE_DESCRIPTIONS/);
  assert.doesNotMatch(R('src/data/items-helpers.js'), /getItemSource\(/);
  assert.doesNotMatch(R('src/application/save/save-extras.js'), /unlockSpeciesHiddenAbility/);
  assert.match(R('src/ui/game/box-ui.js'), /function cancelBoxSwap\(\)/);
  assert.match(R('src/engine/resources/ResourceManager.js'), /for \(const \[url, entry\] of this\._cache\)/);
  assert.match(R('src/engine/core/Input.js'), /this\._addHandler\('pointerup', selector, \(_e, el\)/);
});

// ───────────────────────────── OBS-01 ────────────────────────────────────────

async function freshDiag() {
  // Each import gets its own module instance via a cache-busting query.
  const mod = await import(`../src/application/diagnostics.js?t=${Date.now()}-${Math.random()}`);
  return mod;
}

test('OBS-01 — pwReportError records message, truncated stack, context and build in G.diag.errors', async () => {
  const diag = await freshDiag();
  globalThis.G = { region: 'kanto', lang: 'fr', team: [], collection: {} };
  globalThis.PW_BUILD = 'test-build';
  diag.clearDiagErrors();
  const err = new Error('boom claimQuest');
  const entry = diag.pwReportError(err, { action: 'claimQuest', qid: 31 });
  assert.ok(entry);
  assert.equal(globalThis.G.diag.errors.length, 1);
  assert.equal(entry.msg, 'Error: boom claimQuest');
  assert.equal(entry.build, 'test-build');
  assert.match(entry.ctx, /claimQuest/);
  assert.ok(entry.stack.length <= diag.DIAG_STACK_MAX);
  assert.ok(typeof entry.t === 'number' && entry.t > 0);
  // Same Error object reported twice (explicit call + window.onerror) → counted once.
  assert.equal(diag.pwReportError(err, 'window.onerror'), null);
  assert.equal(globalThis.G.diag.errors.length, 1);
  delete globalThis.G;
});

test('OBS-01 — the ring keeps only the last 50 errors', async () => {
  const diag = await freshDiag();
  globalThis.G = {};
  for (let i = 0; i < 70; i++) diag.pwReportError(`e${i}`, 'loop');
  assert.equal(globalThis.G.diag.errors.length, diag.DIAG_MAX_ERRORS);
  assert.equal(globalThis.G.diag.errors[0].msg, 'e20');
  assert.equal(globalThis.G.diag.errors.at(-1).msg, 'e69');
  delete globalThis.G;
});

test('OBS-01 — errors raised before G exists are flushed into G.diag when it appears', async () => {
  const diag = await freshDiag();
  delete globalThis.G;
  diag.pwReportError(new TypeError('early boot failure'), 'boot');
  assert.equal(diag.getDiagErrors().length, 1);
  globalThis.G = {};
  diag.ensureDiag();
  assert.equal(globalThis.G.diag.errors.length, 1);
  assert.equal(globalThis.G.diag.errors[0].msg, 'TypeError: early boot failure');
  delete globalThis.G;
});

test('OBS-01 — the global hooks (error + unhandledrejection) feed the report', async () => {
  const diag = await freshDiag();
  globalThis.G = {};
  const listeners = {};
  const fakeWindow = { addEventListener: (type, fn) => { listeners[type] = fn; } };
  assert.equal(diag.installGlobalErrorHooks(fakeWindow), true);
  assert.equal(diag.installGlobalErrorHooks(fakeWindow), false, 'installed once');
  listeners.error({ error: new ReferenceError('enemy is not defined'), message: 'x' });
  listeners.error({ error: null, message: 'Script error', filename: 'pw-bundle.js', lineno: 12, colno: 3 });
  listeners.unhandledrejection({ reason: new Error('rejected promise') });
  const msgs = globalThis.G.diag.errors.map((e) => e.msg);
  assert.deepEqual(msgs, ['ReferenceError: enemy is not defined', 'Script error @ pw-bundle.js:12:3', 'Error: rejected promise']);
  assert.equal(globalThis.G.diag.errors[0].ctx, 'window.onerror');
  assert.equal(globalThis.G.diag.errors[2].ctx, 'unhandledrejection');
  const report = diag.buildErrorReport();
  assert.match(report, /enemy is not defined/);
  assert.match(report, /erreurs: 3/);
  delete globalThis.G;
});

test('OBS-01 — acceptance: a deliberate exception inside claimQuest (dispatched action) appears in the report', async () => {
  const diag = await freshDiag();
  const sandbox = {
    console, G: {},
    pwReportError: diag.pwReportError,
    document: { addEventListener: () => {}, querySelectorAll: () => [], getElementById: () => null, body: { addEventListener: () => {} } },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/engine/input/action-dispatcher.js']), sandbox, { filename: 'action-dispatcher [iife]' });
  assert.equal(typeof sandbox.callGlobal, 'function');
  sandbox.claimQuest = () => { throw new Error('claimQuest exploded on purpose'); };
  globalThis.G = sandbox.G;
  assert.throws(() => sandbox.callGlobal('claimQuest', 31, 'main'), /exploded on purpose/, 'behaviour unchanged: the error still propagates');
  const errs = diag.getDiagErrors();
  assert.equal(errs.length, 1);
  assert.equal(errs[0].msg, 'Error: claimQuest exploded on purpose');
  assert.match(errs[0].ctx, /"action":"claimQuest"/);
  assert.match(diag.buildErrorReport(), /claimQuest exploded on purpose/);
  delete globalThis.G;
});

test('OBS-01 — Settings modal exposes the « Copier le rapport d\'erreurs » button (FR + EN keys)', () => {
  const view = R('src/ui/views/SettingsModalView.js');
  assert.match(view, /call: 'copyErrorReport'/);
  assert.match(view, /id: 'diag-section'/);
  const fr = R('src/localization/fr/ui.js');
  const en = R('src/localization/en/ui.js');
  for (const k of ['diag_title', 'diag_copy_report', 'diag_errors_count', 'diag_report_copied', 'diag_report_copy_failed', 'diag_clear']) {
    assert.match(fr, new RegExp(`"${k}":`), `fr ${k}`);
    assert.match(en, new RegExp(`"${k}":`), `en ${k}`);
  }
  assert.match(R('src/application/save/settings.js'), /diag:/);
  assert.match(R('src/main.js'), /import ['"]\.\/application\/diagnostics\.js['"]/); // V7 · DBT-01 — guillemets simples (Prettier)
});

test('OBS-01 — progression paths log through pwReportError (save/load, puzzle legendary, quest migrations)', () => {
  const save = R('src/application/save/save.js');
  assert.match(save, /pwReportError\(e, 'saveGame'\)/);
  assert.match(save, /pwReportError\(e, 'loadGame'\)/);
  assert.match(R('src/application/world/puzzle-explorations.js'), /puzzle\.legendaryEncounter/);
  const qc = R('src/application/quests/quest-core.js');
  for (const v of ['V2', 'V3', 'V4', 'V5', 'V6']) assert.match(qc, new RegExp(`pwReportError\\(e, 'migrateQuestSave${v}'\\)`));
  assert.match(R('src/engine/input/action-dispatcher.js'), /pwReportError\(err, \{ action: name \}\)/);
});
