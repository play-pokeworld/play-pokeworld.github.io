import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Pass 44: user feedback "stairs worse than before" + NPCs ─────────
//  1. STAIRS: sprite = REAL RSE metatiles (display-stand pair), and
//     BOTH stairs columns are walkable ("not just one").
//  2. DISPLAY STAND / SLIDE: real RSE-style object heights — top
//     reachable ONLY via the built-in stairs (stand: stairs
//     at both ends; slide: stairs on the left), never via the
//     edges; slide: FORCED slide down to the mat when touching the ramp
//     head; placement only on an even base.
//  3. ORGANIC MULTI-FLOOR LAYOUTS, FRLG style: non-square room, climb via
//     a small detour, stairs niche framed by heights (unique position).
//     (shape invariants verified in passe43-porte-lock-hauteurs.test.js D)
//  4. NPC: system kickoff — roster pool (8 buddies, dedicated crowd
//     sprites, i18n lines, gen 1-2 teams), placement/refusal on anchor,
//     interaction → bounded battle (1/visit).

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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe44-escalier-zones-pnj [iife]' });
  return sandbox;
}

// ——— A — stairs: crossing BOTH columns (real visit) ——————————————————————
test('phase 44 A: BOTH stairs columns are walkable', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    // pass 47: the rooms are redesigned — we READ the niche from the layout
    // instead of hardcoding its coordinates.
    const L = baseLayoutGet('cave_5');
    const a0 = L.stairAnchors[0];
    const W = a0.x, E = a0.x + 1, AY = a0.y;   // anchor pair, row AY
    basePlace(st, 'stairs', W, AY, 0);
    const r = { W, E, AY };
    // WEST column: spawn → plateau (2 rows above the anchor)
    let sess = baseVisitCreate(st);
    let ok = baseVisitSetDestination(sess, W, AY - 2);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.westPath = !!ok; r.west = sess.pos; r.westElev = sess.elev;
    // EAST column
    sess = baseVisitCreate(st);
    ok = baseVisitSetDestination(sess, E, AY - 2);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.eastPath = !!ok; r.east = sess.pos; r.eastElev = sess.elev;
    // laterality ON the stairs: we join the other anchor column
    sess = baseVisitCreate(st);
    baseVisitSetDestination(sess, E, AY);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.onStairs = sess.pos;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.westPath, true, 'colonne OUEST traversable');
  assert.deepEqual([out.west.x, out.west.y, out.westElev], [out.W, out.AY - 2, 1], 'WEST climb → mezzanine');
  assert.equal(out.eastPath, true, 'EAST column crossable');
  assert.deepEqual([out.east.x, out.east.y, out.eastElev], [out.E, out.AY - 2, 1], 'EAST climb → mezzanine');
  assert.deepEqual([out.onStairs.x, out.onStairs.y], [out.E, out.AY], 'side passage between stairs columns');
});

// ——— B — display stand: canonical object height (stairs at both ends) ————
test('phase 44 B: display stand — up/down ONLY via its stairs', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    basePlace(st, 'stand', 2, 3, 0);         // 4×2 display stand: row 3 = top, row 4 = base
    const r = {};
    const g = baseBuildGrid(st);
    // solid base blocked (between the 2 stairs)
    r.baseBlocked = [baseCellWalkable(st, g, 3, 4, null), baseCellWalkable(st, g, 4, 4, null)];
    // end stairs walkable; top walkable
    r.stairW = baseCellWalkable(st, g, 2, 4, null);
    r.stairE = baseCellWalkable(st, g, 5, 4, null);
    r.topWalk = baseCellWalkable(st, g, 3, 3, null);
    // climbing via stairs: spawn → top
    let sess = baseVisitCreate(st);
    r.upPath = baseVisitSetDestination(sess, 3, 3).map((s) => s.x + ',' + s.y);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.atTop = sess.pos; r.sub = sess.subElev;
    // from the top, NO exit through the edges: (5,3) only opens onto
    // the top (4,3) and its stairs (5,4) — never (5,2) north nor (6,3) east.
    r.vois = baseVisitNeighbors(sess, 5, 3, 0).map((n) => n.x + ',' + n.y).sort();
    r.vois2 = baseVisitNeighbors(sess, 2, 3, 0).map((n) => n.x + ',' + n.y).sort();
    // descent possible via the EAST stairs (5,4): top path → southeast floor
    r.downPath = baseVisitSetDestination(sess, 5, 5).map((s) => s.x + ',' + s.y);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.gone = sess.pos;
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.baseBlocked, [false, false], 'solid substructure blocked');
  assert.equal(out.stairW && out.stairE, true, 'BOTH ends\' stairs walkable');
  assert.equal(out.topWalk, true, 'top walkable');
  assert.deepEqual(out.atTop, { x: 3, y: 3 }, 'climbed onto the display stand');
  assert.equal(out.sub, 1, 'subElev = 1 on top (simulated height)');
  // ✋ the canon lock: from the top, only the top and the built-in stairs
  assert.deepEqual(out.vois, ['4,3', '5,4'], 'EAST corner: exit = EAST stairs only');
  assert.deepEqual(out.vois2, ['2,4', '3,3'], 'WEST corner: exit = WEST stairs only');
  assert.ok(out.downPath && out.downPath.length > 0, 'exit via the EAST stairs');
  assert.deepEqual(out.gone, { x: 5, y: 5 }, 'descended to the floor via the stairs');
});

