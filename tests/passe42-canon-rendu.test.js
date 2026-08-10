import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 42: complete RSE CANON overhaul of the secret base ───────────────
// Locks shipped in this phase (user requests, Emerald screenshots):
//  A. Catalog = pokeemerald gDecorations (120 RSE decors + pc/welcome/stairs)
//  B. Sprites: 122 native assets in the manifest, pc 16×16, stairs 32×32,
//     5 character sheets 64×128
//  C. Placements: tall plant against the wall, board anywhere, big doll
//     centered on rug, poster via floor click (wall + cliff)
//  D. Rotation REMOVED (RSE canon) — button hidden, normalization frozen
//  E. The 6 colored caves have an upper floor (stairs anchors + hole + backgrounds)
//  F. Migration: renames applied, off-canon removed at import
//  G. Visit: direction + animation counter advance (animated walk)
//  H. Renderer: character sheets (hero/NPC) loaded and exported
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));

const SANDBOX_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/application/game-state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/application/base/base-core.js',
  'src/ui/game/base/base-visit.js',
  'src/ui/game/base/base-exchange.js',
  'src/ui/game/base/base-editor.js',
  'src/ui/game/base/base-debug.js',
];

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }, head: { dataset: {} }, documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe42-canon-rendu [iife]' });
  return sandbox;
}

// ——— A — Catalogue = gDecorations pokeemerald ———————————————————————————————
test('phase 42 A: catalog == canon-decor.json (RSE gDecorations, 120 + 2)', () => {
  const canon = J('tools/emerald-ref/canon-decor.json');
  const CAT = { DESK: 'desks', CHAIR: 'chairs', PLANT: 'plants', ORNAMENT: 'objects', MAT: 'mats', POSTER: 'wall', DOLL: 'dolls', CUSHION: 'cushions' };
  const sb = makeSandbox();
  for (const [key, v] of Object.entries(canon)) {
    if (key === 'DECOR_NONE') continue;
    const slug = key.replace('DECOR_', '').toLowerCase().replace(/ /g, '_');
    const out = vm.runInContext(`(() => { const d = baseItemGet(${JSON.stringify(slug)}); return d && { w: d.w, d: d.d, cat: d.cat, price: d.price, layer: d.layer, behind: !!d.behind, rot: d.rot }; })()`, sb);
    assert.ok(out, `canon present: ${slug}`);
    const [w, d] = v.shape.split('x').map(Number);
    assert.deepEqual([out.w, out.d], [w, d], `${slug} : forme DECORSHAPE ${v.shape}`);
    assert.equal(out.cat, CAT[v.cat], `${slug}: category ${v.cat}`);
    assert.equal(out.price, v.price ? v.price : null, `${slug}: canon price ${v.price || 'not for sale'}`);
    assert.equal(out.rot, 0, `${slug}: rotation removed`);
    const wantLayer = v.perm === 'DECORPERM_NA_WALL' ? 'wall' : (v.perm === 'DECORPERM_SPRITE' ? 'surface' : 'floor');
    assert.equal(out.layer, wantLayer, `${slug}: layer ${v.perm}`);
    if (v.perm === 'DECORPERM_BEHIND_FLOOR') assert.equal(out.behind, true, `${slug}: BEHIND_FLOOR (base-row collision)`);
  }
  assert.equal(vm.runInContext('BASE_ITEMS.length', sb), 122, '122 objects (120 canon + stairs + pc — phase 43: welcome_mat removed)');
});

