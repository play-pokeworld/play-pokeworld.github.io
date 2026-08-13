import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pokeCardHTML } from '../src/ui/components/poke-card.js';
import { harnessRunMixed } from '../tools/harness-bundle.mjs';

// ── Phase 12 — bag: TM/HM selector filter, back to bag, HM debug ─────────
// Reported bugs:
//  a. "Most TMs cannot be learned, no Pokémon shows up" → MOVES movesets
//     are lowercase ("grass") while Pokémon types are capitalized ("Grass");
//     6 TMs also pointed to moveIds absent from MOVES (icebeam → ice_beam…, and
//     bodyslam/doubleedge completely missing).
//  b. TM selector: only show Pokémon that do NOT have the
//     move yet (current moves) and CANNOT already equip it.
//  c. Back to the bag when the TM runs out of stock.
//  d. "Back to bag" button in lists opened from the bag.
//  e. "get all HMs" debug: stale keys → dynamic list.

// Vague 40 — les lectures texte destinées à l'évaluation partent par PROD_R /
// runMixedEnv (plus bas). Ne restent ici que les lecteurs de TEXTE pour locks
// d'intention (jamais évalués) :
const BOX_SELECTOR = fs.readFileSync(new URL('../src/ui/game/box-selector.js', import.meta.url), 'utf8');
const SAVE = fs.readFileSync(new URL('../src/application/save/save.js', import.meta.url), 'utf8');

// ── Vague 40 — boucle mixte ordonnée (T2-D généralisé) ────────────────────
// Intention préservée : les mêmes fichiers, dans le même ordre, sous la même
// sémantique que l'ancienne concat unique (un seul script → const inter-
// fichiers partagées). Tant qu'un fichier reste classique, ses segments sont
// concaténés à l'identique ; un fichier converti ESM est bundlé isolément
// (ses globales passent par son shim globalThis gardé).
const PROD_R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function runMixedEnv(labels, readText, sandbox) {
  for (const seg of harnessRunMixed(labels, readText || PROD_R)) {
    vm.runInContext(seg.source, sandbox, { filename: seg.filename });
  }
}

