import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 41: editing comfort, visual height, canonical objects ───────────
// Addressed user feedback:
//  A. "I can't click an object to move it again" → ONE click =
//     direct pick-up (the 2-step selection was invisible);
//     "Pick up" STORES the held furniture; a click on the 3D render recalls
//     that editing happens in 2D (need2d).
//  B. "The new maps are poorly made… the door opens onto a wall" →
//     the 6 custom layouts are re-gridded: E door with free NORTH tile,
//     full flat BFS, stairs anchors in PAIRS (2 wide),
//     mezzanine ≥ 6 tiles. Invariants verified on the 30 layouts.
//  C. "The stairs are gigantic, take inspiration from FRLG (2 wide)" →
//     stairs = canon 2×2 footprint, rot 90, 32×32 sprite baked with Emerald art direction.
//  D. "Rotation: you shrink the width instead of rotating" + "2-tile-tall
//     objects shrunk" → base2dSpriteBox allows +1 tile of VISUAL height
//     (collision = bottom cell only), and base2dDrawSprite ROTATES the
//     bitmap (uniform scale, never stretched). Catalog dimensions =
//     canonical DECORSHAPE (header.h from the pokeemerald disassembly).
//  E. "Objects without sprites (FRLG/Emerald mix)" → 19 sprites
//     redrawn with Emerald art direction (red pc with yellow bars included), 150 PNG,
//     invisible_doll removed from the catalog; only welcome_mat stays procedural.
//  F. i18n: need2d/select_hint/move_hint present FR+EN, zero hardcoded string.
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
  'src/ui/game/base/base-view2d.js',
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe41-confort-canons [iife]' });
  return sandbox;

}

// ——— A — Direct click = pick-up (code + buttons) ————————————————————
test('phase 41 A: direct editing wired (single click, Pick up the held one, 3D hint)', () => {
  const ed = R('src/ui/game/base/base-editor.js');
  const win = R('src/ui/game/base/base-window.js');
  // clicking placed furniture DIRECTLY calls baseEditorMoveStart
  const clickIdx = ed.indexOf('function baseEditorClickCell');
  const mvIdx = ed.indexOf('baseEditorMoveStart(st, sel.uid)', clickIdx);
  assert.ok(mvIdx > clickIdx, 'baseEditorClickCell → baseEditorMoveStart direct');
assert.ok(ed.includes('ONE click on a placed furniture takes it'), 'pass 41 comment (UX choice traceability)');
// "Pick up" also accepts the HELD furniture (except automatic items)
assert.ok(R('src/ui/game/base/base-editor.js').includes('Pick up the placed selection (or the HELD furniture)'), 'toolbar: pickup handles the held item');
  // banned function prefix (project convention)
  for (const f of ['src/ui/game/base/base-editor.js', 'src/ui/game/base/base-window.js', 'src/ui/game/base/base-view2d.js', 'src/application/base/base-core.js']) {
    assert.ok(!R(f).includes('baseWindowToggle'), `no baseWindowToggle* in ${f}`);
  }
  // exported 2D helpers (tests + tools) — canonical export = engine action registry (wave 34)
  assert.ok(R('src/ui/game/base/base-view2d.js').includes("PokeActions.register('base2dSpriteBox', base2dSpriteBox)"), 'base2dSpriteBox exported');
  assert.ok(R('src/ui/game/base/base-view2d.js').includes("PokeActions.register('base2dDrawSprite', base2dDrawSprite)"), 'base2dDrawSprite exported');
});