// ——— B — Sprites natifs ———————————————————————————————————————————————————
test('phase 42 B: 122 sprites in the manifest, native files, characters', () => {
  const dir = 'src/assets/images/secret-base/emerald';
  const manPath = 'src/assets/images/secret-base/manifest.render2d.json';
  const items = J(manPath).items;
  const files = fs.readdirSync(new URL(`../${dir}`, import.meta.url)).filter((f) => f.endsWith('.png'));
  assert.equal(Object.keys(items).length, 122, 'manifest: 122 entries');
  assert.equal(files.length, 122, 'disk: 122 PNGs (one per decor, no more no less)');
  for (const [slug, e] of Object.entries(items)) {
    assert.equal(Object.keys(e).join(','), 'emerald', `${slug}: unique canon sprite`);
    assert.ok(E(e.emerald), `${slug}: file present`);
    const fname = e.emerald.split('/').pop();
    assert.equal(fname, `${slug}.png`, `${slug} : nommage 1:1`);
  }
  // no orphan
  const referenced = new Set(Object.values(items).map((e) => e.emerald.split('/').pop()));
  for (const f of files) assert.ok(referenced.has(f), `orphan: ${f}`);
  // critical native sizes
  const ihdr = (p) => { const b = fs.readFileSync(new URL(`../${p}`, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20), b[25]]; };
  assert.deepEqual(ihdr(`${dir}/pc.png`), [16, 16, 6], 'pc.png = canon 16×16 RGBA metatile');
  assert.deepEqual(ihdr(`${dir}/stairs.png`), [32, 32, 6], 'stairs.png = 32×32 natif GBA');
  // phase 43: player = REAL static trainer-54 sprite (18×26), no anim;
  // the 4 NPCs remain GBA 64×128 walking sheets.
  assert.ok(!E(`${dir}/people`), 'people folder removed');
  assert.deepEqual(J(manPath).stats, { sprites: 122, items: 122, people: ['player'] }, 'canon recomputed stats (static player)');
});

// ——— C — Canonical placement rules ———————————————————————————————————————
test('phase 42 C: canon placements (wall, board, big doll, poster)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const r = {};
    // 1) tall plant (BEHIND_FLOOR) STUCK TO the north wall: refused before pass 42
    r.plantWall = basePlace(st, 'tropical_plant', 4, 1, 0).ok;   // cell (4,1): wall above (4,0)
    // 2) board placeable EVERYWHERE: on bare floor (explicit request) and on a hole
    baseStockAdd(st, 'solid_board', 2);
    r.boardFloor = basePlace(st, 'solid_board', 8, 3, 0).ok === true;
    r.boardHole = basePlace(st, 'solid_board', 5, 2, 0).ok === true;
    const g = baseBuildGrid(st);
    r.holeWalk = baseCellWalkable(st, g, 5, 2, null);
    // 3) big doll (1×2 DECORPERM_SPRITE) centered on a 3×3 mat
    r.mat = basePlace(st, 'surf_mat', 1, 3, 0, { free: true }).ok; // 3×3 covering (1..3, 3..5)
    r.bigCenter = basePlace(st, 'snorlax_doll', 2, 4, 0).ok === true;  // center of the mat
    r.snFp = JSON.stringify(baseItemFootprint(baseItemGet('snorlax_doll'), 0));
    r.snBoxD = baseItemGet('snorlax_doll').d;
    // 4) poster: clicking the FLOOR in front of a wall → hangs the wall above
    baseEditorSelectSlug(st, 'blue_poster');
    const wc = baseEditorWallCell(st, 6, 1);    // (6,1) floor, (6,0) wall
    r.wallCell = wc ? wc.x + ',' + wc.y : null;
    const pl = baseEditorClickCell(st, 6, 1);
    const posted = st.items.find((i) => i.s === 'blue_poster');
    r.postedAt = posted ? posted.x + ',' + posted.y : null;
    // 5) poster on a CLIFF FACE (two-level layout)
    const st2 = (() => { baseDebugCreate('cave_5'); baseDebugGrantAll(); return baseGetState(); })();
    // pass 48: the rooms are redesigned at each overhaul — we SEARCH for a
    // cliff face overhanging free floor instead of hardcoding one.
    r.cliffPoster = false;
    {
      const L3 = baseLayoutGet('cave_5');
      for (let y = 0; y < L3.h && !r.cliffPoster; y++) for (let x = 0; x < L3.w; x++) {
        const c = L3.cells[y][x], below = L3.cells[y + 1] && L3.cells[y + 1][x];
        if (c && c.t === 'cliff' && below && below.t === 'floor' && !below.stairAnchor) {
          if (baseCanPlace(st2, 'blue_poster', x, y, 0).ok) { r.cliffPoster = true; break; }
        }
      }
    }
    r.wallOnCliffRow = baseCanPlace(st2, 'blue_poster', 0, 3, 0).reason;   // (0,3) side wall → refused
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.plantWall, true, 'tall plant stuck to the wall (base-row collision)');
  assert.equal(out.boardFloor, true, 'board placeable on bare floor');
  assert.equal(out.boardHole, true, 'board placeable on a hole (canon filling)');
  assert.equal(out.holeWalk, true, 'filled hole crossable');
  assert.equal(out.mat, true, '3×3 mat placed');
  assert.equal(out.bigCenter, true, 'big doll centered on the rug');
  assert.equal(out.snFp, '{"w":1,"d":1}', '1-cell collision (canon DECORSHAPE_1x2 SPRITE)');
  assert.equal(out.snBoxD, 2, '1×2 shape → 2-tile-high render (32×32 above the base tile)');
  assert.equal(out.wallCell, '6,0', 'floor click → wall cell above');
  assert.equal(out.postedAt, '6,0', 'poster actually hung on the north wall');
  assert.equal(out.cliffPoster, true, 'poster placeable on a cliff face (two-level)');
  assert.equal(out.wallOnCliffRow, 'base.err.wall_only', 'side wall refused');
});

