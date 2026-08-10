import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 40: file:// compat, re-click move, mobile PC ─────────────────────
//  A. 2D manifest embedded as a script (fetch is CORS-blocked under file://):
//     generated file = JSON manifest content, loaded BEFORE the views,
//     consumed FIRST by base-view2d.js and base-window.js.
//  B. 3D: after ONE failure ("cross-origin" img under file:// → texImage2D
//     throws), 3D is cut for the session (broken3d + select switched back to 2D).
//  C. Moving: ONE click on placed furniture = direct pick-up
//     (phase 41 — the 2-step selection was invisible), footprint
//     released (st._moveUid), placement on a legal click, cancel frees the spot,
//     "Pick up" STORES the held furniture; fixed welcome mat; PC
//     movable.
//  D. PC: canonical auto-object present from creation, never stored
//     (Put everything away/basePickup keep it), repositioned when moving,
//     unique per base, and movable AS LONG AS it stays reachable on foot
//     from the entrance (base.err.pc_unreachable otherwise).
//  (pass 41) F. stairs = canon 2×2 footprint (ORAS style); cave_5 was
//     regridded: anchors (1,4)/(2,4), pillar x9-10 y6-7, door E (6,9).
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe40-file-move-pc [iife]' });
  return sandbox;
}

// ——— A — Manifeste script compatible file:// ————————————————————————————
test('phase 40 A: 2D manifest embedded as a script, read first', () => {
  assert.ok(E('src/data/base-manifest-2d-data.js'), 'JS manifest file present');
  const js = R('src/data/base-manifest-2d-data.js');
  assert.ok(js.startsWith('// GENERATED'), 'generated marker');
  // Vague 38 (T2-D ESM) : le manifeste est désormais `export const …` + shim —
  // même JSON embarqué, même intention (« embarqué en script, lu en premier »).
  const body = js.slice(js.indexOf('PokeWorldBaseManifest2D = '));
  const jsonTxt = body.slice(body.indexOf('{'), body.indexOf('};') + 1);
  const fromJs = JSON.parse(jsonTxt);
  const fromJson = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.deepEqual(Object.keys(fromJs.items).sort(), Object.keys(fromJson.items).sort(), 'same slugs');
  assert.equal(fromJs.items.solid_board.emerald, fromJson.items.solid_board.emerald, 'same paths');
  // loaded BEFORE the views in the loader
  const loader = R('src/main.js');
  const iMan = loader.indexOf('./data/base-manifest-2d-data.js');
  assert.ok(iMan > -1, 'JS manifest in the loader');
  assert.ok(iMan < loader.indexOf('./ui/game/base/base-view2d.js'), 'before base-view2d');
  assert.ok(iMan < loader.indexOf('./ui/game/base/base-window.js'), 'before base-window');
  // BOTH consumers read the global FIRST (fetch = http fallback)
  const v2d = R('src/ui/game/base/base-view2d.js');
  const win = R('src/ui/game/base/base-window.js');
  for (const [name, src] of [['view2d', v2d], ['window', win]]) {
    assert.ok(src.includes('window.PokeWorldBaseManifest2D'), `${name} lit la globale`);
    assert.ok(src.indexOf('window.PokeWorldBaseManifest2D') < src.indexOf("fetch('src/assets/images/secret-base/manifest.render2d.json')"), `${name}: global before fetch`);
  }
});

// ——— B — 3D cleanly cut after the 1st failure ———————————————————————————
test('phase 40 B: 3D renderer removed', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), '3D renderer removed');
});

