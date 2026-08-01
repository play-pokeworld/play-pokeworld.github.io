import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 12 — pension : fossiles en incubation, priorité, mode différé,
// auto-remplissage conditionnel ─────────────────────────────────────────────
const HATCHERY = fs.readFileSync(new URL('../src/game/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/game/breeding/hatchery-ui.js', import.meta.url), 'utf8');
const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/game/boxes/box-selector.js', import.meta.url), 'utf8');

function fakeNode() {
  return {
    innerHTML: '', textContent: '', value: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
}

function makeEnv(overrides = {}) {
  const notifs = [];
  const nodes = {
    'poke-modal': fakeNode(),
    'unified-selector-modal': fakeNode(),
    'usm-title': fakeNode(),
    'usm-grid': fakeNode(),
    'usm-search': { value: '' },
    'usm-subtab-bar': fakeNode(),
    'usm-filter-panel': fakeNode(),
    'usm-footer': fakeNode(),
    'quest-modal': fakeNode(),
    'settings-modal': fakeNode(),
  };
  const sandbox = {
    console,
    notifs,
    nodes,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (msg, color) => notifs.push([String(msg), color]),
    addBattleLog: () => {},
    saveGame: () => {},
    updateHeader: () => {},
    renderTeamWindow: () => {},
    renderHatcheryWindow: () => {},
    openHatcheryManagementMenu: () => {},
    t: (k) => k,
    tr: (k, o) => k + (o ? ':' + Object.values(o).join(',') : ''),
    rand: () => 0,
    rollShiny: () => false,
    xpForLevel: () => 0,
    recalcPokeStats: () => {},
    getItemName: (k) => 'ITEM_' + k,
    getPokeName: (id) => 'POKE_' + id,
    createPoke: (id, lvl, shiny) => ({ id, level: lvl, shinyActive: shiny, name: 'POKE_' + id, ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} }),
    unlockShinyForSpecies: () => {},
    speciesOwned: () => false,
    spriteImg: () => '',
    itemIcon: () => '',
    isSpeciesShiny: () => false,
    PD: {},
    ITEMS: { helix_fossil: { type: 'fossil' }, root_fossil: { type: 'fossil' } },
    G: {
      lang: 'fr',
      money: 999999,
      team: [],
      collection: {},
      inventory: { helix_fossil: 1 },
      hatchery: [null],
      hatcheryMaxSlots: 2,
      hatcheryModes: ['breed', 'exp'],
      hatcheryQueues: [[], []],
      hatcheryAutomation: { slots: [
        { enabled: true, mode: 'breed', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
        { enabled: true, mode: 'exp', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', queue: [] },
      ] },
      automation: { autoHatch: false, autoSeedHatchery: false },
      pokedex: {},
      badges: ['koga', 'x', 'y', 'z'],
    },
  };
  Object.assign(sandbox.G, overrides.G || {});
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(HATCHERY, sandbox, { filename: 'hatchery.js' });
  vm.runInContext(BOX_SELECTOR, sandbox, { filename: 'box-selector.js' });
  return sandbox;
}

// ── 1. Mode différé : impossible d'annuler une incubation ───────────────────

test('incubation → garderie sur slot occupé : changement mis en attente', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 3, stepsReq: 50, mode: 'breed' };
  env.toggleHatcherySlotMode(0);
  assert.equal(env.G.hatcheryModes[0], 'breed', 'le mode reste Incubation tant que le slot est occupé');
  assert.equal(env.G.hatcheryPendingModes[0], 'exp', 'changement en attente');
  assert.ok(env.notifs.some(([m]) => m.includes('hatchery_mode_deferred')), 'notification de différé');
  assert.equal(env.G.hatchery[0].mode, 'breed', 'incubation en cours non altérée');
});

test('incubation en cours + bascule : la liste d\'attente est vidée tout de suite', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 3, stepsReq: 50, mode: 'breed' };
  env.G.hatcheryQueues = [['u9', 'fossil:helix_fossil'], []];
  env.toggleHatcherySlotMode(0);
  assert.deepEqual([...env.G.hatcheryQueues[0]], [], 'liste vidée dès la demande');
  assert.equal(env.G.hatcheryPendingModes[0], 'exp');
});