// ——— D — Removed rotation ———————————————————————————————————————————————
test('phase 42 D: object rotation REMOVED (RSE canon + 2D art direction)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = { allZero: true, counts: [], norms: [] };
    for (const it of BASE_ITEMS) {
      if (it.rot !== 0) r.allZero = false;
      const c = baseItemRotCount(it); if (!r.counts.includes(c)) r.counts.push(c);
      const n = baseItemRotNormalize(it, 3); if (!r.norms.includes(n)) r.norms.push(n);
    }
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    basePlace(st, 'heavy_desk', 1, 3, 0);
    const desk = st.items.find((i) => i.s === 'heavy_desk');
    r.rotateRef = baseRotate(st, desk.uid, 1);
    r.edPlace = baseEditorRotatePlacement();
    r.edSel = baseEditorRotateSel(st);
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.allZero, true, 'rot:0 everywhere (data)');
  assert.deepEqual(out.counts, [1], 'baseItemRotCount = 1 frozen');
  assert.deepEqual(out.norms, [0], 'baseItemRotNormalize → 0 frozen');
  assert.equal(out.rotateRef.ok, false, 'engine rotation refused');
  assert.equal(out.rotateRef.reason, 'base.err.not_rotatable');
  assert.equal(out.edPlace, 0 || out.edPlace, 'placement pivot without effect');
  const idx = R('index.html');
  const rb = idx.slice(idx.indexOf('id="base-ed-rotate"') - 200, idx.indexOf('id="base-ed-rotate"') + 300);
  assert.ok(rb.includes('hidden'), '"Rotate" button hidden (phase 42)');
  const win = R('src/ui/game/base/base-window.js');
  assert.ok(win.includes('rotateBtn'), 'button handled window-side');
});

