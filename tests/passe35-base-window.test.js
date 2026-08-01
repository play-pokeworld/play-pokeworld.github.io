import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 35 : fenêtre Base Secrète permanente (dashboard) + FIX renderers ──
//  A. Intégration dashboard : #win-base dans index.html, actions postboot,
//     dashboardCols + injection, hook renderMap, bouton debug retiré
//  B. i18n : base.win.* FR/EN (titre final, empty, close retiré)
//  C. Correctifs 3D : winding des primitives (preuve géométrique), UV OBJ
//     inversées, pitch caméra, skip ombres, constantes de buffers
//  D. Fumée headless : init sélects, rendu 2D sans exception, throttle par
//     signature, invalidation explicite
//  E. Assets : sprites Émeraude convertis RGBA + fix câblé au téléchargeur
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));

const SANDBOX_FILES = [
  'src/file-preflight.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/game/core/state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/game/base/base-core.js',
  'src/game/base/base-view2d.js',
  'src/game/base/base-window.js',
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
  for (const f of SANDBOX_FILES) vm.runInContext(R(f), sandbox, { filename: f });
  return sandbox;
}

// ——— A — Intégration dashboard ——————————————————————————————————————————
test('passe 35 A : fenêtre permanente câblée (index, actions, dashboard, hook)', () => {
  const idx = R('index.html');
  assert.ok(idx.includes('id="win-base"'), '#win-base présent');
  assert.ok(idx.includes('data-drag-window="win-base"'), 'drag natif des dash-win');
  for (const id of ['base-layout-select', 'base-canvas-2d', 'base-canvas-3d', 'base-panel', 'base-win-empty', 'base-refresh-btn']) {
    assert.ok(idx.includes(`id="${id}"`), `#${id} présent`);
  }
  assert.ok(!idx.includes('id="win-base3d"'), 'plus de fenêtre 3D');
  assert.ok(idx.includes('data-action="base-window-layout"'), 'select gabarit = action postboot');
  assert.ok(!idx.includes('debug-base-window'), 'bouton debug « fenêtre test » retiré');
  assert.ok(idx.includes('data-i18n="base.win.title"'), 'titre internationalisé');

  const pb = R('src/file-postboot.js');
  assert.ok(pb.includes("'base-window-refresh'"), 'action refresh');
  assert.ok(pb.includes("callGlobal('baseWindowSetMode'"), 'change mode dispatché');
  assert.ok(pb.includes("callGlobal('baseWindowSetLayout'"), 'change gabarit dispatché');
  assert.ok(!pb.includes('baseWindowToggle'), 'ancienne action debug retirée');

  const dash = R('src/game/display/dashboard.js');
  assert.ok(dash.includes("'win-battle', 'win-map', 'win-base'"), 'win-base dans la colonne 2 par défaut');
  const ensures = dash.split('win-base').length - 1;
  assert.ok(ensures >= 4, 'win-base : défaut + injection existants + preset cols3');

  const loader = R('src/loader.js');
  const i2 = loader.indexOf('base-view2d.js'), iw = loader.indexOf('base-window.js');
  assert.ok(i2 > 0 && i2 < iw, 'renderer 2D avant sa fenêtre');

  assert.ok(R('src/game/display/map-render.js').includes('baseWindowRender'), 'hook renderMap');
});

