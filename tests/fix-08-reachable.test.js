import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// FIX-08 — les 14 espèces injoignables de Hoenn sont désormais atteignables.
// Vérifie getReachableSpecies() sur les vraies données du jeu.
const R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const FILES = [
  'src/data/locations-data.js',
  'src/data/locations-johto.js',
  'src/data/locations-hoenn.js',
  'src/data/items-data.js',
  'src/data/story-quests.js',
  'src/data/story-quests-hoenn.js',
  'src/data/side-quests-data.js',
  'src/application/combat/progression.js',
  'src/data/game-helpers.js',
];

function makeSandbox() {
  const sandbox = {
    console,
    window: {},
    G: { lang: 'fr', region: 'hoenn', pokedex: {}, collection: {}, team: [], inventory: {} },
    t: (k) => k, tr: (k) => k, notify: () => {}, saveGame: () => {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(FILES), sandbox, { filename: 'fix-08 [iife]' });
  return sandbox;
}

test('FIX-08: les 14 espèces injoignables sont atteignables (wild + évolutions)', () => {
  const sb = makeSandbox();
  assert.equal(typeof sb.getReachableSpecies, 'function', 'getReachableSpecies exposed');
  const reach = new Set(sb.getReachableSpecies());
  const targets = [237, 273, 274, 275, 299, 307, 312, 313, 325, 326, 339, 340, 341, 342];
  for (const id of targets) {
    assert.ok(reach.has(id), `#${id} atteignable`);
  }
  // Les évolutions ne sont PAS placées en sauvage (elles découlent de la base).
  assert.ok(sb.LOCS_HOENN.route123.wild.every((e) => e[0] !== 326), 'Groret retiré du sauvage (évolue de #325)');
  assert.ok(sb.LOCS_HOENN.route126.wild.every((e) => e[0] !== 340), 'Barbicha retirée du sauvage (évolue de #339)');
  assert.ok(sb.LOCS_HOENN.route122.wild.every((e) => e[0] !== 342), 'Colhomard retiré du sauvage (évolue de #341)');
});

test('FIX-08: toutes les espèces 1..386 sont atteignables', () => {
  const sb = makeSandbox();
  const reach = new Set(sb.getReachableSpecies());
  const missing = [];
  for (let i = 1; i <= 386; i++) if (!reach.has(i)) missing.push(i);
  assert.deepEqual(missing, [], 'aucune espèce manquante (386/386)');
});

test('FIX-08: getReachableSpecies est déterministe et trié', () => {
  const sb = makeSandbox();
  const a = sb.getReachableSpecies();
  const b = sb.getReachableSpecies();
  assert.deepEqual(a, b, 'déterministe');
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1] < a[i], 'trié croissant');
  for (const id of a) assert.ok(id >= 1 && id <= 386, 'ids 1..386');
});

test('FIX-08: les bases sont bien dans les tables sauvages (tables effectives)', () => {
  const sb = makeSandbox();
  const wildH = (locId) => (sb.LOCS_HOENN[locId]?.wild || []).map((e) => e[0]);
  const wildJ = (locId) => (sb.LOCS_JOHTO[locId]?.wild || []).map((e) => e[0]);
  // Hoenn (14 espèces du ticket FIX-08 — bases seulement).
  assert.ok(wildH('route102').includes(273), 'Grainipiot sur la Route 102');
  assert.ok(wildH('route102').includes(341), 'Écrapince sur la Route 102 (eau)');
  assert.ok(wildH('route114').includes(274), 'Pifeuil sur la Route 114');
  assert.ok(wildH('route110').includes(312), 'Négapi sur la Route 110');
  assert.ok(wildH('route111').includes(325), 'Spoink sur la Route 111');
  assert.ok(wildH('route116').includes(307), 'Méditikka sur la Route 116');
  assert.ok(wildH('route117').includes(313), 'Muciole sur la Route 117');
  assert.ok(wildH('route119').includes(339), 'Barloche sur la Route 119');
  assert.ok(wildH('granite_cave').includes(299), 'Tarinor dans la Grotte Granite');
  assert.ok(wildH('victoryroad_ho').includes(237), 'Kapoera sur la Route Victoire Hoenn');
  // Johto/Hoenn manquants, désormais atteignables (tables effectives).
  assert.ok(wildJ('jroute29').includes(161), 'Fouinette sur la Route 29');
  assert.ok(wildJ('ilexforest').includes(204), 'Pomdepic au Bois aux Chênes');
  assert.ok(wildJ('jroute36').includes(185), 'Simularbre sur la Route 36');
  assert.ok(wildJ('nationalpark').includes(190), 'Capumain au Parc Naturel');
  assert.ok(wildJ('slowpokewell').includes(198), 'Cornèbre au Puits Ramoloss');
  assert.ok(wildJ('jroute39').includes(209), 'Snubbull sur la Route 39');
  assert.ok(wildJ('whirlislands').includes(222), 'Corayon aux Tourb\'Îles');
  assert.ok(wildJ('jroute40').includes(223), 'Rémoraid sur la Route 40');
  assert.ok(wildJ('darkcave').includes(216), 'Teddiursa à la Grotte Noire');
  assert.ok(wildJ('jroute45').includes(207), 'Scorplane sur la Route 45');
  assert.ok(wildJ('burnedtower').includes(228), 'Malosse à la Tour Cendrée');
  assert.ok(wildJ('mtsilver').includes(200), 'Feuforêve au Mont Argenté');
  assert.ok(wildH('mt_pyre').includes(292), 'Munja au Mont Mémoria');
  assert.ok(wildH('island_cave').includes(378), 'Regice à la Grotte Isolée');
  assert.ok(wildH('ancient_tomb').includes(379), 'Registeel au Tombeau Antique');
});