test('incubation terminée + bascule : collecte (éclosion), mode appliqué, liste vidée', () => {
  const env = makeEnv();
  env.G.hatchery[0] = {
    poke: { id: 25, level: 100, uid: 'u1', name: 'POKE_25', ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} },
    steps: 50, stepsReq: 50, mode: 'breed',
  };
  env.G.hatcheryQueues = [['u9'], []];
  env.toggleHatcherySlotMode(0);
  assert.equal(env.G.hatchery[0], null, 'slot vidé par la collecte');
  assert.ok(env.G.collection['25'], 'le résultat rejoint la boîte (incubation jamais annulée)');
  assert.equal(env.G.hatcheryModes[0], 'exp', 'Garderie appliquée immédiatement');
  assert.equal(env.G.hatcheryAutomation.slots[0].mode, 'exp');
  assert.deepEqual([...env.G.hatcheryQueues[0]], [], 'liste vidée');
  assert.equal(env.G.hatcheryPendingModes[0], null, 'aucun changement en attente');
});

test('re-clic sur le toggle annule le changement en attente', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 3, stepsReq: 50, mode: 'breed' };
  env.toggleHatcherySlotMode(0);
  env.toggleHatcherySlotMode(0);
  assert.equal(env.G.hatcheryPendingModes[0], null, 'en attente annulé');
  assert.equal(env.G.hatcheryModes[0], 'breed');
});

test('le changement en attente s\'applique quand le slot se vide (éclosion)', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1', name: 'POKE_25', ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 } }, steps: 50, stepsReq: 50, mode: 'breed' };
  env.toggleHatcherySlotMode(0); // passe en attente
  env.hatchEgg(0);
  assert.equal(env.G.hatchery[0], null, 'slot vidé après éclosion');
  assert.equal(env.G.hatcheryModes[0], 'exp', 'mode Garderie appliqué');
  assert.equal(env.G.hatcheryPendingModes[0], null);
  assert.equal(env.G.hatcheryAutomation.slots[0].mode, 'exp', 'config automation synchronisée');
  assert.ok(env.G.collection['25'], 'l\'œuf rejoint la boîte');
});

test('applyPendingHatcheryMode est sans effet tant que le slot est occupé', () => {
  const env = makeEnv();
  env.ensureHatcheryAutomation(); // initialise G.hatcheryPendingModes
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, steps: 1, stepsReq: 50, mode: 'breed' };
  env.G.hatcheryPendingModes[0] = 'exp';
  env.applyPendingHatcheryMode(0);
  assert.equal(env.G.hatcheryModes[0], 'breed');
  assert.equal(env.G.hatcheryPendingModes[0], 'exp', 'toujours en attente');
});

test('slot vide : changement de mode immédiat (pas d\'attente)', () => {
  const env = makeEnv();
  env.toggleHatcherySlotMode(0); // breed → exp sur slot vide
  assert.equal(env.G.hatcheryModes[0], 'exp');
  assert.equal(env.G.hatcheryPendingModes[0], null);
});

test('garderie → incubation sur Pokémon < 100 : éjecté au PC + liste vidée, mode basculé (passe 14)', () => {
  const env = makeEnv();
  env.G.hatcheryModes[1] = 'exp';
  env.G.hatchery[1] = { poke: { id: 16, level: 50, uid: 'u2', name: 'Roucool' }, steps: 0, stepsReq: 25, mode: 'exp' };
  env.G.hatcheryQueues[1] = ['u9'];
  env.toggleHatcherySlotMode(1);
  assert.equal(env.G.hatcheryModes[1], 'breed', 'le mode bascule (plus de blocage)');
  assert.equal(env.G.hatchery[1], null, 'slot vidé');
  assert.ok(env.G.collection['16'] && env.G.collection['16'].uid === 'u2', 'Pokémon renvoyé au PC');
  assert.equal(env.G.hatcheryQueues[1].length, 0, 'liste vidée');
  assert.ok(env.notifs.some(([m]) => m.includes('hatchery_mode_ejected')), 'notification d\'éjection');
});

test('garderie → incubation sur Pokémon Niv. 100 : conversion conservée (comportement historique)', () => {
  const env = makeEnv();
  env.G.hatcheryModes[1] = 'exp';
  env.G.hatchery[1] = { poke: { id: 25, level: 100, uid: 'u1', name: 'Pikachu' }, steps: 0, stepsReq: 25, mode: 'exp' };
  env.toggleHatcherySlotMode(1);
  assert.equal(env.G.hatcheryModes[1], 'breed');
  assert.ok(env.G.hatchery[1] && env.G.hatchery[1].poke && env.G.hatchery[1].poke.uid === 'u1', 'le Niv. 100 reste et est converti');
  assert.equal(env.G.hatchery[1].mode, 'breed');
});

// ── 2. Fossiles en incubation ───────────────────────────────────────────────

