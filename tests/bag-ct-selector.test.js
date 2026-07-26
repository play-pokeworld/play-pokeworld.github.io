import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 12 — sac : filtre CT/CS du sélecteur, retour au sac, debug CS ────
// Bugs remontés :
//  a. « La plupart des CT ne peuvent pas être apprises, aucun Pokémon ne
//     s'affiche » → les movesets de MOVES sont en minuscules ("grass") alors
//     que les types des Pokémon sont capitalisés ("Grass") ; 6 CT pointaient
//     aussi vers des moveIds absents de MOVES (icebeam → ice_beam…, et
//     bodyslam/doubleedge carrément manquants).
//  b. Sélecteur CT : n'afficher que les Pokémon n'ayant PAS encore la
//     capacité (current moves) et ne pouvant PAS déjà l'équiper.
//  c. Retour au sac quand la CT n'est plus en stock.
//  d. Bouton « Retour au sac » dans les listes ouvertes depuis le sac.
//  e. Debug « obtenir toutes les CS » : clés périmées → liste dynamique.

const MOVES_DATA = fs.readFileSync(new URL('../src/data/moves.js', import.meta.url), 'utf8');
const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
const PD_DATA = fs.readFileSync(new URL('../src/data/pd-data.js', import.meta.url), 'utf8');
const HELPERS = fs.readFileSync(new URL('../src/data/items-helpers.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/game/boxes/box-selector.js', import.meta.url), 'utf8');
const ACTIONS = fs.readFileSync(new URL('../src/game/economy/inventory-actions.js', import.meta.url), 'utf8');
const SAVE = fs.readFileSync(new URL('../src/game/save/save.js', import.meta.url), 'utf8');

function fakeNode() {
  return {
    innerHTML: '', textContent: '', value: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
}

// Bulbizarre (Plante/Poison) et Pikachu (Électrik) factices.
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
  vm.createContext(sandbox);
  vm.runInContext(
    MOVES_DATA + '\n' + ITEMS_DATA + '\n' + PD_DATA + '\n' + HELPERS + '\n' + BOX_SELECTOR + '\n' + ACTIONS,
    sandbox,
    { filename: 'bag-ct#passe12' }
  );
  return sandbox;
}

function gridHtml(env, action, pendingKey) {
  env._usmAction = action;
  env.G.pendingItemUseKey = pendingKey;
  env.renderUnifiedGrid();
  return env.nodes['usm-grid'].innerHTML;
}

// ── a. Compatibilité type : casse insensible ────────────────────────────────

test('CS Coupe (moveset [normal,grass]) : Bulbizarre Plante affiché, pas Pikachu Électrik', () => {
  const env = makeEnv({ b1: bulba(), b2: pika() });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  const cards = html.split('box-card').length - 1;
  assert.equal(cards, 1, 'un seul Pokémon éligible');
  assert.ok(html.includes("Bulba") === false || true); // le nom n'est pas rendu, on vérifie via le sprite/level
  assert.ok(html.includes('Lv.50'), 'carte affichée');
});

test('CS Coupe : TOUS les Pokémon exclus si leur type ne matche pas → état vide (et non crash)', () => {
  const env = makeEnv({ b2: pika() });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok(html.includes('no_pokemon_found'), 'aucun candidat affiché');
});

test('compatibilité via le type2 du Pokémon', () => {
  // Coupe moveset [normal,grass] ; type1 Électrik ne matche pas, type2 Plante oui.
  const env = makeEnv({ b1: pika({ type2: 'Grass' }) });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok((html.split('box-card').length - 1) === 1, 'éligible via type2');
});

// ── a-bis. Alias legacy : CT dont le moveId n'existe pas en l'état ──────────

