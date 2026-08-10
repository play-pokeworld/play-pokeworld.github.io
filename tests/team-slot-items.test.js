import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 16 — held items: they follow the POKÉMON, not the slot number ─────
// Reported bug: swapping two Pokémon in the Party window left the item
// on the slot (both Pokémon ended up with each other's item);
// removing a Pokémon left its item on the slot, inherited by the next one.
const TEAM = fs.readFileSync(new URL('../src/application/world/team.js', import.meta.url), 'utf8');
const TEAM_UI = fs.readFileSync(new URL('../src/ui/game/team-ui.js', import.meta.url), 'utf8');
const TEAM_MANAGE = fs.readFileSync(new URL('../src/ui/game/team-manage.js', import.meta.url), 'utf8');
const BOX_UI = fs.readFileSync(new URL('../src/ui/game/box-ui.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/ui/game/box-selector.js', import.meta.url), 'utf8');

function makeSandbox(withManage = false) {
  const G = {
    team: [],
    teamSlotItems: [],
    collection: {},
    hatchery: [],
    inventory: { choice_band: 1, leftovers: 1, focus_band: 1 },
  };
  const sandbox = {
    console,
    window: {},
    G,
    ITEMS: {
      choice_band: { type: 'held', stat: 'atk', mult: 1.5 },
      leftovers: { type: 'held', category: 'leftovers' },
      focus_band: { type: 'held', category: 'status' },
    },
    t: (k) => k,
    tr: (k) => k,
    getItemName: (k) => k,
    getTalentName: (k) => k,
    notify: () => {},
    saveGame: () => {},
    updateHeader: () => {},
    renderTeamWindow: () => {},
    setMsg: () => {},
    showTab: () => {},
    battle: { active: false },
    document: { getElementById: () => null, querySelectorAll: () => [] },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle : classique = texte vm direct ;
  // converti ESM (team-manage, vague 41) = bundle isolé, globales via shim.
  for (const [label, src] of [['src/application/world/team.js', TEAM]]
    .concat(withManage ? [['src/ui/game/team-manage.js', TEAM_MANAGE]] : [])) {
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([label]) : src, sandbox, { filename: label });
  }
  return sandbox;
}
function poke(name, uid) {
  return { id: 25, name, uid: uid || name, level: 20, currentHP: 40, maxHP: 40, heldItem: null };
}

test('helpers present and exported (swapTeamSlotItems, removeTeamSlotItemAt)', () => {
  assert.ok(/function swapTeamSlotItems\(/.test(TEAM), 'swapTeamSlotItems defined');
  assert.ok(/function removeTeamSlotItemAt\(/.test(TEAM), 'removeTeamSlotItemAt defined');
  assert.ok(TEAM.includes('window.swapTeamSlotItems = swapTeamSlotItems'), 'swap exported');
  assert.ok(TEAM.includes('window.removeTeamSlotItemAt = removeTeamSlotItemAt'), 'remove exported');
  // Call sites updated
  assert.ok(TEAM_UI.includes('swapTeamSlotItems(sourceIdx, targetIdx)'), 'Party drag & drop: items swapped');
  assert.ok(TEAM_MANAGE.includes('removeTeamSlotItemAt(idx)'), 'removeFromTeam: item removed with the Pokémon');
  assert.ok(TEAM_MANAGE.includes('setTeamSlotItem(teamIdx, null)'), 'team↔box swap: item freed');
  assert.ok(TEAM_MANAGE.includes('_itemByPoke'), 'preset: item rearrangement memorized');
  assert.ok(BOX_UI.includes('setTeamSlotItem(idx, null)'), 'box-ui swap: item freed');
  assert.ok(BOX_UI.includes('removeTeamSlotItemAt(idx)'), 'sendTeamToBox: item removed');
  assert.ok(BOX_SELECTOR.includes('setTeamSlotItem(_swapSlotIdx, null)'), 'selector: replacement frees the item');
  assert.ok(BOX_SELECTOR.includes('removeTeamSlotItemAt(_depIdx)'), 'selector: day-care deposit removes the item');
});

test('drag & drop swap: items swap places with their carriers', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B');
  sb.G.team = [A, B];
  sb.G.teamSlotItems = ['choice_band', 'leftovers'];
  sb.syncTeamSlotHeldItems();
  assert.equal(A.heldItem, 'choice_band');
  assert.equal(B.heldItem, 'leftovers');
  // Simulates teamDrop: the Pokémon swap places…
  sb.G.team[0] = B; sb.G.team[1] = A;
  // …then the items are swapped too (phase 16)
  sb.swapTeamSlotItems(0, 1);
  assert.equal(sb.G.teamSlotItems[0], 'leftovers', 'slot 0 = item of B');
  assert.equal(sb.G.teamSlotItems[1], 'choice_band', 'slot 1 = item of A');
  assert.equal(A.heldItem, 'choice_band', 'A keeps ITS item after the swap');
  assert.equal(B.heldItem, 'leftovers', 'B keeps ITS item after the swap');
});

test('removal: the removed Pokémon\'s item leaves, the followers\' slide', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B'); const C = poke('C');
  sb.G.team = [A, B, C];
  sb.G.teamSlotItems = ['choice_band', 'leftovers', 'focus_band'];
  sb.syncTeamSlotHeldItems();
  // Removes A (index 0): B and C move up one
  sb.G.team.splice(0, 1);
  sb.removeTeamSlotItemAt(0);
  assert.equal(sb.G.teamSlotItems[0], 'leftovers', 'B gets ITS own belt back…');
  assert.equal(sb.G.teamSlotItems[1], 'focus_band', 'C keeps ITS item');
  assert.equal(B.heldItem, 'leftovers');
  assert.equal(C.heldItem, 'focus_band');
  assert.equal(sb.itemEquippedOnTeam('choice_band'), null, 'item of A freed (reassignable)');
  assert.equal(sb.G.teamSlotItems.length, 6, 'always 6 slots');
});

