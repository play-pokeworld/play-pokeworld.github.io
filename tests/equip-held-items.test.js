import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phase 18 — Regression: equipping items from the Team window ────────────
// Reported bug: left-click on a bag item (opened via the Team window)
// → the info panel opened instead of equipping the item and closing the bag.
// 3 causes, all covered here:
//  1) the selector crashed on `Object.entries(itm.buff)` (NO item
//     has a buff property anymore → TypeError → the selector never showed);
//  2) equipItemDirect required `ITEMS[key].buff` → silent failure on all
//     modern items (type_boost, choice, berries…);
//  3) the equip callback was consumed even on failure → the next
//     click went back to openItemInfo (the "info panel").

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const fsContent = { innerHTML: '', scrollTop: 42 };
  const G = {
    lang: 'fr', region: 'kanto', badges: [],
    team: [], teamSlotItems: [], collection: {}, hatchery: [],
    inventory: { mystic_water: 1, babiri_berry: 2, prine_berry: 3, fire_stone: 1, choice_band: 1 }, // phase 27: Oran/Sitrus/Ceriz berries removed from the game
    unlockedTalents: {}, money: 0,
  };
  const team = [
    { uid: 'a', id: 25, level: 20, name: 'Pikachu', currentHP: 40, maxHP: 40, xp: 0, xpNext: 100, moves: [{ id: 'tackle' }], heldItem: null },
    { uid: 'b', id: 7, level: 18, name: 'Carapuce', currentHP: 38, maxHP: 38, xp: 0, xpNext: 100, moves: [{ id: 'tackle' }], heldItem: null },
  ];
  G.team = team;
  const sandbox = {
    console, window: {}, document: { getElementById: (id) => (id === 'fs-panel-content' ? fsContent : null) },
    G,
    battle: { active: false },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k, o) => k.replace('{item}', (o && o.item) || '').replace('{name}', (o && o.name) || ''),
    getPokeName: (id) => 'P' + id, getItemName: (k) => k, getMoveName: (id) => id,
    notify: () => {}, saveGame: () => {}, setMsg: () => {}, updateHeader: () => {},
    addToInventory: () => {}, itemSpriteHtml: () => '<img>', getIcon: () => '',
    _closed: 0,
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
    _fsContent: fsContent,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // Arrow capturing sandbox: a bare call from the vm would have an ambiguous `this`.
  sandbox.closeFullscreenPanel = () => { sandbox._closed++; };
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/application/world/team.js', 'src/application/pokemon-factory.js',
    'src/ui/game/inventory.js', 'src/ui/game/team-ui.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}

// Light PD stub needed by createPoke, unused here — no generation.

test('helper isHeldEquippableItem : held/buff tenables, pierres et CT exclus', () => {
  const sb = makeSandbox();
  assert.equal(sb.isHeldEquippableItem('mystic_water'), true, 'type_boost tenable');
  assert.equal(sb.isHeldEquippableItem('babiri_berry'), true, 'baie tenable');
  assert.equal(sb.isHeldEquippableItem('choice_band'), true, 'choice tenable');
  assert.equal(sb.isHeldEquippableItem('prine_berry'), true, 'legacy buff tenable');
  assert.equal(sb.isHeldEquippableItem('fire_stone'), false, "evolution stone NOT held-equippable");
  assert.equal(sb.isHeldEquippableItem('objet_inconnu'), false, 'unknown item not equippable');
});

test('the selector no longer crashes: buff-less items rendered, stones filtered', () => {
  const sb = makeSandbox();
  sb.syncTeamSlotHeldItems && sb.syncTeamSlotHeldItems();
  sb.showItemSelectorForPokemon(0);
  const html = sb._fsContent.innerHTML;
  assert.ok(html.length > 500, 'the selector rendered fine (no TypeError)');
  assert.ok(html.includes('mystic_water'), 'Mystic Water (type_boost, no buff) listed');
  assert.ok(html.includes('babiri_berry'), 'berries listed');
  assert.ok(html.includes('prine_berry'), 'Prine Berry (legacy buff) listed');
  assert.ok(html.includes('choice_band'), 'Choice Band listed');
  assert.ok(!html.includes('fire_stone'), "evolution stone excluded from the selector");
  assert.ok(html.includes('equipItemDirect'), 'every row triggers equipItemDirect');
});

test('equipItemDirect equips a type_boost item (no buff) and closes the panel', () => {
  const sb = makeSandbox();
  sb.syncTeamSlotHeldItems && sb.syncTeamSlotHeldItems();
  sb.equipItemDirect(0, 'mystic_water');
  assert.equal(sb.getTeamSlotItem(0), 'mystic_water', 'object placed in slot 0');
  assert.equal(sb.G.team[0].heldItem, 'mystic_water', 'propagated to p.heldItem');
  assert.equal(sb._closed, 1, 'the bag closes after equipping');
  // A non-holdable item does nothing (and does not break the flow)
  sb.equipItemDirect(1, 'fire_stone');
  assert.notEqual(sb.getTeamSlotItem(1), 'fire_stone', 'stone not equipped');
});

test('bag click in equip mode: callback kept if item not holdable', () => {
  const sb = makeSandbox();
  let called = 0;
  sb.window._equipCallback = () => { called++; };
  // Click on a stone → callback NOT consumed, no call
  sb.handleInventoryClick('fire_stone');
  assert.equal(called, 0, 'no stone equipment');
  assert.ok(sb.window._equipCallback, 'callback kept for another try');
  // Click on a holdable item → callback consumed then called
  sb.handleInventoryClick('mystic_water');
  assert.equal(called, 1, 'holdable item equipped via callback');
  assert.equal(sb.window._equipCallback, null, 'callback consumed after success');
  // Without callback: left-click on non-usable item → info panel (normal bag behavior)
  // (here openItemInfo is present via items-helpers: we just check nothing throws)
  sb.handleInventoryClick('mystic_water');
});

test('getHeldBuff: choice_band/stat+mult active (dead branch repaired), prine_berry legacy', () => {
  const sb = makeSandbox();
  sb.setTeamSlotItem(0, 'choice_band');
  sb.G.team[0].heldItem = 'choice_band';
  const buff = sb.getHeldBuff(sb.G.team[0]);
  assert.ok(Math.abs(buff.atk - 0.5) < 1e-9, `Choice Band → +50% ATK (canon), got ${buff.atk}`);
  // Prine Berry: legacy buff system (3 units / 25 → +3% DEF)
  sb.setTeamSlotItem(0, 'prine_berry');
  sb.G.team[0].heldItem = 'prine_berry';
  const buff2 = sb.getHeldBuff(sb.G.team[0]);
  assert.ok(Math.abs(buff2.def - 0.25 * (3 / 25)) < 1e-9, `Prine Berry ×3 → +3% DEF, got ${buff2.def}`);
});

