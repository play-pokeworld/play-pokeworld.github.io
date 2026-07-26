import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passes 15+16 — anti « retour en haut » : conservation du scroll ────────
// Passe 15 : helpers + capture/restauration explicites.
// Passe 16 : pwSetHtml (page + élément, re-vérifié sur 2 frames), menus de
// gestion à squelette PERSISTANT (.management-content jamais recréé sur le
// même panneau), filet de sécurité dans les répartiteurs de clics.
const UTIL = fs.readFileSync(new URL('../src/game/core/util.js', import.meta.url), 'utf8');
const HATCHERY = fs.readFileSync(new URL('../src/game/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/game/breeding/hatchery-ui.js', import.meta.url), 'utf8');
const TRAINING = fs.readFileSync(new URL('../src/game/combat/training.js', import.meta.url), 'utf8');
const MINE_UI = fs.readFileSync(new URL('../src/game/economy/mine-ui.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/game/boxes/box-selector.js', import.meta.url), 'utf8');
const INVENTORY = fs.readFileSync(new URL('../src/game/economy/inventory.js', import.meta.url), 'utf8');
const PREFLIGHT = fs.readFileSync(new URL('../src/file-preflight.js', import.meta.url), 'utf8');
const POSTBOOT = fs.readFileSync(new URL('../src/file-postboot.js', import.meta.url), 'utf8');

test('helpers de scroll : présents dans core/util.js et exposés sur window', () => {
  for (const fn of ['pwSaveScroll', 'pwRestoreScroll', 'pwSaveScrollOf', 'pwRestoreScrollOf', 'pwSetHtml', 'pwResetScrollNow', 'pwSnapshotScrollAround', 'pwRestoreScrollAround']) {
    assert.ok(new RegExp(`function ${fn}\\(`).test(UTIL), `${fn} défini`);
    assert.ok(UTIL.includes(`window.${fn} = ${fn}`), `${fn} exporté`);
  }
});

test('helpers de scroll : round-trip fonctionnel (élément simple + sélecteur)', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(UTIL, sandbox, { filename: 'util.js' });
  const el = { scrollTop: 240 };
  const pos = sandbox.pwSaveScroll(el);
  el.scrollTop = 0;
  sandbox.pwRestoreScroll(el, pos);
  assert.equal(el.scrollTop, 240, 'scroll restauré');
  const child = { scrollTop: 96 };
  const root = { querySelector: (sel) => (sel === '.management-content' ? child : null) };
  const pos2 = sandbox.pwSaveScrollOf(root, '.management-content');
  const child2 = { scrollTop: 0 };
  root.querySelector = () => child2;
  sandbox.pwRestoreScrollOf(root, '.management-content', pos2);
  assert.equal(child2.scrollTop, 96, 'scroll restauré sur le nouveau conteneur');
  sandbox.pwRestoreScroll(null, 50);
  sandbox.pwRestoreScrollOf(root, '.management-content', null);
});

