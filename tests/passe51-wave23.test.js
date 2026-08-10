/**
 * Wave 23 — static shells (confirm modal + quest-modal shell), header /
 * pw-static palette, MainMenuScene boot truth.
 *
 *  A. Scene session truth: boot lands on MainMenuScene while the STATICALLY
 *     open save screen is up and no session started (the old sync looked up
 *     a never-existing #save-menu-modal and was permanently blind), the
 *     starter overlay forces the menu scene even mid-session, a live
 *     session means GameScene, and menu ⇄ game ROUND TRIPS never throw
 *     (SceneManager.replace — switchTo disposes the singletons).
 *  B. Confirm modal: shells classes contract, danger = FLAT red (no
 *     gradient, no glow), benign = flat accent, pwConfirm/closeConfirm do
 *     NOT paint inline styles (stylesheet owns the coloring).
 *  C. Palette: --pw-surface flattened (was a dead gradient), universal
 *     .modal-title background → --pw-bg-header (theme-blind white sheen
 *     deleted), --pw-border / --pw-border-strong theme-aware (color-mix),
 *     13 dead pw-static classes deleted, live ones tokenized
 *     (029/030/039/045 hammer-proof/068) + --pw-map-surface per theme.
 *  D. _repeatableRoll ownership: quest-ui.js declares + mirrors it (REAL
 *     BUG — ReferenceError in native ES module scope, browser-only).
 *
 * All DOM-free (source contracts + stubbed document like scenes-and-views).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Scene } from '../src/engine/core/Scene.js';
import { SceneManager } from '../src/engine/core/SceneManager.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const CSS_NC = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
// wave 24: pw-static.css (stale mirror) removed — the locks below target only the
// pw-static BLOCK inside the single canonical design-system.css.
const INDEX = R('index.html');
const UTIL = R('src/core/game-utils.js');
const QUEST_UI = R('src/ui/game/quest-ui.js');
const SAVE_JS = R('src/application/save/save.js');
const STARTER_JS = R('src/ui/game/starter.js');
const SCENES_JS = R('src/application/scenes/index.js');

/* ─── A. Scene truth ────────────────────────────────────────────────────── */

test('wave23: SceneManager.replace swaps WITHOUT disposing (round trips safe)', () => {
  const manager = new SceneManager();
  const a = new Scene({ name: 'menu' });
  const b = new Scene({ name: 'game' });
  manager.replace(a);
  assert.equal(manager.current, a);
  manager.replace(b);
  assert.equal(manager.current, b);
  assert.equal(a._disposed, false, 'covered scene NOT disposed (switchTo would kill it)');
  assert.equal(a.active, false, 'covered scene exited');
  manager.replace(a); // round trip — used to throw "Scene was disposed" with switchTo
  assert.equal(manager.current, a);
  assert.equal(a.active, true, 'resident singleton re-entered');
  manager.replace(b);
  manager.replace(a);
  assert.equal(manager.current, a, 'second round trip still fine');
  manager.dispose();
});

