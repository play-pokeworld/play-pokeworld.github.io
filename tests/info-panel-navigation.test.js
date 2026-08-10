import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { moveButtonsBarHTML } from '../src/ui/components/move-buttons.js';
import { InfoPanelView } from '../src/ui/views/InfoPanelView.js';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Contracts of the info panels' contextual navigation (phase 4) ──────────
const PREFLIGHT = [fs.readFileSync(new URL('../src/engine/input/action-dispatcher.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../src/engine/runtime/classic-bridge.js', import.meta.url), 'utf8')].join('\n');
const POKE_MODAL = fs.readFileSync(new URL('../src/ui/game/poke-modal.js', import.meta.url), 'utf8');

function extract(name) {
  // Vague 38 (T2-C) : les aides sont désormais des DÉCLARATIONS du pont
  // (exposition gardée à part) — même intention : trancher la fonction réelle.
  const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}');
  const m = PREFLIGHT.match(re);
  assert.ok(m, `extraction de ${name} impossible`);
  return m[0];
}

// Brings together builder + label + back in a vm context with a minimal DOM stub.
function makeEnv() {
  const calls = [];
  const classes = new Set(['open']);
  const fakeModal = { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: (c) => classes.has(c) } };
  const sandbox = {
    console,
    calls,
    fakeModal,
    window: {
      _pwInfoSource: null,
      // Since wave 9, pwBuildInfoPanel delegates its shell to the ECS
      // InfoPanelView — the real view is injected (DOM-free).
      PokeUI: { views: { InfoPanelView } },
      PW_FS_BACK_KEYS: {
        inventory: 'back_to_inventory', shop: 'back_to_shop', market: 'back_to_market',
        pokedex: 'back_to_pokedex', dictionary: 'back_to_dictionary', guide: 'back_to_guide', atoll: 'back_to_atoll',
      },
    },
    document: { getElementById: (id) => (id === 'poke-modal' ? fakeModal : null) },
    callGlobal: (...args) => { calls.push(args); return true; },
    t: (k) => (k.startsWith('back_to_') ? 'LBL_' + k : k),
  };
  sandbox.window.openPokeModal = () => {};
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(
    extract('pwInfoCaptureSource') + '\n' + extract('pwInfoBackLabel') + '\n' + extract('pwBuildInfoPanel') + '\n' + extract('pwInfoBack')
      + '\nwindow.pwInfoCaptureSource = pwInfoCaptureSource;\nwindow.pwInfoBackLabel = pwInfoBackLabel;\nwindow.pwBuildInfoPanel = pwBuildInfoPanel;\nwindow.pwInfoBack = pwInfoBack;',
    sandbox,
    { filename: 'file-preflight.js#passe3' }
  );
  return sandbox;
}

// ── pwInfoBack: back to the origin menu ───────────────────────────────────

test('pwInfoBack reopens a fullscreen panel (fs)', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'fs', panel: 'dictionary' };
  env.window.pwInfoBack();
  assert.deepEqual(env.calls[0], ['openFullscreenPanel', 'dictionary']);
});

test('pwInfoBack reopens the team sheet', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'team', idx: 3 };
  env.window.pwInfoBack();
  assert.deepEqual(env.calls[0], ['openPokeModal', 3]);
});

test('pwInfoBack reopens the box sheet', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'box', boxId: 'b7' };
  env.window.pwInfoBack();
  assert.deepEqual(env.calls[0], ['openBoxPokeModal', 'b7']);
});

test('pwInfoBack without a source simply closes the modal', () => {
  const env = makeEnv();
  env.window._pwInfoSource = null;
  env.window.pwInfoBack();
  assert.equal(env.calls.length, 0, 'no navigation call');
  assert.equal(env.fakeModal.classList.contains('open'), false, 'modal closed');
});

// ── pwBuildInfoPanel: cross + button bound to pw-info-back, adapted label ──

test('the unified panel carries cross and button under data-action pw-info-back', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'fs', panel: 'inventory' };
  const html = env.window.pwBuildInfoPanel({ icon: '', title: 'Test', subtitle: '', statCards: [{ label: 'A', value: '1' }], sections: [{ title: 'S', body: 'b' }] });
  assert.equal((html.match(/data-action="pw-info-back"/g) || []).length, 2, 'cross + button');
  assert.ok(html.includes('LBL_back_to_inventory'), 'label adapted to the origin menu');
  assert.ok(html.includes('pw-info-stat-cards'), 'stat cards present');
  assert.ok(html.includes('pw-info-section'), 'framed sections present');
});

// ── Source contracts (regression guards) ───────────────────────────────────

