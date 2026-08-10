import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';
import { ManagementMenuView } from '../src/ui/views/ManagementMenuView.js';
import { computeRequiredHatchKos } from '../src/domain/breeding/hatchery-rules.js';

// ── Phases 15+16 — anti "back to top": scroll preservation ────────────────
// Passe 15 : helpers + capture/restauration explicites.
// Phase 16: pwSetHtml (page + element, re-verified over 2 frames),
// PERSISTENT-skeleton management menus (.management-content never recreated on
// the same panel), safety net in the click dispatchers.
const UTIL = fs.readFileSync(new URL('../src/core/game-utils.js', import.meta.url), 'utf8');
const HATCHERY = fs.readFileSync(new URL('../src/application/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/ui/game/hatchery-ui.js', import.meta.url), 'utf8');
const TRAINING = fs.readFileSync(new URL('../src/application/combat/training.js', import.meta.url), 'utf8');
const MINE_UI = fs.readFileSync(new URL('../src/ui/game/mine-ui.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/ui/game/box-selector.js', import.meta.url), 'utf8');
const INVENTORY = fs.readFileSync(new URL('../src/ui/game/inventory.js', import.meta.url), 'utf8');
const PREFLIGHT = [fs.readFileSync(new URL('../src/engine/input/action-dispatcher.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../src/engine/runtime/classic-bridge.js', import.meta.url), 'utf8')].join('\n');
const POSTBOOT = [fs.readFileSync(new URL('../src/engine/input/action-dispatcher.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../src/engine/runtime/classic-bridge.js', import.meta.url), 'utf8')].join('\n');

test('scroll helpers: present in core/util.js and exposed on window', () => {
  for (const fn of ['pwSaveScroll', 'pwRestoreScroll', 'pwSaveScrollOf', 'pwRestoreScrollOf', 'pwSetHtml', 'pwResetScrollNow', 'pwSnapshotScrollAround', 'pwRestoreScrollAround']) {
    assert.ok(new RegExp(`function ${fn}\\(`).test(UTIL), `${fn} defined`);
    assert.ok(UTIL.includes(`window.${fn} = ${fn}`), `${fn} exported`);
  }
});

test('scroll helpers: functional round-trip (simple element + selector)', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle (game-utils est ESM depuis la vague 41 :
  // bundle isolé, globales via shim gardé ; texte direct tant qu'il était classique).
  vm.runInContext(
    harnessIsEsm(UTIL) ? harnessBundleSource(['src/core/game-utils.js']) : UTIL,
    sandbox, { filename: 'util.js' }
  );
  const el = { scrollTop: 240 };
  const pos = sandbox.pwSaveScroll(el);
  el.scrollTop = 0;
  sandbox.pwRestoreScroll(el, pos);
  assert.equal(el.scrollTop, 240, 'scroll restored');
  const child = { scrollTop: 96 };
  const root = { querySelector: (sel) => (sel === '.management-content' ? child : null) };
  const pos2 = sandbox.pwSaveScrollOf(root, '.management-content');
  const child2 = { scrollTop: 0 };
  root.querySelector = () => child2;
  sandbox.pwRestoreScrollOf(root, '.management-content', pos2);
  assert.equal(child2.scrollTop, 96, 'scroll restored on the new container');
  sandbox.pwRestoreScroll(null, 50);
  sandbox.pwRestoreScrollOf(root, '.management-content', null);
});