test('wave23: syncSceneWithSession follows the REAL session truth', async () => {
  const { sceneManager, mainMenuScene, gameScene, syncSceneWithSession } = await import('../src/application/scenes/index.js');
  const mkClassList = (el, cls) => ({
    contains: (c) => c === cls && el.open,
    add: () => { el.open = true; },
    remove: () => { el.open = false; },
  });
  const els = {
    'save-menu-screen': { id: 'save-menu-screen', open: false },
    'starter-modal': { id: 'starter-modal', classList: { contains: () => false, add: () => {}, remove: () => {} }, style: { display: 'none' } },
  };
  els['save-menu-screen'].classList = mkClassList(els['save-menu-screen'], 'is-open');
  const body = { classList: { add: () => {}, remove: () => {} } };
  const prevDoc = globalThis.document;
  const prevWindow = globalThis.window;
  globalThis.document = {
    getElementById: (id) => els[id] || null,
    readyState: 'complete',
    addEventListener: () => {},
    body,
  };
  globalThis.window = globalThis;
  try {
    // 1. Boot truth: save screen STATICALLY open, no session → MainMenuScene.
    els['save-menu-screen'].open = true;
    window.PokeWorldGameStarted = false;
    syncSceneWithSession();
    assert.equal(sceneManager.current, mainMenuScene, 'boot: statically-open save screen ⇒ MainMenuScene');
    assert.equal(mainMenuScene.menuVisible, true, 'menuVisible reads the REAL save screen (is-open)');

    // 2. Session starts (activateCurrentSave hid the menu) → GameScene.
    els['save-menu-screen'].open = false;
    window.PokeWorldGameStarted = true;
    syncSceneWithSession();
    assert.equal(sceneManager.current, gameScene, 'session live ⇒ GameScene');

    // 3. Starter overlay opens mid-session (style.display flex) → menu scene.
    els['starter-modal'].style.display = 'flex';
    syncSceneWithSession();
    assert.equal(sceneManager.current, mainMenuScene, 'starter overlay forces the menu scene');
    assert.equal(mainMenuScene.menuVisible, true, 'menuVisible reads the starter display:flex');

    // 4. Starter picked → GameScene, then deleteSave-style return → MainMenuScene (round trip).
    els['starter-modal'].style.display = 'none';
    syncSceneWithSession();
    assert.equal(sceneManager.current, gameScene);
    window.PokeWorldGameStarted = false;
    els['save-menu-screen'].open = true;
    syncSceneWithSession();
    assert.equal(sceneManager.current, mainMenuScene, 'back-to-menu round trip never throws (replace)');
    assert.equal(mainMenuScene._disposed, false, 'singleton never disposed along the way');
  } finally {
    delete window.PokeWorldGameStarted;
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWindow === undefined) delete globalThis.window; else globalThis.window = prevWindow;
    sceneManager.dispose();
  }
});