test('phase 44 B2: display stand/slide — even base required (no straddling)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    const L = baseLayoutGet('cave_5');
    const elevAt = (x, y) => {
      const c = L.cells[y] && L.cells[y][x];
      return (c && c.t === 'floor') ? c.elev : null;
    };
    // Pass 48: the rooms are now TWO spaces separated by a
    // full-width cliff — there are no longer any cells of different
    // elevations side by side. The "straddling" case is therefore tested by
    // deliberately targeting the row overlapping the cliff (plateau to the
    // north, floor to the south): the placement must be refused.
    let cliffRow = -1;
    for (let y = 0; y < L.h && cliffRow < 0; y++) {
      for (let x = 0; x < L.w; x++) if (L.cells[y][x].t === 'cliff') { cliffRow = y; break; }
    }
    // We verify that NO 4×2 placement can mix two elevations: with
    // the full-width cliff partition, the "straddling" case does not even
    // exist geometrically — that is the intended result.
    r.anyStraddle = null;
    for (let y = 0; y + 1 < L.h && !r.anyStraddle; y++) {
      for (let x = 0; x + 3 < L.w; x++) {
        const es = [];
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 4; dx++) es.push(elevAt(x + dx, y + dy));
        if (es.some((e) => e === null)) continue;
        if (new Set(es).size > 1) { r.anyStraddle = baseCanPlace(st, 'stand', x, y, 0); break; }
      }
    }
    // the cliff itself never accepts a furniture
    r.onCliff = baseCanPlace(st, 'stand', 4, cliffRow, 0);
    // same-level on the plateau
    for (let x = 1; x + 3 < L.w && !r.onMezz; x++) {
      const es = [];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 4; dx++) es.push(elevAt(x + dx, cliffRow - 2 + dy));
      if (es.every((e) => e === 1)) r.onMezz = baseCanPlace(st, 'stand', x, cliffRow - 2, 0);
    }
    // same-level on the floor: 2×3 slide footprint
    for (let y = cliffRow + 1; y + 2 < L.h && !r.onFloor; y++) {
      for (let x = 1; x + 1 < L.w; x++) {
        const es = [];
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) es.push(elevAt(x + dx, y + dy));
        if (es.some((e) => e !== 0)) continue;
        const c = baseCanPlace(st, 'slide', x, y, 0);
        if (c.ok) { r.onFloor = c; break; }
      }
    }
    return JSON.stringify(r);
  })()`, sb));
  // Phase 48: no more "straddling" configuration possible (two rooms
  // separated by a full-width cliff). If one remains, it MUST be
  // rejected for an uneven base.
  if (out.anyStraddle) {
    assert.equal(out.anyStraddle.ok, false, 'straddling display stand refused');
    assert.equal(out.anyStraddle.reason, 'base.err.uneven', 'reason: even base');
  }
  assert.equal(out.onCliff.ok, false, 'no furniture placed on the cliff');
  assert.equal(out.onMezz.ok, true, 'display stand on the (even) plateau');
  assert.equal(out.onFloor.ok, true, 'slide on the (even) floor');
});

// ——— C — slide: left stairs, forced slide, unclimbable ramp ———
test('phase 44 C: slide — climb via the stairs, forced slide down to the mat', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');  // the auto-placed PC occupies (3,1)
    // pass 45: 2×3 footprint (6 tiles) — the cover is a VISUAL overhang
    // outside the footprint. Placed at (3,2): landing r0 (y2), stairs/ramp r1 (y3),
    // mat r2 (y4); the (3,1)/(4,1) tiles UNDER the cover stay free.
    const put = basePlace(st, 'slide', 3, 2, 0);
    if (!put.ok) return JSON.stringify({ placeFailed: put.reason });
    const r = {};
    const g = baseBuildGrid(st);
    // the floor BEHIND the slide (under the cover) is free — user feedback
    r.behindFree = baseCellWalkable(st, g, 3, 1, null) && baseCellWalkable(st, g, 4, 1, null);
    // pass 46: the ramp is NO LONGER a dead tile — it is walkable
    // (you step on it and slide), but ONE-WAY (cf. r.upRamp below).
    r.rampSurf = baseCellWalkable(st, g, 4, 3, null);
    r.stairs = baseCellWalkable(st, g, 3, 3, null);
    r.mat = baseCellWalkable(st, g, 4, 4, null);
    // climb: mat → stairs → landing → ramp head
    const sess = baseVisitCreate(st);
    r.climb = baseVisitSetDestination(sess, 4, 2).map((s) => s.x + ',' + s.y);
    while (sess.path.length) baseVisitStepAlong(sess);
    // the ramp head TRIGGERED the slide before idling there…
    r.after = sess.pos;
    r.logSlides = sess.log.filter((e) => e.fx === 'slide').length;
    r.subEnd = sess.subElev;
    // concretely: intermediate destination = left landing (3,2) WITHOUT sliding
    const sess2 = baseVisitCreate(st);
    baseVisitSetDestination(sess2, 3, 2);
    while (sess2.path.length) baseVisitStepAlong(sess2);
    r.onLanding = sess2.pos; r.subLand = sess2.subElev;
    r.noSlide = sess2.log.filter((e) => e.fx === 'slide').length;
    // impossible to climb the ramp back: mat (4,4) → ramp (4,3) refused
    r.upRamp = baseVisitSetDestination(sess2, 4, 3);
    return JSON.stringify(r);
  })()`, sb));
  assert.ok(!out.placeFailed, 'slide placement accepted' + (out.placeFailed ? ' (' + out.placeFailed + ')' : ''));
  assert.equal(out.behindFree, true, 'phase 45: the 2 tiles UNDER the body stay free (you pass behind)');
  assert.equal(out.rampSurf, true, 'phase 46: the slide is a usable tile (no more dead tile)');
  assert.equal(out.stairs && out.mat, true, 'stairs + mat crossable');
  const chain = out.climb.join(' ');
  assert.ok(chain.indexOf('3,4 3,3') >= 0, 'approach via the mat then the stairs');
  assert.deepEqual(out.climb.slice(-3), ['3,3', '3,2', '4,2'], 'climb via the left stairs up to the ramp head');
  assert.deepEqual(out.after, { x: 4, y: 4 }, 'ramp head touched → slide to the mat');
  assert.equal(out.logSlides, 1, 'one slide event');
  assert.equal(out.subEnd, 0, 'back down to floor level');
  assert.deepEqual(out.onLanding, { x: 3, y: 2 }, 'landing reachable on foot');
  assert.equal(out.subLand, 1, 'perched on the landing');
  assert.equal(out.noSlide, 0, 'no sliding on the left landing');
  // Phase 50: the slide top is now REACHABLE (via the built-in
  // stairs) — that was the request. So a path to the slide exists,
  // but it necessarily goes through the TOP: it descends, it does not climb.
  {
    const path = out.upRamp || [];
    const iTop = path.findIndex((s2) => s2.y <= 2);
    const iRamp = path.findIndex((s2) => s2.x === 4 && s2.y === 3);
    assert.ok(iRamp < 0 || (iTop >= 0 && iTop < iRamp),
      'the slide is only taken TOP to bottom');
  }
});

