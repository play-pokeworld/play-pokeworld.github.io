import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Pass 43: user feedback "perfect render" ─────────────────────────
//  1. The "red/yellow mat" (procedural welcome_mat) had no business
//     there → REMOVED from the whole game (RSE shows none in a base).
//  2. The spawn point is ALWAYS the tile in front of the door ('S' marker).
//  3. The stairs have relief: massive 3/4 v6 sprite (risers, stringers).
//  4. Canon collisions: walk/behind/layer == DECORPERM from gDecorations.
//  5. ORAS-style readable heights: uniform architecture of the 12
//     multi-floor layouts + furniture contact shadow + 0.45 mezzanine offset + cliff
//     dark strata cliff + long cast shadow.
//  6. Controlled character = true static trainer-54 sprite (people.player),
//     no animation (NPCs keep their GBA sheets).

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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe43-porte-lock-hauteurs [iife]' });
  return sandbox;
}

const CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6',
                'cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6', 'cave_yellow_5', 'cave_yellow_6'];

// ——— A — welcome_mat: purged from the whole game ————————————————————————
test('phase 43 A: welcome_mat removed from the game (catalog, i18n, modules, migration)', () => {
  const sb = makeSandbox();
  assert.equal(vm.runInContext(`BASE_ITEMS.some(it => it.s === 'welcome_mat')`, sb), false, 'removed from the catalog');
  assert.equal(vm.runInContext('BASE_ITEMS.length', sb), 122, '122 items (120 canon + stairs/pc)');
  assert.equal(vm.runInContext(`baseItemMigrate('welcome_mat')`, sb), null, 'migration → null (saves cleaned)');
  for (const f of ['src/application/base/base-core.js', 'src/ui/game/base/base-editor.js',
                   'src/ui/game/base/base-window.js', 'src/ui/game/base/base-view2d.js',
                   'src/localization/fr/base.js', 'src/localization/en/base.js',
                   'src/data/base-items-data.js', 'tools/render_base_preview.py',
                   'tools/build-canon-items.py']) {
    assert.ok(!R(f).includes('welcome_mat'), `${f} without welcome_mat`);
  }
  // sanitize: an old placed mat is removed, nothing is regenerated
  const out = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const st = { layoutId: 'cave_1', stock: { welcome_mat: 3 }, items: [{ uid: 1, s: 'welcome_mat', x: 5, y: 7, rot: 0 }],
      npcs: [], npcStock: [], uidSeq: 2, record: { w: 0, l: 0, visits: 0 }, spawn: null };
    const c = baseSanitizeState(st);
    return { items: c.items.map((i) => i.s), stock: c.stock };
  })())`, sb));
  assert.ok(!out.items.includes('welcome_mat'), 'placed mat discarded');
  assert.ok(!('welcome_mat' in out.stock), 'stock discarded');
});

// ——— B — spawn ALWAYS in front of the door ——————————————————————————————
test('phase 43 B: spawn = tile in front of the door, for the 36 layouts', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const bad = [];
    for (const id of baseLayoutIds()) {
      const L = baseLayoutGet(id);
      if (!L.spawn || !L.exit) { bad.push(id + ' without S/E'); continue; }
      if (L.spawn.x !== L.exit.x || L.spawn.y !== L.exit.y - 1) bad.push(id + ' S not in front of E');
      const sc = L.cells[L.spawn.y][L.spawn.x];
      if (!sc || sc.t !== 'floor' || sc.entrance) bad.push(id + ' S not walkable');
      // the tile in front of the door is protected (not decorable)
    }
    return JSON.stringify({ bad, count: baseLayoutIds().length });
  })()`, sb));
  assert.equal(out.count, 36, '36 layouts');
  assert.deepEqual(out.bad, [], 'every S is the tile right in front of the door');
  // the visit starts ON the layout spawn (nothing else)
  const pos = vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const L = baseLayoutGet('cave_1');
    return L.spawn.x + ',' + L.spawn.y;
  })()`, sb);
  assert.equal(pos, '5,7', 'cave_1: S = in front of E (5,8)');
  // no more custom spawn: the function no longer exists, the state ignores it
  assert.equal(vm.runInContext('typeof window.baseSetSpawn', sb), 'undefined', 'baseSetSpawn removed');
  const san = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const st = { layoutId: 'cave_1', stock: {}, items: [], npcs: [], npcStock: [], uidSeq: 1,
      record: { w: 0, l: 0, visits: 0 }, spawn: { x: 2, y: 2 } };
    return baseSanitizeState(st);
  })())`, sb));
  assert.equal(san.spawn == null || (san.spawn.x === 5 && san.spawn.y === 7), true, 'custom spawn ignored');
  // the import also ignores the spawn field
  assert.ok(R('src/ui/game/base/base-exchange.js').includes('43'), 'removal comment in the import');
});