test('pwSetHtml : conserve scroll page + élément ; pwResetScrollNow invalide (epoch)', () => {
  const scrollingElement = { scrollTop: 480, scrollLeft: 0, isConnected: true };
  const sandbox = {
    window: {},
    document: { scrollingElement, documentElement: scrollingElement },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(UTIL, sandbox, { filename: 'util.js' });
  let html = '';
  const el = {
    scrollTop: 150,
    scrollLeft: 0,
    isConnected: true,
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
  };
  sandbox.pwSetHtml(el, '<b>x</b>');
  assert.equal(el.scrollTop, 150, 'scroll élément conservé');
  assert.equal(scrollingElement.scrollTop, 480, 'scroll page conservé');
  assert.equal(html, '<b>x</b>', 'contenu écrit');
  // Remise à zéro volontaire : l'epoch est bumpé et le scroll repart à 0.
  el.scrollTop = 210;
  sandbox.pwResetScrollNow(el);
  assert.equal(el.scrollTop, 0, 'reset volontaire à 0');
});

test('pwSnapshotScrollAround / pwRestoreScrollAround : ancêtres + page', () => {
  const scrollingElement = { scrollTop: 700, scrollLeft: 0, isConnected: true };
  const sandbox = {
    window: {},
    document: { scrollingElement, documentElement: scrollingElement },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(UTIL, sandbox, { filename: 'util.js' });
  const panel = { scrollTop: 120, scrollLeft: 0, isConnected: true, parentElement: null };
  const button = { scrollTop: 0, scrollLeft: 0, isConnected: true, parentElement: panel };
  const snap = sandbox.pwSnapshotScrollAround(button);
  assert.ok(snap.length >= 2, 'au moins le panneau + la page capturés');
  // Le re-rendu « saute » : on simule le bug du navigateur
  panel.scrollTop = 0;
  scrollingElement.scrollTop = 0;
  sandbox.pwRestoreScrollAround(snap);
  assert.equal(panel.scrollTop, 120, 'scroll du panneau remis');
  assert.equal(scrollingElement.scrollTop, 700, 'scroll de page remis');
});

test('menus de gestion : squelette persistant + reset volontaire au changement d\'onglet', () => {
  for (const [src, name, shellClass] of [
    [HATCHERY_UI, 'pension', 'management-hatchery'],
    [TRAINING, 'entraînement', 'management-training'],
    [MINE_UI, 'mine', 'management-mine'],
  ]) {
    assert.ok(src.includes(`querySelector('.management-shell.${shellClass}')`), `${name} : squelette recherché avant reconstruction`);
    assert.ok(src.includes("pwResetScrollNow(contentEl)"), `${name} : reset volontaire sur changement d'onglet`);
    assert.ok(src.includes("_keepScroll"), `${name} : suivi de page conservé`);
    // Le contenu n'est plus écrit dans un innerHTML global du modal
    assert.ok(src.includes('contentEl.innerHTML = body'), `${name} : seul le contenu est réécrit`);
  }
});

// DOM minimal mais FIDÈLE : le squelette persiste tant qu'on reste dans le
// même panneau ; tout autre contenu (fiche Pokémon…) le détruit.
function fakeContainer() {
  let contentNode = null;
  let shellNode = null;
  const tabsNode = { innerHTML: '' };
  const self = {
    scrollTop: 0,
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    set innerHTML(v) {
      if (String(v).includes('management-shell')) {
        contentNode = { scrollTop: 0, innerHTML: '' };
        shellNode = { querySelector: (sel) => (sel === '.management-content' ? contentNode : null) };
      } else {
        shellNode = null; // autre panneau : squelette détruit
      }
    },
    get innerHTML() { return ''; },
    querySelector(sel) {
      if (sel.startsWith('.management-shell.')) return shellNode;
      if (!shellNode) return null;
      if (sel === '.management-content') return contentNode;
      if (sel === '.management-tabs-host') return tabsNode;
      return null;
    },
  };
  return self;
}

test('menu pension : même page = scroll conservé (nœud persistant), changement d\'onglet = reset', () => {
  const nodes = {
    'poke-modal-inner': fakeContainer(),
    'poke-modal': fakeContainer(),
  };
  const sandbox = {
    console,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: () => {}, saveGame: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {}, renderHatcheryWindow: () => {},
    addBattleLog: () => {},
    t: (k) => k, tr: (k) => k,
    rand: () => 0, rollShiny: () => false,
    getIcon: () => '', isLocUnlocked: () => true,
    isAutomationPurchased: () => true,
    spriteImg: () => '', itemIcon: () => '', getItemName: (k) => k,
    getPokeName: (id) => 'P' + id, isSpeciesShiny: () => false,
    PD: {}, ITEMS: {},
    G: {
      lang: 'fr', money: 999999, team: [], collection: {}, inventory: {},
      hatchery: [null], hatcheryMaxSlots: 2,
      hatcheryModes: ['breed', 'exp'], hatcheryQueues: [[], []],
      hatcheryAutomation: { filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', excludeLocked: true, slots: [
        { enabled: true, mode: 'breed', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'fossil', queue: [] },
        { enabled: true, mode: 'exp', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
      ] },
      automation: { autoHatch: false, autoSeedHatchery: false },
      pokedex: {}, badges: ['koga'],
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(UTIL, sandbox, { filename: 'util.js' });
  vm.runInContext(HATCHERY, sandbox, { filename: 'hatchery.js' });
  vm.runInContext(HATCHERY_UI, sandbox, { filename: 'hatchery-ui.js' });

  const inner = nodes['poke-modal-inner'];
  sandbox.openHatcheryManagementMenu('automation');
  const firstContent = inner.querySelector('.management-content');
  assert.ok(firstContent, 'conteneur créé à la première ouverture');
  assert.equal(firstContent.scrollTop, 0, 'première ouverture en haut');
  // L'utilisateur scrolle puis effectue une action qui re-rend la même page
  firstContent.scrollTop = 300;
  sandbox.openHatcheryManagementMenu('automation');
  const secondContent = inner.querySelector('.management-content');
  assert.equal(secondContent, firstContent, 'PERSISTANCE : le conteneur n\'est PAS recréé sur la même page');
  assert.equal(secondContent.scrollTop, 300, 'scroll du contenu conservé');
  // Changement d'onglet → retour en haut voulu (pwResetScrollNow)
  secondContent.scrollTop = 300;
  sandbox.openHatcheryManagementMenu('upgrades');
  assert.equal(inner.querySelector('.management-content').scrollTop, 0, 'nouvel onglet en haut');
  assert.equal(inner.querySelector('.management-content'), secondContent, 'conteneur toujours persistant après changement d\'onglet');
});

test('sélecteur unifié : helper _usmSetGridHtml + clé de contexte, reset déterministe', () => {
  assert.ok(/var _usmLastScrollKey/.test(BOX_SELECTOR), 'clé de contexte déclarée');
  assert.ok(/function _usmSetGridHtml\(grid, html, prevScroll\)/.test(BOX_SELECTOR), 'helper défini');
  const calls = BOX_SELECTOR.match(/, _usmPrevScroll\);/g) || [];
  assert.equal(calls.length, 3, 'les 3 points d\'écriture passent par le helper');
  const direct = BOX_SELECTOR.match(/grid\.innerHTML =/g) || [];
  assert.equal(direct.length, 1, 'une seule écriture grid.innerHTML (dans le helper)');
  assert.ok(BOX_SELECTOR.includes('pwSaveScroll(grid)'), 'capture du scroll');
  assert.ok(BOX_SELECTOR.includes('pwResetScrollNow(grid)'), 'reset déterministe au changement de contexte');
  assert.ok(BOX_SELECTOR.includes("String(_usmAction) + '|' + String(_usmSubTab)"), 'clé action + sous-onglet');
});

test('fenêtres + sac + labo fossile : réécritures via _pwSetHtmlSafe (page + panneau)', () => {
  const hw = HATCHERY_UI.match(/function renderHatcheryWindow\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(hw && hw[0].includes('_pwSetHtmlSafe(el,'), 'fenêtre pension');
  const fl = HATCHERY_UI.match(/function renderFossilLab\(el\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fl && fl[0].includes('_pwSetHtmlSafe(el,'), 'labo fossile');
  const tw = TRAINING.match(/function renderTrainingWindow\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(tw && tw[0].includes('_pwSetHtmlSafe(el,'), 'fenêtre entraînement');
  const inv = INVENTORY.match(/function renderInventory\(el\)\s*\{[\s\S]*?\n\}/);
  assert.ok(inv && inv[0].includes('_pwSetHtmlSafe(el,'), 'sac');
  // Chaque fichier converti déclare le repli sécurisé (tests unitaires sans util.js)
  for (const [src, name] of [[HATCHERY_UI, 'pension'], [TRAINING, 'entraînement'], [INVENTORY, 'sac'], [MINE_UI, 'mine']]) {
    assert.ok(src.includes('var _pwSetHtmlSafe'), `${name} : repli _pwSetHtmlSafe déclaré`);
  }
});

test('filet de sécurité : les répartiteurs de clics capturent et restaurent le scroll', () => {
  for (const [src, name] of [[PREFLIGHT, 'preflight'], [POSTBOOT, 'postboot']]) {
    assert.ok(src.includes('pwSnapshotScrollAround'), `${name} : capture avant action`);
    assert.ok(src.includes('pwRestoreScrollAround'), `${name} : restauration après action`);
    assert.ok((src.match(/pwRestoreScrollAround/g) || []).length >= 2, `${name} : click + contextmenu couverts`);
  }
});
