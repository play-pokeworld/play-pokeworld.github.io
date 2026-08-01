import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 11 : clic gauche du sac sur un objet utilisable ───────────────────
// Bug remonté : un clic gauche sur une CT, un objet d'évolution ou un Super
// Bonbon ouvrait le panneau d'information au lieu de la liste des Pokémon
// (flux d'utilisation). handleInventoryClick ouvrait openItemInfo pour TOUS
// les objets. Correctif : prédicat isUsableBagItem + routage vers
// onInventoryClick. Le panneau d'info reste au clic droit (data-context-call).
//
// Correctif collatéral : 28 CT déclarées sans `type` (ex. ct_airshlash)
// n'étaient reconnues nulle part comme CT (clic sans effet, catégorie « Divers »,
// attaques absentes du canal CT/CS de getCtCsMoveIds). Désormais un prédicat
// partagé isCtCsItem (moveId + clé ct_*/cs_*) les reconnaît.

const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
const HELPERS = fs.readFileSync(new URL('../src/data/items-helpers.js', import.meta.url), 'utf8');
const GAME_HELPERS = fs.readFileSync(new URL('../src/data/game-helpers.js', import.meta.url), 'utf8');
const INVENTORY = fs.readFileSync(new URL('../src/game/economy/inventory.js', import.meta.url), 'utf8');
const ACTIONS = fs.readFileSync(new URL('../src/game/economy/inventory-actions.js', import.meta.url), 'utf8');

function extractFrom(src, signature) {
  const re = new RegExp('function ' + signature + '\\s*\\{[\\s\\S]*?\\n\\}');
  const m = src.match(re);
  assert.ok(m, `extraction de ${signature} impossible`);
  return m[0];
}

// Charge les sources réelles (données d'objets comprises) dans un contexte vm.
// `calls` reçoit ['use', key] / ['info', key] via les espions de routage.
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
  vm.runInContext(
    ITEMS_DATA + '\n'
    + HELPERS + '\n'
    + extractFrom(GAME_HELPERS, 'getCtCsMoveIds\\(\\)') + '\n'
    + INVENTORY + '\n'
    + ACTIONS,
    sandbox,
    { filename: 'bag-item-usage#passe11' }
  );
  // Espions de routage installés APRÈS chargement : handleInventoryClick les
  // résout dynamiquement sur l'objet global (déclarations fonction attachées).
  sandbox.realOnInventoryClick = sandbox.onInventoryClick;
  sandbox.onInventoryClick = (key) => calls.push(['use', key]);
  sandbox.openItemInfo = (key) => calls.push(['info', key]);
  return sandbox;
}

test('clic gauche sur une CT → flux d\'utilisation', () => {
  const env = makeEnv();
  env.handleInventoryClick('ct06_toxic');
  assert.deepEqual(env.calls[0], ['use', 'ct06_toxic']);
});

test('clic gauche sur une CS → flux d\'utilisation', () => {
  const env = makeEnv();
  env.handleInventoryClick('cs01_cut');
  assert.deepEqual(env.calls[0], ['use', 'cs01_cut']);
});

test('clic gauche sur un objet d\'évolution → flux d\'utilisation', () => {
  const env = makeEnv();
  env.handleInventoryClick('kings_rock'); // type evolution
  env.handleInventoryClick('fire_stone'); // type stone
  assert.deepEqual(env.calls[0], ['use', 'kings_rock']);
  assert.deepEqual(env.calls[1], ['use', 'fire_stone']);
});

test('clic gauche sur un Super Bonbon → flux d\'utilisation', () => {
  const env = makeEnv();
  env.handleInventoryClick('rarecandy');
  assert.deepEqual(env.calls[0], ['use', 'rarecandy']);
});

test('clic gauche sur un trésor → écran de vente', () => {
  const env = makeEnv();
  env.handleInventoryClick('nugget');
  assert.deepEqual(env.calls[0], ['use', 'nugget']);
});

test('objets non utilisables → panneau d\'info conservé (clic gauche)', () => {
  const env = makeEnv();
  env.handleInventoryClick('charcoal');    // objet tenu
  env.handleInventoryClick('armor_fossil'); // fossile
  env.handleInventoryClick('pokeflute');    // objet clé
  assert.deepEqual(env.calls[0], ['info', 'charcoal']);
  assert.deepEqual(env.calls[1], ['info', 'armor_fossil']);
  assert.deepEqual(env.calls[2], ['info', 'pokeflute']);
});

