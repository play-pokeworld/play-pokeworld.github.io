import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { LearnableMovesPanelView } from '../src/ui/views/LearnableMovesPanelView.js';
import { moveRowHTML } from '../src/ui/components/move-row.js';

// Wave 9: the learnable-moves panel shell is rendered by the ECS
// LearnableMovesPanelView; the marker contract lives in the view source
// (legitimate move — the rendered marker [data-learnable-panel="1"] is
// unchanged, the assertions below still check the same rendered classes).
const LEARNABLE_VIEW = fs.readFileSync(new URL('../src/ui/views/LearnableMovesPanelView.js', import.meta.url), 'utf8');

// ── Phase 6: unlocked level moves / box learning ───────────────────────────
// Reported bug: a level-100 Pokémon from an old save had "no learnable
// move". Cause: isMoveTrainingLocked locked ALL unknown moves
// (except training/TM) — the level was never taken into
// account. And learnBoxMove / toggleBoxMoveSelect (called by the box sheet)
// did not exist -> box learning was a silent no-op.

const TRAINING = fs.readFileSync(new URL('../src/application/combat/training.js', import.meta.url), 'utf8');
const MOVE_LEARNING = fs.readFileSync(new URL('../src/ui/game/move-learning.js', import.meta.url), 'utf8');
const POKE_MODAL = fs.readFileSync(new URL('../src/ui/game/poke-modal.js', import.meta.url), 'utf8');

function extractFrom(src, signature) {
  const re = new RegExp('function ' + signature + '\\s*\\{[\\s\\S]*?\\n\\}');
  const m = src.match(re);
  assert.ok(m, `extraction de ${signature} impossible`);
  return m[0];
}