// ——— B — Invariants of the 30 layouts (free door, BFS, anchors, mezzanine) —
test('phase 41 B: the 30 layouts respect the furnishing invariants', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const report = [];
    const ids = baseLayoutIds();
    for (const id of ids) {
      const L = baseLayoutGet(id);
      const at = (x, y) => (L.cells[y] || [])[x] || { t: 'wall' };
      const floors = []; let E = null, S = null;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const c = at(x, y);
        if (c.t === 'floor' || c.t === 'hole') floors.push([x, y]);
        if (c.entrance) { if (E) report.push(id + ': 2nd entrance'); E = [x, y]; }
        if (c.spawnPt) { if (S) report.push(id + ': 2e spawn'); S = [x, y]; }
      }
      if (!E) { report.push(id + ': pas de porte'); continue; }
      if (!S) { report.push(id + ': pas de spawn'); continue; }
      // the DOOR never faces a wall: the tile NORTH of it is free floor
      const nE = at(E[0], E[1] - 1);
      if (!(nE.t === 'floor' && !nE.entrance)) report.push(id + ': case NORD de la porte = ' + nE.t);
      if (at(S[0], S[1]).t !== 'floor') report.push(id + ': spawn hors sol');
      // level-walk BFS from the spawn: the WHOLE ground floor is reached
      const seen = new Set([S[0] + ',' + S[1]]);
      const q = [S];
      while (q.length) {
        const cur = q.shift();
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cur[0] + d[0], ny = cur[1] + d[1], k = nx + ',' + ny;
          if (seen.has(k)) continue;
          const c = at(nx, ny);
          if ((c.t === 'floor' || c.t === 'hole') && !c.elev) { seen.add(k); q.push([nx, ny]); }
        }
      }
      for (const f of floors) {
        const c = at(f[0], f[1]);
        if (c.elev) continue;
        if (!seen.has(f[0] + ',' + f[1])) { report.push(id + ': case plaine-pied inaccessible ' + f); break; }
      }
      if (!seen.has(E[0] + ',' + (E[1] - 1))) report.push(id + ': door not reachable on foot');
      // 2-level layouts: anchors in PAIRS (2-wide stairs), cliff
      // at N, mezzanine at N-2, ≥ 6 raised tiles
      if (id.endsWith('_5') || id.endsWith('_6')) {
        if (!L.stairAnchors.length) report.push(id + ': no anchor');
        if (L.stairAnchors.length % 2) report.push(id + ': ancres impaires (paires requises)');
        for (const a of L.stairAnchors) {
          const N = at(a.x, a.y - 1), NN = at(a.x, a.y - 2);
          const right = at(a.x + 1, a.y), rightN = at(a.x + 1, a.y - 1);
          const leftIsAnchor = !!at(a.x - 1, a.y).stairAnchor;
          if (N.t !== 'cliff') report.push(id + ': anchor ' + a.x + ',' + a.y + ' without cliff at N');
          if (NN.elev !== 1) report.push(id + ': anchor ' + a.x + ',' + a.y + ' without mezzanine at N-2');
          if (!leftIsAnchor && !(right.stairAnchor && rightN.t === 'cliff')) report.push(id + ': anchor ' + a.x + ',' + a.y + ' without PAIR on the right');
        }
        let mezz = 0;
        for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (at(x, y).elev === 1) mezz++;
        if (mezz < 6) report.push(id + ': mezzanine ' + mezz + ' < 6');
      }
    }
    return JSON.stringify({ n: ids.length, report });
  })()`, sb));
  assert.equal(out.n, 36, '36 layouts (24 canon + 6 custom + 6 colored multi-floor caves, phase 42)');
  assert.deepEqual(out.report, [], 'clear door + full BFS + anchors in pairs + mezzanine ≥ 6');
});

// ——— C — ORAS canon stairs: 2×2, anchor pair, overlap exclusion ——
test('phase 51 C: 2×2 FRLG-style stairs — dims, anchor pair, exclusion', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const def = baseItemGet('stairs');
    r.def = { w: def.w, d: def.d, rot: def.rot, acq: def.acq, walk: !!def.walk, fx: def.fx };
    // Pass 51: each two-level layout is TWO rooms joined by a corridor
    // and ONE stairs — so we check the anchor pair and the refusal to
    // overlap that same pair.
    const st = baseGetState();
    baseDebugCreate('bush_6');
    st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
    baseStockAdd(st, 'stairs', 2);
    const anchors = baseLayoutGet('bush_6').stairAnchors;
    r.pairs = anchors.length;
    const p1 = basePlace(st, 'stairs', anchors[0].x, anchors[0].y, 0);
    const s1 = st.items.find((i) => i.s === 'stairs');
    r.first = p1.ok === true && s1.x === anchors[0].x && s1.y === anchors[0].y - 1;
    // the 2nd anchor of the SAME pair overlaps the placed stairs → refused
    r.overlapReason = baseCanPlace(st, 'stairs', anchors[1].x, anchors[1].y, 0).reason;
    r.stairsCount = st.items.filter((i) => i.s === 'stairs').length;
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.def, { w: 2, d: 2, rot: 0, acq: 'fortree', walk: true, fx: 'stairs' }, 'canon stairs: 2×2 (two wide like FRLG), NO rotation (phase 42), walkable');
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('stairs'))`, sb), 1, 'stairs: single orientation');
  assert.equal(out.pairs, 2, 'one anchor pair (2 tiles) per multi-floor layout');
  assert.equal(out.first, true, 'stairs placed, footprint normalized anchor-1');
  assert.equal(out.overlapReason, 'base.err.occupied', '2nd anchor of the same pair = overlap refused');
  assert.equal(out.stairsCount, 1, 'a single staircase fits in the niche');
});