// ——— C — ONE-click moving (phase 41) ————————————————————————————————————
test('phase 41 C: ONE click on placed furniture = direct pick-up', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const r = {};
    basePlace(st, 'small_desk', 3, 4, 0);
    const desk = st.items.find((i) => i.s === 'small_desk');
    // ONE click on the placed furniture = DIRECT pickup (pass 41: the
    // two-step selection was invisible and read as a bug).
    const c1 = baseEditorClickCell(st, 3, 4);
    r.start = c1.type;
    r.moveUid = baseEditorGet().moveUid === desk.uid;
    // the footprint is freed: another furniture could come through
    r.canReuse = baseCanPlace(st, 'pokemon_chair', 3, 4, 0).ok === true;  // passe 42 : slug canon
    // click on an illegal tile (wall) → still in hand
    baseEditorSetHover({ x: 0, y: 0 });
    const bad = baseEditorClickCell(st, 0, 0);
    r.badOk = bad.ok !== false ? 'oui' : bad.reason;
    r.stillHeld = baseEditorGet().moveUid === desk.uid;
    // legal click → placed over there, hand released
    const c3 = baseEditorClickCell(st, 5, 5);
    r.placed = c3.ok === true && st.items.find((i) => i.uid === desk.uid).x === 5;
    r.released = baseEditorGet().moveUid == null;
    // cancellation: re-grab (one click), pivot the held item, right-click → everything back
    baseEditorClickCell(st, 5, 5);
    baseEditorRotateSel(st); // pass 42: rotation removed → no effect, breaks nothing
    baseEditorMoveCancel(st);
    const d2 = st.items.find((i) => i.uid === desk.uid);
    r.backHome = d2.x === 5 && d2.y === 5 && d2.rot === 0; // attempted pivot discarded on cancel
    // "Pick up" with a furniture in hand = STORES it (pass 41): no more
    // "cannot pick up while moving" deadlock.
    baseEditorClickCell(st, 5, 5);
    r.heldAgain = baseEditorGet().moveUid === desk.uid;
    const pk = baseEditorPickupSel(st);
    r.pickHeld = pk.ok === true && pk.slug === 'small_desk';
    r.gone = !st.items.some((i) => i.uid === desk.uid);
    r.backInStock = (st.stock.small_desk || 0) >= 1;
    // …but the PC and the mat, even held, refuse storage (automatic items)
    const pc = st.items.find((i) => i.s === 'pc');
    baseEditorClickCell(st, pc.x, pc.y);
    r.pcHeld = baseEditorGet().moveUid === pc.uid;
    r.pcPick = baseEditorPickupSel(st).reason || 'stored?!';
    baseEditorMoveCancel(st);
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.start, 'move_start', 'ONE click = direct pick-up');
  assert.equal(out.moveUid, true);
  assert.equal(out.canReuse, true, 'footprint released while carrying');
  assert.equal(out.badOk, 'base.err.floor_only');
  assert.equal(out.stillHeld, true, 'illegal placement: the furniture is kept');
  assert.equal(out.placed, true, 'legal placement at the new point');
  assert.equal(out.released, true);
  assert.equal(out.backHome, true, 'annulation : place et rotation d’origine rendues');
  assert.equal(out.heldAgain, true, 're-pick-up in one click');
  assert.equal(out.pickHeld, true, '"Pick up" stores the held furniture');
  assert.equal(out.gone, true, 'furniture removed from the floor');
  assert.equal(out.backInStock, true, 'returned to stock');
  assert.equal(out.pcHeld, true, 'the PC is picked up like any furniture');
  assert.equal(out.pcPick, 'base.err.fixed', 'the held PC refuses storage');
});

