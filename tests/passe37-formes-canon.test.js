import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { fileURLToPath } from 'node:url';

// ── Pass 37: official GBA shapes (12 RSE layouts) + unified art direction ────────
//  A. The 12 grids of base-layouts-data.js == CANON classification re-computed
//     from the official map.bin (collision bits + metatiles) of the
//     pret/pokeemerald disassembly, presented by tools/bake-emerald-bgs.py
//  B. Every layout: unique S spawn, unique E exit, 'o' hole present;
//     legacy aliases (square_a/wide_b/twolevel_a → 1/2/3) kept for
//     old saves; S and E non-decorable
//  C. Art direction: softened camera pitch + textured 3D shell (tex3d) + 100%
//     Emerald sprites (never again a 2.5D serebii icon in 2D)
//  D. 33 decoration sprites baked from the REAL metatiles of the
//     secret_base tileset (upper layer, primary palettes) + updated manifest
//  E. The furnished scenes of tools/render_base_preview.py are LEGAL in
//     the engine's sense (every placement accepted by baseCanPlace, in order)
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const SANDBOX_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/application/game-state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/application/base/base-core.js',
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe37-formes-canon [iife]' });
  return sandbox;
}

function jsGrids(src) {
  const out = {};
  for (const m of src.matchAll(/(cave(?:_(?:red|blue|yellow))?_[1-4]|tree_[1-4]|bush_[1-4]): \{\s*canon: '([^']+)',\s*rows: \[(.*?)\]/gs)) {
    out[m[1]] = { canon: m[2], rows: [...m[3].matchAll(/'([^']*)'/g)].map((r) => r[1]) };
  }
  return out;
}

// ——— A — Grids == recomputed canon ———————————————————————————————————————
test('phase 37 A: 24 canon JS grids == canon classification of the official map.bin', () => {
  // tools/emerald-ref/canon-grids.json = the COMMITTED output of
  // `python3 tools/bake-emerald-bgs.py --dump-grids` (classification bits de
  // collision + metatiles of the pret/pokeemerald map.bin — see test D)
  const canon = JSON.parse(R('tools/emerald-ref/canon-grids.json'));
  const grids = jsGrids(R('src/data/base-layouts-data.js'));
  assert.deepEqual(Object.keys(grids).sort(), Object.keys(canon).sort(), 'the 24 canon ids match');
  // phase 43: 'S' normalized on both sides — its position (in front of the door)
  // is a gameplay rule (user request), outside canon topology.
  const norm = (rows) => rows.map((r) => r.split('S').join('.'));
  for (const id of Object.keys(canon)) {
    assert.deepEqual(norm(grids[id].rows), norm(canon[id]),
      `${id}: grid (excluding 'S') == collision/metatiles from ${grids[id].canon}`);
  }
  // the canon reference is well-formed: 16 caves (4 colors × 4) + 4 trees + 4 bushes
  const src = R('src/data/base-layouts-data.js');
  for (const n of ['BrownCave1', 'BrownCave2', 'BrownCave3', 'BrownCave4',
    'RedCave1', 'RedCave2', 'RedCave3', 'RedCave4',
    'BlueCave1', 'BlueCave2', 'BlueCave3', 'BlueCave4',
    'YellowCave1', 'YellowCave2', 'YellowCave3', 'YellowCave4',
    'Tree1', 'Tree2', 'Tree3', 'Tree4', 'Shrub1', 'Shrub2', 'Shrub3', 'Shrub4']) {
    assert.ok(src.includes(`SecretBase_${n}`), `canon SecretBase_${n}`);
  }
});

// ——— B — Layout structure + aliases + protected cells ————————————————————
test('phase 37 B: unique S/E, hole present, legacy aliases, S/E protection', () => {
  const sb = makeSandbox();
  const info = vm.runInContext(`(() => {
    const out = {};
    for (const id of baseLayoutIds()) {
      const L = baseLayoutGet(id);
      let s = 0, e = 0, o = 0;
      for (const row of L.cells) for (const c of row) {
        if (c.spawnPt) s++;
        if (c.entrance) e++;
        if (c.t === 'hole') o++;
      }
      out[id] = { w: L.w, h: L.h, s, e, o, theme: L.theme, canon: L.canon,
                  spawn: L.spawn, exit: L.exit, anchors: L.stairAnchors.length };
    }
    return JSON.parse(JSON.stringify(out));
  })()`, sb);
  // 24 canon layouts (RSE) + 12 custom two-level ones (mezzanine + stairs)
  assert.equal(Object.keys(info).length, 36, '36 layouts (24 canon + 12 custom multi-floor, phase 42)');
  const CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6',
                  'cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6', 'cave_yellow_5', 'cave_yellow_6'];
  for (const [id, i] of Object.entries(info)) {
    assert.equal(i.s, 1, `${id}: a single spawn point S`);
    assert.equal(i.e, 1, `${id}: a single exit mat E`);
    assert.ok(i.o >= 1, `${id}: at least one fillable hole/rock`);
    if (CUSTOM.includes(id)) assert.ok(i.anchors >= 1, `${id}: stairs anchor(s) (custom 2 levels)`);
    else assert.equal(i.anchors, 0, `${id}: RSE has no stairs anchor`);
    assert.ok(['cave', 'tree', 'bush'].includes(i.theme));
  }
  // legacy aliases of old saves (passes 33-36)
  const alias = vm.runInContext(`({
    a: baseLayoutGet('cave_square_a') && baseLayoutGet('cave_square_a').id,
    b: baseLayoutGet('tree_wide_b') && baseLayoutGet('tree_wide_b').id,
    c: baseLayoutGet('bush_twolevel_a') && baseLayoutGet('bush_twolevel_a').id,
    d: baseLayoutGet('nope_1'),
  })`, sb);
  assert.equal(alias.a, 'cave_1');
  assert.equal(alias.b, 'tree_2');
  assert.equal(alias.c, 'bush_3');
  assert.equal(alias.d, null, 'id inconnu → null');
  // S and E non-decorable (protected metatiles 544/524)
  const prot = vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    return {
      s: baseCanPlace(st, 'small_desk', 5, 7, 0).reason,   // S(5,7) — passe 43: in front of the door
      e: baseCanPlace(st, 'small_desk', 5, 8, 0).reason,   // E(5,8)
      hole: baseCanPlace(st, 'small_desk', 5, 2, 0).reason, // hole without a board
      ok: baseCanPlace(st, 'small_desk', 4, 4, 0).ok,
    };
  })()`, sb);
  assert.equal(prot.s, 'base.err.entrance', 'spawn point not decorable');
  assert.equal(prot.e, 'base.err.entrance', 'exit mat not decorable');
  assert.equal(prot.hole, 'base.err.floor_only', 'the bare hole accepts nothing');
  assert.equal(prot.ok, true, 'free floor OK');
});

// ——— C — Art direction: camera + textured shell + 2D 100% GBA ———————————————————
// Phase 56: the old `base-view3d.js` renderer was REPLACED by the
// standalone 3D window (base3d-view.js). It declared `_base3dManifestP` at
// global scope, like the new loader: two `let` with the same name in
// global scope = SyntaxError, and ALL script loading stopped
// (black 3D window, console full of "loadScript"). It is archived in
// tools/legacy/; these checks now target the active renderer.
test('phase 37 C: 3D renderer removed, 2D without 2.5D icon', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), '3D renderer removed');
  const v2d = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2d.includes('e.emerald'), '2D: Emerald sprite');
  assert.ok(!v2d.includes('e.icon2d'), '2D: NO serebii icon (pure GBA art direction)');
  assert.ok(v2d.includes('EMERALD ONLY'), 'art-direction choice documented in the code');
});

function bakedSlugs() {
  const bake = R('tools/bake-emerald-bgs.py');
  const meta = [...bake.matchAll(/\('([a-z0-9_]+)', '[A-Z_0-9]+'\)/g)].map((m) => m[1]);
  const obj = Object.keys(JSON.parse(R('tools/emerald-ref/objgfx/sources.json')).files);
  return { meta: [...new Set(meta)], obj };
}

test('phase 37 D: baked RSE sprites (metatiles + objects) + updated manifest', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json').items;
  const { meta, obj } = bakedSlugs();
  assert.ok(meta.length >= 55, `${meta.length} metatile decors in DECOR_MAP (phase 39)`);
  assert.equal(obj.length, 45, '45 object sprites (27 dolls + 8 big + 10 cushions, phase 42)');
  for (const slug of meta.concat(obj)) {
    const p = `src/assets/images/secret-base/emerald/${slug}.png`;
    assert.ok(E(p), p);
    const buf = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    assert.equal(buf.readUInt32BE(0), 0x89504e47, `${slug} PNG`);
    assert.equal(buf[25], 6, `${slug} RGBA (transparency for placement on the background)`);
    assert.equal(man[slug] && man[slug].emerald, p, `${slug} referenced in the manifest`);
  }
  // the objgfx mode is wired and staged offline
  const bake2 = R('tools/bake-emerald-bgs.py');
  assert.ok(bake2.includes('--bake-decor-all') && bake2.includes('DECOR_MAP'), 'full metatile bake');
  assert.ok(bake2.includes('--bake-objgfx'), 'object sprite bake');
  // the baker knows how to regenerate them from the disassembly references
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('--bake-decor') && bake.includes('decor_refs'), 'decor bake wired');
  assert.ok(bake.includes('tiles.h') || bake.includes('DECOR_TILE'), 'DecorGfx references from the disassembly');
  for (const f of ['metatile_labels.h', 'decorations.h', 'tiles.h', 'header.h']) {
    assert.ok(E(`tools/emerald-ref/decor/${f}`), `persisted reference ${f}`);
  }
  assert.ok(E('tools/emerald-ref/data/tilesets/primary/secret_base/tiles.png'), 'tileset primaire secret_base');
  assert.ok(E('tools/emerald-ref/data/tilesets/primary/secret_base/palettes/01.pal'), 'palettes primaires');
});

// ——— E — Legality of the furnished example scenes ————————————————————————
test('phase 37 E: the examples\' furnished scenes are all legal', () => {
  const py = R('tools/render_base_preview.py');
  const scenes = {};
  for (const m of py.matchAll(/'(cave_\d|tree_\d|bush_\d)': \{\s*'items': \[(.*?)\],\s*'npcs': \[(.*?)\],/gs)) {
    const items = [...m[2].matchAll(/\('([a-z0-9_]+)', (\d+), (\d+), (\d+)\)/g)]
      .map((t) => [t[1], +t[2], +t[3], +t[4]]);
    const npcs = [...m[3].matchAll(/\((\d+), (\d+)\)/g)].map((t) => [+t[1], +t[2]]);
    scenes[m[1]] = { items, npcs };
  }
  assert.deepEqual(Object.keys(scenes).sort(), ['cave_1', 'cave_3', 'tree_2'], 'the 3 expected scenes');
  for (const [lid, sc] of Object.entries(scenes)) {
    assert.ok(sc.items.length >= 5, `${lid}: at least 5 objects`);
    const sb = makeSandbox();
    const resJson = vm.runInContext(`(() => {
      const st = baseGetState();
      baseDebugCreate(${JSON.stringify(lid)});
      const fails = [];
      const L = baseLayoutGet(${JSON.stringify(lid)});
      baseDebugGrantAll();
      const note = (slug, x, y, rot) => {
        const c = baseCanPlace(st, slug, x, y, rot);
        if (!c.ok) fails.push(slug + '@' + x + ',' + y + ' → ' + c.reason);
        else basePlace(st, slug, x, y, rot);
      };
      (${JSON.stringify(sc.items)}).forEach(([s, x, y, rot]) => note(s, x, y, rot));
      // NPC on walkable floor, never spawn/hole
      const npcBad = [];
      for (const [nx, ny] of ${JSON.stringify(sc.npcs)}) {
        const cell = L.cells[ny][nx];
        if (cell.t !== 'floor' || cell.entrance || cell.spawnPt) npcBad.push(nx + ',' + ny);
      }
      return JSON.stringify({ fails, npcBad, placed: st.items.length });
    })()`, sb);
    const res = JSON.parse(resJson);
    assert.deepEqual(res.fails, [], `${lid}: every placement is legal (${res.fails.join('; ') || 'OK'})`);
    assert.deepEqual(res.npcBad, [], `${lid}: NPC on valid tiles`);
  }
});