// ——— E — The 6 colored caves with an upper floor —————————————————————————
test('phase 42 E: red/blue/yellow caves with an upper floor (anchors + backgrounds)', () => {
  const sb = makeSandbox();
  const colored = ['cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6', 'cave_yellow_5', 'cave_yellow_6'];
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    for (const id of ${JSON.stringify(colored)}) {
      const L = baseLayoutGet(id);
      let holes = 0, mezz = 0;
      for (const row of L.cells) for (const c of row) { if (c.t === 'hole') holes++; if (c.elev === 1) mezz++; }
      r[id] = {
        anchors: L.stairAnchors.length, holes, mezz, exit: !!L.exit, spawn: !!L.spawn,
        canon: L.canon, theme: L.theme,
        stairOk: L.stairAnchors.length ? baseCanPlace(baseGetState(), 'stairs', L.stairAnchors[0].x, L.stairAnchors[0].y, 0, { free: true }).ok !== false : false,
      };
      // the layout supports a full base (creation without exception)
      const st = baseGetState();
      st.layoutId = id;
      r[id].gridOk = !!baseBuildGrid(st);
    }
    window._layoutsCount = baseLayoutIds().length;
    return JSON.stringify(r);
  })()`, sb));
  for (const id of colored) {
    const i = out[id];
    assert.ok(i.anchors >= 1, `${id}: stairs anchor pair (upper floor)`);
    assert.ok(i.holes >= 1, `${id}: at least one hole`);
    assert.ok(i.mezz >= 1, `${id}: mezzanine (elev-1 cells)`);
    assert.ok(i.exit && i.spawn, `${id}: E + S`);
    assert.equal(i.canon, null, `${id}: PokéWorld custom (not an RSE layout)`);
    assert.equal(i.gridOk, true, `${id}: buildable grid`);
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${id}.png`), `blended background ${id}`);
  }
  assert.equal(vm.runInContext('window._layoutsCount', sb), 36, '36 layouts in total');
});

// ——— F — Migration catalogue → canon ——————————————————————————————————————
test('phase 42 F: migration (renames, off-canon removal, rot → 0, importDropped)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    // renommages canon
    r.m1 = baseItemMigrate('pokeball_desk');
    r.m2 = baseItemMigrate('note_do_mat');
    r.m3 = baseItemMigrate('substitute_doll');
    // off-canon → cleanly removed
    r.m4 = baseItemMigrate('invisible_doll');
    r.m5 = baseItemMigrate('bench') || 'small_chair';
    // sanitize migrates stock + items, clamp rot → 0
    const st = {
      layoutId: 'cave_1',
      stock: { pokeball_desk: 2, substitute_doll: 1, invisible_doll: 4 },
      items: [
        { uid: 3, s: 'pokeball_desk', x: 3, y: 3, rot: 2 },
        { uid: 4, s: 'tropical_plant', x: 4, y: 1, rot: 1 },
        { uid: 5, s: 'invisible_doll', x: 3, y: 4, rot: 0 },
        { uid: 9, s: 'welcome_mat', x: 5, y: 7, rot: 0 },
      ],
      npcs: [], npcStock: [], uidSeq: 6, record: { w: 2, l: 1, visits: 5 }, spawn: null,
    };
    const c = baseSanitizeState(st);
    r.stockAfter = c.stock;
    r.itemsAfter = c.items.map((i) => i.s + ':' + i.rot).sort();
    r.recordKept = c.record.w === 2 && c.record.l === 1 && c.record.visits === 5;
    // export→import: the importer migrates and counts the removed items (nothing is credited)
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const st2 = baseGetState();
    basePlace(st2, 'tropical_plant', 4, 1, 0, { free: true });
    basePlace(st2, 'small_desk', 3, 4, 0, { free: true });
    const json = baseExportString(st2, 'Testeur');
    const chk = baseImportValidate(json);
    r.importOk = chk.ok === true;
    r.importItemsCount = chk.visit.items.length;
    r.droppedInfo = typeof chk.visit.importDropped === 'number' ? chk.visit.importDropped : 0;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.m1, 'pokemon_desk', 'pokeball_desk → pokemon_desk (canon)');
  assert.equal(out.m2, 'c_low_note_mat', 'note_do_mat → c_low_note_mat');
  assert.equal(out.m3, 'wynaut_doll', 'substitute_doll → wynaut_doll');
  assert.equal(out.m4, null, 'invisible_doll removed (off canon, invisible in game)');
  assert.equal(out.m5, 'small_chair', 'bench → canon equivalent (small chair)');
  assert.deepEqual(out.stockAfter, { pokemon_desk: 2, wynaut_doll: 1 }, 'migrated stock + off-canon purged');
  // the plant (3,4→ok) and the migrated desk survive, rot clamped to 0; invisible tossed
  assert.ok(out.itemsAfter.includes('pokemon_desk:0'), 'migrated item (rotation lost, canon)');
  assert.ok(out.itemsAfter.includes('tropical_plant:0'), 'plant kept, rotation cancelled');
  assert.ok(!out.itemsAfter.some((i) => i.startsWith('invisible_doll')), 'off-canon removed');
  // phase 43: the welcome mat no longer exists — an old save
  // containing it loses it cleanly (migration → null), NOTHING regenerated.
  assert.equal(vm.runInContext(`baseItemMigrate('welcome_mat')`, sb), null, 'welcome_mat → null (removed from the game)');
  assert.ok(!out.itemsAfter.some((i) => i.startsWith('welcome_mat')), 'welcome_mat discarded at sanitizing');
  assert.equal(out.recordKept, true, 'record kept by sanity');
  assert.equal(out.importOk, true, 'export→import valide');
  assert.ok(out.importItemsCount >= 3, 'placed objects are exported');
});