test('pwSetHtml: keeps page + element scroll; pwResetScrollNow invalidates (epoch)', () => {
  const scrollingElement = { scrollTop: 480, scrollLeft: 0, isConnected: true };
  const sandbox = {
    window: {},
    document: { scrollingElement, documentElement: scrollingElement },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle (game-utils est ESM depuis la vague 41 :
  // bundle isolé, globales via shim gardé ; texte direct tant qu'il était classique).
  vm.runInContext(
    harnessIsEsm(UTIL) ? harnessBundleSource(['src/core/game-utils.js']) : UTIL,
    sandbox, { filename: 'util.js' }
  );
  let html = '';
  const el = {
    scrollTop: 150,
    scrollLeft: 0,
    isConnected: true,
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
  };
  sandbox.pwSetHtml(el, '<b>x</b>');
  assert.equal(el.scrollTop, 150, 'element scroll kept');
  assert.equal(scrollingElement.scrollTop, 480, 'page scroll kept');
  assert.equal(html, '<b>x</b>', 'content written');
  // Deliberate reset: the epoch is bumped and scroll restarts at 0.
  el.scrollTop = 210;
  sandbox.pwResetScrollNow(el);
  assert.equal(el.scrollTop, 0, 'deliberate reset to 0');
});

test('pwSnapshotScrollAround / pwRestoreScrollAround: ancestors + page', () => {
  const scrollingElement = { scrollTop: 700, scrollLeft: 0, isConnected: true };
  const sandbox = {
    window: {},
    document: { scrollingElement, documentElement: scrollingElement },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle (game-utils est ESM depuis la vague 41 :
  // bundle isolé, globales via shim gardé ; texte direct tant qu'il était classique).
  vm.runInContext(
    harnessIsEsm(UTIL) ? harnessBundleSource(['src/core/game-utils.js']) : UTIL,
    sandbox, { filename: 'util.js' }
  );
  const panel = { scrollTop: 120, scrollLeft: 0, isConnected: true, parentElement: null };
  const button = { scrollTop: 0, scrollLeft: 0, isConnected: true, parentElement: panel };
  const snap = sandbox.pwSnapshotScrollAround(button);
  assert.ok(snap.length >= 2, 'at least the panel + the page captured');
  // The re-render "jumps": we simulate the browser bug
  panel.scrollTop = 0;
  scrollingElement.scrollTop = 0;
  sandbox.pwRestoreScrollAround(snap);
  assert.equal(panel.scrollTop, 120, 'panel scroll restored');
  assert.equal(scrollingElement.scrollTop, 700, 'page scroll restored');
});

test('management menus: persistent skeleton + deliberate reset on tab change', () => {
  for (const [src, name, shellClass] of [
    [HATCHERY_UI, 'pension', 'management-hatchery'],
    [TRAINING, 'training', 'management-training'],
    [MINE_UI, 'mine', 'management-mine'],
  ]) {
    assert.ok(src.includes(`querySelector('.management-shell.${shellClass}')`), `${name}: skeleton searched before rebuild`);
    assert.ok(src.includes("pwResetScrollNow(contentEl)"), `${name}: deliberate reset on tab change`);
    assert.ok(src.includes("_keepScroll"), `${name}: page tracking kept`);
    // Content is no longer written to a global modal innerHTML
    assert.ok(src.includes('_pwSetHtmlSafe(contentEl, body)'), `${name}: only the content is rewritten — via the canonical sink (v39)`);
  }
});

// Minimal but FAITHFUL DOM: the skeleton persists as long as we stay on
// the same panel; any other content (Pokémon sheet…) destroys it.
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
        shellNode = null; // other panel: skeleton destroyed
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

test('day-care menu: same page = scroll kept (persistent node), tab change = reset', () => {
  const nodes = {
    'poke-modal-inner': fakeContainer(),
    'poke-modal': fakeContainer(),
  };
  const sandbox = {
    console,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    // The management shell is the ECS ManagementMenuView since the UI
    // overhaul — the real view is injected into the sandbox (DOM-free).
    PokeUI: { views: { ManagementMenuView } },
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
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle : classique = texte vm direct ;
  // converti ESM (hatchery-ui vague 41, util/hatchery plus tard) = bundle isolé.
  for (const [label, src] of [
    ['src/core/game-utils.js', UTIL],
    ['src/application/breeding/hatchery.js', HATCHERY],
    ['src/ui/game/hatchery-ui.js', HATCHERY_UI],
  ]) {
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([label]) : src, sandbox, { filename: label });
  }

  const inner = nodes['poke-modal-inner'];
  sandbox.openHatcheryManagementMenu('automation');
  const firstContent = inner.querySelector('.management-content');
  assert.ok(firstContent, 'container created on first open');
  assert.equal(firstContent.scrollTop, 0, 'first opening at the top');
  // The user scrolls then performs an action that re-renders the same page
  firstContent.scrollTop = 300;
  sandbox.openHatcheryManagementMenu('automation');
  const secondContent = inner.querySelector('.management-content');
  assert.equal(secondContent, firstContent, 'PERSISTENCE: the container is NOT recreated on the same page');
  assert.equal(secondContent.scrollTop, 300, 'content scroll kept');
  // Tab change → intended back-to-top (pwResetScrollNow)
  secondContent.scrollTop = 300;
  sandbox.openHatcheryManagementMenu('upgrades');
  assert.equal(inner.querySelector('.management-content').scrollTop, 0, 'new tab scrolled to top');
  assert.equal(inner.querySelector('.management-content'), secondContent, 'container still persistent after tab change');
});

test('unified selector: _usmSetGridHtml helper + context key, deterministic reset', () => {
  assert.ok(/(var|globalThis\.)_usmLastScrollKey/.test(BOX_SELECTOR), 'context key declared');
  assert.ok(/function _usmSetGridHtml\(grid, html, prevScroll\)/.test(BOX_SELECTOR), 'helper defined');
  const calls = BOX_SELECTOR.match(/, _usmPrevScroll\);/g) || [];
  assert.equal(calls.length, 3, 'the 3 write points go through the helper');
  // Vague 39 : l'unique écriture passe par le puits canonique (même unité,
  // même intention « un seul point d'écriture, dans le helper »).
  const direct = BOX_SELECTOR.match(/_pwSetHtmlSafe\(grid, html\)/g) || [];
  assert.equal(direct.length, 1, 'a single grid write (in the helper, via the canonical sink)');
  assert.ok(BOX_SELECTOR.includes('pwSaveScroll(grid)'), 'capture du scroll');
  assert.ok(BOX_SELECTOR.includes('pwResetScrollNow(grid)'), 'deterministic reset on context change');
  assert.ok(BOX_SELECTOR.includes("String(_usmAction) + '|' + String(_usmSubTab)"), 'action + sub-tab key');
});

test('windows + bag + fossil lab: rewrites via _pwSetHtmlSafe (page + panel)', () => {
  const hw = HATCHERY_UI.match(/function renderHatcheryWindow\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(hw && hw[0].includes('_pwSetHtmlSafe(el,'), 'day care window');
  const fl = HATCHERY_UI.match(/function renderFossilLab\(el\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fl && fl[0].includes('_pwSetHtmlSafe(el,'), 'labo fossile');
  const tw = TRAINING.match(/function renderTrainingWindow\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(tw && tw[0].includes('_pwSetHtmlSafe(el,'), 'training window');
  const inv = INVENTORY.match(/function renderInventory\(el\)\s*\{[\s\S]*?\n\}/);
  assert.ok(inv && inv[0].includes('_pwSetHtmlSafe(el,'), 'sac');
  // Every converted file shares the secure fallback service (unit tests without util.js)
  for (const [src, name] of [[HATCHERY_UI, 'day care'], [TRAINING, 'training'], [INVENTORY, 'bag'], [MINE_UI, 'mine']]) {
    assert.ok(src.includes('globalThis._pwSetHtmlSafe'), `${name}: _pwSetHtmlSafe fallback declared`);
  }
});

test('safety net: click dispatchers capture and restore scroll', () => {
  for (const [src, name] of [[PREFLIGHT, 'preflight'], [POSTBOOT, 'postboot']]) {
    assert.ok(src.includes('pwSnapshotScrollAround'), `${name}: capture before action`);
    assert.ok(src.includes('pwRestoreScrollAround'), `${name}: restore after action`);
    assert.ok((src.match(/pwRestoreScrollAround/g) || []).length >= 2, `${name}: click + contextmenu covered`);
  }
});