test('sendFossilToHatchery cible le slot demandé (onglet fossile du slot)', () => {
  const env = makeEnv();
  env.sendFossilToHatchery('helix_fossil', 0);
  const slot = env.G.hatchery[0];
  assert.ok(slot && slot.isFossil, 'fossile placé dans le slot 0');
  assert.equal(slot.fossilKey, 'helix_fossil');
  assert.equal(slot.reviveId, 138);
  assert.equal((env.G.inventory.helix_fossil || 0), 0, 'fossile consommé');
});

test('sendFossilToHatchery sans slot : préfère un slot vide en mode incubation', () => {
  const env = makeEnv();
  env.G.hatcheryModes = ['exp', 'breed'];
  env.sendFossilToHatchery('helix_fossil');
  assert.ok(env.G.hatchery[1] && env.G.hatchery[1].isFossil, 'fossile vers le slot incubation (index 1)');
  assert.equal(env.G.hatchery[0], null);
});

test('sendFossilToHatchery refuse un slot occupé', () => {
  const env = makeEnv();
  env.G.hatchery[0] = { poke: { id: 25, level: 100, uid: 'u1' }, mode: 'breed' };
  env.sendFossilToHatchery('helix_fossil', 0);
  assert.equal(env.G.hatchery[0].isFossil, undefined, 'rien n\'est remplacé');
  assert.equal(env.G.inventory.helix_fossil, 1, 'fossile non consommé');
  assert.ok(env.notifs.some(([m]) => m.includes('hatchery_full')));
});

test('entrée fossile en file : consommée et placée quand le slot se libère', () => {
  const env = makeEnv();
  env.G.hatcheryQueues = [['fossil:helix_fossil'], []];
  assert.equal(env.fillHatcherySlotFromQueue(0), true);
  assert.ok(env.G.hatchery[0].isFossil, 'fossile placé');
  assert.equal((env.G.inventory.helix_fossil || 0), 0, 'fossile consommé du sac');
  assert.equal(env.fillHatcherySlotFromQueue(0), false, 'slot déjà occupé');
});

test('entrée fossile sauté si le fossile n\'est plus en sac', () => {
  const env = makeEnv();
  env.G.inventory = {}; // fossile utilisé entre-temps
  env.G.hatcheryQueues = [['fossil:helix_fossil'], []];
  assert.equal(env.fillHatcherySlotFromQueue(0), false);
  assert.equal(env.G.hatchery[0], null);
});

test('cleanHatcheryQueue conserve les fossiles en stock, purge les épuisés', () => {
  const env = makeEnv();
  env.G.hatcheryQueues = [['fossil:helix_fossil', 'fossil:root_fossil'], []];
  env.G.inventory = { helix_fossil: 1 }; // root épuisé
  env.cleanHatcheryQueue(0);
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['fossil:helix_fossil']);
});

// ── 3. Priorité Pokémon / Fossile ───────────────────────────────────────────

test('toggle de priorité : flip Pokémon ↔ Fossile', () => {
  const env = makeEnv();
  assert.equal(env.hatcherySlotPriority(0), 'pokemon');
  env.toggleHatcherySlotPriority(0);
  assert.equal(env.hatcherySlotPriority(0), 'fossil');
  env.toggleHatcherySlotPriority(0);
  assert.equal(env.hatcherySlotPriority(0), 'pokemon');
});

test('FIFO : avec priorité Fossile, un Pokémon déjà en tête de liste passe d\'abord', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.G.hatcheryQueues = [['u1', 'fossil:helix_fossil'], []];
  env.fillHatcherySlotFromQueue(0);
  assert.ok(env.G.hatchery[0].poke, 'le Pokémon en tête passe (pas le fossile)');
});

test('FIFO : fossile en tête de liste → le fossile passe, même priorisé Pokémon', () => {
  const env = makeEnv();
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.G.hatcheryQueues = [['fossil:helix_fossil', 'u1'], []];
  env.fillHatcherySlotFromQueue(0);
  assert.ok(env.G.hatchery[0].isFossil, 'le fossile en tête passe');
  assert.ok(!env.G.hatcheryQueues[0].includes('fossil:helix_fossil'), 'entrée consommée');
  assert.ok(env.G.hatcheryQueues[0].includes('u1'), 'le Pokémon reste derrière');
});

test('réassort : priorité Fossile remplit la liste de fossiles (pas de Pokémon)', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.inventory = { helix_fossil: 2 };
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.refillHatcheryQueueFromRules();
  const q = [...env.G.hatcheryQueues[0]];
  assert.deepEqual(q, ['fossil:helix_fossil', 'fossil:helix_fossil', 'u1'],
    'fossiles d\'abord, puis le Pokémon en repli pour compléter');
  assert.equal(env.G.hatcheryAutomation.slots[0].priority, 'fossil', 'pas de bascule (le préféré a servi)');
});