// Simulated level pool: a(lvl 1) b(8) c(15) d(99). `a` is known.
function makeEnv(level, unlocked) {
  const sandbox = {
    console,
    MOVES: { a: { power: 10 }, b: { power: 20 }, c: { power: 30 }, d: { power: 40 } },
    getSpeciesFullLearnablePool: () => ['a', 'b', 'c', 'd'],
    getTrainingLockedMoves: () => ['b', 'c', 'd'],
    getMoveLearnLevel: (nid, id) => ({ b: 8, c: 15, d: 99 })[id] ?? 999,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(
    extractFrom(TRAINING, 'isMoveTrainingLocked\\(p, moveId\\)') + '\n' + extractFrom(MOVE_LEARNING, 'learnableMoves\\(p\\)'),
    sandbox,
    { filename: 'training+move-learning#passe6' }
  );
  const p = { id: 25, level, moves: [{ id: 'a' }], trainingUnlockedMoves: unlocked || [] };
  return { sandbox, p };
}

test('level 100: the whole level pool is learnable', () => {
  const { sandbox, p } = makeEnv(100);
  assert.deepEqual(sandbox.learnableMoves(p), ['b', 'c', 'd']);
});

test('level 20: only moves whose level is reached are learnable', () => {
  const { sandbox, p } = makeEnv(20);
  assert.deepEqual(sandbox.learnableMoves(p), ['b', 'c'], 'd (lvl 99) stays locked');
});

test('training/TM unlocks beyond level', () => {
  const { sandbox, p } = makeEnv(20, ['d']);
  assert.deepEqual(sandbox.learnableMoves(p), ['b', 'c', 'd']);
});

test('isMoveTrainingLocked: explicit level rule', () => {
  const { sandbox, p } = makeEnv(50);
  assert.equal(sandbox.isMoveTrainingLocked(p, 'b'), false, 'lv 8 reached -> unlocked');
  assert.equal(sandbox.isMoveTrainingLocked(p, 'd'), true, 'lv 99 not reached -> locked');
  p.trainingUnlockedMoves = ['d'];
  assert.equal(sandbox.isMoveTrainingLocked(p, 'd'), false, 'training unlock kept');
  assert.equal(sandbox.isMoveTrainingLocked(p, 'a'), false, 'known move: not locked');
});

test('getTrainableLockedMoves excludes moves already learnable by level', () => {
  assert.ok(/isMoveTrainingLocked\(p, id\)/.test(TRAINING), 'the training filter must reuse isMoveTrainingLocked');
});

// ── learnBoxMove / toggleBoxMoveSelect (fiche box) ─────────────────────────

function makeBoxEnv() {
  const calls = { notify: [], open: [], save: 0 };
  const sandbox = {
    console,
    calls,
    G: { collection: { b7: { name: 'Carapuce', moves: [{ id: 'a' }] } } },
    window: { boxMoveReplaceSlot: null },
    notify: (msg) => calls.notify.push(msg),
    saveGame: () => calls.save++,
    openBoxPokeModal: (boxId) => calls.open.push(boxId),
    tr: (k, o) => `${k}:${o && o.p1 || ''}`,
    t: (k) => k,
    getMoveName: (id) => id.toUpperCase(),
  };
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(
    extractFrom(MOVE_LEARNING, 'getBoxPokemon\\(boxId\\)') + '\n'
    + extractFrom(MOVE_LEARNING, 'toggleBoxMoveSelect\\(boxId, moveIdx\\)') + '\n'
    + extractFrom(MOVE_LEARNING, 'learnBoxMove\\(boxId, moveId\\)'),
    sandbox,
    { filename: 'move-learning#box' }
  );
  return sandbox;
}

test('learnBoxMove adds a move to the box Pokémon', () => {
  const env = makeBoxEnv();
  vm.runInContext('learnBoxMove("b7", "b")', env);
  const p = env.G.collection.b7;
  assert.deepEqual(p.moves.map((m) => m.id), ['a', 'b']);
  assert.equal(env.calls.save, 1, 'save triggered');
  assert.deepEqual(env.calls.open, ['b7'], 'box sheet refreshed');
  assert.equal(env.calls.notify.length, 1);
});

test('learnBoxMove replaces the slot selected via toggleBoxMoveSelect', () => {
  const env = makeBoxEnv();
  env.G.collection.b7.moves = [{ id: 'a' }, { id: 'b' }];
  env.window.boxMoveReplaceSlot = 1;
  vm.runInContext('learnBoxMove("b7", "c")', env);
  assert.deepEqual(env.G.collection.b7.moves.map((m) => m.id), ['a', 'c']);
  assert.equal(env.window.boxMoveReplaceSlot, null, 'replacement slot consumed');
});

test('toggleBoxMoveSelect bascule le slot de remplacement', () => {
  const env = makeBoxEnv();
  vm.runInContext('toggleBoxMoveSelect("b7", 0)', env);
  assert.equal(env.window.boxMoveReplaceSlot, 0);
  vm.runInContext('toggleBoxMoveSelect("b7", 0)', env);
  assert.equal(env.window.boxMoveReplaceSlot, null);
});

test('box functions exist and are exposed (the box sheet calls them via data-call)', () => {
  // Wave 10 (legitimate move): the box sheet's move rows are built from the
  // action models shaped by the adapter (call: 'learnBoxMove' …) and rendered
  // into real data-call attributes by moveRowVNode. The intent is unchanged —
  // the box sheet still calls learnBoxMove / toggleBoxMoveSelect via data-call —
  // the assertions now check the model AND the rendered attribute.
  assert.ok(POKE_MODAL.includes("call: 'learnBoxMove'"), 'the box sheet models a learnBoxMove action');
  assert.ok(POKE_MODAL.includes("call: 'toggleBoxMoveSelect'"), 'the box sheet models a toggleBoxMoveSelect action');
  const rendered = moveRowHTML({
    name: 'X', typeCls: 'type-normal', typeName: 'Normal',
    action: { action: 'legacy-call', call: 'learnBoxMove', callArgs: "'b7','c'" },
  });
  assert.ok(rendered.includes('data-call="learnBoxMove"'), 'the rendered sheet calls learnBoxMove via data-call');
  const renderedSel = moveRowHTML({
    name: 'X', typeCls: 'type-normal', typeName: 'Normal',
    action: { action: 'legacy-call', call: 'toggleBoxMoveSelect', callArgs: "'b7',0" },
  });
  assert.ok(renderedSel.includes('data-call="toggleBoxMoveSelect"'), 'the rendered sheet calls toggleBoxMoveSelect via data-call');
  assert.ok(MOVE_LEARNING.includes('function learnBoxMove'), 'learnBoxMove must exist (otherwise callGlobal silent no-op)');
  assert.ok(MOVE_LEARNING.includes('function toggleBoxMoveSelect'), 'toggleBoxMoveSelect must exist');
  assert.ok(MOVE_LEARNING.includes('window.learnBoxMove = learnBoxMove'), 'learnBoxMove exposed on window');
  assert.ok(MOVE_LEARNING.includes('window.toggleBoxMoveSelect = toggleBoxMoveSelect'), 'toggleBoxMoveSelect exposed on window');
});

// ── Phase 7: refreshing the "learnable moves" panel indicators ─────────────

const BOX_SELECTOR = fs.readFileSync(new URL('../src/ui/game/box-selector.js', import.meta.url), 'utf8');
const SAVE_JS = fs.readFileSync(new URL('../src/application/save/save.js', import.meta.url), 'utf8');

test('the full panel carries a marker and resolves the Pokémon from the rendered sheet', () => {
  assert.ok(LEARNABLE_VIEW.includes("learnablePanel: '1'"), 'marqueur de panneau absent (view)');
  assert.ok(POKE_MODAL.includes('function refreshLearnableMovesPanelIfOpen'), 'refresh helper missing');
  assert.ok(POKE_MODAL.includes('window.refreshLearnableMovesPanelIfOpen = refreshLearnableMovesPanelIfOpen'), 'helper not exposed');
  const body = POKE_MODAL.match(/function openLearnableMovesPanel\(idxOrBoxId, opts\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'panel extraction impossible');
  const iSheet = body[0].indexOf('_pwPokeSheet');
  const iAmbient = body[0].indexOf('_POKEMODAL_SOURCE');
  assert.ok(iSheet > -1 && iAmbient > -1 && iSheet < iAmbient, 'the rendered sheet (_pwPokeSheet) must win over the ambient source');
});

test('every move mutation triggers the panel refresh', () => {
  const NEEDLE = 'refreshLearnableMovesPanelIfOpen';
  assert.equal((MOVE_LEARNING.match(/window\.refreshLearnableMovesPanelIfOpen\(\);/g) || []).length, 4, 'learnMove(×2)/forgetMove/learnBoxMove must refresh');
  assert.ok(TRAINING.includes(NEEDLE), 'unlockTrainingMove must refresh');
  assert.ok(BOX_SELECTOR.includes(NEEDLE), 'using a TM/HM must refresh');
  assert.ok(SAVE_JS.includes(NEEDLE), 'save migration must refresh');
});

test('refreshLearnableMovesPanelIfOpen: no-op without panel, re-render otherwise, never reopens', () => {
  const body = POKE_MODAL.match(/function refreshLearnableMovesPanelIfOpen\(\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'helper extraction impossible');
  assert.ok(body[0].includes("contains('open')"), 'phase 8: the helper must check the modal is REALLY open (otherwise a training reopens the panel by itself)');
  const calls = [];
  const sandbox = {
    console,
    calls,
    openLearnableMovesPanel: (id, opts) => calls.push([id, opts && opts.source]),
    window: { _pwLearnableCtx: { source: 'team', id: 3 } },
    document: { getElementById: () => null },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(body[0], sandbox, { filename: 'poke-modal.js#refresh' });
  vm.runInContext('refreshLearnableMovesPanelIfOpen()', sandbox);
  assert.equal(calls.length, 0, 'without #poke-modal-inner, nothing to refresh');
  // Marker present (DOM kept) BUT modal closed -> does not reopen (training bug)
  sandbox.document = {
    getElementById: (id) => {
      if (id === 'poke-modal') return { classList: { contains: () => false } };
      if (id === 'poke-modal-inner') return { querySelector: (sel) => (sel === '[data-learnable-panel]' ? {} : null) };
      return null;
    },
  };
  vm.runInContext('refreshLearnableMovesPanelIfOpen()', sandbox);
  assert.equal(calls.length, 0, 'modal closed + residual marker: no reopening');
  // Marker present AND modal open -> re-render with the memorized source
  sandbox.document = {
    getElementById: (id) => {
      if (id === 'poke-modal') return { classList: { contains: () => true } };
      if (id === 'poke-modal-inner') return { querySelector: (sel) => (sel === '[data-learnable-panel]' ? {} : null) };
      return null;
    },
  };
  vm.runInContext('refreshLearnableMovesPanelIfOpen()', sandbox);
  assert.deepEqual(calls, [[3, 'team']], 'the open panel is re-rendered with memorized id + source');
});

// ── Passe 8 : source explicite du panneau « attaques apprenables » ──────────

function makePanelEnv() {
  const INNER = { innerHTML: '' };
  const classSet = new Set(['open']);
  const MODAL = { classList: { add: (c) => classSet.add(c), remove: (c) => classSet.delete(c), contains: (c) => classSet.has(c) } };
  const MOVES = {};
  ['a', 'b', 'c', 'd'].forEach((id, x) => { MOVES[id] = { type: 'normal', power: 40 + x, rarity: 1 }; });
  const sandbox = {
    console,
    _INNER: INNER,
    MOVES,
    G: {
      team: [{ id: 25, name: 'TeamMon', level: 100, moves: [{ id: 'a' }] }],
      collection: { b7: { id: 25, name: 'BoxMon', level: 100, moves: [{ id: 'c' }, { id: 'd' }] } },
    },
    PD: { 25: ['Test', 'normal', ''] },
    getSpeciesFullLearnablePool: () => ['a', 'b', 'c', 'd'],
    getSpeciesMovePool: () => ['a', 'b', 'c', 'd'],
    ITEMS: {},
    TYPE_COLORS: { normal: '#999' },
    t: (k) => k, tr: (k, o) => k, getMoveName: (id) => id.toUpperCase(),
    document: { getElementById: (id) => (id === 'poke-modal-inner' ? INNER : (id === 'poke-modal' ? MODAL : null)) },
    window: {
      _pwPokeSheet: { kind: 'team', idx: 0 },
      typeClass: (tp) => 'type-' + tp,
      pwModalInfo: () => {},
      // Wave 9: the panel shell delegates to the ECS LearnableMovesPanelView
      // — the real view is injected into the sandbox (DOM-free).
      PokeUI: { views: { LearnableMovesPanelView } },
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const body = POKE_MODAL.match(/function openLearnableMovesPanel\(idxOrBoxId, opts\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'panel extraction impossible');
  vm.runInContext(body[0], sandbox, { filename: 'poke-modal.js#panel8' });
  return sandbox;
}

test('the sheet button passes the explicit source (\'team\'/\'box\')', () => {
  assert.ok(POKE_MODAL.includes(`'box','\${boxId}'`), 'argument explicite box attendu');
  assert.ok(POKE_MODAL.includes(`'team',\${idx != null ? idx : 0}`), 'argument explicite team attendu');
  // Phase 8: the button is hidden on readonly sheets (otherwise it would open team[0])
  assert.ok(/readonly \? '' : `<button class="hbtn poke-detail-full-list-btn"/.test(POKE_MODAL), 'button hidden in readonly as expected');
});

test('explicit \'box\' source: resolves the box Pokémon (even with team sheet shown)', () => {
  const env = makePanelEnv();
  vm.runInContext("openLearnableMovesPanel('box','b7')", env);
  assert.equal(env.window._pwLearnableCtx.source, 'box');
  assert.equal(env.window._pwLearnableCtx.id, 'b7');
  const html = env._INNER.innerHTML;
  assert.equal((html.match(/move-row known/g) || []).length, 2, 'BoxMon has 2 known moves checked');
});

test('explicit team source via opts: takes precedence over the displayed box sheet', () => {
  const env = makePanelEnv();
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  vm.runInContext("openLearnableMovesPanel(0,{source:'team'})", env);
  assert.equal(env.window._pwLearnableCtx.source, 'team');
  const html = env._INNER.innerHTML;
  assert.equal((html.match(/move-row known/g) || []).length, 1, 'TeamMon has 1 known move checked');
});

test('without explicit source: the rendered sheet serves as resolution (phase 7 kept)', () => {
  const env = makePanelEnv();
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  vm.runInContext("openLearnableMovesPanel('b7')", env);
  assert.equal(env.window._pwLearnableCtx.source, 'box');
  assert.equal((env._INNER.innerHTML.match(/move-row known/g) || []).length, 2);
});

// ── Pass 9: "owned" = equipped OR learnable now ──────────────

test('learnable moves get the validated pill and count in the owned total', () => {
  const env = makePanelEnv();
  // TeamMon knows 'a'; level/training also unlocked 'b'
  vm.runInContext('var learnableMoves = function(p){ return ["b"]; };', env);
  vm.runInContext("openLearnableMovesPanel('team',0)", env);
  const html = env._INNER.innerHTML;
  assert.equal((html.match(/poke-detail-pill is-known/g) || []).length, 1, '1 move equipped');
  assert.equal((html.match(/poke-detail-pill is-learnable/g) || []).length, 1, '1 learnable move validated (before: not taken into account)');
  assert.ok(html.includes('2/4'), 'counter = equipped + learnable (2/4), got: ' + (html.match(/\d\/\d/g) || [])[0]);
  assert.equal((html.match(/move-row learnable locked/g) || []).length, 2, 'the 2 still-locked moves are dimmed');
});

test('button without emoji: only text is shown', () => {
  assert.ok(!POKE_MODAL.includes('📋 ${typeof t'), 'the button must no longer prefix the label with an emoji');
  for (const lang of ['fr', 'en']) {
    const ui = fs.readFileSync(new URL(`../src/localization/${lang}/ui.js`, import.meta.url), 'utf8');
    const m = ui.match(/"view_all_learnable_moves":"([^"]*)"/);
    assert.ok(m, `view_all_learnable_moves key missing (${lang})`);
    assert.ok(!m[1].includes('📋'), `emoji 📋 still present (${lang})`);
  }
});

test('the new panel i18n keys exist in both locales', () => {
  for (const lang of ['fr', 'en']) {
    const ui = fs.readFileSync(new URL(`../src/localization/${lang}/ui.js`, import.meta.url), 'utf8');
    for (const key of ['possessed_short', 'move_pill_equipped', 'move_pill_available']) {
      assert.ok(ui.includes(`"${key}"`), `${key} missing (${lang})`);
    }
  }
});

// ── Pass 10: training only offers the "training" category ─────────

const GAME_HELPERS = fs.readFileSync(new URL('../src/data/game-helpers.js', import.meta.url), 'utf8');

test('getSpeciesTrainingOnlyPool = pool complet − niveau − CT/CS', () => {
  const sandbox = {
    console,
    ITEMS: { ct_c: { type: 'ct', moveId: 'c' }, potion: { type: 'heal' } },
    getSpeciesFullLearnablePool: () => ['a', 'b', 'c', 'd', 'e'],
    getMoveLearnLevel: (nid, id) => ({ a: 1, b: 8 })[id] ?? 999,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const fns = [
    /function getCtCsMoveIds\(\) \{[\s\S]*?\n\}/,
    /function getSpeciesTrainingOnlyPool\(speciesId\) \{[\s\S]*?\n\}/,
  ].map((re) => {
    const m = GAME_HELPERS.match(re);
    assert.ok(m, 'extraction impossible');
    return m[0];
  });
  vm.runInContext(fns.join('\n'), sandbox, { filename: 'game-helpers.js#passe10' });
  assert.equal(JSON.stringify(sandbox.getSpeciesTrainingOnlyPool(25)), JSON.stringify(['d', 'e']), 'a,b = niveau ; c = CT ; restent d,e (dressage)');
});

test('getTrainableLockedMoves draws from the training category only', () => {
  assert.ok(/getSpeciesTrainingOnlyPool/.test(TRAINING), 'training must use getSpeciesTrainingOnlyPool');
  assert.ok(/getSpeciesTrainingOnlyPool/.test(POKE_MODAL), 'the panel\'s "training" category shares the same source');
  const sandbox = {
    console,
    getSpeciesTrainingOnlyPool: () => ['d', 'e'],
    getTrainingLockedMoves: () => { throw new Error('must no longer be used as the main pool'); },
    isMoveTrainingLocked: (p, id) => !(p.trainingUnlockedMoves || []).includes(id),
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const m = TRAINING.match(/function getTrainableLockedMoves\(p\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'extraction impossible');
  vm.runInContext(m[0], sandbox, { filename: 'training.js#passe10' });
  const p = { id: 25, moves: [{ id: 'a' }], trainingUnlockedMoves: ['e'] };
  assert.deepEqual(sandbox.getTrainableLockedMoves(p), ['d'], 'rest d: e already unlocked, a known, level/TM excluded from pool');
});

test('the new categorization helpers are exposed on window', () => {
  assert.ok(GAME_HELPERS.includes('window.getCtCsMoveIds = getCtCsMoveIds'), 'getCtCsMoveIds not exposed');
  assert.ok(GAME_HELPERS.includes('window.getSpeciesTrainingOnlyPool = getSpeciesTrainingOnlyPool'), 'getSpeciesTrainingOnlyPool not exposed');
});