test('the .modal-close cross with data-action goes through runAction (no blind close)', () => {
  assert.ok(
    /closeButton\.dataset\s*&&\s*closeButton\.dataset\.action\s*&&\s*runAction\(/.test(PREFLIGHT),
    'installRobustClickFallback must route .modal-close[data-action] via runAction'
  );
});

test('the sheet move rows pass their explicit context', () => {
  assert.ok(POKE_MODAL.includes('ctxMoveArgs'), 'known moves: explicit context');
  assert.ok(POKE_MODAL.includes('ctxLearnArgs'), 'learnable moves: explicit context');
  assert.ok(/`'\$\{m\.id\}',null,'\$\{boxId\}'`/.test(POKE_MODAL), 'box context passed to openMoveInfo');
  assert.ok(/`'\$\{m\.id\}',\$\{idx\}`/.test(POKE_MODAL), 'team context passed to openMoveInfo');
});

test('openMoveInfo honors the explicit context before ambient deduction', () => {
  const ia = POKE_MODAL.indexOf("contextBoxId != null && contextBoxId !== ''");
  const ib = POKE_MODAL.indexOf('pwInfoCaptureSource');
  assert.ok(ia > -1 && ib > -1 && ia < ib, 'explicit context wins over pwInfoCaptureSource');
});

test('the move panel no longer shows Accuracy (Power + Category)', () => {
  assert.ok(!POKE_MODAL.includes("label: (t('accuracy')"), 'Accuracy card removed');
});

test('callGlobal is exposed on window (pwInfoBack, defined outside the IIFE, depends on it)', () => {
  assert.ok(
    PREFLIGHT.includes('window.callGlobal = callGlobal'),
    'without window.callGlobal, pwInfoBack throws a silent ReferenceError and contextual back fails'
  );
});

// ── Phase 6: "ghost" source + Pokémon sheet label ─────────────────────────

test('pwInfoCaptureSource ignores a ghost sheet when the modal is closed', () => {
  const env = makeEnv();
  env.fakeModal.classList.remove('open'); // box sheet seen then closed earlier
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  const src = env.window.pwInfoCaptureSource();
  assert.equal(src, null, 'without an open modal, the memorized sheet must not be captured');
});

test('pwInfoCaptureSource returns the sheet when the modal is open on it', () => {
  const env = makeEnv(); // fakeModal has the 'open' class by default
  env.window._pwPokeSheet = { kind: 'team', idx: 2 };
  let src = env.window.pwInfoCaptureSource();
  assert.equal(src && src.kind, 'team');
  assert.equal(src && src.idx, 2);
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  src = env.window.pwInfoCaptureSource();
  assert.equal(src && src.kind, 'box');
  assert.equal(src && src.boxId, 'b7');
});

test('a Pokémon sheet\'s back label is "back_to_pokemon" (team and box)', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'team', idx: 1 };
  assert.equal(env.window.pwInfoBackLabel(), 'LBL_back_to_pokemon');
  env.window._pwInfoSource = { kind: 'box', boxId: 'b3' };
  assert.equal(env.window.pwInfoBackLabel(), 'LBL_back_to_pokemon');
  env.window._pwInfoSource = { kind: 'fs', panel: 'shop' };
  assert.equal(env.window.pwInfoBackLabel(), 'LBL_back_to_shop', 'fs panels keep their label');
});

test('back_to_pokemon exists in both locales', () => {
  for (const lang of ['fr', 'en']) {
    const ui = fs.readFileSync(new URL(`../src/localization/${lang}/ui.js`, import.meta.url), 'utf8');
    assert.ok(ui.includes('back_to_pokemon'), `back_to_pokemon manquant (${lang})`);
  }
});

test('closing the poke-modal purges the sheet and memorized source', () => {
  assert.ok(
    /action === 'close-poke-modal'\) \{[^\n]*window\._pwPokeSheet = null/.test(PREFLIGHT),
    'close-poke-modal (preflight) must purge _pwPokeSheet/_pwInfoSource'
  );
  const POSTBOOT = [fs.readFileSync(new URL('../src/engine/input/action-dispatcher.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../src/engine/runtime/classic-bridge.js', import.meta.url), 'utf8')].join('\n');
  assert.ok(POSTBOOT.includes('_pwPokeSheet = null'), 'close-poke-modal (postboot) must purge _pwPokeSheet');
});