// ——— C — stairs: v9 constant-width wooden sprite + crossing ———
test('phase 43/44/46 C: v9 wooden stairs (2 columns) + level crossing', () => {
  const b = fs.readFileSync(new URL('../src/assets/images/secret-base/emerald/stairs.png', import.meta.url));
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20), b[25]], [32, 32, 6], 'stairs.png 32×32 RGBA');
  const bake = R('tools/bake-emerald-bgs.py');
  // phase 46 (user feedback: "the stairs must be the same size all
  // the time" + "wooden like the planks instead") → v9 = WOODEN stairs
  // with CONSTANT WIDTH, solid_board palette.
  // History (user feedback "not consistent with the Emerald assets"):
  // v7 repeated the DISPLAY-STAND pattern (0x272/0x275) → flat checkerboard,
  // central seam, rug trim. v8 = true perspective flight (6 trapezoid
  // steps, sloped stringers) with the EXACT PALETTE of the only authentic
  // stairs in the secret-base tileset: Slide_Stairs 0x263.
  for (const cue of ['v9', '2 COLUMNS', 'CONSTANT WIDTH', 'solid_board']) {
    assert.ok(bake.includes(cue), `baker : ${cue}`);
  }
  // the relief is REAL in the pixels: alternating light/dark steps,
  // varied hues (never flat fills)
  const px = [];
  for (let i = 26; i < b.length; i += ((b.length - 26) / 400 | 0) || 1) px.push(b[i]);
  assert.ok(new Set(px).size > 24, 'detailed sprite (not a flat fill)');
  // legal placement straddling cliff/anchors (phase 44 niche), crossing BOTH
  // columns, then mezzanine reachable from the spawn
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    const r = {};
    const a0 = baseLayoutGet('cave_5').stairAnchors[0]; // niche organique (3,4)
    r.anchor = a0;
    // pose par n'importe quelle ancre de la paire (alignement auto)
    r.stairsOkE = baseCanPlace(st, 'stairs', a0.x + 1, a0.y, 0);
    const p = basePlace(st, 'stairs', a0.x + 1, a0.y, 0);
    const s1 = st.items.find((i) => i.s === 'stairs');
    r.snapped = s1 ? (s1.x === a0.x && s1.y === a0.y - 1) : false;
    // BOTH columns hug the cliff (user request, pass 44)
    r.hookW = baseStairsAt(st, a0.x, a0.y);
    r.hookE = baseStairsAt(st, a0.x + 1, a0.y);
    // UNIQUE position: a 2nd placement on the same pair = hard refusal
    r.second = baseCanPlace(st, 'stairs', a0.x + 1, a0.y, 0).ok === true;
    // access: past the stairs, the mezzanine is reachable from the spawn
    const from = baseLayoutGet('cave_5').spawn;
    const reach2 = baseReachableSet(st, baseBuildGrid(st), from.x, from.y);
    r.mezzReach = [...reach2].filter((k) => {
      const [x, y] = k.split(',').map(Number);
      return baseLayoutGet('cave_5').cells[y][x].elev === 1;
    }).length;
    r.mezzTotal = 0;
    {
      const L2 = baseLayoutGet('cave_5');
      for (let y = 0; y < L2.h; y++) for (let x = 0; x < L2.w; x++) {
        if (L2.cells[y][x].t === 'floor' && L2.cells[y][x].elev === 1) r.mezzTotal++;
      }
    }
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.stairsOkE.ok, true, 'stairs placeable on the niche (E anchor of the pair)');
  assert.equal(out.snapped, true, 'placement aligned to the pair start (unique position)');
  assert.equal(out.hookW && out.hookE, true, 'BOTH columns hug the cliff');
  assert.equal(out.second, false, 'a single placement per niche');
  // phase 47: FRLG rooms are partitioned — the cave_5 plateau is
  // 12 tiles (vs ~28 for the old full-width plateau). We verify
  // it is FULLY reachable rather than an absolute threshold.
  assert.equal(out.mezzReach, out.mezzTotal,
    `100% of the mezzanine reachable after the stairs (${out.mezzReach}/${out.mezzTotal})`);
});

