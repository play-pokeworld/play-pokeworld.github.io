import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 18 — Régression : équipement d'objets depuis la fenêtre Team ─────
// Bug remonté : clic gauche sur un objet du sac (ouvert via la fenêtre Team)
// → le panneau d'info s'ouvrait au lieu d'équiper l'objet et de fermer le sac.
// 3 causes, toutes couvertes ici :
//  1) le sélecteur plantait sur `Object.entries(itm.buff)` (plus AUCUN objet
//     n'a de propriété buff → TypeError → le sélecteur ne s'affichait jamais) ;
//  2) equipItemDirect exigeait `ITEMS[key].buff` → échec silencieux sur tous
//     les objets modernes (type_boost, choice, baies…) ;
//  3) le callback d'équipement était consommé même en cas d'échec → le clic
//     suivant repartait sur openItemInfo (le « panneau d'info »).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const fsContent = { innerHTML: '', scrollTop: 42 };
  const G = {
    lang: 'fr', region: 'kanto', badges: [],
    team: [], teamSlotItems: [], collection: {}, hatchery: [],
    inventory: { mystic_water: 1, babiri_berry: 2, prine_berry: 3, fire_stone: 1, choice_band: 1 }, // passe 27 : baies Oran/Sitrus/Ceriz retirées du jeu
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
  // Arrow capturant sandbox : un appel nu depuis le vm aurait un `this` ambigu.
  sandbox.closeFullscreenPanel = () => { sandbox._closed++; };
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/game/world/team.js', 'src/game/core/pokemon-factory.js',
    'src/game/economy/inventory.js', 'src/game/display/team-ui.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}

// PD stub léger nécessaire à createPoke non sollicité ici — pas de génération.

test('helper isHeldEquippableItem : held/buff tenables, pierres et CT exclus', () => {
  const sb = makeSandbox();
  assert.equal(sb.isHeldEquippableItem('mystic_water'), true, 'type_boost tenable');
  assert.equal(sb.isHeldEquippableItem('babiri_berry'), true, 'baie tenable');
  assert.equal(sb.isHeldEquippableItem('choice_band'), true, 'choice tenable');
  assert.equal(sb.isHeldEquippableItem('prine_berry'), true, 'legacy buff tenable');
  assert.equal(sb.isHeldEquippableItem('fire_stone'), false, "pierre d'évolution NON tenable");
  assert.equal(sb.isHeldEquippableItem('objet_inconnu'), false, 'inconnu non tenable');
});

test('le sélecteur ne plante plus : objets sans buff rendus, pierres filtrées', () => {
  const sb = makeSandbox();
  sb.syncTeamSlotHeldItems && sb.syncTeamSlotHeldItems();
  sb.showItemSelectorForPokemon(0);
  const html = sb._fsContent.innerHTML;
  assert.ok(html.length > 500, 'le sélecteur a bien été rendu (aucun TypeError)');
  assert.ok(html.includes('mystic_water'), 'Eau Mystérieuse (type_boost, sans buff) listée');
  assert.ok(html.includes('babiri_berry'), 'baies listées');
  assert.ok(html.includes('prine_berry'), 'Baie Prine (legacy buff) listée');
  assert.ok(html.includes('choice_band'), 'Bandeau Choix listé');
  assert.ok(!html.includes('fire_stone'), "pierre d'évolution exclue du sélecteur");
  assert.ok(html.includes('equipItemDirect'), 'chaque ligne déclenche equipItemDirect');
});

test('equipItemDirect équipe un objet type_boost (sans buff) et ferme le panneau', () => {
  const sb = makeSandbox();
  sb.syncTeamSlotHeldItems && sb.syncTeamSlotHeldItems();
  sb.equipItemDirect(0, 'mystic_water');
  assert.equal(sb.getTeamSlotItem(0), 'mystic_water', 'objet placé dans le slot 0');
  assert.equal(sb.G.team[0].heldItem, 'mystic_water', 'propagé vers p.heldItem');
  assert.equal(sb._closed, 1, 'le sac se ferme après équipement');
  // Un objet non tenable ne fait rien (et ne casse pas le flux)
  sb.equipItemDirect(1, 'fire_stone');
  assert.notEqual(sb.getTeamSlotItem(1), 'fire_stone', 'pierre non équipée');
});

test('clic sac en mode équipement : callback conservé si objet non tenable', () => {
  const sb = makeSandbox();
  let called = 0;
  sb.window._equipCallback = () => { called++; };
  // Clic sur une pierre → callback NON consommé, pas d'appel
  sb.handleInventoryClick('fire_stone');
  assert.equal(called, 0, 'aucun équipement de pierre');
  assert.ok(sb.window._equipCallback, 'callback conservé pour un autre essai');
  // Clic sur un objet tenable → callback consommé puis appelé
  sb.handleInventoryClick('mystic_water');
  assert.equal(called, 1, 'objet tenable équipé via callback');
  assert.equal(sb.window._equipCallback, null, 'callback consommé après succès');
  // Sans callback : clic gauche sur objet non utilisable → panneau d'info (comportement normal du sac)
  // (ici openItemInfo est présent via items-helpers : on vérifie juste qu'aucun throw)
  sb.handleInventoryClick('mystic_water');
});

test('getHeldBuff : choice_band/stat+mult actifs (branche morte réparée), prine_berry legacy', () => {
  const sb = makeSandbox();
  sb.setTeamSlotItem(0, 'choice_band');
  sb.G.team[0].heldItem = 'choice_band';
  const buff = sb.getHeldBuff(sb.G.team[0]);
  assert.ok(Math.abs(buff.atk - 0.5) < 1e-9, `Bandeau Choix → +50% ATK (canon), reçu ${buff.atk}`);
  // Baie Prine : système legacy buff (3 unités / 25 → +3% DEF)
  sb.setTeamSlotItem(0, 'prine_berry');
  sb.G.team[0].heldItem = 'prine_berry';
  const buff2 = sb.getHeldBuff(sb.G.team[0]);
  assert.ok(Math.abs(buff2.def - 0.25 * (3 / 25)) < 1e-9, `Baie Prine ×3 → +3% DEF, reçu ${buff2.def}`);
});

