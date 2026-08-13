import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 39: real assets everywhere + stock pages + fixed rules ───────────
//  A. Asset coverage: 106 catalog slugs have an Emerald sprite
//     (DECOR_MAP metatiles + 34 doll/cushion object sprites); only
//     objects WITHOUT an RSE equivalent stay as discs (exhaustive list)
//  B. 1×2 board (canonical DECORSHAPE_1x2): fills the twin hollows of the
//     "4" rooms (546/547 reclassified as holes) OR an isolated hole (board
//     extended onto the floor); entrance/spawn/occupied tile refused
//  C. Dolls/cushions ON THE FLOOR allowed (user decision): 1 surface object
//     per cell, entrance refused, picking up the carrier leaves the doll
//  D. Editor: deselect after EACH placement (one by one), stock paginated by
//     categories (tabs) + thumbnails on the buttons
//  E. Grids: 546/547 reclassified 'o' — engine coherence + persisted baker
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
  'src/ui/game/base/base-visit.js',
  'src/ui/game/base/base-editor.js',
  'src/ui/game/base/base-debug.js',
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
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, addEventListener() {}, click() {}, remove() {} }),
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe39-assets-editeur [iife]' });
  return sandbox;
}

// Objects without a dedicated sprite: in phase 41, the 20 ex-no-RSE were REDRAWN
// in the Emerald art style (tools/bake-missing-sprites.py) or removed from the catalog
// (invisible_doll, invisible in game). Remains the welcome mat, red/gold
// procedural art wanted from the start (automatic acquisition).
const NO_RSE_SPRITE = []; // phase 43: welcome_mat removed from the catalog

// ——— A — Asset coverage ————————————————————————————————————————————
test('phase 39 A: the 122 slugs ALL have an Emerald sprite (phase 43)', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json').items;
  const bake = R('tools/bake-emerald-bgs.py');
  const catalogue = [...R('src/data/base-items-data.js').matchAll(/s:'([a-z0-9_]+)'/g)].map((m) => m[1]);
  const withSprite = catalogue.filter((s) => man[s] && man[s].emerald);
  const without = catalogue.filter((s) => !(man[s] && man[s].emerald));
  assert.equal(catalogue.length, 122, 'catalog 122 objects = 120 RSE canon + stairs + pc (phase 43: welcome mat removed)');
  assert.deepEqual(without.sort(), [], 'phase 43: ALL slugs have a sprite (welcome mat removed)');
  assert.equal(withSprite.length, 122, '122 baked slugs (canon metatiles + 45 objgfx + stairs + 11 downloaded dolls)');
  for (const s of withSprite) {
    assert.ok(E(man[s].emerald), `file present ${s}`);
  }
  // offline-staged object sprites (regenerable without network)
  const sources = J('tools/emerald-ref/objgfx/sources.json');
  assert.equal(Object.keys(sources.files).length, 45, '45 staged objgfx (34 + 11 canon dolls downloaded in phase 42)');
  for (const slug of Object.keys(sources.files)) {
    assert.ok(E(`tools/emerald-ref/objgfx/${slug}.png`), `staging ${slug}`);
  }
  // le baker mappe CAMP_DESK/CHAIR (log) et RED_PLANT (fleur) — vrais noms RSE
  assert.ok(bake.includes('CAMP_DESK') && bake.includes('CAMP_CHAIR') && bake.includes('RED_PLANT'), 'exact Emerald DECOR names');
});