test('team↔box replacement: the outgoing one\'s item is freed, the incoming one itemless', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B');
  sb.G.team = [A];
  sb.G.teamSlotItems = ['choice_band'];
  sb.syncTeamSlotHeldItems();
  const boxed = poke('Boxmon');
  sb.G.collection['box_1'] = boxed;
  // Simulates swapBoxWithTeam: A goes to the box, boxed arrives at slot 0
  sb.G.team[0] = boxed;
  sb.setTeamSlotItem(0, null);
  assert.equal(boxed.heldItem, null, 'the substitute arrives itemless');
  assert.equal(sb.itemEquippedOnTeam('choice_band'), null, 'outgoing item freed');
});

test('preset: every Pokémon gets ITS item back at its new place', () => {
  const sb = makeSandbox(true);
  const A = poke('A', 'uidA'); const B = poke('B', 'uidB'); const C = poke('C', 'uidC');
  sb.G.team = [A, B];
  sb.G.teamSlotItems = ['choice_band', 'leftovers'];
  sb.syncTeamSlotHeldItems();
  sb.G.teamPresets = { preset1: { name: 'X', uids: ['uidB', 'uidC', 'uidA'] } };
  sb.G.collection['999'] = C; // C at the PC (no item)
  sb.loadTeamFromPreset('preset1');
  assert.equal(sb.G.team[0], B, 'B at the head');
  assert.equal(sb.G.team[1], C, 'C recalled from the PC');
  assert.equal(sb.G.team[2], A, 'A en 3e');
  assert.equal(B.heldItem, 'leftovers', 'B kept ITS item');
  assert.equal(A.heldItem, 'choice_band', 'A kept ITS item');
  assert.equal(C.heldItem, null, 'C (from the PC) itemless');
  assert.equal(sb.itemEquippedOnTeam('leftovers'), B, 'coherent holder');
});

test('purge of orphan items beyond the team size', () => {
  const sb = makeSandbox();
  const A = poke('A');
  sb.G.team = [A];
  sb.G.teamSlotItems = ['choice_band', 'leftovers', null, 'focus_band'];
  sb.syncTeamSlotHeldItems();
  assert.equal(sb.G.teamSlotItems[1], null, 'slot 1 (off team) purged');
  assert.equal(sb.G.teamSlotItems[3], null, 'slot 3 (off team) purged');
  assert.equal(A.heldItem, 'choice_band', 'the Pokémon\'s item kept');
});

test('integration: the item bonus (getHeldBuff) follows the carrier after swap', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B');
  A.atk = 50; B.atk = 80;
  sb.G.team = [A, B];
  sb.G.teamSlotItems = ['choice_band', null];
  sb.syncTeamSlotHeldItems();
  const beforeA = sb.getHeldBuff(A).atk;
  assert.ok(Math.abs(beforeA - 0.5) < 1e-9, 'A a le bandeau choix (+50% atk)');
  sb.G.team[0] = B; sb.G.team[1] = A;
  sb.swapTeamSlotItems(0, 1);
  assert.equal(sb.getHeldBuff(A).atk, beforeA, 'le bonus suit A');
  assert.equal(sb.getHeldBuff(B).atk, 0, 'B without bonus');
});