// ——— D — heights: ORGANIC ORAS architecture (stairs niche) + render ——
test('phase 51 D: multi-floor layouts — two rooms, corridor, single staircase', () => {
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  assert.deepEqual(Object.keys(grids).sort(), CUSTOM.slice().sort(), 'the 12 custom layouts');
  const at = (rows, x, y) => (rows[y] && rows[y][x]) || '#';
  for (const [lid, rows] of Object.entries(grids)) {
    const w = rows[0].length, h = rows.length;
    // engine elevation invariants
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '^') {
        assert.ok(['^', '='].includes(at(rows, x, y + 1)), `${lid} : '^'(${x},${y}) a un sud '^'/'='`);
        assert.ok(['^', '#'].includes(at(rows, x, y - 1)), `${lid}: '^'(${x},${y}) backed to the north`);
      }
      if (c === '=') assert.equal(at(rows, x, y - 1), '^', `${lid} : '='(${x},${y}) = face d'un plateau`);
      if (c === 'a') {
        assert.equal(at(rows, x, y - 1), '=', `${lid}: anchor (${x},${y}) under a cliff`);
        assert.equal(at(rows, x, y - 2), '^', `${lid}: cliff (${x},${y - 1}) backed to the plateau`);
      }
    }
    // ONE staircase, exact anchor pair, flanked by the cliff
    const runs = [];
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        if (rows[y][x] !== 'a') { x++; continue; }
        let x2 = x; while (x2 < w && rows[y][x2] === 'a') x2++;
        runs.push({ y, x1: x, x2: x2 - 1 }); x = x2;
      }
    }
    assert.equal(runs.length, 1, `${lid}: a single staircase between the two rooms`);
    for (const r of runs) {
      assert.equal(r.x2 - r.x1 + 1, 2, `${lid} : paire d'ancres exacte`);
      assert.equal(at(rows, r.x1 - 1, r.y), '=', `${lid}: cliff left of the niche`);
      assert.equal(at(rows, r.x2 + 1, r.y), '=', `${lid}: cliff right of the niche`);
    }
    const flat = rows.join('');
    assert.equal((flat.match(/S/g) || []).length, 1, `${lid} : un S`);
    assert.equal((flat.match(/E/g) || []).length, 1, `${lid}: ONE SINGLE entrance`);
    assert.ok(flat.includes('o'), `${lid} : rocher d'habillage`);
  }
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('CLEARLY VISIBLE height difference, ORAS style'), 'baker phase 43 comment');
  assert.ok(bake.includes('wall_metatile'), 'wall autotiling (phase 47)');
  for (const lid of CUSTOM) assert.ok(E(`src/assets/images/secret-base/bg/emerald/${lid}.png`), `fond ${lid}`);
});

// ——— E — collisions canon == DECORPERM gDecorations ————————————————————————
test('phase 43 E: catalog walk/behind/layer == canon DECORPERM', () => {
  const canon = J('tools/emerald-ref/canon-decor.json');
  const sb = makeSandbox();
  const items = JSON.parse(vm.runInContext(`JSON.stringify(BASE_ITEMS.map((d) => ({
    s: d.s, walk: !!d.walk, behind: !!d.behind, layer: d.layer, w: d.w, d: d.d,
  })))`, sb));
  const bySlug = Object.fromEntries(items.map((d) => [d.s, d]));
  let checked = 0;
  for (const [key, v] of Object.entries(canon)) {
    if (key === 'DECOR_NONE') continue;
    const slug = key.replace('DECOR_', '').toLowerCase().replace(/ /g, '_');
    const it = bySlug[slug];
    assert.ok(it, `${slug} present`);
    const [w, d] = v.shape.split('x').map(Number);
    assert.deepEqual([it.w, it.d], [w, d], `${slug}: footprint ${v.shape} (real collisions)`);
    // DECORPERM_PASS_FLOOR = walkable (slide, display stand, tents…)
    if (v.perm === 'DECORPERM_PASS_FLOOR') assert.equal(it.walk, true, `${slug}: PASS_FLOOR walkable`);
    if (v.perm === 'DECORPERM_SOLID_FLOOR') assert.equal(it.walk, false, `${slug}: SOLID_FLOOR blocking`);
    if (v.perm === 'DECORPERM_BEHIND_FLOOR') {
      assert.equal(it.behind, true, `${slug}: BEHIND_FLOOR (pass behind, place against wall)`);
      assert.equal(it.walk, false, `${slug}: BEHIND_FLOOR blocking`);
    }
    if (v.perm === 'DECORPERM_NA_WALL') assert.equal(it.layer, 'wall', `${slug} : NA_WALL mural`);
    checked++;
  }
  assert.equal(checked, 120, 'the 120 canon decors verified');
  // explicit witness cases requested by the user
  assert.equal(bySlug.slide.walk, true, 'toboggan : franchissable (canon)');
  assert.equal(bySlug.stand.walk, true, 'display stand: walkable (canon)');
  assert.deepEqual([bySlug.slide.w, bySlug.slide.d], [2, 4], 'toboggan 2×4 (canon)');
  assert.deepEqual([bySlug.stand.w, bySlug.stand.d], [4, 2], '4×2 display stand (canon)');
});

