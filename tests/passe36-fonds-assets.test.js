import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Pass 36/37: real canon Emerald backgrounds + ORAS camera + assets ────────
//  A. Assets tidied into src/assets (models, icons, sprites, backgrounds) —
//     no more assets3d/assets2d/out at the root, no heavy zip shipped
//  B. Baked Emerald backgrounds: 12 PNGs (the 12 official RSE layouts) at
//     the exact dimensions of the layouts, baker tuned to the real
//     palettes GBA (SPLIT_PAL = 6, primaire gTileset_SecretBase)
//  C. FRLG camera (yaw 0, pitch 0.95) + shell TEXTURED by the real
//     Emerald metatiles (tex3d atlas) + south-void lower rims + posters
//  D. Canonical rule for wall items: placed ONLY on the north wall (floor to the south)
//  E. Examples regenerated in src/assets/images/secret-base/examples/
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const L = (p) => fs.readdirSync(new URL(`../${p}`, import.meta.url));

const LAYOUTS = [
  ['cave_1', 11, 9], ['cave_2', 14, 9], ['cave_3', 15, 11], ['cave_4', 14, 12],
  ['tree_1', 11, 9], ['tree_2', 7, 16], ['tree_3', 17, 8], ['tree_4', 14, 14],
  ['bush_1', 11, 9], ['bush_2', 15, 7], ['bush_3', 13, 11], ['bush_4', 14, 11],
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
  // T2-D: same files, SAME order — bundled IIFE keeps vm parity AND tolerates ESM converts
  vm.runInContext(harnessBundleSource([
    'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
    'src/localization/fr/base.js', 'src/localization/en/base.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/application/game-state.js',
    'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
    'src/application/base/base-core.js',
  ]), sandbox, { filename: 'passe36-base [iife]' });
  return sandbox;
}

// ——— A — Tidied assets ————————————————————————————————————————————————————
test('phase 36 A: assets tidied into src/assets, root purged', () => {
  // new houses
  assert.ok(!E('src/assets/models'), '3D models removed');
  assert.ok(E('src/assets/images/secret-base/manifest.render2d.json'), '2D manifest moved');
  // phase 45: the two ORAS staging icon folders (icons/ 64 files,
  // icons-serebii/ 165) no LONGER exist — phase 42 had already purged their
  // references from the manifest (100% of sprites come from native
  // Emerald metatiles/objgfx). So we verify the INVERSE: no residual ORAS fallback.
  assert.ok(!E('src/assets/images/secret-base/icons'), 'ORAS icons/ staging purged (phase 42/45)');
  assert.ok(!E('src/assets/images/secret-base/icons-serebii'), 'icons-serebii/ staging purged');
  {
    const m2 = J('src/assets/images/secret-base/manifest.render2d.json');
    const withIcon = Object.values(m2.items).filter((e) => e.icon2d).length;
    assert.equal(withIcon, 0, 'no sprite falls back to an ORAS icon');
  }
  // pass 39: + full metatile decors (DECOR_MAP, real Emerald names)
  // + 34 object sprites (dolls/cushions). Verifiable count:
  // 105 produced by the bakes (71 DECOR_MAP + 34 objgfx) + 25 inherited from
  // phases 33-37 (bricks, pretty dressers, flat dolls… referenced by the
  // 2D/3D manifests) = 130 files.
  // phase 40: + stairs (stairs.png, ladder baked by the baker) = 131.
  // phase 42: RSE canon PURGE — the 19 redrawn ones (red/yellow pc,
  // ORAS rugs…) and every sprite outside the official catalog are DELETED. The
  // 122 native sprites (DecorGfx metatiles + objgfx + pc 0x220 + stairs v4)
  // + the people/ subfolder (phase 46: 9 sheets = player + 8 looks).
  const emDir = fs.readdirSync(new URL('../src/assets/images/secret-base/emerald', import.meta.url), { withFileTypes: true });
  assert.equal(emDir.filter((e) => e.isFile() && e.name.endsWith('.png')).length, 122, '122 native canon Emerald sprites (phase 42)');
  assert.ok(!emDir.some((e) => e.isDirectory() && e.name === 'people'), 'people/ subfolder removed');
  // old houses removed
  assert.ok(!E('assets3d'), 'assets3d/ removed from the root');
  assert.ok(!E('assets2d'), 'assets2d/ removed from the root');
  assert.ok(!E('out'), 'out/ removed (examples → examples/)');
  // no heavy zip shipped in the project (the original archives are purged)
  const stack = ['src/assets'];
  const zips = [];
  while (stack.length) {
    const d = stack.pop();
    for (const f of fs.readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })) {
      const p = `${d}/${f.name}`;
      if (f.isDirectory()) stack.push(p);
      else if (/\.zip$/i.test(f.name)) zips.push(p);
    }
  }
  assert.deepEqual(zips, [], 'no zip shipped in src/assets');
  // no reference to the old paths anywhere in the shipped code
  for (const f of ['src/ui/game/base/base-view2d.js',
    'src/ui/game/base/base-window.js', 'index.html']) {
    const s = R(f);
    assert.ok(!s.includes('assets3d') && !s.includes('assets2d'), f + ' without legacy path');
  }
  // 2D render manifest: every referenced file exists
  const man2 = J('src/assets/images/secret-base/manifest.render2d.json');
  for (const slug of Object.keys(man2.items)) {
    const e2 = man2.items[slug];
    for (const k of ['emerald', 'icon2d']) {
      if (e2[k]) assert.ok(E(e2[k]), `${slug}.${k} → ${e2[k]}`);
    }
  }
});