// ——— D — layouts: whole plateau reachable during visit (stairs placed) ———
test('phase 44 D: the 12 niches connect 100% of the plateau during visit', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const res = {};
    for (const lid of ['cave_5','cave_6','tree_5','tree_6','bush_5','bush_6','cave_red_5','cave_red_6','cave_blue_5','cave_blue_6','cave_yellow_5','cave_yellow_6']) {
      const st = baseGetState();
      baseDebugCreate(lid);
      st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
      const L = baseLayoutGet(lid);
      // place ONE stairs per anchor pair (all niches)
      const runs = [];
      for (const a of L.stairAnchors) if (!runs.some((r) => Math.abs(r - a.x) <= 1)) runs.push(a.x);
      let n = 0;
      for (const x of runs) { st.stock.stairs = (st.stock.stairs || 0) + 1; if (basePlace(st, 'stairs', x, L.stairAnchors[0].y, 0).ok) n++; }
      // full reach from the spawn
      const from = L.spawn;
      const reach = baseReachableSet(st, baseBuildGrid(st), from.x, from.y);
      let hi = 0, hiOk = 0;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const c = L.cells[y][x];
        if (c.t === 'floor' && c.elev === 1) { hi++; if (reach.has(x + ',' + y)) hiOk++; }
      }
      res[lid] = { stairs: n, runs: runs.length, hi, hiOk };
    }
    return JSON.stringify(res);
  })()`, sb));
  for (const [lid, r] of Object.entries(out)) {
    assert.equal(r.stairs, r.runs, `${lid}: stairs placed in each niche`);
    assert.ok(r.hi >= 10, `${lid}: substantial plateau (${r.hi} tiles)`);
    assert.equal(r.hiOk, r.hi, `${lid} : 100 % du plateau atteignable (${r.hiOk}/${r.hi})`);
  }
});

// ——— F — NPC: placement, refusal on anchor, bounded battle ———————————————
test('phase 44 F: NPC — legal placement, refusal on anchor, bounded battle', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const st = baseGetState();
    baseDebugCreate('cave_5');
    // pass 47: no more roster — NPCs are placed directly, like a furniture.
    const mk = (name) => baseNpcCreate(st, { name, sprite: 'trainer-0',
      team: [{ id: 19, level: 13 }, { id: 21, level: 14 }] });
    const a = mk('PNJ A');
    const b = mk('PNJ B');
    // legal placement on free floor
    const g0 = baseBuildGrid(st);
    let free = null;
    const L = baseLayoutGet('cave_5');
    for (let y = 0; y < L.h && !free; y++) for (let x = 0; x < L.w; x++) {
      const c = baseCellAt(g0, x, y);
      if (c && c.t === 'floor' && !c.stairAnchor && !c.entrance && !c.spawnPt
          && g0.occ[y][x] == null) { free = { x, y }; break; }
    }
    r.place = baseNpcPlace(st, a.id, free.x, free.y);
    // refused on a stairs anchor
    const anch = L.stairAnchors[0];
    r.onAnchor = baseNpcPlace(st, b.id, anch.x, anch.y);
    // interaction → bounded battle (once per visit)
    const sess = baseVisitCreate(st);
    const inter = baseVisitInteract(sess, free.x, free.y);
    r.interType = inter.type;
    r.battle = inter.type === 'npc_battle'
      ? { kind: inter.battle.kind, team: inter.battle.team.length } : null;
    r.again = baseVisitInteract(sess, free.x, free.y).type;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.place.ok, true, 'placement on free floor');
  assert.equal(out.onAnchor.ok, false, 'placement refused on a stairs anchor');
  assert.equal(out.interType, 'npc_battle', 'interaction → bounded duel');
  assert.equal(out.battle.kind, 'base_npc', 'duel base_npc');
  assert.equal(out.battle.team, 2, 'team passed to the duel');
  // Phase 52 (user feedback: "we must be able to battle it as much
  //    as we want"): no more one-battle-per-visit lock. Opening the
  //    dialogue no longer consumes anything either — that was the second bug:
  //    "walking away" still burned the duel.
  assert.equal(out.again, 'npc_battle', 'the NPC stays battleable as many times as wanted');
});