test('le mode équipement (depuis l\'équipe) garde la priorité et rejette les non-tenables', () => {
  // Comportement REVU en passe 18 : avant, le callback d'équipement était
  // consommé avec N'IMPORTE quel objet (CT comprise) qui échouait ensuite
  // silencieusement — le clic suivant ouvrait le panneau d'info (bug signalé).
  // Désormais : objet non tenable → callback CONSERVÉ, rien d'autre déclenché ;
  // objet tenable → callback consommé et invoqué.
  const env = makeEnv();
  const got = [];
  env.window._equipCallback = (key) => got.push(key);
  env.handleInventoryClick('ct06_toxic'); // CT : pas tenable → callback conservé
  assert.deepEqual(got, [], 'CT non tenable : pas d\'appel du callback');
  assert.ok(env.window._equipCallback, 'callback conservé après refus');
  assert.equal(env.calls.length, 0, 'ni use ni info déclenchés');
  env.handleInventoryClick('charcoal'); // objet tenu : le callback prime
  assert.deepEqual(got, ['charcoal']);
  assert.equal(env.window._equipCallback, null);
});

test('objet inconnu : aucun effet', () => {
  const env = makeEnv();
  env.handleInventoryClick('does_not_exist');
  assert.equal(env.calls.length, 0);
});

// ── CT sans `type` déclaré (ex. ct_airshlash) ──────────────────────────────

test('isCtCsItem reconnaît une CT typée, une CT sans type et une CS', () => {
  const env = makeEnv();
  assert.equal(env.isCtCsItem('ct06_toxic'), true);
  assert.equal(env.isCtCsItem('ct_airshlash'), true, 'CT sans type reconnue');
  assert.equal(env.isCtCsItem('cs01_cut'), true);
  assert.equal(env.isCtCsItem('charcoal'), false);
  assert.equal(env.isCtCsItem('kings_rock'), false);
  assert.equal(env.isCtCsItem('objet_inexistant'), false);
});

test('clic gauche sur une CT sans type → flux d\'utilisation (plus de no-op ni d\'info)', () => {
  const env = makeEnv();
  env.handleInventoryClick('ct_airshlash');
  assert.deepEqual(env.calls[0], ['use', 'ct_airshlash']);
});

test('itemCat classe une CT sans type dans ct_cs (et non dans « Divers »)', () => {
  const env = makeEnv();
  assert.equal(env.itemCat('ct_airshlash'), 'ct_cs');
  assert.equal(env.itemCat('ct06_toxic'), 'ct_cs');
  assert.equal(env.itemCat('charcoal'), 'held');
  assert.equal(env.itemCat('kings_rock'), 'evolution');
});

test('getCtCsMoveIds inclut les attaques des CT sans type', () => {
  const env = makeEnv();
  const map = env.getCtCsMoveIds();
  assert.equal(map['toxic'], true, 'CT typée');
  assert.equal(map['air_shlash'], true, 'CT sans type');
  assert.equal(map['cut'], true, 'CS');
});

test('CT sans type : usage réel sans crash et titre suffixé (CT)', () => {
  const env = makeEnv();
  // Rétablit le vrai onInventoryClick pour traverser startLearnMoveCtCs.
  env.onInventoryClick = env.realOnInventoryClick;
  vm.runInContext('__err = null; try { handleInventoryClick("ct_airshlash"); } catch (e) { __err = String(e && e.message || e); }', env);
  assert.equal(env.__err, null, 'aucun crash (itm.type.toUpperCase corrigé)');
  assert.equal(env.G.pendingItemUseKey, 'ct_airshlash');
  assert.ok(env.calls.some((c) => c[0] === 'selector' && c[1] === 'item_ct_cs_ct_airshlash'), 'sélecteur ouvert');
  assert.ok(/\(CT\)/.test(env.titleEl.textContent), `titre CT attendu : ${env.titleEl.textContent}`);
});

test('CT typée : le titre reste suffixé (CT) comme avant', () => {
  const env = makeEnv();
  env.onInventoryClick = env.realOnInventoryClick;
  vm.runInContext('__err = null; try { handleInventoryClick("ct06_toxic"); } catch (e) { __err = String(e && e.message || e); }', env);
  assert.equal(env.__err, null);
  assert.ok(/\(CT\)/.test(env.titleEl.textContent), `titre CT attendu : ${env.titleEl.textContent}`);
});

test('CS : le titre est suffixé (CS)', () => {
  const env = makeEnv();
  env.onInventoryClick = env.realOnInventoryClick;
  vm.runInContext('__err = null; try { handleInventoryClick("cs01_cut"); } catch (e) { __err = String(e && e.message || e); }', env);
  assert.equal(env.__err, null);
  assert.ok(/\(CS\)/.test(env.titleEl.textContent), `titre CS attendu : ${env.titleEl.textContent}`);
});