test('wave23: scene wiring is EXPLICIT (dead eventBus listeners removed, hooks in place)', () => {
  assert.ok(!/eventBus\.on\(/.test(SCENES_JS), 'no eventBus listener left in the scenes orchestration');
  assert.ok(!/for \(const evt of/.test(SCENES_JS), 'dead wiring loop removed');
  assert.ok(SCENES_JS.includes("getElementById('save-menu-screen')"), 'sync reads the REAL save screen id');
  assert.ok(SCENES_JS.includes('sceneManager.replace('), 'sync swaps via replace (resident singletons)');
  assert.ok(SAVE_JS.includes('function _pwSyncScenes()') && SAVE_JS.includes('_pwSyncScenes();'), 'save.js hook present');
  assert.ok(STARTER_JS.includes('function _pwSyncScenes()') && (STARTER_JS.match(/_pwSyncScenes\(\);/g) || []).length >= 3, 'starter.js hooks at show/hide transitions');
});

/* ─── B. Confirm modal ──────────────────────────────────────────────────── */

test('wave23: confirm shell classes + FLAT colors (no gradient, no glow)', () => {
  assert.ok(INDEX.includes('<div class="pw-confirm-actions">'), 'static shell: actions row classed');
  assert.ok(!INDEX.includes('pw-static-011') && !INDEX.includes('pw-static-013'), 'static shell: dead pw-static rows gone');
  const yesRule = CSS_NC.split('#confirm-yes {')[1].split('}')[0];
  assert.ok(yesRule.includes('var(--accent)'), 'benign yes = flat accent');
  assert.ok(!/gradient/.test(yesRule), 'benign yes: NO gradient');
  const dangerRule = CSS_NC.split('#confirm-yes.pw-confirm-danger {')[1].split('}')[0];
  assert.ok(dangerRule.includes('var(--red)'), 'danger yes = flat red');
  assert.ok(!/gradient|box-shadow/.test(dangerRule), 'danger yes: NO gradient, NO glow shadow');
  assert.ok(CSS.includes('.pw-confirm-actions { display: flex; gap: 8px; margin-top: 14px; margin-bottom: 8px; }'), 'row layout lives in the stylesheet (settings-row + pw-static-013 replacement)');
});

test('wave23: pwConfirm/closeConfirm never paint inline styles', () => {
  const fnStart = UTIL.indexOf('function pwConfirm(');
  const fnEnd = UTIL.indexOf('function closeConfirm(');
  const body = UTIL.slice(fnStart, fnEnd + 600);
  assert.ok(!/\.style\s*=/.test(body), 'no el.style.* assignment in pwConfirm/closeConfirm');
  assert.ok(body.includes("classList.toggle('pw-confirm-danger'"), 'danger stays a CLASS toggle');
  assert.ok(body.includes('<div class="pw-confirm-title">') && body.includes('<div class="pw-confirm-msg">'), 'title/msg bricks kept');
});

/* ─── C. Palette ────────────────────────────────────────────────────────── */

test('wave23: surface flattening + theme-aware borders', () => {
  assert.ok(CSS.includes('--pw-surface: var(--dark2);'), 'surface token flattened (dead gradient deleted)');
  assert.ok(!/--pw-surface:\s*linear-gradient/.test(CSS_NC), 'NO gradient surface token left');
  assert.ok(CSS.includes('--pw-border: color-mix(in srgb, var(--light2) 22%, transparent);'), 'border theme-aware (22% light2)');
  assert.ok(CSS.includes('--pw-border-strong: color-mix(in srgb, var(--light2) 38%, transparent);'), 'strong border theme-aware (38%)');
  assert.ok(!/--pw-border:\s*rgba\(236/.test(CSS_NC), 'theme-blind cream rgba deleted');
  // The universal header rule = the one sizing --pw-header-h (48px canonical).
  const hIdx = CSS_NC.indexOf('height: var(--pw-header-h);');
  const headerRule = CSS_NC.slice(CSS_NC.lastIndexOf('}', hIdx) + 1, CSS_NC.indexOf('}', hIdx));
  assert.ok(headerRule.includes('.modal-title,'), 'located the universal panel-header rule');
  assert.ok(headerRule.includes('background: var(--pw-bg-header);'), 'universal panel header on the per-theme token');
  assert.ok(!/linear-gradient/.test(headerRule), 'white sheen gradient deleted from panel headers');
});

test('wave23: pw-static — 13 dead classes deleted, live ones tokenized (mirrored)', () => {
  for (const c of ['005', '006', '007', '008', '011', '013', '083', '084', '104', '105', '106', '109', '124']) {
    for (const src of [CSS]) {
      assert.ok(!new RegExp(`\\.pw-static-${c}[^0-9]`).test(src), `pw-static-${c} deleted (both files)`);
    }
  }
  for (const src of [CSS]) {
    assert.ok(src.includes('.pw-static-029{background:var(--dark1);color:var(--light2);border:1px solid var(--pw-border-color);'), '029 region select: token border');
    assert.ok(src.includes('.pw-static-030{background:var(--pw-map-surface);'), '030 map panel: --pw-map-surface token');
    assert.ok(src.includes('color-mix(in srgb, var(--light2) 6%, transparent)'), '039 loot row: light2-mix surface');
    assert.ok(src.includes('button.pw-static-045[data-action]{width:100%;background:var(--red) !important;'), '045 leave button: FLAT red, hammer-proof [data-action] + !important');
    assert.ok(src.includes('.pw-static-068{font-size: 13px;font-weight:bold;color:var(--red);border-bottom:1px solid var(--pw-border-color);'), '068 debug header: token border');
  }
  for (const theme of ['--pw-map-surface: #0D1B0D', '--pw-map-surface: #E4EDE4', '--pw-map-surface: #82A20E', '--pw-map-surface: #1C100C']) {
    assert.ok(CSS.includes(theme), `map surface token exists: ${theme}`);
  }
  assert.ok(!/data-style="display:none;"/.test(INDEX.split('id="tabs"')[0].slice(-200)), 'tabs strip: JS-dead data-style removed from markup');
  assert.ok(INDEX.includes('<div id="tabs" class="pw-static-050 pw-win-tabs">'), 'tabs hidden via the existing .pw-win-tabs{display:none} convention (no new rule)');
  assert.ok(CSS.includes('.pw-win-tabs{display:none}'), 'pw-win-tabs convention exists');
});

/* ─── D. quest-ui owns _repeatableRoll (browser-only ReferenceError fix) ── */

test('wave23: _repeatableRoll is declared AND mirrored by its sole consumer', () => {
  assert.ok(/(var|let) _repeatableRoll = \(typeof window !== 'undefined'/.test(QUEST_UI), 'quest-ui.js declares the roll (module scope)');
  // Vague 41 — lock recâblé (intention préservée « exposé aux lecteurs
  // legacy ») : la pose window est devenue le shim canonique gardé globalThis
  // (window === globalThis au navigateur).
  assert.ok(QUEST_UI.includes('globalThis._repeatableRoll = _repeatableRoll;'), 'window mirrored for legacy readers');
});
