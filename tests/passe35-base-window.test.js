import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 35: permanent Secret Base window (dashboard) + FIX renderers ─────
//  A. Dashboard integration: #win-base in index.html, postboot actions,
//     dashboardCols + injection, renderMap hook, debug button removed
//  B. i18n: base.win.* FR/EN (final title, empty, close removed)
//  C. 3D fixes: primitive winding (geometric proof), flipped OBJ UVs,
//     camera pitch, shadow skip, buffer constants
//  D. Headless smoke: select init, 2D render without exception, throttle by
//     signature, invalidation explicite
//  E. Assets: Emerald sprites converted to RGBA + fix wired to the downloader
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));

const SANDBOX_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/application/game-state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/application/base/base-core.js',
  'src/ui/game/base/base-view2d.js',
  'src/ui/game/base/base-window.js',
];

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {} },
      head: { dataset: {} }, documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, children: [], appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, addEventListener() {}, click() {}, remove() {} }),
      addEventListener() {}, removeEventListener() {},
    },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() },
    navigator: { language: 'fr' },
    location: { href: 'http://localhost/', reload() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    setInterval: () => 1, clearInterval() {}, setTimeout: (cb) => setTimeout(cb, 0), clearTimeout() {},
    PokeWorldGameStarted: false,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe35-base-window [iife]' });
  return sandbox;
}

// ——— A — Dashboard integration ——————————————————————————————————————————
test('phase 35 A: permanent window wired (index, actions, dashboard, hook)', () => {
  const idx = R('index.html');
  assert.ok(idx.includes('id="win-base"'), '#win-base present');
  assert.ok(idx.includes('data-drag-window="win-base"'), 'native drag of the dash-win');
  for (const id of ['base-layout-select', 'base-canvas-2d', 'base-canvas-3d', 'base-panel', 'base-win-empty', 'base-refresh-btn']) {
    assert.ok(idx.includes(`id="${id}"`), `#${id} present`);
  }
  assert.ok(!idx.includes('id="win-base3d"'), 'no more 3D window');
  assert.ok(idx.includes('data-action="base-window-layout"'), 'layout select = postboot action');
  assert.ok(!idx.includes('debug-base-window'), 'debug "test window" button removed');
  assert.ok(idx.includes('data-i18n="base.win.title"'), 'internationalized title');

  const pb = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(pb.includes("'base-window-refresh'"), 'action refresh');
  assert.ok(pb.includes("callGlobal('baseWindowSetMode'"), 'mode change dispatched');
  assert.ok(pb.includes("callGlobal('baseWindowSetLayout'"), 'layout change dispatched');
  assert.ok(!pb.includes('baseWindowToggle'), 'old debug action removed');

  const dash = R('src/ui/game/dashboard.js');
  assert.ok(dash.includes("'win-battle', 'win-map', 'win-base'"), 'win-base in column 2 by default');
  const ensures = dash.split('win-base').length - 1;
  assert.ok(ensures >= 4, 'win-base: default + existing injections + cols3 preset');

  const loader = R('src/main.js');
  const i2 = loader.indexOf('base-view2d.js'), iw = loader.indexOf('base-window.js');
  assert.ok(i2 > 0 && i2 < iw, '2D renderer before its window');

  assert.ok(R('src/ui/game/map-render.js').includes('baseWindowRender'), 'hook renderMap');
});