// ——— B — 1×2 board ——————————————————————————————————————————————————————
test('phase 39 B: canon 1×2 board — twin hollows, isolated hole, refusals', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    r.fp = baseItemFootprint(baseItemGet('solid_board'), 0);
    // salle « 4 » : paire de creux tree_4 (11,7)/(11,8)
    {
      const st = baseGetState();
      baseDebugCreate('tree_4');
      baseDebugGrantAll();
      r.pairOk = basePlace(st, 'solid_board', 11, 7, 0).ok === true;
      const g = baseBuildGrid(st);
      r.w7 = baseCellWalkable(st, g, 11, 7, null);
      r.w8 = baseCellWalkable(st, g, 11, 8, null);
      r.bottomTaken = baseCanPlace(st, 'solid_board', 11, 6, 0).reason; // overlaps the placed board
      // pass 42: board placeable ANYWHERE (hole OR bare floor), but never on
      // a wall / the border / an occupied tile
      r.wallRefusal = baseCanPlace(st, 'solid_board', 0, 0, 0).reason;
    }
    // isolated hole (526): the board continues onto the floor below
    {
      const st2 = baseGetState();
      baseDebugCreate('tree_2');
      st2.items = []; st2.stock = {}; st2.npcs = []; st2.npcStock = [];
      st2.uidSeq = 1;
      baseStockAdd(st2, 'solid_board', 2);
      r.singleOk = basePlace(st2, 'solid_board', 3, 1, 0).ok === true;  // bottom (3,2) = free floor
      baseStockAdd(st2, 'small_desk', 1);
      basePlace(st2, 'small_desk', 3, 2, 0);                            // under the hole: desk
      r.bottomOccupied = baseCanPlace(st2, 'solid_board', 3, 1, 0).reason; // (a board is already there…)
    }
    // the TOP must be a hole: refused on the floor
    r.ghostFp = (() => {
      const st3 = baseGetState();
      baseDebugCreate('bush_4');
      const st4 = { ...st3, items: [], stock: {}, npcs: [], npcStock: [], uidSeq: 1 };
      baseStockAdd(st4, 'solid_board', 1);
      baseEditorSelectSlug(st4, 'solid_board');
      baseEditorSetHover({ x: 3, y: 1 });  // paire (3,1)/(3,2) de bush_4
      const gh = baseEditorGhost(st4);
      return gh ? { w: gh.w, d: gh.d, ok: gh.ok } : null;
    })();
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.fp, { w: 1, d: 2 }, '1×2 board (canon DECORSHAPE_1x2)');
  assert.equal(out.pairOk, true, 'twin hollows of the "4" rooms filled');
  assert.equal(out.w7, true, 'top of the hollow crossable once filled');
  assert.equal(out.w8, true, 'bottom of the hollow crossable once filled');
    assert.equal(out.bottomTaken, 'base.err.occupied', 'cell already filled → refusal');
    assert.equal(out.wallRefusal, 'base.err.floor_only', 'wall → refusal (phase 42)');
  assert.equal(out.singleOk, true, 'isolated hole: board extended onto the floor');
  assert.equal(out.bottomOccupied, 'base.err.occupied');
  assert.deepEqual(out.ghostFp, { w: 1, d: 2, ok: true }, '1×2 ghost on the bush_4 pair');
});

// ——— C — Surface assouplie ————————————————————————————————————————————————
test('phase 39 C: dolls/cushions on the floor, 1 per cell, entrance refused, carrier picked up', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const r = {};
    r.floorDoll = basePlace(st, 'pichu_doll', 4, 4, 0).ok === true;     // on the floor
    r.floorCushion = basePlace(st, 'pika_cushion', 6, 4, 0).ok === true; // cushion on the floor
    r.secondSame = baseCanPlace(st, 'azurill_doll', 4, 4, 0).reason;    // 1 per cell
    r.onSpawn = baseCanPlace(st, 'azurill_doll', 5, 7, 0).reason;       // S refused (pass 43: in front of the door)
    r.onEntrance = baseCanPlace(st, 'azurill_doll', 5, 8, 0).reason;    // E refused
    r.onOccupied = baseCanPlace(st, 'azurill_doll', 6, 4, 0).reason;    // cushion already there
    // holder + doll: picking up the holder LEAVES the doll (legal floor)
    basePlace(st, 'small_desk', 3, 5, 0);
    basePlace(st, 'clefairy_doll', 3, 5, 0);
    const desk = st.items.find((i) => i.s === 'small_desk');
    const n = basePickup(st, desk.uid);
    r.pickupChain = n;                                                   // desk alone (doll stays)
    r.dollLeft = st.items.some((i) => i.s === 'clefairy_doll' && i.x === 3 && i.y === 5);
    r.deskLeft = st.items.some((i) => i.s === 'small_desk');
    // but on a tile occupied by a non-holder furniture: refused
    // (pass 42: pokeball_chair no longer exists — the canon barrier has no surf:true)
    basePlace(st, 'fence_length', 8, 5, 0);
    r.onOtherItem = baseCanPlace(st, 'azurill_doll', 8, 5, 0).reason;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.floorDoll, true, 'doll on the floor');
  assert.equal(out.floorCushion, true, 'cushion on the floor');
  assert.equal(out.secondSame, 'base.err.surface_taken', 'a single surface per cell');
  assert.equal(out.onSpawn, 'base.err.entrance');
  assert.equal(out.onEntrance, 'base.err.entrance');
  assert.equal(out.onOccupied, 'base.err.surface_taken');
  assert.equal(out.pickupChain, 1, 'the desk alone is picked up');
  assert.equal(out.dollLeft, true, 'the doll stays on the floor (relaxed rule)');
  assert.equal(out.deskLeft, false);
  assert.equal(out.onOtherItem, 'base.err.occupied', 'no doll on a non-carrier furniture');
});