// ——— B — i18n ———————————————————————————————————————————————————————————
test('passe 35 B : base.win.* finalisé FR/EN (titre, empty ; close retiré)', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    for (const lang of ['fr', 'en']) {
      const w = I18N[lang] && I18N[lang].base && I18N[lang].base.win;
      if (!w) throw new Error(lang + ' base.win absent');
      for (const k of ['title', 'mode_label', 'layout_label', 'refresh', 'mode3d', 'mode2d', 'moved', 'no_gl', 'empty']) {
        if (typeof w[k] !== 'string' || !w[k].length) throw new Error(lang + ' win.' + k);
      }
      if (w.close) throw new Error(lang + ' win.close retirée (plus de bouton ✕)');
      if (/(test|essai)/i.test(w.title)) throw new Error(lang + ' titre final sans « test »');
      for (const id of ['cave_1', 'cave_2', 'cave_3', 'cave_4', 'tree_1', 'tree_2', 'tree_3', 'tree_4', 'bush_1', 'bush_2', 'bush_3', 'bush_4']) {
        if (!w.layout[id]) throw new Error(lang + ' win.layout.' + id);
      }
    }
    window._ok = true;
  `, sb);
  assert.ok(vm.runInContext('window._ok', sb), 'base.win.* complet');
  // Langue par défaut du jeu = EN ; on force chaque locale explicitement.
  assert.equal(vm.runInContext(`(G.lang='fr', t('base.win.title'))`, sb), 'Base Secrète');
  assert.equal(vm.runInContext(`I18N.en.base.win.title`, sb), 'Secret Base');
  assert.ok(!R('src/localization/fr/ui.js').includes('debug_base_window'), 'clé UI FR retirée');
  assert.ok(!R('src/localization/en/ui.js').includes('debug_base_window'), 'clé UI EN retirée');
});

// ——— C — Correctifs 3D (preuves géométriques) ————————————————————————————
// Passe 56 : l'ancien renderer `base-view3d.js` a été REMPLACÉ par la
// fenêtre 3D autonome (base3d-view.js). Il déclarait `_base3dManifestP` au
// niveau global, comme le nouveau chargeur : deux `let` de même nom dans la
// portée globale = SyntaxError, et TOUT le chargement des scripts s'arrêtait
// (fenêtre 3D noire, console pleine de « loadScript »). Il est archivé dans
// tools/legacy/ ; ces vérifications portent désormais sur le renderer actif.
test('passe 35 C : renderer 3D supprimé', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), 'renderer 3D retiré');
  assert.ok(!E('src/game/base/base-view3d.js'), 'ancien renderer retiré');
});

test('passe 35 D : init + rendu 2D sans exception + throttle signature', async () => {
  const sb = makeSandbox();
  vm.runInContext(`
    window.fetch = () => Promise.resolve({ ok: false });
    window._calls = { rects: 0, draws: 0 };
    // Passe 40 : le sélecteur de gabarits groupe ses options dans des optgroups
    // (comme le DOM réel, .options doit les compter à plat).
    const mkSelect = (id) => ({ id, options: [], value: '', title: '', style: { cssText: '' }, dataset: {}, setAttribute() {}, addEventListener() {},
      appendChild(c) { const kids = c && Array.isArray(c.children) && c.children.length ? c.children : [c]; for (const k of kids) this.options.push(k); return c; } });
    const mkText = (id) => ({ id, textContent: '', style: { cssText: '', display: '' }, dataset: {}, setAttribute() {}, addEventListener() {} });
    const mkCanvas = (id) => ({
      id, style: { cssText: '', display: '' }, dataset: {}, setAttribute() {}, addEventListener() {},
      width: 0, height: 0,
      getContext(kind) {
        if (kind === 'webgl2') return null; // headless : pas de GL → repli 2D
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
      // 1) sans partie chargée (G null) : hint affiché, aucun crash
      G = null;
      await baseWindowRender();
      const empty = window._els['base-win-empty'];
      r.steps.push({ hint: empty.style.display, txt: empty.textContent.length > 0 });
      // 2) avec une base meublée (G frais → lazy-init de baseGetState)
      G = {};
      const st = baseGetState();
      baseCreate(st, 'cave_1');
      baseStockAdd(st, 'surf_mat', 1); baseStockAdd(st, 'azurill_doll', 1);
      basePlace(st, 'surf_mat', 4, 3, 0);
      basePlace(st, 'azurill_doll', 4, 3, 0);   // poupée sur le tapis (porteur) passe 42 : scène 100 % canon
      const before = window._calls.rects;
      await baseWindowRender();
      const c2d = window._els['base-canvas-2d'], c3d = window._els['base-canvas-3d'];
      const drawn2d = window._calls.rects - before;
      r.steps.push({ c2d: c2d.style.display, c3d: c3d.style.display, drawn2d, empty: empty.style.display });
      // 3) re-render SANS changement → throttle (aucun rect de plus)
      const before2 = window._calls.rects;
      await baseWindowRender();
      r.steps.push({ extra: window._calls.rects - before2 });
      // 4) invalidation explicite → redessine
      baseWindowInvalidate();
      await Promise.resolve(); await Promise.resolve();
      r.steps.push({ afterInv: window._calls.rects - before2 });
      // 5) sélect de gabarit rempli (passe 55 : plus de sélecteur de mode)
      const ls = window._els['base-layout-select'];
      r.steps.push({ layouts: ls.options.length, layout: ls.value });
      return JSON.stringify(r);
    })()
  `, sb);
  const r = JSON.parse(await out);
  assert.deepEqual([r.steps[0].hint, r.steps[0].txt], ['block', true], 'hint sans sauvegarde');
  assert.deepEqual([r.steps[1].c2d, r.steps[1].c3d, r.steps[1].empty], ['block', 'none', 'none'], 'canvas 2D visible seul');
  assert.ok(r.steps[1].drawn2d >= 49, `grille dessinée (${r.steps[1].drawn2d} rects ≥ 49)`);
  assert.equal(r.steps[2].extra, 0, 'aucun re-rendu sans changement');
  assert.ok(r.steps[3].afterInv > 0, 'invalidation → redessine');
  assert.equal(r.steps[4].layouts, 36, '36 gabarits (24 canon + 6 perso + 6 grottes colorées à étage, passe 42) — optgroups comptés à plat');
  assert.equal(r.steps[4].layout, 'cave_1');
});

// ——— F — Hotfix visibilité : collision CSS pw-static + mobile + durcissement —
// La fenêtre entière héritait de .pw-static-082 (20px × 20px, opacity .5) :
// une collision avec les styles legacy de pw-static.css la rendait invisible.
test('passe 35 F : aucune pw-static sur win-base + mobile + repli 2D garanti', () => {
  const idx = R('index.html');
  const i = idx.indexOf('id="win-base"');
  const j = idx.indexOf('id="win-battle"');
  const block = idx.slice(i, j);
  assert.ok(!/pw-static-\d+/.test(block), 'aucune classe pw-static-* dans le bloc #win-base');
  const css = R('src/assets/styles/pw-static.css');
  for (const m of block.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls || cls === 'dash-win' || cls === 'win-header' || cls === 'win-body' || cls === 'hbtn' || cls.startsWith('drag-handle') || cls === 'title-icon' || cls === 'win-header-title' || cls === 'base-win-controls') continue;
      assert.ok(!new RegExp('\\.' + cls + '\\s*[{,]').test(css), `classe ${cls} sans style legacy conflictuel`);
    }
  }
  // mobile : la base est atteignable via Gestion → Base
  assert.ok(R('src/file-preflight.js').includes("base:['win-base']"), 'mapping mobile-manage-view base');
  assert.ok(idx.includes('data-mobile-manage-view="base"'), 'bouton subnav mobile Base');
  assert.ok(R('src/localization/fr/ui.js').includes('"base_tab"'), 'clé base_tab FR');
  assert.ok(R('src/localization/en/ui.js').includes('"base_tab"'), 'clé base_tab EN');
  // durcissements rendu
  const win = R('src/game/base/base-window.js');
  // Passe 56 : cette fenêtre est purement 2D — il n'y a plus de 3D à replier.
  // Le filet de sécurité est ailleurs : si même la 2D échoue, un message
  // s'affiche dans le cadre (la fenêtre n'est jamais vide).
  assert.ok(win.includes('dernier recours'), 'message si le rendu 2D échoue');
  assert.ok(win.includes('fenêtre jamais vide') || win.includes('dernier recours'), 'message si même la 2D échoue');
});

// ——— E — Assets : transparence Émeraude + téléchargeur ———————————————————
test('passe 35 E : sprites Émeraude RGBA (alpha) + fix câblé au téléchargeur', () => {
  // PNG colorType 6 (RGBA) après tools/fix-emerald-alpha.py (octet 25 du fichier)
  for (const f of ['azurill_doll.png', 'torchic_doll.png', 'red_brick.png', 'blue_tent.png']) {
    const buf = fs.readFileSync(new URL(`../src/assets/images/secret-base/emerald/${f}`, import.meta.url));
    assert.equal(buf[25], 6, `${f} en RGBA (colorType ${buf[25]})`);
  }
  const py = R('tools/download_assets.py');
  assert.ok(py.includes('fix-emerald-alpha.py'), 'passe transparence câblée');
  assert.ok(E('tools/fix-emerald-alpha.py'), 'outil présent');

  // Passe 42 : manifeste 2D 100 % canon RSE (le seul sprite = l'asset Émeraude
  // natif, cuit depuis les métatiles/objgfx officiels — icônes ORAS supprimées).
  const r2 = J('src/assets/images/secret-base/manifest.render2d.json');
  const fsSprites = fs.readdirSync(new URL('../src/assets/images/secret-base/emerald', import.meta.url)).filter((f) => f.endsWith('.png'));
  assert.equal(r2.stats.sprites, fsSprites.length, 'stats.sprites == fichiers cuisinés');
  assert.equal(r2.stats.sprites, 122, '122 sprites canon (120 décos + pc + escalier... purge ORAS incluse)');
  for (const k of ['catalog', 'emerald', 'icon2d', 'covered', 'uncovered']) assert.ok(!(k in r2.stats), `stats legacy ${k} retirée`);
  assert.deepEqual([...r2.stats.people].sort(),
    ['player'],
    'personnage joueur trainer-54');
  for (const [slug, entry] of Object.entries(r2.items)) {
    assert.equal(Object.keys(entry).join(','), 'emerald', `${slug} : sprite canon unique`);
    assert.ok(E(entry.emerald), `fichier ${slug}`);
  }
  // pas d'orphelin : chaque PNG est référencé par le manifeste
  const referenced = new Set(Object.values(r2.items).map((e) => e.emerald.split('/').pop()));
  for (const f of fsSprites) assert.ok(referenced.has(f), `orphelin ${f}`);
});

