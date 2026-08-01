import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 16 — objets tenus : ils suivent le POKÉMON, pas le n° de slot ────
// Bug remonté : échanger deux Pokémon dans la fenêtre Party laissait l'objet
// sur le slot (les deux Pokémon se retrouvaient avec l'objet de l'autre) ;
// supprimer un Pokémon laissait son objet au slot, hérité par le suivant.
const TEAM = fs.readFileSync(new URL('../src/game/world/team.js', import.meta.url), 'utf8');
const TEAM_UI = fs.readFileSync(new URL('../src/game/display/team-ui.js', import.meta.url), 'utf8');
const TEAM_MANAGE = fs.readFileSync(new URL('../src/game/display/team-manage.js', import.meta.url), 'utf8');
const BOX_UI = fs.readFileSync(new URL('../src/game/display/box-ui.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/game/boxes/box-selector.js', import.meta.url), 'utf8');

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
  vm.runInContext(TEAM, sandbox, { filename: 'team.js' });
  if (withManage) vm.runInContext(TEAM_MANAGE, sandbox, { filename: 'team-manage.js' });
  return sandbox;
}
function poke(name, uid) {
  return { id: 25, name, uid: uid || name, level: 20, currentHP: 40, maxHP: 40, heldItem: null };
}

test('helpers présents et exportés (swapTeamSlotItems, removeTeamSlotItemAt)', () => {
  assert.ok(/function swapTeamSlotItems\(/.test(TEAM), 'swapTeamSlotItems défini');
  assert.ok(/function removeTeamSlotItemAt\(/.test(TEAM), 'removeTeamSlotItemAt défini');
  assert.ok(TEAM.includes('window.swapTeamSlotItems = swapTeamSlotItems'), 'swap exporté');
  assert.ok(TEAM.includes('window.removeTeamSlotItemAt = removeTeamSlotItemAt'), 'remove exporté');
  // Call sites mis à jour
  assert.ok(TEAM_UI.includes('swapTeamSlotItems(sourceIdx, targetIdx)'), 'glisser-déposer Party : items échangés');
  assert.ok(TEAM_MANAGE.includes('removeTeamSlotItemAt(idx)'), 'removeFromTeam : item supprimé avec le Pokémon');
  assert.ok(TEAM_MANAGE.includes('setTeamSlotItem(teamIdx, null)'), 'swap équipe↔box : item libéré');
  assert.ok(TEAM_MANAGE.includes('_itemByPoke'), 'preset : réagencement des items mémorisé');
  assert.ok(BOX_UI.includes('setTeamSlotItem(idx, null)'), 'swap box-ui : item libéré');
  assert.ok(BOX_UI.includes('removeTeamSlotItemAt(idx)'), 'sendTeamToBox : item supprimé');
  assert.ok(BOX_SELECTOR.includes('setTeamSlotItem(_swapSlotIdx, null)'), 'sélecteur : remplacement libère l\'item');
  assert.ok(BOX_SELECTOR.includes('removeTeamSlotItemAt(_depIdx)'), 'sélecteur : dépôt pension retire l\'item');
});

test('échange drag & drop : les objets échangent de place avec leurs porteurs', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B');
  sb.G.team = [A, B];
  sb.G.teamSlotItems = ['choice_band', 'leftovers'];
  sb.syncTeamSlotHeldItems();
  assert.equal(A.heldItem, 'choice_band');
  assert.equal(B.heldItem, 'leftovers');
  // Simule teamDrop : les Pokémon échangent leurs places…
  sb.G.team[0] = B; sb.G.team[1] = A;
  // …puis les objets sont échangés eux aussi (passe 16)
  sb.swapTeamSlotItems(0, 1);
  assert.equal(sb.G.teamSlotItems[0], 'leftovers', 'slot 0 = objet de B');
  assert.equal(sb.G.teamSlotItems[1], 'choice_band', 'slot 1 = objet de A');
  assert.equal(A.heldItem, 'choice_band', 'A garde SON objet après l\'échange');
  assert.equal(B.heldItem, 'leftovers', 'B garde SON objet après l\'échange');
});

test('suppression : l\'objet du Pokémon retiré part, ceux des suivants glissent', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B'); const C = poke('C');
  sb.G.team = [A, B, C];
  sb.G.teamSlotItems = ['choice_band', 'leftovers', 'focus_band'];
  sb.syncTeamSlotHeldItems();
  // Retire A (index 0) : B et C remontent d'un cran
  sb.G.team.splice(0, 1);
  sb.removeTeamSlotItemAt(0);
  assert.equal(sb.G.teamSlotItems[0], 'leftovers', 'B récupère SA propre ceinture…');
  assert.equal(sb.G.teamSlotItems[1], 'focus_band', 'C garde SON objet');
  assert.equal(B.heldItem, 'leftovers');
  assert.equal(C.heldItem, 'focus_band');
  assert.equal(sb.itemEquippedOnTeam('choice_band'), null, 'objet de A libéré (réassignable)');
  assert.equal(sb.G.teamSlotItems.length, 6, 'toujours 6 slots');
});