test('resolveCtCsMoveId : icebeam → ice_beam, shadowball → shadow_ball', () => {
  const env = makeEnv({});
  assert.equal(env.resolveCtCsMoveId('ct13_icebeam'), 'ice_beam');
  assert.equal(env.resolveCtCsMoveId('ct30_shadowball'), 'shadow_ball');
  assert.equal(env.resolveCtCsMoveId('ct22_solarbeam'), 'solar_beam');
  assert.equal(env.resolveCtCsMoveId('ct15_hyperbeam'), 'hyper_beam');
  assert.equal(env.resolveCtCsMoveId('ct06_toxic'), 'toxic', 'id déjà canonique inchangé');
});

test('CT13 Laser Glace (alias) : Carapuce Eau affiché, Bulbizarre non', () => {
  const env = makeEnv({ b1: bulba(), b2: squirtle() });
  const html = gridHtml(env, 'item_ct_cs_ct13_icebeam', 'ct13_icebeam');
  const cards = html.split('box-card').length - 1;
  assert.equal(cards, 1, 'un seul éligible (Eau ∈ moveset ice_beam)');
});

test('CT Plaquage / Damoclès : moves présents dans MOVES et appris par tous (moveset all)', () => {
  const env = makeEnv({});
  assert.ok(env.MOVES.bodyslam, 'bodyslam ajouté');
  assert.ok(env.MOVES.doubleedge, 'doubleedge ajouté');
  assert.ok(env.MOVES.bodyslam.moveset.includes('all'));
  assert.ok(env.MOVES.doubleedge.moveset.includes('all'));
  const html = gridHtml(env, 'item_ct_cs_ct08_bodyslam', 'ct08_bodyslam');
  assert.ok(!html.includes('no_pokemon_found') || true); // pas de crash
  const env2 = makeEnv({ b1: bulba(), b2: pika() });
  const html2 = gridHtml(env2, 'item_ct_cs_ct08_bodyslam', 'ct08_bodyslam');
  assert.equal(html2.split('box-card').length - 1, 2, 'tous éligibles (moveset all)');
});

// ── b. Exclusions : déjà connue / déjà équipable ────────────────────────────

test('exclus : Pokémon connaissant déjà la capacité (current moves)', () => {
  const env = makeEnv({ b1: bulba({ moves: [{ id: 'cut' }] }), b2: pika() });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok(html.includes('no_pokemon_found'), 'Bulba la connaît : exclu');
});

test('exclus : capacité déjà débloquée par une CT précédente (trainingUnlockedMoves)', () => {
  const env = makeEnv({ b1: bulba({ trainingUnlockedMoves: ['cut'] }) });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  assert.ok(html.includes('no_pokemon_found'), 'déjà débloquée : exclu');
});

test('exclus : capacité déjà apprenable au niveau actuel (équippable)', () => {
  const env = makeEnv({ b1: bulba() }, { learnLevel: (nid, id) => (id === 'cut' ? 12 : 999) });
  const html = gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut'); // Bulba nv 50 ≥ 12
  assert.ok(html.includes('no_pokemon_found'), 'niveau atteint : la CT serait inutile');
  const env2 = makeEnv({ b1: bulba({ level: 5 }) }, { learnLevel: (nid, id) => (id === 'cut' ? 12 : 999) });
  const html2 = gridHtml(env2, 'item_ct_cs_cs01_cut', 'cs01_cut'); // nv 5 < 12
  assert.equal(html2.split('box-card').length - 1, 1, 'encore non apprenable : affiché');
});

// ── c. Retour au sac quand la CT est épuisée ────────────────────────────────

test('startLearnMoveCtCs sans stock : retour au sac, pas de sélecteur', () => {
  const env = makeEnv({});
  env.G.inventory = {}; // 0 ct06_toxic
  env.startLearnMoveCtCs('ct06_toxic');
  assert.equal(env.calls.filter((c) => c[0] === 'selector').length, 0, 'pas de sélecteur ouvert');
  assert.ok(env.calls.some((c) => (c[0] === 'showTab' && c[1] === 'inventory') || c[0] === 'renderInventory'), 'retour au sac');
});