test('réassort : priorité Fossile épuisée → Pokémon en repli + toggle bascule', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.inventory = {}; // plus de fossile
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.refillHatcheryQueueFromRules();
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['u1']);
  assert.equal(env.G.hatcheryAutomation.slots[0].priority, 'pokemon', 'le toggle bascule');
});

test('réassort : un nouveau fossile prend la SUITE de la liste, jamais la tête', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  env.G.hatcheryQueues = [['u1', 'u2'], []]; // deux Pokémon déjà en file
  env.G.collection = {
    b1: { id: 25, level: 100, uid: 'u1', name: 'A' },
    b2: { id: 26, level: 100, uid: 'u2', name: 'B' },
  };
  env.G.inventory = { helix_fossil: 1 };
  env.refillHatcheryQueueFromRules();
  const q = [...env.G.hatcheryQueues[0]];
  assert.deepEqual(q, ['u1', 'u2', 'fossil:helix_fossil'], 'fossile ajouté à la fin');
});

test('réassort : un slot avec changement de mode en attente n\'est pas alimenté', () => {
  const env = makeEnv();
  env.ensureHatcheryAutomation();
  env.G.hatcheryPendingModes[0] = 'exp';
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.refillHatcheryQueueFromRules();
  assert.equal(env.G.hatcheryQueues[0].length, 0, 'aucune entrée ajoutée pendant l\'attente');
});

// ── 4. Auto-remplissage conditionnel ────────────────────────────────────────

test('processHatcheryQueue sans activation : rien ne se remplit (ni slot ni file)', () => {
  const env = makeEnv();
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  const changed = env.processHatcheryQueue();
  assert.equal(changed, false);
  assert.equal(env.G.hatchery[0], null, 'slot resté vide');
  assert.equal(env.G.hatcheryQueues[0].length, 0, 'file restée vide');
  assert.equal(env.G.inventory.helix_fossil, 1, 'fossile non consommé');
});

test('processHatcheryQueue avec activation : le slot incubation se remplit', () => {
  const env = makeEnv();
  env.G.automation.autoSeedHatchery = true;
  env.G.collection = { b1: { id: 25, level: 100, uid: 'u1', name: 'POKE_25' } };
  env.processHatcheryQueue();
  assert.ok(env.G.hatchery[0], 'slot rempli');
});

test('contrat : renderHatcheryWindow et addPokemonToHatcheryQueue ne forcent plus le remplissage', () => {
  const render = HATCHERY_UI.match(/function renderHatcheryWindow\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(render, 'renderHatcheryWindow trouvé');
  assert.ok(!/processHatcheryQueue\(true\)/.test(render[0]), 'plus d\'appel forcé dans renderHatcheryWindow');
  assert.ok(/processHatcheryQueue\(\)/.test(render[0]), 'appel non forcé conservé');
  const add = HATCHERY.match(/function addPokemonToHatcheryQueue\(boxId[\s\S]*?\n\}/);
  assert.ok(add, 'addPokemonToHatcheryQueue trouvé');
  assert.ok(!/processHatcheryQueue\(true\)/.test(add[0]), 'plus d\'appel forcé dans addPokemonToHatcheryQueue');
});

// ── 5. Sélecteur : onglet fossile pour les slots d'incubation ───────────────

test('contrat : l\'onglet fossile est proposé pour hatchery_queue_N en mode incubation', () => {
  assert.ok(/startsWith\('hatchery_queue_'\)[\s\S]{0,200}hatcherySlotIsIncubation/.test(BOX_SELECTOR), 'showFossilTab étendu');
  assert.ok(/_fossilSlotArg/.test(BOX_SELECTOR), 'le bouton Incuber transmet le slot cible');
});

test('sélecteur d\'un slot incubation avec priorité Fossile : ouvre l\'onglet fossiles', () => {
  const env = makeEnv();
  env.G.hatcheryAutomation.slots[0].priority = 'fossil';
  vm.runInContext('closeFullscreenPanel = function(){}; closeBattleSummary = function(){};', env);
  env.openUnifiedSelectorModal('hatchery_queue_0');
  assert.equal(env._usmSubTab, 'fossil', 'onglet fossile par défaut');
  assert.ok(env.nodes['usm-grid'].innerHTML.includes('fossil-card'), 'grille de fossiles affichée');
});