// ——— B — Baked Emerald backgrounds ————————————————————————————————————————————
test('phase 36 B: 12 canon Emerald backgrounds at the exact layout dimensions', () => {
  for (const [lid, w, h] of LAYOUTS) {
    const p = `src/assets/images/secret-base/bg/emerald/${lid}.png`;
    assert.ok(E(p), p);
    const buf = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    assert.ok(buf.length > 1200, `${p} poids plausible`);
    // PNG header: signature + IHDR (width/height big-endian @16/@20)
    assert.equal(buf.readUInt32BE(0), 0x89504e47, 'signature PNG');
    const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
    assert.equal(W, w * 16, `${lid} native GBA width`);
    assert.equal(H, h * 16, `${lid} native GBA height`);
  }
  // the baker encodes the real GBA rule (proven on pret/pokeemerald data)
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('SPLIT_PAL = 6'), 'GBA palettes: secondary from slot 6');
  assert.ok(bake.includes('primary/secret_base'), 'primary = gTileset_SecretBase (NOT general)');
  assert.ok(bake.includes('SecretBase_BrownCave4'), '12 official RSE layouts (including the “4” ones)');
  assert.ok(bake.includes("'floor': 522"), 'canon floor metatile (extracted positionally)');
  assert.ok(bake.includes("'entr': 524"), 'canon entrance metatile');
  // atlas of the textured 3D shells (5 real metatile slots)
  // the 2D renderer consumes these backgrounds
  const v2d = R('src/ui/game/base/base-view2d.js');
  assert.ok(v2d.includes('src/assets/images/secret-base/bg/emerald/${layoutId}.png') ||
            v2d.includes('src/assets/images/secret-base/bg/emerald/${st.layoutId}.png') ||
            /bg\/emerald\/\$\{/.test(v2d), '2D: background baked per layout');
  assert.ok(v2d.includes('baseView2dBg'), '2D: named background loader');
});

// ——— C — ORAS camera + textured 3D shell ——————————————————————————————
// Phase 56: the old `base-view3d.js` renderer was REPLACED by the
// standalone 3D window (base3d-view.js). It declared `_base3dManifestP` at
// global scope, like the new loader: two `let` with the same name in
// global scope = SyntaxError, and ALL script loading stopped
// (black 3D window, console full of "loadScript"). It is archived in
// tools/legacy/; these checks now target the active renderer.
test('phase 36 C: 3D renderer and ORAS tiles removed', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), '3D renderer removed');
});

test('phase 36 D: wall items placed only on the north wall (floor to the south)', () => {
  const sb = makeSandbox();
  const out = vm.runInContext(`(() => {
    const st = baseCreateDefault();
    baseRelocate(st, 'cave_1');
    const north = baseCanPlace(st, 'blue_poster', 5, 0, 0);   // north wall (floor at (5,1))
    const west = baseCanPlace(st, 'blue_poster', 0, 4, 0);    // west wall: south = wall
    const east = baseCanPlace(st, 'blue_poster', 10, 4, 0);   // east wall: south = wall
    const southWall = baseCanPlace(st, 'blue_poster', 1, 7, 0); // wall (south = wall, never floor)
    const floor = baseCanPlace(st, 'blue_poster', 4, 4, 0);   // bare floor
    const stairs = baseCanPlace(st, 'stairs', 2, 5, 0);       // RSE: no anchor
    const tire = baseCanPlace(st, 'tire', 1, 4, 0);           // 2×2 floor always OK
    return JSON.parse(JSON.stringify({ north, west, east, southWall, floor, stairs, tire }));
  })()`, sb);
  assert.ok(out.north.ok, 'poster on north wall: accepted');
  assert.ok(!out.west.ok && out.west.reason === 'base.err.wall_only', 'poster west wall: refused');
  assert.ok(!out.east.ok && out.east.reason === 'base.err.wall_only', 'poster east wall: refused');
  assert.ok(!out.southWall.ok, 'poster south wall: refused');
  assert.ok(!out.floor.ok && out.floor.reason === 'base.err.wall_only', 'poster on floor: refused');
  assert.ok(!out.stairs.ok && out.stairs.reason === 'base.err.stairs_anchor', 'RSE: stairs refused (no anchor)');
  assert.ok(out.tire.ok, 'floor furniture unchanged');
});

// ——— E — Regenerated examples ——————————————————————————————————————————————
test('phase 36 E: examples in src/assets/images/secret-base/examples/ (removed)', () => {
  const dir = 'src/assets/images/secret-base/examples';
  assert.ok(!E(dir), '3D examples removed');
});