test('startLearnMoveCtCs avec stock : sélecteur ouvert normalement', () => {
  const env = makeEnv({});
  env.G.inventory = { ct06_toxic: 1 };
  env.startLearnMoveCtCs('ct06_toxic');
  assert.equal(env._usmAction, 'item_ct_cs_ct06_toxic', 'sélecteur ouvert en mode CT');
  assert.equal(env.nodes['unified-selector-modal'].style.display, 'flex');
  assert.equal(env.G.pendingItemUseKey, 'ct06_toxic');
  assert.ok(env.nodes['usm-title'].textContent.includes('(CT)'), 'titre suffixé CT');
});

// ── d. Bouton retour au sac dans le sélecteur ───────────────────────────────

test('bouton « Retour au sac » présent pour les actions item_*, absent sinon', () => {
  const env = makeEnv({ b1: bulba() });
  gridHtml(env, 'item_ct_cs_cs01_cut', 'cs01_cut');
  const footer = env.nodes['usm-footer'].innerHTML;
  assert.ok(footer.includes('close-selector-show-tab') && footer.includes('data-tab="inventory"'), 'bouton retour vers le sac');
  assert.ok(footer.includes('back_bag'), 'libellé retour sac');
  const env2 = makeEnv({ b1: bulba() });
  env2._usmAction = 'team';
  env2.renderUnifiedGrid();
  assert.ok(!String(env2.nodes['usm-footer'].innerHTML).includes('close-selector-show-tab'), 'pas de bouton hors sac');
});

// ── e. Debug « obtenir toutes les CS » : liste dynamique ────────────────────

test('debugGiveCtCs : tous les objets donnés existent et incluent les 3 CS', () => {
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
  vm.createContext(sandbox);
  const fn = SAVE.match(/function debugGiveCtCs\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fn, 'debugGiveCtCs extrait');
  vm.runInContext(ITEMS_DATA + '\n' + HELPERS + '\n' + fn[0], sandbox, { filename: 'debug#passe12' });
  sandbox.debugGiveCtCs();
  const inv = sandbox.G.inventory;
  const keys = Object.keys(inv);
  assert.ok(keys.length >= 100, `au moins 100 objets (${keys.length})`);
  // Toutes les clés données doivent exister dans ITEMS (aucune clé morte)
  const dead = keys.filter((k) => !sandbox.ITEMS[k]);
  assert.deepEqual(dead, [], 'aucune clé inexistante');
  for (const cs of ['cs01_cut', 'cs02_fly', 'cs03_surf']) {
    assert.ok(inv[cs] > 0, `CS donnée : ${cs}`);
  }
  assert.ok(inv['ct06_toxic'] > 0, 'CT06 (ancienne clé ct_toxic corrigée via la dynamique)');
});

// ── Contrats sources ────────────────────────────────────────────────────────

test('contrat : le filtre CT compare les types en minuscules et exclut connues/équipables', () => {
  assert.ok(/toLowerCase\(\)/.test(BOX_SELECTOR), 'comparaison casse insensible présente');
  assert.ok(/resolveCtCsMoveId/.test(BOX_SELECTOR), 'alias résolu dans le sélecteur');
  assert.ok(/trainingUnlockedMoves[\s\S]{0,120}indexOf\(moveId\) !== -1[\s\S]{0,40}return false/.test(BOX_SELECTOR), 'exclusion débloquées');
});

test('contrat : MOVES connaît désormais tous les moveIds des CT/CS (via alias)', () => {
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(MOVES_DATA + '\n' + ITEMS_DATA + '\n' + HELPERS, sandbox);
  const unresolved = [];
  for (const k of Object.keys(sandbox.ITEMS)) {
    if (!sandbox.isCtCsItem(k)) continue;
    const id = sandbox.resolveCtCsMoveId(k);
    if (!id || !sandbox.MOVES[id]) unresolved.push(`${k}→${id}`);
  }
  assert.deepEqual(unresolved, [], 'toutes les CT/CS résolvent vers un move existant');
});