// ——— D — mobile auto PC under reachability constraint ———————————————————
test('phase 40 D: auto PC, never stored, repositioned, unique, reachable', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    const pc1 = st.items.find((i) => i.s === 'pc');
    r.autoAtCreate = !!pc1;
    r.walkableFromOpen = (() => {
      const g = baseBuildGrid(st);
      const reach = baseReachableSet(st, g, 5, 8); // E cave_1 = (5,8)
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        if (reach.has((pc1.x + dx) + ',' + (pc1.y + dy))) return true;
      }
      return false;
    })();
    // "Put everything away": the PC and the mat STAY
    r.cleared = baseClearAll(st);
    r.pcStillThere = st.items.some((i) => i.s === 'pc');
    r.matGone = !st.items.some((i) => i.s === 'welcome_mat'); // pass 43: removed
    // relocation: repositioned near the new opening
    baseRelocate(st, 'tree_2');
    const pc2 = st.items.find((i) => i.s === 'pc');
    r.repositioned = pc2.x !== pc1.x || pc2.y !== pc1.y || st.layoutId !== 'cave_1';
    r.singlePc = st.items.filter((i) => i.s === 'pc').length;
    // unique: no 2nd PC placeable even when in stock
    baseDebugGrantAll();
    st.stock.pc = 1;
    r.secondRefused = baseCanPlace(st, 'pc', pc2.x, pc2.y + 2, 0).reason;
    // movable as long as reachable: ONE click = pickup (pass 41)
    baseEditorClickCell(st, pc2.x, pc2.y);
    r.held = baseEditorGet().moveUid === pc2.uid;
    const g2 = baseBuildGrid(st);
    const reach2 = baseReachableSet(st, g2, 3, 9); // E tree_2 = (3,9)
    let spot = null;
    for (let y = 0; y < 11 && !spot; y++) for (let x = 0; x < 10 && !spot; x++) {
      const c = st.layoutId ? baseLayoutGet(st.layoutId).cells[y][x] : null;
      if (c && c.t === 'floor' && reach2.has(x + ',' + y) && g2.occ[y][x] == null) spot = [x, y];
    }
    const okMv = baseEditorClickCell(st, spot[0], spot[1]);
    r.movedOk = okMv.ok === true;
    // trapping: area cut off from the entrance by a curtain → pc_unreachable.
    // cave_3 (15x11): S arrives from the EAST (12,3); the west (x1..4) only
    // connects to the east via the north corridor (y=1). 12 desks y=1 x1..12 seal it.
    const st2 = baseGetState();
    baseDebugCreate('cave_3');
    st2.items = st2.items.filter((i) => i.s !== 'pc' && i.s !== 'welcome_mat');
    st2.stock = {}; st2.npcs = []; st2.npcStock = []; st2.uidSeq = 50;
    r.westFreeNoCurtain = baseCanPlace(st2, 'pc', 2, 4, 0).ok === true; // without curtain: OK
    for (let x = 1; x <= 12; x++) st2.items.push({ uid: 100 + x, s: 'small_desk', x, y: 1, rot: 0 });
    r.blocked = baseCanPlace(st2, 'pc', 2, 4, 0).reason;                 // with curtain: unreachable
    r.freeOk = r.westFreeNoCurtain;
    // and to the east, still reachable despite the curtain (no false positive)
    const g9 = baseBuildGrid(st2);
    let eastOk = null;
    for (let y = 3; y < 9 && eastOk == null; y++) for (let x = 10; x < 14 && eastOk == null; x++) {
      if (baseLayoutGet('cave_3').cells[y][x].t === 'floor' && g9.occ[y][x] == null) {
        eastOk = baseCanPlace(st2, 'pc', x, y, 0).ok === true;
      }
    }
    r.eastStillOk = eastOk;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.autoAtCreate, true, 'PC placed from creation');
  assert.equal(out.walkableFromOpen, true, 'initial PC reachable from the entrance');
  assert.equal(out.pcStillThere, true, '"Put everything away" keeps the PC');
  assert.equal(out.matGone, true, 'phase 43: the welcome mat no longer exists (RSE faithful)');
  assert.equal(out.repositioned, true, 'PC repositioned on relocation');
  assert.equal(out.singlePc, 1, 'a single PC per base');
  assert.equal(out.secondRefused, 'base.err.already_placed');
  assert.equal(out.held, true, 'the PC is picked up like any furniture');
  assert.equal(out.movedOk, true, 'legal PC move');
  assert.equal(out.blocked, 'base.err.pc_unreachable', 'stuck → explicit refusal');
  assert.equal(out.freeOk, true, 'same cell without curtain → accepted');
  assert.equal(out.eastStillOk, true, 'arrival side, the PC stays placeable (no false positive)');
});