test('old saves\' movepool is normalized at load', () => {
  const SAVE = fs.readFileSync(new URL('../src/application/save/save.js', import.meta.url), 'utf8');
  assert.ok(/Array\.isArray\(p\.movepool\)\s*\?\s*'movepool'\s*:\s*\(Array\.isArray\(p\.learnableMoves\)/.test(SAVE), 'movepool/learnableMoves field supported');
});

// ── Phase 7: team/battle card move pills -> back = close ───────────────────

const BATTLE_TEAM_UI = fs.readFileSync(new URL('../src/ui/game/battle-team-ui.js', import.meta.url), 'utf8');
const BATTLE_UI = fs.readFileSync(new URL('../src/ui/game/battle-ui.js', import.meta.url), 'utf8');

// Extracts openMoveInfo with minimal stubs (the panel is generated via pwBuildInfoPanel).
function makeMoveInfoEnv(captureResult) {
  const sandbox = {
    console,
    MOVES: { tackle: { type: 'normal', pow: 40, cat: 'phys', desc: 'Charge basique.' } },
    TYPE_COLORS: { normal: '#A0A29F' },
    document: {
      _inner: { innerHTML: '' },
      _classes: new Set(),
      getElementById(id) {
        if (id === 'poke-modal-inner') return this._inner;
        if (id === 'poke-modal') {
          const classes = this._classes;
          return { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: (c) => classes.has(c) } };
        }
        return null;
      },
    },
    getMoveName: (id) => 'NOM_' + id,
    typeClass: (tp) => 'type-' + tp,
    t: (k) => k,
    tr: (k) => k,
    window: {
      _pwInfoSource: 'INIT',
      pwModalInfo: () => {},
      pwBuildInfoPanel: () => '<HTML_OK>',
      pwInfoCaptureSource: () => captureResult,
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const m = POKE_MODAL.match(/function openMoveInfo\(moveId, contextIdx, contextBoxId\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'extraction openMoveInfo impossible');
  vm.runInContext(m[0], sandbox, { filename: 'poke-modal.js#passe7' });
  return sandbox;
}

test('openMoveInfo with explicit context -1 (team/battle card): no source -> back closes', () => {
  const env = makeMoveInfoEnv({ kind: 'team', idx: 0 });
  vm.runInContext("openMoveInfo('tackle', -1)", env);
  assert.equal(env.window._pwInfoSource, null, 'ambient deduction must NOT be used when idx=-1 (otherwise the sheet visible behind would reopen on return)');
});

test('openMoveInfo with idx >= 0 (team sheet): back to the sheet', () => {
  const env = makeMoveInfoEnv(null);
  vm.runInContext("openMoveInfo('tackle', 2)", env);
  const src = env.window._pwInfoSource;
  assert.equal(src && src.kind, 'team');
  assert.equal(src && src.idx, 2);
});

test('openMoveInfo without context: ambient deduction kept (dict/fs)', () => {
  const env = makeMoveInfoEnv({ kind: 'fs', panel: 'dictionary' });
  vm.runInContext("openMoveInfo('tackle')", env);
  const src = env.window._pwInfoSource;
  assert.equal(src && src.kind, 'fs');
  assert.equal(src && src.panel, 'dictionary');
});

test('team/battle card move pills pass context -1', () => {
  // Execution assertion (phase 25: context construction goes through
  // moveInfoArgs — default = context -1, moveInfoContextless option = none).
  const sandbox = {
    console, window: {},
    G: { team: [] },
    battle: { eMoveIdx: 0, pMoveIdx: 0, eCd: 0, pCd: 0, eCdMax: 0, pCdMax: 0, enemyPoke: null, playerMods: null, enemyMods: null },
    ITEMS: {}, MOVES: { tackle: { type: 'normal', power: 40, cat: 'physique' } },
    TYPE_COLORS: { normal: '#A0A29F' },
    spriteImg: () => '<span></span>', getHeldBuff: () => ({}),
    getMoveName: () => 'Charge', getPokeName: () => 'Ratata',
    t: (k) => k, tr: (k) => k,
  };
  sandbox.window = sandbox;
  sandbox.PokeUI = sandbox.PokeUI || {}; sandbox.PokeUI.components = Object.assign({}, sandbox.PokeUI.components, { pokeFullCardHTML, moveButtonsBarHTML }); sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle : battle-team-ui est ESM (bundle isolé,
  // globales via shim gardé) ; texte direct tant qu'il était classique.
  vm.runInContext(
    harnessIsEsm(BATTLE_TEAM_UI) ? harnessBundleSource(['src/ui/game/battle-team-ui.js']) : BATTLE_TEAM_UI,
    sandbox,
    { filename: 'battle-team-ui.js#passe7' }
  );
  const poke = { id: 1, name: 'Ratata', level: 5, currentHP: 20, maxHP: 20, xp: 0, xpNext: 8, moves: [{ id: 'tackle', pp: 35 }] };
  const htmlDefault = vm.runInContext('generatePokeCardHTML(' + JSON.stringify(poke) + ', 0, { showMoves: true, movesDraggable: false })', sandbox);
  assert.ok(htmlDefault.includes('data-context-args="\'tackle\',-1"'), 'team cards: context -1 expected (back = close)');
  const htmlNu = vm.runInContext('generatePokeCardHTML(' + JSON.stringify(poke) + ', 0, { showMoves: true, moveInfoContextless: true })', sandbox);
  assert.ok(htmlNu.includes('data-context-args="\'tackle\'"'), 'moveInfoContextless: bare context (back deduced from the screen)');
  assert.ok(!htmlNu.includes(",-1\""), 'moveInfoContextless: no residual -1');
  assert.equal((BATTLE_UI.match(/,-1"/g) || []).length >= 1, true, 'moves auto-battle : contexte -1 attendu');
  // SHEET lines keep their idx (behavior validated by the user)
  assert.ok(POKE_MODAL.includes("ctxMoveArgs"), 'sheet: idx context kept');
});