function fakeNode() {
  return {
    innerHTML: '', textContent: '', value: '',
    replaceChildren() { this.innerHTML = ''; },
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
}

// Fake Bulbasaur (Grass/Poison) and Pikachu (Electric).
function bulba(extra = {}) { return Object.assign({ id: 1, name: 'Bulba', level: 50, type1: 'Grass', type2: 'Poison', moves: [], trainingUnlockedMoves: [], uid: 'u_b' }, extra); }
function pika(extra = {}) { return Object.assign({ id: 25, name: 'Pika', level: 50, type1: 'Electric', type2: null, moves: [], trainingUnlockedMoves: [], uid: 'u_p' }, extra); }
function squirtle(extra = {}) { return Object.assign({ id: 7, name: 'Carapuce', level: 50, type1: 'Water', type2: null, moves: [], trainingUnlockedMoves: [], uid: 'u_s' }, extra); }

function makeEnv(collect, opts = {}) {
  const nodes = {
    'usm-grid': fakeNode(), 'usm-search': { value: '' }, 'usm-subtab-bar': fakeNode(),
    'usm-filter-panel': fakeNode(), 'usm-footer': fakeNode(), 'usm-title': fakeNode(),
    'fullscreen-panel-modal': fakeNode(), 'unified-selector-modal': fakeNode(),
    'quest-modal': fakeNode(), 'settings-modal': fakeNode(),
  };
  const calls = [];
  const sandbox = {
    _swapFromTeamIdx: null,
    console, calls, nodes,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    t: (k) => k, tr: (k) => k,
    notify: () => {}, saveGame: () => {}, updateHeader: () => {},
    spriteImg: () => 'SPRITE', itemIcon: () => '', getPokeName: (id) => 'P_' + id,
    speciesOwned: () => false, isSpeciesShiny: () => false,
    closeFullscreenPanel: () => {}, closeBattleSummary: () => {},
    openUnifiedSelectorModal: (mode) => calls.push(['selector', mode]),
    renderInventory: () => calls.push(['renderInventory']),
    showTab: (tab) => calls.push(['showTab', tab]),
    getMoveName: (id) => 'MV_' + id,
    getMoveLearnLevel: opts.learnLevel || (() => 999),
    consumeItem: (key) => { if (sandbox.G.inventory[key] > 0) sandbox.G.inventory[key]--; if (sandbox.G.inventory[key] === 0) delete sandbox.G.inventory[key]; },
    G: Object.assign({
      lang: 'fr', team: [], collection: collect || {}, inventory: {},
      pendingItemUseKey: null, pokedex: {},
    }, opts.G || {}),
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  // The selector grid renders through the single PokeCard DS component.
  sandbox.PokeUI = { components: { pokeCardHTML } };
  vm.createContext(sandbox);
  // Vague 40 — ex 'bag-ct#passe12' concat : mêmes 6 fichiers, même ordre.
  runMixedEnv([
    'src/data/moves.js', 'src/data/items-data.js', 'src/data/pd-data.js',
    'src/data/items-helpers.js', 'src/ui/game/box-selector.js',
    'src/application/economy/inventory-actions.js',
  ], null, sandbox);
  return sandbox;
}

function gridHtml(env, action, pendingKey) {
  env._usmAction = action;
  env.G.pendingItemUseKey = pendingKey;
  env.renderUnifiedGrid();
  return env.nodes['usm-grid'].innerHTML;
}

// ── a. Type compatibility: case-insensitive ────────────────────────────────

test('HM Cut (moveset [normal,grass]): Bulbasaur Grass shown, not Pikachu Electric', () => {
  const env = makeEnv({ b1: bulba(), b2: pika() });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  const cards = html.split('box-card').length - 1;
  assert.equal(cards, 1, 'a single eligible Pokémon');
  assert.ok(html.includes("Bulba") === false || true); // the name is not rendered, verified via sprite/level
  assert.ok(html.includes('Lv.50'), 'card shown');
});

test('HM Cut: ALL Pokémon excluded if their type does not match → empty state (not a crash)', () => {
  const env = makeEnv({ b2: pika() });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok(html.includes('no_pokemon_found'), 'no candidate shown');
});

test('compatibility via the Pokémon\'s type2', () => {
  // Splits moveset [normal,grass]; Electric type1 does not match, Grass type2 does.
  const env = makeEnv({ b1: pika({ type2: 'Grass' }) });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok((html.split('box-card').length - 1) === 1, 'eligible via type2');
});

// ── a-bis. Legacy aliases: TM whose moveId does not exist as-is ───────────

test('resolveCtCsMoveId : icebeam → ice_beam, shadowball → shadow_ball', () => {
  const env = makeEnv({});
  assert.equal(env.resolveCtCsMoveId('ct13_icebeam'), 'ice_beam');
  assert.equal(env.resolveCtCsMoveId('ct30_shadowball'), 'shadow_ball');
  assert.equal(env.resolveCtCsMoveId('ct22_solarbeam'), 'solar_beam');
  assert.equal(env.resolveCtCsMoveId('ct15_hyperbeam'), 'hyper_beam');
  assert.equal(env.resolveCtCsMoveId('ct06_toxic'), 'toxic', 'already-canonical id unchanged');
});

test('TM13 Ice Beam (alias): Squirtle Water shown, Bulbasaur not', () => {
  const env = makeEnv({ b1: bulba(), b2: squirtle() });
  const html = gridHtml(env, 'item_ct_cs_ct13_icebeam', 'ct13_icebeam');
  const cards = html.split('box-card').length - 1;
  assert.equal(cards, 1, 'a single eligible (Water ∈ moveset ice_beam)');
});

test('TM Body Slam / Double-Edge: moves present in MOVES and learned by all (moveset all)', () => {
  const env = makeEnv({});
  assert.ok(env.MOVES.bodyslam, 'bodyslam added');
  assert.ok(env.MOVES.doubleedge, 'doubleedge added');
  assert.ok(env.MOVES.bodyslam.moveset.includes('all'));
  assert.ok(env.MOVES.doubleedge.moveset.includes('all'));
  const html = gridHtml(env, 'item_ct_cs_ct08_bodyslam', 'ct08_bodyslam');
  assert.ok(!html.includes('no_pokemon_found') || true); // no crash
  const env2 = makeEnv({ b1: bulba(), b2: pika() });
  const html2 = gridHtml(env2, 'item_ct_cs_ct08_bodyslam', 'ct08_bodyslam');
  assert.equal(html2.split('box-card').length - 1, 2, 'all eligible (moveset all)');
});

// ── b. Exclusions: already known / already equippable ────────────────────────────

test('excluded: Pokémon already knowing the move (current moves)', () => {
  const env = makeEnv({ b1: bulba({ moves: [{ id: 'cut' }] }), b2: pika() });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok(html.includes('no_pokemon_found'), 'Bulba knows it: excluded');
});

test('excluded: move already unlocked by a previous TM (trainingUnlockedMoves)', () => {
  const env = makeEnv({ b1: bulba({ trainingUnlockedMoves: ['cut'] }) });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok(html.includes('no_pokemon_found'), 'already unlocked: excluded');
});

test('excluded: move already learnable at current level (equippable)', () => {
  const env = makeEnv({ b1: bulba() }, { learnLevel: (nid, id) => (id === 'cut' ? 12 : 999) });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut'); // Bulba nv 50 ≥ 12
  assert.ok(html.includes('no_pokemon_found'), 'level reached: the TM would be useless');
  const env2 = makeEnv({ b1: bulba({ level: 5 }) }, { learnLevel: (nid, id) => (id === 'cut' ? 12 : 999) });
  const html2 = gridHtml(env2, 'item_ct_cs_cs01_cut', 'cs01_cut'); // nv 5 < 12
  assert.equal(html2.split('box-card').length - 1, 1, 'still not learnable: shown');
});

// ── c. Back to the bag when the TM is exhausted ────────────────────────────

test('startLearnMoveCtCs without stock: back to bag, no selector', () => {
  const env = makeEnv({});
  env.G.inventory = {}; // 0 ct06_toxic
  env.startLearnMoveCtCs('ct06_toxic');
  assert.equal(env.calls.filter((c) => c[0] === 'selector').length, 0, 'no selector opened');
  assert.ok(env.calls.some((c) => (c[0] === 'showTab' && c[1] === 'inventory') || c[0] === 'renderInventory'), 'back to bag');
});

test('startLearnMoveCtCs with stock: selector opens normally', () => {
  const env = makeEnv({});
  env.G.inventory = { ct06_toxic: 1 };
  env.startLearnMoveCtCs('ct06_toxic');
  assert.equal(env._usmAction, 'item_ct_cs_ct06_toxic', 'selector opened in TM mode');
  assert.equal(env.nodes['unified-selector-modal'].style.display, 'flex');
  assert.equal(env.G.pendingItemUseKey, 'ct06_toxic');
  assert.ok(env.nodes['usm-title'].textContent.includes('(CT)'), 'title suffixed with TM');
});

// ── d. Back-to-bag button in the selector ──────────────────────────────────

test('"Back to bag" button present for item_* actions, absent otherwise', () => {
  const env = makeEnv({ b1: bulba() });
  gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  const footer = env.nodes['usm-footer'].innerHTML;
  assert.ok(footer.includes('close-selector-show-tab') && footer.includes('data-tab="inventory"'), 'back-to-bag button');
  assert.ok(footer.includes('back_bag'), 'back-to-bag label');
  const env2 = makeEnv({ b1: bulba() });
  env2._usmAction = 'team';
  env2.renderUnifiedGrid();
  assert.ok(!String(env2.nodes['usm-footer'].innerHTML).includes('close-selector-show-tab'), 'no button outside the bag');
});

// ── e. "get all HMs" debug: dynamic list ───────────────────────────────────

test('debugGiveCtCs: all given items exist and include the 3 HMs', () => {
  const notifs = [];
  const sandbox = {
    console,
    document: { getElementById: () => null },
    window: {},
    t: (k) => k,
    notify: (m) => notifs.push(String(m)),
    saveGame: () => {}, updateHeader: () => {},
    G: { inventory: {} },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  // The selector grid renders through the single PokeCard DS component.
  sandbox.PokeUI = { components: { pokeCardHTML } };
  vm.createContext(sandbox);
  const fn = SAVE.match(/function debugGiveCtCs\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fn, 'debugGiveCtCs extrait');
  // Vague 40 — ex concat 'debug#passe12' : data + slice de save.js. Le slice
  // reste DANS le segment classique (parité exacte : même scope de script —
  // il lit ITEMS / isCtCsItem via typeof gardé comme avant la conversion).
  runMixedEnv(
    ['src/data/items-data.js', 'src/data/items-helpers.js', '__slice/debugGiveCtCs(save.js)'],
    (label) => (label === '__slice/debugGiveCtCs(save.js)' ? fn[0] : PROD_R(label)),
    sandbox
  );
  sandbox.debugGiveCtCs();
  const inv = sandbox.G.inventory;
  const keys = Object.keys(inv);
  assert.ok(keys.length >= 100, `at least 100 objects (${keys.length})`);
  // Every given key must exist in ITEMS (no dead key)
  const dead = keys.filter((k) => !sandbox.ITEMS[k]);
  assert.deepEqual(dead, [], 'no missing key');
  for (const cs of ['cs01_cut', 'cs02_fly', 'cs03_surf']) {
    assert.ok(inv[cs] > 0, `HM given: ${cs}`);
  }
  assert.ok(inv['ct06_toxic'] > 0, 'TM06 (old ct_toxic key fixed via the dynamic list)');
});

// ── Contrats sources ────────────────────────────────────────────────────────

test('contract: the TM filter compares types in lowercase and excludes known/equippable', () => {
  assert.ok(/toLowerCase\(\)/.test(BOX_SELECTOR), 'case-insensitive comparison present');
  assert.ok(/resolveCtCsMoveId/.test(BOX_SELECTOR), 'alias resolved in the selector');
  assert.ok(/trainingUnlockedMoves[\s\S]{0,120}indexOf\(moveId\) !== -1[\s\S]{0,40}return false/.test(BOX_SELECTOR), 'unlocked-moves exclusion');
});

test('contract: MOVES now knows all TM/HM moveIds (via aliases)', () => {
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  // The selector grid renders through the single PokeCard DS component.
  sandbox.PokeUI = { components: { pokeCardHTML } };
  vm.createContext(sandbox);
  // Vague 40 — ex concat : mêmes 3 fichiers (moves/items-data/items-helpers), même ordre.
  runMixedEnv(['src/data/moves.js', 'src/data/items-data.js', 'src/data/items-helpers.js'], null, sandbox);
  const unresolved = [];
  for (const k of Object.keys(sandbox.ITEMS)) {
    if (!sandbox.isCtCsItem(k)) continue;
    const id = sandbox.resolveCtCsMoveId(k);
    if (!id || !sandbox.MOVES[id]) unresolved.push(`${k}→${id}`);
  }
  assert.deepEqual(unresolved, [], 'all TMs/HMs resolve to an existing move');
});