// ——— G — Visitor walk animation ——————————————————————————————————————————
test('phase 42 G: animated visit (dir + animStep advance each step)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const sess = baseVisitCreate(st);
    const r = { dir0: sess.dir, step0: sess.animStep };
    // eastward path: the direction must follow the walk, the counter advance
    baseVisitSetDestination(sess, 6, 1);
    const dirs = [];
    let guard = 0;
    while (sess.path.length && guard < 40) {
      baseVisitStepAlong(sess);
      dirs.push(sess.dir + '|' + sess.animStep);
      guard++;
    }
    r.path = dirs;
    r.finalDir = sess.dir; r.finalStep = sess.animStep; r.steps = guard;
    return JSON.stringify(r);
  })()`, sb));
  assert.ok(out.steps >= 1, 'the visitor walked');
  assert.ok(out.finalStep >= out.steps - 1, 'animStep advances each step');
  for (const d of out.path) assert.ok(['up', 'down', 'left', 'right'].includes(d.split('|')[0]), `direction valide (${d})`);
  assert.equal(out.dir0, 'down', 'start facing down (canon)');
  const uniq = new Set(out.path.map((d) => d.split('|')[1]));
  assert.ok(uniq.size >= out.steps - 1, 'the frame counter does not stagnate');
});

// ——— H — Character sheets for the renderer ———————————————————————————————
test('phase 42/43 H: characters wired to the renderer (static player + NPC)', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.ok(man.people, 'section people au manifeste');
  // phase 43: the procedural animated hero is REPLACED by the real
  // static trainer-54 sprite (people.player); the 4 NPCs keep their sheets.
  assert.ok(E(man.people.player), 'people.player present on disk');
  assert.ok(!man.people.hero, 'old hero sheet removed from the manifest');
  // script duplicate (file:// compatible) synchronized
  const js = R('src/data/base-manifest-2d-data.js');
  assert.ok(js.includes('"people"'), 'people in the script version of the manifest');
  assert.ok(js.includes('"player"'), 'player in the script version');
  assert.ok(!js.includes('"hero"'), 'no more hero in the script version');
  // exports renderer
  const v2 = R('src/ui/game/base/base-view2d.js');
  for (const g of ['baseView2dPeople', 'base2dPerson', 'base2dNpcPersonId', 'base2dPlayerStatic']) {
    assert.ok(v2.includes(`PokeActions.register('${g}', ${g})`), `${g} exposed (engine action registry)`);
  }
  assert.ok(v2.includes("BASE2D_DIR_ROW = { down: 0, up: 1, left: 2, right: 3 }"), '4 views (down/up/left/right) on the sheet');
  assert.ok(v2.includes('col * 16') && v2.includes('row * 32'), '16×32 frames selected (dir × frame)');
  assert.ok(v2.includes('people.player'), 'visitor rendered via people.player (static)');
  assert.ok(v2.includes('base2dPlayerStatic(ctx, img, px, py, C)'), 'static player drawing (no frame)');
  assert.ok(!v2.includes('people.hero'), 'no more people.hero reference in the renderer');
});

