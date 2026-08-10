import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessRunMixed } from '../tools/harness-bundle.mjs';

// ── Phase 11: bag left-click on a usable item ──────────────────────────────
// Reported bug: left-clicking a TM, an evolution item or a Rare
// Candy opened the info panel instead of the Pokémon list
// (usage flow). handleInventoryClick opened openItemInfo for ALL
// items. Fix: isUsableBagItem predicate + routing to
// onInventoryClick. The info panel stays on right-click (data-context-call).
//
// Collateral fix: 28 TMs declared without `type` (e.g. ct_airshlash)
// were recognized nowhere as TMs (click without effect, "Misc" category,
// moves absent from getCtCsMoveIds' TM/HM channel). Now a shared
// isCtCsItem predicate (moveId + ct_*/cs_* key) recognizes them.

// Vague 40 — GAME_HELPERS ne sert plus qu'au slice getCtCsMoveIds (ci-dessous) ;
// les autres lectures partent par PROD_R via la boucle mixte ordonnée.
const GAME_HELPERS = fs.readFileSync(new URL('../src/data/game-helpers.js', import.meta.url), 'utf8');
const PROD_R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function extractFrom(src, signature) {
  const re = new RegExp('function ' + signature + '\\s*\\{[\\s\\S]*?\\n\\}');
  const m = src.match(re);
  assert.ok(m, `extraction de ${signature} impossible`);
  return m[0];
}