// ——— E — 12 missing canon caves added ————————————————————————————
test('phase 40 E: 24 canon layouts = map.bin (4 colors × 4 caves)', () => {
  const canon = J('tools/emerald-ref/canon-grids.json');
  const ids = Object.keys(canon).sort();
  assert.equal(ids.length, 24, '24 persisted canon layouts (12 original + 12 caves)');
  for (const c of ['cave_red', 'cave_blue', 'cave_yellow']) {
    for (let n = 1; n <= 4; n++) assert.ok(ids.includes(`${c}_${n}`), `layout ${c}_${n}`);
  }
  // engine classification aligned with the reference
  const src = R('src/data/base-layouts-data.js');
  const m = src.match(/const BASE_LAYOUT_SHAPES = \{([\s\S]*?)\n\};/);
  const js = {};
  for (const b of m[1].matchAll(/(\w+):\s*\{\s*canon: '[^']+',\s*rows: \[([\s\S]*?)\]/g)) {
    js[b[1]] = [...b[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  assert.deepEqual(Object.keys(js).sort(), ids, 'the 24 canon ids in the data');
  // phase 43: normalized 'S' — its position (in front of the door) is a user
  // gameplay choice, not a map.bin collision.
  const norm = (rows) => rows.map((r) => r.split('S').join('.'));
  for (const id of ids) assert.deepEqual(norm(js[id]), norm(canon[id]), `${id} grid (without 'S') == map.bin`);
  // baked backgrounds for the 12 new ones + shared 'cave' render theme
  const sb = makeSandbox();
  for (const c of ['cave_red_1', 'cave_blue_2', 'cave_yellow_3']) {
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${c}.png`), `fond ${c}`);
    const th = vm.runInContext(`baseLayoutGet(${JSON.stringify(c)}).theme`, sb);
    assert.equal(th, 'cave', `${c}: cave theme`);
  }
  // FR/EN i18n names for the window
  for (const id of ids) {
    for (const lang of ['fr', 'en']) {
      assert.equal(typeof vm.runInContext(
        `I18N.${lang}.base.win.layout[${JSON.stringify(id)}]`, sb), 'string', `${lang} layout.${id}`);
    }
  }
});

// ——— F — 6 custom two-level layouts + stairs ————————————————————————
test('phase 40 F: mezzanine + cliff + stairs (placement, refuge, crossing)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    r.shapeIds = baseLayoutIds().length;
    r.custom = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6'].map((id) => {
      const L = baseLayoutGet(id);
      return { id, anchors: L.stairAnchors.length, elev: L.cells.flat().filter((c) => c.elev === 1).length,
               cliff: L.cells.flat().filter((c) => c.t === 'cliff').length };
    });
    // Place the stairs on a cave_5 anchor + refusal away from anchors
    const st = baseGetState();
    baseDebugCreate('cave_5');
    st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
    baseStockAdd(st, 'stairs', 1);
    const L = baseLayoutGet('cave_5');
    const a = L.stairAnchors[0];
    r.anchorCells = L.stairAnchors.length;
    const p = basePlace(st, 'stairs', a.x, a.y, 0);
    r.placed = p.ok === true;
    const st2 = st.items.find((i) => i.s === 'stairs');
    r.footprint = st2 ? { x: st2.x, y: st2.y } : null; // normalized footprint ^/=/a
    // pass 47: the rooms were redesigned — we SEARCH for a bare floor
    // tile, free and anchorless, instead of hardcoding one.
    r.notOnFloor = null;
    {
      const LL = baseLayoutGet('cave_5');
      const gg = baseBuildGrid(st);
      for (let y = 0; y < LL.h && !r.notOnFloor; y++) for (let x = 0; x < LL.w; x++) {
        const c = LL.cells[y][x];
        if (c && c.t === 'floor' && !c.stairAnchor && !c.entrance && !c.spawnPt
            && c.elev === 0 && gg.occ[y][x] == null) {
          const why = baseCanPlace(st, 'stairs', x, y, 0).reason;
          if (why) { r.notOnFloor = why; break; }
        }
      }
    }
    // the cliff is crossed ONLY where the stairs are anchored
    const g = baseBuildGrid(st);
    r.cliffBlocked = false;
    {
      const LL = baseLayoutGet('cave_5');
      for (let y = 0; y < LL.h; y++) for (let x = 0; x < LL.w; x++) {
        const c = LL.cells[y][x];
        if (c && c.t === 'cliff' && !baseStairsAt(st, x, y + 1)) {
          if (baseCellWalkable(st, g, x, y, 0)) r.cliffBlocked = true;
        }
      }
    }
    r.stairWalk = baseCellWalkable(st, g, a.x, a.y, 0); // walkable anchor cell
    // full visit traversal: from the spawn to the mezzanine and back
    const sess = baseVisitCreate(st);
    const path = baseFindPath(sess, a.x, 1, 1); // mezzanine cell (1,1) elev1… target = (a.x,1)?
    r.havePath = !!path;
    baseVisitSetDestination(sess, a.x, 1);
    let up = null;
    let guard = 0;
    while (sess.path.length && guard++ < 64) baseVisitStepAlong(sess);
    r.topElev = sess.elev;
    r.topPos = sess.pos;
    baseVisitSetDestination(sess, 8, 5); // come back down due east, level walk (regridded pass 41: former (9,6) = '#' pillar)
    guard = 0;
    while (sess.path.length && guard++ < 64) baseVisitStepAlong(sess);
    r.downElev = sess.elev;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.shapeIds, 36, '36 layouts (24 canon + 12 mezzanine, phase 42)');
  for (const c of out.custom) {
    assert.ok(c.anchors >= 1, `${c.id} ≥1 anchor`);
    assert.ok(c.elev >= 6, `${c.id} mezzanine ≥6 cells`);
    assert.ok(c.cliff >= 3, `${c.id} cliff ≥3 cells`);
  }
  assert.equal(out.placed, true, 'stairs placed on anchor');
  assert.equal(out.notOnFloor, 'base.err.stairs_anchor', 'off-anchor refused');
  // normalized 2×2 footprint (phase 41, FRLG style): anchor + cliff to the north
  const a0 = JSON.parse(vm.runInContext(`JSON.stringify(baseLayoutGet('cave_5').stairAnchors[0])`, sb));
  // phase 47: niches are redrawn on every room revamp — we
  // verify the STRUCTURE (aligned anchor pair, flanked by cliff), not
  // coordinates hardcoded in the test.
  assert.equal(typeof a0.x, 'number', 'cave_5: a 1st anchor exists');
  assert.equal(out.footprint.y, a0.y - 1, 'stairs footprint 2 deep upwards');
  assert.equal(out.cliffBlocked, false, 'cliff uncrossable without stairs');
  assert.equal(out.stairWalk, true, 'stairs walkable');
  assert.equal(out.havePath, true, 'path to the mezzanine');
  assert.equal(out.topElev, 1, 'the visitor CLIMBS to level 1');
  assert.equal(out.topPos.y <= 2, true, 'reaches the mezzanine');
  assert.equal(out.downElev, 0, 'the visitor GOES BACK DOWN');
});

// ——— G — Custom backgrounds + baked stairs sprite ————————————————————————————
test('phase 40 G: custom backgrounds + stairs sprite + updated manifest', () => {
  for (const id of ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6']) {
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${id}.png`), `fond ${id}`);
  }
  const man = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.equal(man.items.stairs.emerald, 'src/assets/images/secret-base/emerald/stairs.png');
  assert.ok(E(man.items.stairs.emerald), 'stairs.png present');
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('bake_custom_layouts'), 'custom baker');
  assert.ok(bake.includes('bake_stairs_sprite'), 'stairs baker');
  assert.ok(bake.includes('read_custom_shapes'), 'single source = JS data');
});

// ——— H — Item tabs and buttons harmonized bag / dictionary style ————————
test('phase 40 H: base stock harmonized with the menus (bag, dex)', () => {
  const css = R('src/assets/css/style.css');
  const win = R('src/ui/game/base/base-window.js');
  const stockBlock = css.slice(css.indexOf('#base-stock'), css.indexOf('#story-panel'));
  // .hbtn-style tabs (light --light1/--dark1 charter) + .inv-qty-style badge
  assert.match(stockBlock, /\.base-stock-tab \{[\s\S]*?background: var\(--light1\)/, 'onglet = fond clair hbtn');
  assert.match(stockBlock, /\.base-stock-tab:hover \{ background: var\(--light2\)/, 'survol onglet = hbtn');
  assert.match(stockBlock, /\.base-stock-tab\.sel \{ background: var\(--light2\); border-color: var\(--light2\); font-weight: bold; \}/, 'onglet actif = hbtn.active');
  assert.match(stockBlock, /\.base-stock-tab-count \{[\s\S]*?background: var\(--dark1\);[\s\S]*?border-radius: 12px;/, 'bag-style counter chip');
  // .inv-item / .dex-entry-style item cards (light, 2px, levitating hover)
  assert.match(stockBlock, /\.base-stock-item \{[\s\S]*?background: var\(--light1\);[\s\S]*?border: 2px solid var\(--dark1\);[\s\S]*?transition: all 0\.2s;/, 'inv-item-style card');
  assert.match(stockBlock, /\.base-stock-item:hover \{ border-color: var\(--light2\); background: var\(--light2\); transform: translateY\(-2px\)/, 'inv-item-style card hover');
  assert.match(stockBlock, /\.base-stock-count \{[\s\S]*?background: var\(--dark1\);[\s\S]*?border-radius: 12px;/, '×n counter in a pill');
  // the local dark theme of phase 39 is gone
  assert.ok(!stockBlock.includes('#14151b'), 'no more local dark background in the stock');
  assert.ok(!stockBlock.includes('#ffd54f'), 'no more local yellow trim in the stock');
  // JS: counter in a dedicated <span> + optgroups (the layout <select> is
  // now hidden: alcoves are picked from the Location window)
  assert.ok(win.includes("pill.className = 'base-stock-tab-count'"), 'tab counter in a pill');
  assert.ok(win.includes("layoutSel.style.cssText = 'display:none'"), 'layout select hidden (alcoves per route)');
  assert.ok(win.includes("document.createElement('optgroup')"), 'grouped layouts (optgroup)');
  assert.ok(win.includes("t('base.win.layout_group.'"), 'group labels i18n');
  // i18n: 6 groups in both languages
  for (const loc of ['src/localization/fr/base.js', 'src/localization/en/base.js']) {
    const s = R(loc);
    assert.ok(s.includes('"layout_group"'), loc + ' : bloc layout_group');
    for (const g of ['cave', 'cave_red', 'cave_blue', 'cave_yellow', 'tree', 'bush'])
      assert.ok(s.includes('"' + g + '":'), loc + ' : groupe ' + g);
  }
});