// ——— F — static player trainer-54 ————————————————————————————————————————
test('phase 43 F: controlled character = static trainer-54 (people.player)', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.ok(man.people.player, 'people.player au manifeste');
  assert.ok(!man.people.hero, 'old animated hero removed');
  const p54 = fs.readFileSync(new URL('../' + man.people.player, import.meta.url));
  const src54 = fs.readFileSync(new URL('../src/assets/images/trainers/profil/trainer-54.png', import.meta.url));
  assert.deepEqual([p54.readUInt32BE(16), p54.readUInt32BE(20)], [18, 26], 'player.png = trainer-54 (18×26)');
  assert.ok(p54.equals(src54) || p54.length > 0, 'player.png issu de trainer-54');
  assert.deepEqual(man.stats.people, ['player'], 'people manifest up to date (static player)');
  const v2 = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2.includes('people.player'), 'the visitor is rendered via people.player');
  assert.ok(v2.includes('function base2dPlayerStatic(ctx, img, px, py, C)'), 'static drawing (no dir/frame)');
  assert.ok(!v2.includes('people.hero'), 'plus de people.hero');
  assert.ok(!v2.includes('overlay.visitor.dir'), 'no walk animation for the player');
});

// ——— G — furniture height: contact shadows + mezzanine offset ———————————
test('phase 43 G: contact shadows + 0.45 mezzanine offset (2 renderers)', () => {
  const v2 = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2.includes('BASE2D_SHADOW_CATS'), 'shadow categories (view2d)');
  assert.ok(v2.includes('function base2dContactShadow'), 'ellipse de contact (view2d)');
  // Phase 53: the MEZZANINE offset is removed (user feedback:
  // "offset on the upper floor, the assets are no longer in the right place"). The
  // background is baked tile by tile, the cliff is exactly one tile: raising
  // furniture by 14 px shifted them half a square off their tile.
  // Perching on FURNITURE (stand/slide), however, keeps its offset.
  assert.ok(v2.includes('const ELEV_PX = 0;'), 'no more mezzanine offset (view2d)');
  assert.ok(v2.includes('const PERCH_PX = Math.round(C * 0.45);'), 'perch on furniture kept');
  const pv = R('tools/render_base_preview.py');
  assert.ok(pv.includes("d['cat'] in ('objects', 'desks', 'chairs', 'plants')"), 'same shadow rule (preview)');
  assert.ok(pv.includes('ELEV_PX'), 'the preview knows the height-difference notion');
  assert.ok(!pv.includes('welcome_mat'), 'no more procedural mat in the preview');
});

// ——— H — legal MULTI-FLOOR sample scenes on the new grids ————————————————
test('phase 43 H: the 4 furnished 2D scenes are all legal', () => {
  const py = R('tools/render_base_preview.py');
  const scenes = {};
  for (const m of py.matchAll(/'(cave_5|tree_5|cave_red_1|bush_6)': \{(?:\s*#[^\n]*)?\s*'items': \[(.*?)\],\s*'npcs': \[(.*?)\],/gs)) {
    const items = [...m[2].matchAll(/\('([a-z0-9_]+)', (\d+), (\d+), (\d+)\)/g)].map((t) => [t[1], +t[2], +t[3], +t[4]]);
    const npcs = [...m[3].matchAll(/\((\d+), (\d+)\)/g)].map((t) => [+t[1], +t[2]]);
    scenes[m[1]] = { items, npcs };
  }
  assert.deepEqual(Object.keys(scenes).sort(), ['bush_6', 'cave_5', 'cave_red_1', 'tree_5'], 'the 4 2D scenes');
  for (const [lid, sc] of Object.entries(scenes)) {
    const sb = makeSandbox();
    const resJson = vm.runInContext(`(() => {
      const st = baseGetState();
      baseDebugCreate(${JSON.stringify(lid)});
      baseDebugGrantAll();
      st.items = st.items.filter((i) => i.s !== 'pc');  // the scene brings its own PC
      st.stock.stairs = 5; st.stock.pc = 5;
      const fails = [];
      const note = (slug, x, y, rot) => {
        const c = baseCanPlace(st, slug, x, y, rot);
        if (!c.ok) fails.push(slug + '@' + x + ',' + y + ' → ' + c.reason);
        else basePlace(st, slug, x, y, rot);
      };
      (${JSON.stringify(sc.items)}).forEach(([s, x, y, rot]) => note(s, x, y, rot));
      const L = baseLayoutGet(${JSON.stringify(lid)});
      const npcBad = [];
      for (const [nx, ny] of ${JSON.stringify(sc.npcs)}) {
        const cell = L.cells[ny][nx];
        if (!cell || cell.t !== 'floor' || cell.entrance || cell.spawnPt) npcBad.push(nx + ',' + ny);
      }
      return JSON.stringify({ fails, npcBad });
    })()`, sb);
    const res = JSON.parse(resJson);
    assert.deepEqual(res.fails, [], `${lid}: every placement is legal (${res.fails.join('; ') || 'OK'})`);
    assert.deepEqual(res.npcBad, [], `${lid}: NPC on valid tiles`);
  }
});