// Loads the real sources (item data included) into a vm context.
// `calls` receives ['use', key] / ['info', key] via the routing spies.
function makeEnv() {
  const calls = [];
  const titleEl = { textContent: '' };
  const sandbox = {
    console,
    calls,
    titleEl,
    document: { getElementById: (id) => (id === 'usm-title' ? titleEl : null) },
    t: (k) => k,
    tr: (k) => k,
    G: { inventory: { ct06_toxic: 1, ct_airshlash: 1, cs01_cut: 1, rarecandy: 2 }, team: [], collection: {}, lang: 'fr' },
    openUnifiedSelectorModal: (mode) => calls.push(['selector', mode]),
    getMoveName: (id) => 'MV_' + id,
    notify: () => {},
    saveGame: () => {},
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  // Vague 40 — ex concat 'bag-item-usage#passe11' : mêmes sources, même ordre
  // (slice inclus dans le flux classique tant qu'il l'est, bundlé si ESM).
  const SLICE = '__slice/getCtCsMoveIds(game-helpers.js)';
  for (const seg of harnessRunMixed(
    ['src/data/items-data.js', 'src/data/items-helpers.js', SLICE,
     'src/ui/game/inventory.js', 'src/application/economy/inventory-actions.js'],
    (label) => (label === SLICE ? extractFrom(GAME_HELPERS, 'getCtCsMoveIds\\(\\)') : PROD_R(label))
  )) vm.runInContext(seg.source, sandbox, { filename: seg.filename });
  // Routing spies installed AFTER loading: handleInventoryClick
  // resolves them dynamically on the global object (attached function declarations).
  sandbox.realOnInventoryClick = sandbox.onInventoryClick;
  sandbox.onInventoryClick = (key) => calls.push(['use', key]);
  sandbox.openItemInfo = (key) => calls.push(['info', key]);
  return sandbox;
}

test('left-click on a TM → usage flow', () => {
  const env = makeEnv();
  env.handleInventoryClick('ct06_toxic');
  assert.deepEqual(env.calls[0], ['use', 'ct06_toxic']);
});

test('left-click on an HM → usage flow', () => {
  const env = makeEnv();
  env.handleInventoryClick('cs01_cut');
  assert.deepEqual(env.calls[0], ['use', 'cs01_cut']);
});

test('left-click on an evolution item → usage flow', () => {
  const env = makeEnv();
  env.handleInventoryClick('kings_rock'); // type evolution
  env.handleInventoryClick('fire_stone'); // type stone
  assert.deepEqual(env.calls[0], ['use', 'kings_rock']);
  assert.deepEqual(env.calls[1], ['use', 'fire_stone']);
});

test('left-click on a Rare Candy → usage flow', () => {
  const env = makeEnv();
  env.handleInventoryClick('rarecandy');
  assert.deepEqual(env.calls[0], ['use', 'rarecandy']);
});

test('left-click on a treasure → sell screen', () => {
  const env = makeEnv();
  env.handleInventoryClick('nugget');
  assert.deepEqual(env.calls[0], ['use', 'nugget']);
});

test('non-usable items → info panel kept (left-click)', () => {
  const env = makeEnv();
  env.handleInventoryClick('charcoal');    // held item
  env.handleInventoryClick('armor_fossil'); // fossil
  env.handleInventoryClick('pokeflute');    // key item
  assert.deepEqual(env.calls[0], ['info', 'charcoal']);
  assert.deepEqual(env.calls[1], ['info', 'armor_fossil']);
  assert.deepEqual(env.calls[2], ['info', 'pokeflute']);
});

test('equip mode (from the team) keeps priority and rejects non-holdables', () => {
  // Behavior REVISED in phase 18: before, the equip callback was
  // consumed with ANY item (TMs included) which then failed
  // silently — the next click opened the info panel (reported bug).
  // Now: non-holdable item → callback KEPT, nothing else triggered;
  // holdable item → callback consumed and invoked.
  const env = makeEnv();
  const got = [];
  env.window._equipCallback = (key) => got.push(key);
  env.handleInventoryClick('ct06_toxic'); // TM: not holdable → callback kept
  assert.deepEqual(got, [], 'non-holdable TM: no callback call');
  assert.ok(env.window._equipCallback, 'callback kept after refusal');
  assert.equal(env.calls.length, 0, 'neither use nor info triggered');
  env.handleInventoryClick('charcoal'); // held item: the callback wins
  assert.deepEqual(got, ['charcoal']);
  assert.equal(env.window._equipCallback, null);
});

test('unknown item: no effect', () => {
  const env = makeEnv();
  env.handleInventoryClick('does_not_exist');
  assert.equal(env.calls.length, 0);
});

// ── TM without declared `type` (e.g. ct_airshlash) ─────────────────────────

test('isCtCsItem recognizes a typed TM, a typeless TM and an HM', () => {
  const env = makeEnv();
  assert.equal(env.isCtCsItem('ct06_toxic'), true);
  assert.equal(env.isCtCsItem('ct_airshlash'), true, 'typeless TM recognized');
  assert.equal(env.isCtCsItem('cs01_cut'), true);
  assert.equal(env.isCtCsItem('charcoal'), false);
  assert.equal(env.isCtCsItem('kings_rock'), false);
  assert.equal(env.isCtCsItem('objet_inexistant'), false);
});

test('left-click on a typeless TM → usage flow (no more no-op nor info)', () => {
  const env = makeEnv();
  env.handleInventoryClick('ct_airshlash');
  assert.deepEqual(env.calls[0], ['use', 'ct_airshlash']);
});

test('itemCat puts a typeless TM in ct_cs (not in "Misc")', () => {
  const env = makeEnv();
  assert.equal(env.itemCat('ct_airshlash'), 'ct_cs');
  assert.equal(env.itemCat('ct06_toxic'), 'ct_cs');
  assert.equal(env.itemCat('charcoal'), 'held');
  assert.equal(env.itemCat('kings_rock'), 'evolution');
});

test('getCtCsMoveIds includes the typeless TMs moves', () => {
  const env = makeEnv();
  const map = env.getCtCsMoveIds();
  assert.equal(map['toxic'], true, 'typed TM');
  assert.equal(map['air_shlash'], true, 'typeless TM');
  assert.equal(map['cut'], true, 'CS');
});

test('typeless TM: real usage without crash and (TM)-suffixed title', () => {
  const env = makeEnv();
  // Restores the real onInventoryClick to pass through startLearnMoveCtCs.
  env.onInventoryClick = env.realOnInventoryClick;
  vm.runInContext('__err = null; try { handleInventoryClick("ct_airshlash"); } catch (e) { __err = String(e && e.message || e); }', env);
  assert.equal(env.__err, null, 'no crash (itm.type.toUpperCase fixed)');
  assert.equal(env.G.pendingItemUseKey, 'ct_airshlash');
  assert.ok(env.calls.some((c) => c[0] === 'selector' && c[1] === 'item_ct_cs_ct_airshlash'), 'selector opened');
  assert.ok(/\(CT\)/.test(env.titleEl.textContent), `titre CT attendu : ${env.titleEl.textContent}`);
});

test('typed TM: the title stays (TM)-suffixed as before', () => {
  const env = makeEnv();
  env.onInventoryClick = env.realOnInventoryClick;
  vm.runInContext('__err = null; try { handleInventoryClick("ct06_toxic"); } catch (e) { __err = String(e && e.message || e); }', env);
  assert.equal(env.__err, null);
  assert.ok(/\(CT\)/.test(env.titleEl.textContent), `titre CT attendu : ${env.titleEl.textContent}`);
});

test('HM: the title is (HM)-suffixed', () => {
  const env = makeEnv();
  env.onInventoryClick = env.realOnInventoryClick;
  vm.runInContext('__err = null; try { handleInventoryClick("cs01_cut"); } catch (e) { __err = String(e && e.message || e); }', env);
  assert.equal(env.__err, null);
  assert.ok(/\(CS\)/.test(env.titleEl.textContent), `titre CS attendu : ${env.titleEl.textContent}`);
});