test('remplacement équipe↔box : l\'objet du sortant est libéré, l\'arrivant sans objet', () => {
  const sb = makeSandbox();
  const A = poke('A'); const B = poke('B');
  sb.G.team = [A];
  sb.G.teamSlotItems = ['choice_band'];
  sb.syncTeamSlotHeldItems();
  const boxed = poke('Boxmon');
  sb.G.collection['box_1'] = boxed;
  // Simule swapBoxWithTeam : A part au box, boxed arrive au slot 0
  sb.G.team[0] = boxed;
  sb.setTeamSlotItem(0, null);
  assert.equal(boxed.heldItem, null, 'le remplaçant arrive sans objet');
  assert.equal(sb.itemEquippedOnTeam('choice_band'), null, 'objet du sortant libéré');
});

test('preset : chaque Pokémon retrouve SON objet à sa nouvelle place', () => {
  const sb = makeSandbox(true);
  const A = poke('A', 'uidA'); const B = poke('B', 'uidB'); const C = poke('C', 'uidC');
  sb.G.team = [A, B];
  sb.G.teamSlotItems = ['choice_band', 'leftovers'];
  sb.syncTeamSlotHeldItems();
  sb.G.teamPresets = { preset1: { name: 'X', uids: ['uidB', 'uidC', 'uidA'] } };
  sb.G.collection['999'] = C; // C au PC (sans objet)
  sb.loadTeamFromPreset('preset1');
  assert.equal(sb.G.team[0], B, 'B en tête');
  assert.equal(sb.G.team[1], C, 'C rappelé du PC');
  assert.equal(sb.G.team[2], A, 'A en 3e');
  assert.equal(B.heldItem, 'leftovers', 'B a gardé SON objet');
  assert.equal(A.heldItem, 'choice_band', 'A a gardé SON objet');
  assert.equal(C.heldItem, null, 'C (venu du PC) sans objet');
  assert.equal(sb.itemEquippedOnTeam('leftovers'), B, 'porteur cohérent');
});

test('purge des objets orphelins au-delà de la taille de l\'équipe', () => {
  const sb = makeSandbox();
  const A = poke('A');
  sb.G.team = [A];
  sb.G.teamSlotItems = ['choice_band', 'leftovers', null, 'focus_band'];
  sb.syncTeamSlotHeldItems();
  assert.equal(sb.G.teamSlotItems[1], null, 'slot 1 (hors équipe) purgé');
  assert.equal(sb.G.teamSlotItems[3], null, 'slot 3 (hors équipe) purgé');
  assert.equal(A.heldItem, 'choice_band', 'objet du Pokémon conservé');
});

test('intégration : le bonus d\'objet (getHeldBuff) suit le porteur après échange', () => {
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
  assert.equal(sb.getHeldBuff(B).atk, 0, 'B sans bonus');
});