// ——— D — Deselect after placement + paginated stock ——————————————————————
test('phase 39 D: one by one after each placement + paginated stock + thumbnails', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const ed = baseEditorGet();
    baseStockAdd(st, 'small_desk', 2);      // stock ≥ 2: the old code kept the hand
    baseEditorSelectSlug(st, 'small_desk');
    const r = { before: ed.slug };
    const p1 = baseEditorClickCell(st, 1, 3);
    r.p1 = p1.ok === true;
    r.after1 = ed.slug;                     // MUST be null (decision: one at a time)
    r.stock1 = baseStockCount(st, 'small_desk');
    r.reSel = baseEditorSelectSlug(st, 'small_desk');  // re-click possible
    const p2 = baseEditorClickCell(st, 2, 3);
    r.p2 = p2.ok === true;
    r.after2 = ed.slug;
    r.stock2 = baseStockCount(st, 'small_desk');
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.before, 'small_desk');
  assert.equal(out.p1, true);
  assert.equal(out.after1, null, 'hand released after EACH placement');
  assert.equal(out.stock1, 1);
  assert.equal(out.reSel, 'small_desk', 'you can re-select for the next one');
  assert.equal(out.p2, true);
  assert.equal(out.after2, null);
  assert.equal(out.stock2, 0);
  // Paginated stock: per-category tabs + single page + thumbnails
  const win = R('src/ui/game/base/base-window.js');
  assert.ok(win.includes('base-stock-tabs'), 'barre d’onglets');
  assert.ok(win.includes("_baseWin.stockTab"), 'current page memorized');
  assert.ok(win.includes("data-action = 'base-ed-tab'") || win.includes("'base-ed-tab'") || win.includes('base-ed-tab'), 'onglet cliquable');
  assert.ok(win.includes('base-stock-page'), 'page unique rendue');
  assert.ok(win.includes('baseWindowManifest') && win.includes('e.emerald || e.icon2d'), 'emerald→icon2d thumbnail on the buttons');
  assert.ok(win.includes('__pals'), 'page Copains');
  const post = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(post.includes("'base-ed-tab'"), 'action postboot');
  const css = R('src/assets/css/style.css');
  for (const sel of ['.base-stock-tabs', '.base-stock-tab', '.base-stock-page']) assert.ok(css.includes(sel), `style ${sel}`);
  // The CANVAS stays 100% Emerald (the 2.5D icon is only for the buttons)
  const v2d = R('src/ui/game/base/base-view2d.js');
  assert.ok(!v2d.includes('icon2d'), 'canvas: still no shop icon');
});

// ——— E — Hollow reclassification ———————————————————————————————————————————
test('phase 39 E: hollows 546/547 reclassified as holes (engine + reference + baker)', () => {
  const canon = J('tools/emerald-ref/canon-grids.json');
  const pairs = { tree_4: [[11, 7], [11, 8]], cave_4: [[10, 1], [10, 2]], bush_4: [[3, 1], [3, 2]] };
  for (const [lid, cells] of Object.entries(pairs)) {
    for (const [x, y] of cells) {
      assert.equal(canon[lid][y][x], 'o', `${lid} (${x},${y}) = hole in the reference`);
    }
  }
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    for (const [lid, cells] of Object.entries({ tree_4: [[11, 7], [11, 8]], cave_4: [[10, 1], [10, 2]], bush_4: [[3, 1], [3, 2]] })) {
      const L = baseLayoutGet(lid);
      for (const [x, y] of cells) {
        r[lid + ':' + x + ',' + y] = L.cells[y][x].t;
        const st = baseGetState();
        baseDebugCreate(lid);
        st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
        const g = baseBuildGrid ? baseBuildGrid(st) : null;
        r[lid + ':walk:' + x + ',' + y] = baseCellWalkable(st, g, x, y, null);
      }
    }
    // floor furniture on a hollow is still refused (only the board goes there)
    const st = baseGetState();
    baseDebugCreate('tree_4');
    st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
    r.floorRefused = baseCanPlace(st, 'small_desk', 11, 7, 0).reason;
    return JSON.stringify(r);
  })()`, sb));
  for (const [lid, cells] of Object.entries(pairs)) {
    for (const [x, y] of cells) {
      assert.equal(out[`${lid}:${x},${y}`], 'hole', `${lid} (${x},${y}) hole on the engine side`);
      assert.equal(out[`${lid}:walk:${x},${y}`], false, 'hollow uncrossable without a board');
    }
  }
  assert.equal(out.floorRefused, 'base.err.floor_only', 'floor furniture refused on the hollow');
  // baker: persisted classification (deterministic regeneration)
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('546, 547'), 'twin hollows recognized by the baker');
});