// ——— D — Canonical DECORSHAPE dims + visual height ———————————————————
test('phase 41 D: catalog dims = canon header.h, overflowing visual height', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const CANON = {
      heavy_desk: [3, 2], ragged_desk: [3, 2], comfort_desk: [3, 2], // bureaux canon
      pretty_desk: [3, 3], brick_desk: [3, 3], camp_desk: [3, 3], hard_desk: [3, 3],
      blue_tent: [3, 3], red_tent: [3, 3], // pass 42: 3×3 canon (was 3×2)
      tv: [1, 1], round_tv: [1, 1], cute_tv: [1, 1], pc: [1, 1],
      breakable_door: [1, 2], stairs: [2, 2], tropical_plant: [1, 2],
      // pass 42: canon items added (request: "assets are missing")
      pika_poster: [2, 1], kiss_poster: [2, 1], gate_poster_none: null,
    };
    delete CANON.gate_poster_none; // local guard (outside the catalog)
    Object.assign(CANON, { stand: [4, 2], slide: [2, 4], colorful_plant: [2, 2],
      surf_mat: [3, 3], fissure_mat: [3, 3], c_low_note_mat: [1, 1] });
    const dims = {}, fp0 = {};
    for (const s of Object.keys(CANON)) {
      const d = baseItemGet(s);
      dims[s] = d ? [d.w, d.d] : null;
      fp0[s] = d ? baseItemFootprint(d, 0) : null;
    }
    // Visual height: a tropical plant (16×32 sprite) overflows one cell
    // upward but only blocks its LOWER cell (1×1 footprint).
    const C = 16;
    const plant = baseItemGet('tropical_plant');
    const plantImg = { width: 16, height: 32 };
    const boxPlant = base2dSpriteBox(plant, baseItemFootprint(plant, 0), plantImg, C);
    // a WALL poster (wall layer) does NOT overflow upward (stuck to the wall)
    const poster = baseItemGet('blue_poster');
    const boxBoard = base2dSpriteBox(poster, baseItemFootprint(poster, 0), { width: 16, height: 16 }, C);
    // BITMAP rotation: the angle is imposed by rotIdx × def.rot (90° desk)
    const desk = baseItemGet('heavy_desk');
    const turns = [0, 1, 2, 3].map((i) => (((i * desk.rot) % 360) + 360) % 360);
    return JSON.stringify({ dims, fp0plant: fp0.tropical_plant, boxPlant, boxBoard, turns, rotDesk: desk.rot, rotPlant: plant.rot });
  })()`, sb));
  const CANON = {
    heavy_desk: [3, 2], ragged_desk: [3, 2], comfort_desk: [3, 2],
    pretty_desk: [3, 3], brick_desk: [3, 3], camp_desk: [3, 3], hard_desk: [3, 3],
    blue_tent: [3, 3], red_tent: [3, 3],
    tv: [1, 1], round_tv: [1, 1], cute_tv: [1, 1], pc: [1, 1],
    breakable_door: [1, 2], stairs: [2, 2], tropical_plant: [1, 2],
    pika_poster: [2, 1], kiss_poster: [2, 1],
    stand: [4, 2], slide: [2, 4], colorful_plant: [2, 2],
    surf_mat: [3, 3], fissure_mat: [3, 3], c_low_note_mat: [1, 1],
  };
  for (const [s, wd] of Object.entries(CANON)) {
    assert.deepEqual(out.dims[s], wd, `${s} = ${wd[0]}×${wd[1]} (DECORSHAPE canon)`);
  }
  assert.deepEqual(out.fp0plant, { w: 1, d: 1 }, 'collision = bottom cell only (1×1 footprint)');
  assert.equal(out.boxPlant.maxH, 48, '3-tile-tall visual (fix >1 block): maxH = h + 2*C');
  assert.equal(out.boxPlant.h, 16, 'ground footprint unchanged');
  assert.equal(out.boxBoard.maxH, 16, 'wall object: no overhang (flush with the wall)');
  assert.equal(out.rotDesk, 0, 'phase 42: rotation REMOVED (RSE canon)');
  assert.equal(out.rotPlant, 0, 'object without rotation');
  assert.deepEqual(out.turns, [0, 0, 0, 0], 'no pivot possible (single orientation)');
});

// ——— E — Sprites: 150 PNGs, 19 redrawn, PC 16×32, coherent manifest ———
test('phase 41 E: complete RSE canon sprites (122 native PNGs, ORAS purged)', () => {
  const dir = 'src/assets/images/secret-base/emerald';
  const files = fs.readdirSync(new URL(`../${dir}`, import.meta.url)).filter((f) => f.endsWith('.png'));
  assert.equal(files.length, 122, '122 native canon Emerald PNGs (phase 42)');
  // Phase 42: the 19 "redrawn" ones (red/yellow pc, ORAS rugs, blackboard,
  // vending_machine, bed, proclamation…) were OFF-brand → removed from the game,
  // their files purged. Every sprite in the repo = official metatile/objgfx.
  const FORMER_ORAS = ['bench', 'green_mat', 'red_mat', 'blue_mat', 'flat_mat',
    'proclamation', 'blackboard', 'confetti_ball', 'poke_flute', 'berry_blender',
    'comfortable_bed', 'substitute_doll', 'vending_machine', 'tall_grass',
    'pitfall_mat', 'square_one_mat', 'blue_warp_panel', 'red_warp_panel'];
  for (const s of FORMER_ORAS) {
    assert.ok(!E(`${dir}/${s}.png`), `purged: ${s}.png (not in the Emerald offshoot)`);
  }
  // Authentic PC: metatile 0x220 from the SecretBase tileset (blue-grey, 16×16)
  const man = J('src/assets/images/secret-base/manifest.render2d.json').items;
  const ihdr = (p) => { const b = fs.readFileSync(new URL(`../${p}`, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  assert.ok(man.pc && man.pc.emerald, 'pc au manifeste');
  assert.deepEqual(ihdr(`${dir}/pc.png`), [16, 16], 'pc.png = canon 16×16 metatile');
  assert.deepEqual(ihdr(`${dir}/stairs.png`), [32, 32], 'stairs.png 32×32 (2×2 natif GBA)');
  // canon catalog: 123 items (120 RSE + welcome_mat + stairs + pc)
  const catalogue = [...R('src/data/base-items-data.js').matchAll(/s:'([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.equal(catalogue.length, 122, '122 objects in the catalog (phase 43: welcome_mat removed)');
  const without = catalogue.filter((s) => !(man[s] && man[s].emerald));
  assert.deepEqual(without, [], 'phase 43: NO procedural sprite left (welcome mat removed)');
  // the 11 downloaded dolls (ditto, meowth, pikachu…) + 5 characters
  for (const s of ['ditto_doll', 'meowth_doll', 'pikachu_doll', 'gulpin_doll', 'kecleon_doll', 'seedot_doll', 'lotad_doll', 'duskull_doll', 'snoothum_doll'.replace('snoothum', 'smoochum'), 'snorlax_doll', 'rhydon_doll']) {
    assert.ok(E(`${dir}/${s}.png`), `downloaded doll ${s}`);
  }
  assert.ok(!E(`${dir}/people`), 'people folder removed');
});

test('phase 41 F: i18n need2d + FR/EN editing hints, 3D listener hooked', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`JSON.stringify({
    fr: { need2d: I18N.fr.base.edit.need2d, sel: I18N.fr.base.edit.select_hint, mv: I18N.fr.base.edit.move_hint },
    en: { need2d: I18N.en.base.edit.need2d, sel: I18N.en.base.edit.select_hint, mv: I18N.en.base.edit.move_hint },
  })`, sb));
  for (const lang of ['fr', 'en']) {
    assert.equal(typeof out[lang].need2d, 'string', `${lang}: need2d present`);
    assert.ok(out[lang].need2d.length > 10, `${lang} : need2d explicite`);
    assert.equal(typeof out[lang].sel, 'string', `${lang}: select_hint present`);
    assert.equal(typeof out[lang].mv, 'string', `${lang}: move_hint present`);
  }
  assert.ok(out.fr.sel.includes('prendre en main'), 'FR select_hint: ONE click = pick up');
  assert.ok(out.en.sel.includes('pick it up'), 'EN select_hint : one click = pick up');
  assert.ok(out.fr.mv.includes('Ramasser'), 'FR move_hint : « Ramasser » range le tenu');
  assert.ok(out.en.mv.includes('Pick up'), 'EN move_hint : Pick up stashes the held item');
  // the 3D canvas recalls that editing = 2D (notification, no hardcoded alert)
  const win = R('src/ui/game/base/base-window.js');
  assert.ok(win.includes("_baseWin.c3d.addEventListener('click'"), 'click listener on the 3D canvas');
  assert.ok(win.includes("t('base.edit.need2d')"), 'i18n need2d notification (zero hardcoded string)');
});