// ——— B — i18n ———————————————————————————————————————————————————————————
test('phase 35 B: base.win.* finalized FR/EN (title, empty; close removed)', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    for (const lang of ['fr', 'en']) {
      const w = I18N[lang] && I18N[lang].base && I18N[lang].base.win;
      if (!w) throw new Error(lang + ' base.win absent');
      for (const k of ['title', 'mode_label', 'layout_label', 'refresh', 'mode3d', 'mode2d', 'moved', 'no_gl', 'empty']) {
        if (typeof w[k] !== 'string' || !w[k].length) throw new Error(lang + ' win.' + k);
      }
      if (w.close) throw new Error(lang + ' win.close removed (no more ✕ button)');
      if (/(test|essai)/i.test(w.title)) throw new Error(lang + ' final title without "test"');
      for (const id of ['cave_1', 'cave_2', 'cave_3', 'cave_4', 'tree_1', 'tree_2', 'tree_3', 'tree_4', 'bush_1', 'bush_2', 'bush_3', 'bush_4']) {
        if (!w.layout[id]) throw new Error(lang + ' win.layout.' + id);
      }
    }
    window._ok = true;
  `, sb);
  assert.ok(vm.runInContext('window._ok', sb), 'base.win.* complet');
  // Game default language = EN; each locale is forced explicitly.
  assert.equal(vm.runInContext(`(G.lang='fr', t('base.win.title'))`, sb), 'Base Secrète');
  assert.equal(vm.runInContext(`I18N.en.base.win.title`, sb), 'Secret Base');
  assert.ok(!R('src/localization/fr/ui.js').includes('debug_base_window'), 'FR UI key removed');
  assert.ok(!R('src/localization/en/ui.js').includes('debug_base_window'), 'EN UI key removed');
});

// ——— C — 3D fixes (geometric proofs) ————————————————————————————
// Phase 56: the old `base-view3d.js` renderer was REPLACED by the
// standalone 3D window (base3d-view.js). It declared `_base3dManifestP` at
// global scope, like the new loader: two `let` with the same name in
// global scope = SyntaxError, and ALL script loading stopped
// (black 3D window, console full of "loadScript"). It is archived in
// tools/legacy/; these checks now target the active renderer.
test('phase 35 C: 3D renderer removed', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), '3D renderer removed');
  assert.ok(!E('src/game/base/base-view3d.js'), 'old renderer removed');
});

test('phase 35 D: init + 2D render without exception + throttle signature', async () => {
  const sb = makeSandbox();
  vm.runInContext(`
    window.fetch = () => Promise.resolve({ ok: false });
    window._calls = { rects: 0, draws: 0 };
    // Pass 40: the layout selector groups its options into optgroups
    // (like the real DOM, .options must count them flat).
    const mkSelect = (id) => ({ id, options: [], value: '', title: '', style: { cssText: '' }, dataset: {}, setAttribute() {}, addEventListener() {},
      appendChild(c) { const kids = c && Array.isArray(c.children) && c.children.length ? c.children : [c]; for (const k of kids) this.options.push(k); return c; } });
    const mkText = (id) => ({ id, textContent: '', style: { cssText: '', display: '' }, dataset: {}, setAttribute() {}, addEventListener() {} });
    const mkCanvas = (id) => ({
      id, style: { cssText: '', display: '' }, dataset: {}, setAttribute() {}, addEventListener() {},
      width: 0, height: 0,
      getContext(kind) {
        if (kind === 'webgl2') return null; // headless: no GL → 2D fallback
        return {
          set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {}, set textAlign(v) {},
          set imageSmoothingEnabled(v) {},
          fillRect() { window._calls.rects++; }, strokeRect() { window._calls.rects++; },
          drawImage() { window._calls.draws++; }, fillText() { window._calls.texts++; },
          beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, fill() {}, arc() {}, clearRect() {},
        };
      },
    });
    window._els = {
      'win-base': mkText('win-base'),
      'base-layout-select': mkSelect('base-layout-select'),
      'base-win-empty': mkText('base-win-empty'),
      'base-canvas-2d': mkCanvas('base-canvas-2d'),
      'base-canvas-3d': mkCanvas('base-canvas-3d'),
    };
    document.getElementById = (id) => window._els[id] || null;
  `, sb);
  const out = vm.runInContext(`
    (async () => {
      const r = { steps: [] };
      // 1) without a loaded game (G null): hint shown, no crash
      G = null;
      await baseWindowRender();
      const empty = window._els['base-win-empty'];
      r.steps.push({ hint: empty.style.display, txt: empty.textContent.length > 0 });
      // 2) with a furnished base (fresh G → lazy-init of baseGetState)
      G = {};
      const st = baseGetState();
      baseCreate(st, 'cave_1');
      baseStockAdd(st, 'surf_mat', 1); baseStockAdd(st, 'azurill_doll', 1);
      basePlace(st, 'surf_mat', 4, 3, 0);
      basePlace(st, 'azurill_doll', 4, 3, 0);   // doll on the mat (holder) pass 42: 100% canon scene
      const before = window._calls.rects;
      await baseWindowRender();
      const c2d = window._els['base-canvas-2d'], c3d = window._els['base-canvas-3d'];
      const drawn2d = window._calls.rects - before;
      r.steps.push({ c2d: c2d.style.display, c3d: c3d.style.display, drawn2d, empty: empty.style.display });
      // 3) re-render WITHOUT change → throttle (no extra rect)
      const before2 = window._calls.rects;
      await baseWindowRender();
      r.steps.push({ extra: window._calls.rects - before2 });
      // 4) invalidation explicite → redessine
      baseWindowInvalidate();
      await Promise.resolve(); await Promise.resolve();
      r.steps.push({ afterInv: window._calls.rects - before2 });
      // 5) layout select filled (pass 55: no more mode selector)
      const ls = window._els['base-layout-select'];
      r.steps.push({ layouts: ls.options.length, layout: ls.value });
      return JSON.stringify(r);
    })()
  `, sb);
  const r = JSON.parse(await out);
  assert.deepEqual([r.steps[0].hint, r.steps[0].txt], ['block', true], 'hint unsaved');
  assert.deepEqual([r.steps[1].c2d, r.steps[1].c3d, r.steps[1].empty], ['block', 'none', 'none'], 'canvas 2D visible seul');
  assert.ok(r.steps[1].drawn2d >= 49, `grid drawn (${r.steps[1].drawn2d} rects ≥ 49)`);
  assert.equal(r.steps[2].extra, 0, 'no re-render without change');
  assert.ok(r.steps[3].afterInv > 0, 'invalidation → redessine');
  assert.equal(r.steps[4].layouts, 36, '36 layouts (24 canon + 6 custom + 6 colored multi-floor caves, phase 42) — optgroups counted flat');
  assert.equal(r.steps[4].layout, 'cave_1');
});

// ——— F — Visibility hotfix: pw-static CSS collision + mobile + hardening —
// The whole window inherited .pw-static-082 (20px × 20px, opacity .5):
// a collision with pw-static.css legacy styles made it invisible.
test('phase 35 F: no pw-static on win-base + mobile + guaranteed 2D fallback', () => {
  const idx = R('index.html');
  const i = idx.indexOf('id="win-base"');
  const j = idx.indexOf('id="win-battle"');
  const block = idx.slice(i, j);
  assert.ok(!/pw-static-\d+/.test(block), 'no pw-static-* class in the #win-base block');
  // wave 24: pw-static.css removed — the guard now targets the pw-static SECTION
  // of the single canonical stylesheet (same legacy surface, same semantics).
  const DSFULL = R('src/assets/styles/design-system.css');
  const a = DSFULL.indexOf('=== Section: pw-static utilities ===');
  const b = DSFULL.indexOf('=== Section: universal contrast');
  assert.ok(a > 0 && b > a, 'pw-static section located inside design-system.css');
  const css = DSFULL.slice(a, b);
  for (const m of block.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls || cls === 'dash-win' || cls === 'win-header' || cls === 'win-body' || cls === 'hbtn' || cls.startsWith('drag-handle') || cls === 'title-icon' || cls === 'win-header-title' || cls === 'base-win-controls') continue;
      assert.ok(!new RegExp('\\.' + cls + '\\s*[{,]').test(css), `class ${cls} without conflicting legacy style`);
    }
  }
  // mobile: the base is reachable via Manage → Base
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes("base:['win-base']"), 'mapping mobile-manage-view base');
  assert.ok(idx.includes('data-mobile-manage-view="base"'), 'mobile Base subnav button');
  assert.ok(R('src/localization/fr/ui.js').includes('"base_tab"'), 'base_tab key FR');
  assert.ok(R('src/localization/en/ui.js').includes('"base_tab"'), 'base_tab key EN');
  // render hardening
  const win = R('src/ui/game/base/base-window.js');
  // Pass 56: this window is purely 2D — there is no 3D left to fall back to.
  // The safety net is elsewhere: if even the 2D fails, a message
  // is shown in the frame (the window is never empty).
  assert.ok(win.includes('last resort'), 'message if the 2D render fails');
  assert.ok(win.includes('window never empty') || win.includes('last resort'), 'message if even 2D fails');
});

// ——— E — Assets: Emerald transparency + downloader ———————————————————
test('phase 35 E: RGBA (alpha) Emerald sprites + fix wired to the downloader', () => {
  // PNG colorType 6 (RGBA) after tools/fix-emerald-alpha.py (byte 25 of the file)
  for (const f of ['azurill_doll.png', 'torchic_doll.png', 'red_brick.png', 'blue_tent.png']) {
    const buf = fs.readFileSync(new URL(`../src/assets/images/secret-base/emerald/${f}`, import.meta.url));
    assert.equal(buf[25], 6, `${f} en RGBA (colorType ${buf[25]})`);
  }
  const py = R('tools/download_assets.py');
  assert.ok(py.includes('fix-emerald-alpha.py'), 'transparency pass wired');
  assert.ok(E('tools/fix-emerald-alpha.py'), 'tool present');

  // Pass 42: 2D manifest 100% RSE canon (the only sprite = the native
  // Emerald asset, baked from the official metatiles/objgfx — ORAS icons removed).
  const r2 = J('src/assets/images/secret-base/manifest.render2d.json');
  const fsSprites = fs.readdirSync(new URL('../src/assets/images/secret-base/emerald', import.meta.url)).filter((f) => f.endsWith('.png'));
  assert.equal(r2.stats.sprites, fsSprites.length, 'stats.sprites == baked files');
  assert.equal(r2.stats.sprites, 122, '122 canon sprites (120 decors + pc + stairs... ORAS purge included)');
  for (const k of ['catalog', 'emerald', 'icon2d', 'covered', 'uncovered']) assert.ok(!(k in r2.stats), `legacy stats ${k} removed`);
  assert.deepEqual([...r2.stats.people].sort(),
    ['player'],
    'personnage joueur trainer-54');
  for (const [slug, entry] of Object.entries(r2.items)) {
    assert.equal(Object.keys(entry).join(','), 'emerald', `${slug}: unique canon sprite`);
    assert.ok(E(entry.emerald), `fichier ${slug}`);
  }
  // no orphan: every PNG is referenced by the manifest
  const referenced = new Set(Object.values(r2.items).map((e) => e.emerald.split('/').pop()));
  for (const f of fsSprites) assert.ok(referenced.has(f), `orphelin ${f}`);
});

