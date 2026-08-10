// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// Phase has — legacy feature update
// ----------------------------------------------------------------------------
// Pure logic, 100% independent of rendering: the 3D/2.5D layer must not
// These functions operate on G.base state (lazy-init, backwards compatible with older saves).
// compatible with existing saves).
//
// Model:
//   state = { layoutId, items:[{uid,s,x,y,rot}], stock:{slug:n},
//             npcs:[{id,name,sprite,team,msgs,x,y}|placed],
//             npcStock:[...], spawn:{x,y}|null (= entrance), uidSeq,
//             record:{w,l,visits} }
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseItemFootprint(...args) { const f = __pwV43Link('baseItemFootprint'); return f ? f(...args) : undefined; }
function baseItemGet(...args) { const f = __pwV43Link('baseItemGet'); return f ? f(...args) : undefined; }
function baseItemMigrate(...args) { const f = __pwV43Link('baseItemMigrate'); return f ? f(...args) : undefined; }
function baseItemRotCount(...args) { const f = __pwV43Link('baseItemRotCount'); return f ? f(...args) : undefined; }
function baseItemRotNormalize(...args) { const f = __pwV43Link('baseItemRotNormalize'); return f ? f(...args) : undefined; }
function baseLayoutGet(...args) { const f = __pwV43Link('baseLayoutGet'); return f ? f(...args) : undefined; }

const _BASE_DEFAULT_LAYOUT = 'cave_1'; // phase 37: GBA canonical forms

function baseCreateDefault() {
  return {
    layoutId: null,           // null = no base created for the moment
    routeId: null,            // route of Hoenn ou the base is etablie
    items: [],
    stock: {},
    npcs: [],
    npcStock: [],
    spawn: null,
    uidSeq: 1,
    record: { w: 0, l: 0, visits: 0 },
    pcMessage: '',            // message custom of the PC for visitors (flag)
  };
}

// Acces lazy : initializes G.base if absent (old saves).
function baseGetState() {
  if (typeof G === 'undefined' || !G) return null;
  if (!G.base || typeof G.base !== 'object') G.base = baseCreateDefault();
  const st = G.base;
  if (!Array.isArray(st.items)) st.items = [];
  if (!st.stock || typeof st.stock !== 'object') st.stock = {};
  if (!Array.isArray(st.npcs)) st.npcs = [];
  if (!Array.isArray(st.npcStock)) st.npcStock = [];
  if (!st.record) st.record = { w: 0, l: 0, visits: 0 };
  if (typeof st.uidSeq !== 'number') st.uidSeq = 1;
  if (!st._v1) {
    delete st._moveUid; // transitoire editeur (movement in cours) — never persiste
    // re-validation integrale has fois by chargement (old saves / JSON)
    const clean = baseSanitizeState(st);
    for (const k of Object.keys(st)) delete st[k];
    Object.assign(st, clean);
    st._v1 = true;
  }
  return st;
}

// ——— Stock ————————————————————————————————————————————————————————————————
function baseStockCount(st, slug) { return Math.max(0, (st.stock && st.stock[slug]) || 0); }
function baseStockAdd(st, slug, n) {
  if (!baseItemGet(slug) || !n) return 0;
  st.stock[slug] = baseStockCount(st, slug) + n;
  return st.stock[slug];
}
function baseStockRemove(st, slug, n) {
  const have = baseStockCount(st, slug);
  const take = Math.min(have, n || 1);
  if (take <= 0) return 0;
  const left = have - take;
  if (left > 0) st.stock[slug] = left; else delete st.stock[slug];
  return take;
}

// ——— Grid / occupation ———————————————————————————————————————————————————
// Builds the material view: layout cells + occupation by uid.
function baseBuildGrid(st) {
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return null;
  const occ = layout.cells.map((row) => row.map(() => null)); // uid | 'npc:<id>'
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue; // phase 40 : item held a the mouse (movement)
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    for (let dy = 0; dy < fp.d; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const x = it.x + dx, y = it.y + dy;
        if (y >= 0 && y < layout.h && x >= 0 && x < layout.w) occ[y][x] = it.uid;
      }
    }
  }
  for (const n of st.npcs) {
    if (n.x == null || n.y == null || !occ[n.y]) continue;
    const cur = occ[n.y][n.x];
    if (cur == null) { occ[n.y][n.x] = 'npc:' + n.id; continue; }
    // a NPC can stand on a walkable item (rug…): it takes priority.
    if (typeof cur === 'number') {
      const it = basePlacedFind(st, cur);
      if (it && baseItemGet(it.s).walk) occ[n.y][n.x] = 'npc:' + n.id;
    }
  }
  return { layout, occ };
}

function baseCellAt(grid, x, y) { return (grid && grid.layout.cells[y]) ? grid.layout.cells[y][x] : null; }

// CARRIER furniture (floor layer with a surface, e.g. rug/desk) covering
// cell (x,y) — independent of occ, because a "surface" item may be
// placed on top and hide the carrier in the grid.
function baseCarrierAt(st, x, y, ignoreUid) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue; // phase 40: the held item no longer occupies its former cell
    if (ignoreUid != null && it.uid === ignoreUid) continue;
    const d = baseItemGet(it.s);
    if (!d || d.layer !== 'floor' || !d.surf) continue;
    const fp = baseItemFootprint(d, it.rot);
    if (x >= it.x && x < it.x + fp.w && y >= it.y && y < it.y + fp.d) return it;
  }
  return null;
}

// "surface"-layer item covering (x,y) (canonical rule: 1 per cell).
function baseSurfaceAt(st, x, y, ignoreUid) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue;
    if (ignoreUid != null && it.uid === ignoreUid) continue;
    const d = baseItemGet(it.s);
    if (!d || d.layer !== 'surface') continue;
    const fp = baseItemFootprint(d, it.rot);
    if (x >= it.x && x < it.x + fp.w && y >= it.y && y < it.y + fp.d) return it;
  }
  return null;
}

// Placed stairs: is a stairs ANCHORED at (x,y)? The canonical anchor is the
// BOTTOM row of the stairs (stored as its normalized top-left origin).
// Phase 44 (user request): canonical stairs are 2 tiles WIDE — the
// TWO columns hook onto the cliff (the whole width of the footprint).
function baseStairsAt(st, x, y) {
  for (const it of st.items) {
    if (it.s !== 'stairs' || it.uid === st._moveUid) continue;
    const fp = baseItemFootprint(baseItemGet('stairs'), it.rot);
    if (x >= it.x && x < it.x + fp.w && it.y + fp.d - 1 === y) return true;
  }
  return false;
}

// Phase 44 — legacy feature update
// In RSE, the display stand (4×2) and the slide (2×4) simulate a REAL height:
// their top is only reachable through their built-in stairs (display stand:
// stairs at BOTH ends StairsLeft/StairsRight; slide: stairs
// on the left), and you only come down through those stairs — except the slide's
// ramp, which force-slides you all the way to the reception mat.
// Phase 50: the zone of a "top" item covers its entire DRAWN shape, not
// just its floor footprint. The slide is drawn 2×4 but only occupies
// 2×3 on the floor (`over:1`): its TOP row — the housing — is an
// OVERHANG. User feedback: "I still cannot climb the two
// top tiles (6 on the floor, the 2 extra ones up top)".
// So we extend the zone by one row upward, and `dy` becomes relative to
// the DRAWN shape: dy 0 = housing (perched), 1 = landing, 2 = stairs/ramp,
// 3 = mat.
function baseZoneDefAt(st, x, y) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue;
    if (it.s !== 'stand' && it.s !== 'slide') continue;
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    const over = def.over | 0;                 // top rows outside the footprint
    const top = it.y - over;                   // 1st DRAWN row
    const dep = fp.d + over;                   // total drawn height
    if (x < it.x || x >= it.x + fp.w || y < top || y >= top + dep) continue;
    return { it, fp: { w: fp.w, d: dep }, dx: x - it.x, dy: y - top, over };
  }
  return null;
}

// "Top" cell (high zone — perched, no way down except through
// the built-in stairs). Display stand: NORTH row. Slide: landing + head
// of the ramp (the slide-down triggers there).
// Phase 45: the slide has lost its row 0 (housing = VISUAL overhang outside
// the footprint), so all its gameplay rows shift up by 1:
//   dy 0 = landing + ramp head · dy 1 = stairs + ramp · dy 2 = rug.
function baseZoneTopAt(st, x, y) {
  const z = baseZoneDefAt(st, x, y);
  if (!z) return null;
  if (z.it.s === 'stand') return (z.dy === 0) ? z.it : null;
  // Slide (dy relative to the DRAWN shape, cf. baseZoneDefAt):
  //   dy 0 = housing (VISUAL overhang)
  //   dy 1 = landing + ramp head (perched)
  //   dy 2 = stairs (left, on the floor) · slide (right, perched)
  //   dy 3 = reception rug (on the floor)
  if (z.it.s === 'slide') {
    if (z.dy <= 1) return z.it;
    if (z.dx === 1 && z.dy < z.fp.d - 1) return z.it;
  }
  return null;
}

// Built-in stairs cell (walkable, on the floor: links floor ↔ top).
function baseZoneStairAt(st, x, y) {
  const z = baseZoneDefAt(st, x, y);
  if (!z) return null;
  if (z.it.s === 'stand' && z.dy === z.fp.d - 1 && (z.dx === 0 || z.dx === z.fp.w - 1)) return z.it;
  if (z.it.s === 'slide' && z.dy === 2 && z.dx === 0) return z.it;
  return null;
}

// BLOCKED cell inside an otherwise walkable item: the solid base
// between the two display stairs.
// Phase 46 (user feedback "the two top tiles are always
// inaccessible"): the SLIDE no longer has ANY dead cell. Its 6
// footprint cells are all usable — left column = stairs + landing,
// right column = the slide (you step on it and slide down), bottom
// row = the reception rug.
function baseZoneBlockedAt(st, x, y) {
  // Phase 48 — TENTS (user feedback: "you must only be able to walk through
  // the middle of the tents"). RSE canon (DecorGfx_RED_TENT / BLUE_TENT):
  // the 3×3 tent has a single opening, the CENTRAL column (DoorTop +
  // Door); the left and right columns are the canvas
  // (TopLeft/MidLeft/BottomLeft…), uncrossable. We therefore only block
  // the side columns.
  const tent = baseTentAt(st, x, y);
  if (tent) return tent.dx !== 1;

  const z = baseZoneDefAt(st, x, y);
  if (!z) return false;
  if (z.it.s === 'stand') return z.dy === z.fp.d - 1 && z.dx > 0 && z.dx < z.fp.w - 1;
  return false;
}

// Tent cell (3×3, walkable per canon) + relative position.
function baseTentAt(st, x, y) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue;
    if (it.s !== 'red_tent' && it.s !== 'blue_tent') continue;
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    if (x < it.x || x >= it.x + fp.w || y < it.y || y >= it.y + fp.d) continue;
    return { it, fp, dx: x - it.x, dy: y - it.y };
  }
  return null;
}

// The slide's ramp: stepping on it = slide straight down to the rug (canon).
// Phase 46: the whole right column above the rug triggers the slide
// (ramp head dy 0 and ramp body dy 1) — before, the ramp body was
// "blocked", which left one cell permanently unreachable.
function baseSlideRampAt(st, x, y) {
  const z = baseZoneDefAt(st, x, y);
  if (!z || z.it.s !== 'slide') return null;
  // Right column, anywhere above the rug: stepping on it = slide
  return (z.dx === 1 && z.dy >= 1 && z.dy < z.fp.d - 1) ? z.it : null;
}

// Is a top↔floor transition allowed? Canon: you only climb on/off a
// display or a slide via its built-in stairs — never by jumping the edges.
// Phase 46: the slide SLIDE-DOWN is ONE-WAY. You may only enter it from
// the top (from the landing or by going down the slide); climbing onto it
// from the rug or reaching it sideways from the stairs is impossible.
function baseZoneGateOK(st, x, y, nx, ny) {
  const ramp = (typeof baseSlideRampAt === 'function') ? baseSlideRampAt(st, nx, ny) : null;
  if (ramp) {
    const from = baseZoneDefAt(st, x, y);
    // Phase 50: the slide is only approached from the top of the slide —
    // the housing (dy 0) or the landing (dy 1) of the same item — and
    // never by climbing back from the rug. The descent stays one-way.
    if (!from || from.it.uid !== ramp.uid) return false;
    // You only enter the slide from the TOP of the slide (housing dy 0 or
    // landing dy 1). Any other origin — including the rug right below —
    // is refused: the descent stays strictly one-way.
    return from.dy <= 1 && ny >= y;
  }
  const aTop = baseZoneTopAt(st, x, y);
  const bTop = baseZoneTopAt(st, nx, ny);
  if (aTop && bTop) return aTop.uid === bTop.uid; // top↔top: same item
  if (!aTop && !bTop) return true;                // floor↔floor: free
  const top = aTop || bTop;
  const stairAt = aTop ? baseZoneStairAt(st, nx, ny) : baseZoneStairAt(st, x, y);
  return !!(stairAt && stairAt.uid === top.uid);  // only via the integrated stairs
}

// Cell walkable on foot at the given elevation (cross-elevation moves are
// only allowed via the stairs: handled by baseVisitStep on the visit side).
function baseCellWalkable(st, grid, x, y, elev) {
  const cell = baseCellAt(grid, x, y);
  if (!cell) return false;

  // Phase 53 (user feedback: "if the tile behind the two
  // top tiles of the slide is a wall, you can no longer climb on top").
  // Root cause: the slide HOUSING is an overhang — it is drawn
  // above its footprint and therefore occupies no floor tile. Yet you walk
  // on it: it is the item's ROOF. We used to test the ground of the tile
  // below it; backed against the back wall — the most natural placement —
  // this terrain is a wall (or a hole), and the tile was refused. The top
  // of the slide became unreachable in 40 placements out of 214.
  // When standing on TOP of a perched item, the terrain underneath does
  // not matter: only the item's rules count (baseZoneGateOK always
  // forbids climbing on it other than via the built-in stairs).
  if (typeof baseZoneTopAt === 'function' && baseZoneTopAt(st, x, y)) {
    if (typeof baseZoneBlockedAt === 'function' && baseZoneBlockedAt(st, x, y)) return false;
    const uidTop = grid.occ[y] && grid.occ[y][x];
    if (typeof uidTop === 'string') return false;   // an NPC blocks its cell
    return true;
  }

  if (cell.t === 'floor') {
    if (elev != null && cell.elev !== elev) return false;
  } else if (cell.t === 'hole') {
    // walkable only when a board covers it
    const uid = grid.occ[y][x];
    const it = uid ? basePlacedFind(st, uid) : null;
    if (!it || baseItemGet(it.s).fx !== 'board') return false;
    if (elev != null && elev !== 0) return false;
  } else {
    return false;
  }
  const uid = grid.occ[y][x];
  if (uid == null) return true;
  if (typeof uid === 'string') return false; // an NPC blocks its cell
  const it = basePlacedFind(st, uid);
  if (!it) return true;
  const def = baseItemGet(it.s);
  if (!def.walk) return false;
  // Phase 44: cell blocked INSIDE a walkable item (display base,
  // slide housing/ramp)
  return !baseZoneBlockedAt(st, x, y);
}

function basePlacedFind(st, uid) {
  for (const it of st.items) if (it.uid === uid) return it;
  return null;
}

// BFS over walkable cells (free elevation: edition validation) —
// returns the set of "x,y" cells reachable from (sx,sy).
function baseReachableSet(st, grid, sx, sy) {
  const seen = new Set();
  if (!baseCellWalkable(st, grid, sx, sy, null)) return seen;
  const q = [[sx, sy]];
  seen.add(sx + ',' + sy);
  while (q.length) {
    const [cx, cy] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
      let walkable = baseCellWalkable(st, grid, nx, ny, null);
      // Stairs: a cliff becomes walkable if stairs are anchored there
      // (otherwise the high spawn would make every placement "blocking").
      if (!walkable) {
        const c = baseCellAt(grid, nx, ny);
        if (c && c.t === 'cliff') {
          const below = baseCellAt(grid, nx, ny + 1);
          walkable = !!(below && below.stairAnchor && baseStairsAt(st, nx, ny + 1));
        }
      }
      // Phase 44: item heights — you do not cross the edges of an
      // display/slide that by its stairs integre (canonical).
      if (walkable && !baseZoneGateOK(st, cx, cy, nx, ny)) walkable = false;
      if (seen.has(k) || !walkable) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

// HYPOTHETICAL state: copy of st with one extra placement (validation).
function baseWithPlaced(st, placed) {
  const copy = { ...st, items: st.items.concat([placed]), npcs: st.npcs, itemShallow: true };
  return copy;
}

// —────────────────────────────────────────────────────────────────────────
// → {ok:true} | {ok:false, reason:<i18n key base.err.*>}
function baseCanPlace(st, slug, x, y, rot, opts) {
  const def = baseItemGet(slug);
  if (!def) return { ok: false, reason: 'base.err.unknown' };
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return { ok: false, reason: 'base.err.no_base' };
  rot = baseItemRotNormalize(def, rot || 0);
  const fp = baseItemFootprint(def, rot);
  const ignoreUid = (opts && opts.ignoreUid) || null;
  const grid = baseBuildGrid(st);
  // ignoreUid: the tile of the item being re-validated (rotation) is free.
  if (ignoreUid != null) {
    for (let yy = 0; yy < grid.occ.length; yy++) {
      for (let xx = 0; xx < grid.occ[yy].length; xx++) {
        if (grid.occ[yy][xx] === ignoreUid) grid.occ[yy][xx] = null;
      }
    }
  }
  opts = opts || {};

  // Effective origin (top-left corner of the footprint) — stairs are
  // placed by their ANCHOR (canonical bottom row) then normalized.
  let px = x, py = y;

  // Special case: stairs -> only on a layout anchor; they
  // cover the cliff to the north (floor/cliff cells, never occupied).
  if (def.fx === 'stairs') {
    let ay = y;
    const c0 = baseCellAt(grid, x, ay);
    if (!(c0 && c0.stairAnchor)) {
      // Idempotence: we also accept the already-normalized origin of a
      // placed item (re-validation during an import / load).
      const c1 = baseCellAt(grid, x, y + fp.d - 1);
      if (c1 && c1.stairAnchor) ay = y + fp.d - 1;
      else return { ok: false, reason: 'base.err.stairs_anchor' };
    }
    py = ay - (fp.d - 1);
    // Phase 44 (canonical, user request): the anchors come in pairs
    // and the stairs have ONE single position in their niche — clicking
    // either anchor of the pair aligns the placed item at its start.
    {
      let start = px;
      while (start > 0 && baseCellAt(grid, start - 1, ay) && baseCellAt(grid, start - 1, ay).stairAnchor) start--;
      let run = true;
      for (let dx = 0; dx < fp.w; dx++) {
        const c = baseCellAt(grid, start + dx, ay);
        if (!(c && c.stairAnchor)) { run = false; break; }
      }
      if (run) px = start;
    }
    // BOTH columns of the stairs must land on an anchor.
    for (let dx = 0; dx < fp.w; dx++) {
      const ca = baseCellAt(grid, px + dx, ay);
      if (!(ca && ca.stairAnchor)) return { ok: false, reason: 'base.err.stairs_anchor' };
    }
    for (let dy = 0; dy < fp.d; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const cx = px + dx, cy = py + dy;
        const cell = baseCellAt(grid, cx, cy);
        if (!cell) return { ok: false, reason: 'base.err.out_of_bounds' };
        if (cell.t !== 'floor' && cell.t !== 'cliff') return { ok: false, reason: 'base.err.floor_only' };
        if (cell.entrance) return { ok: false, reason: 'base.err.entrance' };
        if (grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
      }
    }
  // Phase 42 — legacy feature update
  // placeable ANYWHERE — it fills a hole (its primary purpose) or
  // on bare floor (decorative path, play area for dolls). Rules
  // kept: each tile must be floor|hole, free, outside entrance/spawn.
  } else if (def.fx === 'board') {
    for (let dy = 0; dy < fp.d; dy++) {
      const c = baseCellAt(grid, x, y + dy);
      if (!c) return { ok: false, reason: 'base.err.out_of_bounds' };
      if (c.entrance || c.spawnPt) return { ok: false, reason: 'base.err.entrance' };
      if (c.t !== 'hole' && c.t !== 'floor') return { ok: false, reason: 'base.err.floor_only' };
      if (grid.occ[y + dy][x] != null) return { ok: false, reason: 'base.err.occupied' };
    }
  } else {
    // Footprint within bounds + layer rules.
    for (let dy = 0; dy < fp.d; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const cx = px + dx, cy = py + dy;
        const cell = baseCellAt(grid, cx, cy);
        if (!cell) return { ok: false, reason: 'base.err.out_of_bounds' };
        if (def.layer === 'wall') {
          if (cell.t !== 'wall' && cell.t !== 'cliff') return { ok: false, reason: 'base.err.wall_only' };
          if (grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
        } else if (def.layer === 'surface') {
          // Phase 39 (user decision): dolls/cushions can also be placed
          // on the floor, not only on a carrier. Rules: 1 "surface"
          // item per cell (carrier or floor), entrance/forbidden cells preserved.
          if (cell.t !== 'floor') return { ok: false, reason: 'base.err.surface_only' };
          if (cell.entrance || cell.spawnPt) return { ok: false, reason: 'base.err.entrance' };
          if (baseSurfaceAt(st, cx, cy, ignoreUid)) return { ok: false, reason: 'base.err.surface_taken' };
          const carrier = baseCarrierAt(st, cx, cy, ignoreUid);
          if (!carrier && grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
        } else { // floor
          if (cell.t !== 'floor') return { ok: false, reason: 'base.err.floor_only' };
          if (cell.stairAnchor) return { ok: false, reason: 'base.err.stairs_anchor' };
          if (cell.entrance) return { ok: false, reason: 'base.err.entrance' };
          if (cell.spawnPt) return { ok: false, reason: 'base.err.entrance' }; // phase 37: arrival point (metatile 544), not decorable
          if (grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
        }
      }
    }
    // Phase 44 (RSE canon): display and slide require a LEVEL platform —
    // their built-in stairs cannot be placed straddling the cliff.
    if (slug === 'stand' || slug === 'slide') {
      let elevRef = null;
      for (let dy = 0; dy < fp.d; dy++) {
        for (let dx = 0; dx < fp.w; dx++) {
          const cc = baseCellAt(grid, px + dx, py + dy);
          const e = (cc && cc.elev) || 0;
          if (elevRef == null) elevRef = e;
          else if (e !== elevRef) return { ok: false, reason: 'base.err.uneven' };
        }
      }
    }
    // Canonical: a wall item only hooks onto a VISIBLE FACE — north wall or
    // cliff face (Phase 42 — legacy feature update), with walkable floor
    // directly south of each footprint column. Never on side/south walls.
    if (def.layer === 'wall') {
      for (let dx = 0; dx < fp.w; dx++) {
        const c = baseCellAt(grid, px + dx, py);
        const s = baseCellAt(grid, px + dx, py + fp.d);
        if (!c || (c.t !== 'wall' && c.t !== 'cliff')) return { ok: false, reason: 'base.err.wall_only' };
        if (!s || s.t !== 'floor') return { ok: false, reason: 'base.err.wall_only' };
      }
    }
  }

  // Limit canonical : 26 items poses (outside rug of bienvenue automatique).
  const placedCount = st.items.filter((i) => baseItemGet(i.s) && baseItemGet(i.s).acq !== 'auto').length;
  if (def.acq !== 'auto' && placedCount >= BASE_ITEM_MAX_PLACED) return { ok: false, reason: 'base.err.max_placed' };

  // Anti-blocking: the entrance must always reach the spawn, the PC and each NPC.
  const hypo = baseWithPlaced(st, { uid: -1, s: slug, x: px, y: py, rot });
  const grid2 = baseBuildGrid(hypo);
  if (def.layer !== 'wall') {
    const sp = st.spawn || layout.spawn;
    const reach = baseReachableSet(hypo, grid2, layout.spawn.x, layout.spawn.y);
    if (sp && !reach.has(sp.x + ',' + sp.y)) return { ok: false, reason: 'base.err.blocks_spawn' };
    for (const n of hypo.npcs) {
      if (n.x == null) continue;
      let okAdj = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (reach.has((n.x + dx) + ',' + (n.y + dy))) { okAdj = true; break; }
      }
      if (!okAdj) return { ok: false, reason: 'base.err.blocks_npc' };
    }
    // verifies that the PC remains accessible same when on placed other chose that the PC
    const pcIt = hypo.items.find(i => i.s === 'pc');
    if (pcIt) {
      let pcAdj = false;
      const pcDef = baseItemGet('pc');
      const pcFp = pcDef ? baseItemFootprint(pcDef, pcIt.rot) : { w: 1, d: 1 };
      for (let dy = -1; dy <= pcFp.d && !pcAdj; dy++) {
        for (let dx = -1; dx <= pcFp.w && !pcAdj; dx++) {
          if (dx >= 0 && dx < pcFp.w && dy >= 0 && dy < pcFp.d) continue;
          if (reach.has((pcIt.x + dx) + ',' + (pcIt.y + dy))) pcAdj = true;
        }
      }
      if (!pcAdj) return { ok: false, reason: 'base.err.pc_unreachable' };
    }
    // Old PC-specific check (kept for placing the PC itself, redundant but explicit)
    if (slug === 'pc') {
      let adj = false;
      for (let dy = -1; dy <= fp.d && !adj; dy++) {
        for (let dx = -1; dx <= fp.w && !adj; dx++) {
          if (dx >= 0 && dx < fp.w && dy >= 0 && dy < fp.d) continue;
          if (reach.has((px + dx) + ',' + (py + dy))) adj = true;
        }
      }
      if (!adj) return { ok: false, reason: 'base.err.pc_unreachable' };
    }
  }
  // Phase 40: a item automatique is unique by base (not of 2e PC placed).
  if (def.acq === 'auto' && ignoreUid == null && st.items.some((i) => i.s === slug && i.uid !== st._moveUid)) {
    return { ok: false, reason: 'base.err.already_placed' };
  }
  return { ok: true, rot, x: px, y: py };
}

// ——— Placed / ramassage / rotation ———————————————————————————————————————————
function basePlace(st, slug, x, y, rot, opts) {
  opts = opts || {};
  if (!opts.free && baseStockCount(st, slug) <= 0) return { ok: false, reason: 'base.err.not_in_stock' };
  const chk = baseCanPlace(st, slug, x, y, rot, opts);
  if (!chk.ok) return chk;
  if (!opts.free) baseStockRemove(st, slug, 1);
  const placed = { uid: st.uidSeq++, s: slug, x: chk.x, y: chk.y, rot: chk.rot };
  st.items.push(placed);
  return { ok: true, uid: placed.uid };
}

// Ramasse a item (and recursivement this which is placed top) → return stock.
function basePickup(st, uid) {
  const idx = st.items.findIndex((i) => i.uid === uid);
  if (idx < 0) return 0;
  // Phase 40: the items automatiques (rug of bienvenue, PC) are of the
  // elements FIXES of the base — deplacables (editeur), never ranges nor jetes.
  const d0 = baseItemGet(st.items[idx].s);
  if (d0 && d0.acq === 'auto') return 0;
  const def = baseItemGet(st.items[idx].s);
  let back = 0;
  if (def && def.acq !== 'auto') { baseStockAdd(st, st.items[idx].s, 1); back++; }
  const carrierCells = [];
  const fp = def ? baseItemFootprint(def, st.items[idx].rot) : null;
  if (fp) for (let dy = 0; dy < fp.d; dy++) for (let dx = 0; dx < fp.w; dx++) carrierCells.push([st.items[idx].x + dx, st.items[idx].y + dy]);
  st.items.splice(idx, 1);
  // "Surface" items that were resting on it and are no longer valid:
  // they go back to stock (phase 39 — validated with ignoreUid so each
  // item does not block itself during re-validation).
  if (carrierCells.length) {
    const snapshot = st.items.slice();
    const orphans = snapshot.filter((it) => {
      if (st.items.indexOf(it) < 0) return false; // already removed
      const d2 = baseItemGet(it.s);
      if (!d2 || d2.layer !== 'surface') return false;
      const chk = baseCanPlace(st, it.s, it.x, it.y, it.rot, { free: true, ignoreUid: it.uid });
      return !chk.ok;
    });
    for (const o of orphans) back += basePickup(st, o.uid);
  }
  return back;
}

function baseRotate(st, uid, dir) {
  const it = basePlacedFind(st, uid);
  if (!it) return { ok: false, reason: 'base.err.unknown' };
  const def = baseItemGet(it.s);
  const n = baseItemRotCount(def);
  if (n <= 1) return { ok: false, reason: 'base.err.not_rotatable' };
  const next = baseItemRotNormalize(def, it.rot + (dir || 1));
  const chk = baseCanPlace(st, it.s, it.x, it.y, next, { free: true, ignoreUid: uid });
  if (!chk.ok) return chk;
  it.rot = next;
  // The carrier may have rotated under its "surface" items: unsupported
  // leftovers go back to stock (phase 39).
  for (const o of st.items.slice()) {
    const d2 = baseItemGet(o.s);
    if (!d2 || d2.layer !== 'surface') continue;
    const re = baseCanPlace(st, o.s, o.x, o.y, o.rot, { free: true, ignoreUid: o.uid });
    if (!re.ok) basePickup(st, o.uid);
  }
  return { ok: true, rot: next };
}

// "Put everything away": returns all items (except automatic ones) to stock.
function baseClearAll(st) {
  let n = 0;
  for (const it of st.items.slice()) n += basePickup(st, it.uid);
  return n;
}

// First free cell for the automatic PC: SCAN from the arrival
// (reading order top-left → bottom-right), undecorated floor reachable
// on foot from the entrance/exit by construction (parity on a nearly
// empty grid — welcome mat already placed). Fallback: the mat cell.
function basePcSpot(layout, st) {
  const g = baseBuildGrid(st);
  // Phase 44: two passes. The automatic PC prefers the GROUND FLOOR —
  // on a mezzanine it would be unreachable while the stairs are not
  // placed (the PC must serve right from the arrival). Fallback: any free cell.
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < layout.h; y++) {
      for (let x = 0; x < layout.w; x++) {
        const c = layout.cells[y][x];
        if (!c || c.t !== 'floor' || c.entrance || c.spawnPt || c.stairAnchor) continue;
        if (pass === 0 && (c.elev || 0) !== 0) continue; // pass 0: ground floor only
        if (g.occ[y][x] != null) continue;
        return { x, y };
      }
    }
  }
  return null;
}

// —────────────────────────────────────────────────────────────────────────
function baseRelocate(st, newLayoutId) {
  if (!baseLayoutGet(newLayoutId)) return { ok: false, reason: 'base.err.unknown' };
  baseClearAll(st);
  // Requested fix: no NPC stock backup, which blocked the creator —
  // everything is emptied on relocation
  st.npcs = [];
  st.npcStock = [];
  st.layoutId = newLayoutId;
  st.spawn = null;
  // Canonical AUTOMATIC item: the PC (present in every base) is reposited
  // in the new layout, never lost (basePickup spares it, baseClearAll
  // ignores it). The spawn marker follows the layout's 'S' marker —
  // the player appears in front of the door (phase 43).
  const lay2 = baseLayoutGet(newLayoutId);
  const pc = st.items.find((i) => i.s === 'pc');
  const pspot = basePcSpot(lay2, st);
  if (pspot) {
    if (!pc) st.items.push({ uid: st.uidSeq++, s: 'pc', x: pspot.x, y: pspot.y, rot: 0 });
    else { pc.x = pspot.x; pc.y = pspot.y; pc.rot = 0; }
  }
  return { ok: true };
}

// Initial creation (explicit alias).
function baseCreate(st, layoutId) { return baseRelocate(st, layoutId); }

// ——— "Secret buddy" NPCs ———————————————————————————————————————————————
// team = [{id,level,moves:[..],talent,shiny}] (self-contained snapshot —
// never a live reference to the team, so the export stays self-sufficient).
let baseNpcSeq = 1;
function baseNpcAdd(st, def) {
  // Phase 47: allowEmpty → NPC placed but not configured yet (empty team)
  if (!def || !Array.isArray(def.team) || (!def.team.length && !def.allowEmpty)) {
    return { ok: false, reason: 'base.err.npc_team' };
  }
  const npc = {
    id: 'n' + (baseNpcSeq++) + '_' + Date.now().toString(36),
    name: String(def.name || '').slice(0, 18) || 'Copain',
    sprite: String(def.sprite || 'youngster'),
    team: def.team.slice(0, 6).map((p) => ({
      id: p.id | 0, level: Math.min(100, Math.max(1, p.level | 0)),
      moves: Array.isArray(p.moves) ? p.moves.slice(0, 4) : [],
      talent: p.talent || null, shiny: !!p.shiny,
    })),
    msgs: {
      pre: String((def.msgs && def.msgs.pre) || '').slice(0, 80),
      win: String((def.msgs && def.msgs.win) || '').slice(0, 80),
      lose: String((def.msgs && def.msgs.lose) || '').slice(0, 80),
    },
    x: null, y: null,
  };
  st.npcStock.push(npc);
  return { ok: true, id: npc.id };
}

function baseNpcPlace(st, npcId, x, y) {
  const i = st.npcStock.findIndex((n) => n.id === npcId);
  if (i < 0) return { ok: false, reason: 'base.err.unknown' };
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return { ok: false, reason: 'base.err.no_base' };
  const grid = baseBuildGrid(st);
  const cell = baseCellAt(grid, x, y);
  // Occupied = non-walkable occupant; a NPC may stand on a rug.
  // Phase 44: never on a stair anchor (it must stay crossable)
  // nor on a BLOCKED cell of a walkable item (display base,
  // slide housing/ramp).
  let free = false;
  if (cell && cell.t === 'floor' && !cell.stairAnchor) {
    const cur = grid.occ[y][x];
    if (cur == null) free = true;
    else if (typeof cur === 'number') free = baseCellWalkable(st, grid, x, y, null);
  }
  if (!free) return { ok: false, reason: 'base.err.occupied' };

  // —────────────────────────────────────────────────────────────────────────
  // Build the hypothetical state with the NPC placed and verify that:
  //  - the PC remains accessible (adjacence)
  //  - each EXISTING NPC stays reachable (the new one may be on a not-yet-connected mezzanine, allow it)
  //  - the spawn remains atteignable
  const npcSrc = st.npcStock[i];
  const npcHypo = { ...npcSrc, x, y };
  const hypo = {
    ...st,
    items: st.items,
    npcs: st.npcs.concat([npcHypo]),
  };
  const grid2 = baseBuildGrid(hypo);
  const reach = baseReachableSet(hypo, grid2, layout.spawn.x, layout.spawn.y);
  const sp = st.spawn || layout.spawn;
  if (sp && !reach.has(sp.x + ',' + sp.y)) return { ok: false, reason: 'base.err.blocks_spawn' };
  // PC must stay reachable
  const pcIt = hypo.items.find(it => it.s === 'pc');
  if (pcIt) {
    let pcAdj = false;
    const pcDef = baseItemGet('pc');
    const pcFp = pcDef ? baseItemFootprint(pcDef, pcIt.rot) : { w:1, d:1 };
    for (let dy=-1; dy<=pcFp.d && !pcAdj; dy++) {
      for (let dx=-1; dx<=pcFp.w && !pcAdj; dx++) {
        if (dx>=0 && dx<pcFp.w && dy>=0 && dy<pcFp.d) continue;
        if (reach.has((pcIt.x+dx)+','+(pcIt.y+dy))) pcAdj = true;
      }
    }
    if (!pcAdj) return { ok: false, reason: 'base.err.pc_unreachable' };
  }
  // existing NPCs must remain approachable (the new one may be on a mezzanine)
  for (const n of st.npcs) {
    if (n.x == null) continue;
    let okAdj = false;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (reach.has((n.x+dx)+','+(n.y+dy))) { okAdj = true; break; }
    }
    if (!okAdj) return { ok: false, reason: 'base.err.blocks_npc' };
  }

  const npc = st.npcStock.splice(i, 1)[0];
  npc.x = x; npc.y = y;
  st.npcs.push(npc);
  return { ok: true };
}

function baseNpcPickup(st, npcId) {
  const i = st.npcs.findIndex((n) => n.id === npcId);
  if (i < 0) return false;
  const npc = st.npcs.splice(i, 1)[0];
  npc.x = null; npc.y = null;
  st.npcStock.push(npc);
  return true;
}

// Phase 45 — bounded buddy count:
// NPC cap per base (RSE allows few; we stay generous but bounded,
// as the JSON export must stay light for file visits).
export const BASE_NPC_MAX = 8;

// Phase 47 — true trainer portraits (user feedback: "the procedural
// sprites are ugly, use the assets in images/trainers/profil"):
// these are the TRUE trainer portraits already shipped with the game (101
// trainer-N.png files). We expose a varied selection; the identity
// key is the file name, which makes rendering direct and bake-free.
export const BASE_NPC_SPRITES = [
  'trainer-0','trainer-1','trainer-2','trainer-3','trainer-4','trainer-5','trainer-6','trainer-7','trainer-8','trainer-9',
  'trainer-10','trainer-11','trainer-12','trainer-13','trainer-14','trainer-15','trainer-16','trainer-17','trainer-18','trainer-19',
  'trainer-20','trainer-21','trainer-22','trainer-23','trainer-24','trainer-25','trainer-26','trainer-27','trainer-28','trainer-29',
  'trainer-30','trainer-31','trainer-32','trainer-33','trainer-34','trainer-35','trainer-36','trainer-37','trainer-38','trainer-39',
  'trainer-40','trainer-41','trainer-42','trainer-43','trainer-44','trainer-45','trainer-46','trainer-47','trainer-48','trainer-49',
  'trainer-50','trainer-51','trainer-52','trainer-53','trainer-54','trainer-55','trainer-56','trainer-57','trainer-58','trainer-59',
  'trainer-60','trainer-61','trainer-62','trainer-63','trainer-64','trainer-65','trainer-66','trainer-67','trainer-68','trainer-69',
  'trainer-70','trainer-71','trainer-72','trainer-73','trainer-74','trainer-75','trainer-76','trainer-77','trainer-78','trainer-79',
  'trainer-80','trainer-81','trainer-82','trainer-83','trainer-84','trainer-85','trainer-86','trainer-87','trainer-88','trainer-89',
  'trainer-90','trainer-91','trainer-92','trainer-93','trainer-94','trainer-95','trainer-96','trainer-97','trainer-98','trainer-99',
  'trainer-100',
];
export const BASE_NPC_SPRITE_DEFAULT = 'trainer-0';
// Portrait path for a look (identical on the render side and the UI side).
function baseNpcSpriteUrl(sprite) {
  const s = (BASE_NPC_SPRITES.indexOf(sprite) >= 0) ? sprite : BASE_NPC_SPRITE_DEFAULT;
  return 'src/assets/images/trainers/profil/' + s + '.png';
}

function baseNpcFind(st, npcId) {
  return (st.npcs || []).find((n) => n.id === npcId)
      || (st.npcStock || []).find((n) => n.id === npcId)
      || null;
}

function baseNpcCount(st) {
  // Requested fix: only count placed NPCs; stock is empty at load
  // to avoid the invisible pool that blocked the creator (x0)
  return ((st.npcs || []).length);
}

// Normalizes a player-entered team → FROZEN SNAPSHOT.
// (Validated product choice: never a live reference to a preset,
// otherwise exporting the base to another player would be incoherent.)
function baseNpcNormalizeTeam(team) {
  if (!Array.isArray(team)) return [];
  const out = [];
  for (const p of team.slice(0, 6)) {
    const id = (p && p.id) | 0;
    if (id < 1) continue;
    out.push({
      id,
      level: Math.min(100, Math.max(1, (p && p.level) | 0 || 5)),
      moves: Array.isArray(p && p.moves) ? p.moves.map((m) => (m && m.id) || m).filter(Boolean).slice(0, 4) : [],
      talent: (p && p.talent) || null,
      shiny: !!(p && p.shiny),
      // Phase 47: NPC held item (copy, never removed from the inventory)
      item: (p && (p.item || p.heldItem)) || null,
    });
  }
  return out;
}

// "Editor" creation: same guards as baseNpcAdd + cap + valid sprite.
// → {ok:true,id} | {ok:false, reason:<i18n key>}
function baseNpcCreate(st, def) {
  if (!st) return { ok: false, reason: 'base.err.no_base' };
  if (baseNpcCount(st) >= BASE_NPC_MAX) return { ok: false, reason: 'base.err.npc_max' };
  const team = baseNpcNormalizeTeam(def && def.team);
  const sprite = BASE_NPC_SPRITES.includes(def && def.sprite) ? def.sprite : BASE_NPC_SPRITE_DEFAULT;
  // Phase 47: a FRESHLY PLACED NPC may have an empty team — it is
  // decoration until the player configures it ("Edit" button). Only
  // the battle requires a team (baseVisitInteract checks it).
  return baseNpcAdd(st, { name: (def && def.name) || '', sprite, team, msgs: (def && def.msgs) || {}, allowEmpty: true });
}

// Phase 47 — DIRECT PLACEMENT of an NPC, like any furniture (user
// feedback: "I don't want an NPC pool, just an NPC item that you place in
// the base"). Creates the NPC and places it in a single operation.
function baseNpcPlaceNew(st, x, y, def) {
  const res = baseNpcCreate(st, def || {});
  if (!res.ok) return res;
  const put = baseNpcPlace(st, res.id, x, y);
  if (!put.ok) { baseNpcDelete(st, res.id); return put; }
  return { ok: true, id: res.id };
}

// Editing an existing NPC (placed or pooled) — optional fields.
function baseNpcUpdate(st, npcId, patch) {
  const npc = baseNpcFind(st, npcId);
  if (!npc) return { ok: false, reason: 'base.err.unknown' };
  if (!patch) return { ok: true };
  if (patch.name != null) npc.name = String(patch.name).slice(0, 18) || npc.name;
  if (patch.sprite != null && BASE_NPC_SPRITES.includes(patch.sprite)) npc.sprite = patch.sprite;
  if (patch.team != null) {
    npc.team = baseNpcNormalizeTeam(patch.team);
    npc.rosterKey = null;  // team edited by hand
  }
  if (patch.msgs) {
    npc.msgs = {
      pre: String(patch.msgs.pre != null ? patch.msgs.pre : npc.msgs.pre || '').slice(0, 80),
      win: String(patch.msgs.win != null ? patch.msgs.win : npc.msgs.win || '').slice(0, 80),
      lose: String(patch.msgs.lose != null ? patch.msgs.lose : npc.msgs.lose || '').slice(0, 80),
    };
  }
  return { ok: true };
}

// Definitive deletion (removed from the room and from the pool).
function baseNpcDelete(st, npcId) {
  const a = (st.npcs || []).findIndex((n) => n.id === npcId);
  if (a >= 0) { st.npcs.splice(a, 1); return true; }
  const b = (st.npcStock || []).findIndex((n) => n.id === npcId);
  if (b >= 0) { st.npcStock.splice(b, 1); return true; }
  return false;
}

// Team snapshot from a preset (or the active team) — the "same as team
// presets" path requested by the user. Returns a FROZEN
// {id,level,moves,talent,shiny} array, ready for baseNpcCreate/baseNpcUpdate.
function baseNpcTeamFromPreset(presetKey) {
  const G_ = (typeof G !== 'undefined') ? G : null;
  if (!G_) return [];
  let mons = [];
  if (!presetKey || presetKey === 'active') {
    mons = Array.isArray(G_.team) ? G_.team.filter(Boolean) : [];
  } else {
    const preset = G_.teamPresets && G_.teamPresets[presetKey];
    const uids = (preset && Array.isArray(preset.uids)) ? preset.uids : [];
    for (const uid of uids) {
      const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
      if (found && found.p) mons.push(found.p);
    }
  }
  return baseNpcNormalizeTeam(mons.slice(0, 6).map((p) => ({
    id: p.id, level: p.level,
    moves: (Array.isArray(p.moves) ? p.moves : []).map((m) => (m && m.id) || m).filter(Boolean),
    talent: p.talent || null, shiny: !!(p.shiny || p.shinyActive),
  })));
}

// —────────────────────────────────────────────────────────────────────────
function baseSanitizeState(st) {
  if (!st || typeof st !== 'object') return baseCreateDefault();
  const clean = baseCreateDefault();
  clean.layoutId = baseLayoutGet(st.layoutId) ? st.layoutId : null;
  clean.routeId = (typeof st.routeId === 'string' && st.routeId) ? st.routeId : null;
  // Phase 42: migration to the canonical RSE catalogue (renames mapped via
  // baseItemMigrate; items outside the art direction are dropped — renames
  // go through, ORAS-only items disappear cleanly).
  for (const k of Object.keys(st.stock || {})) {
    const mk = typeof __pwV43Link('baseItemMigrate') === 'function' ? baseItemMigrate(k) : (baseItemGet(k) ? k : null);
    if (!mk) continue;
    clean.stock[mk] = Math.min(99, (clean.stock[mk] | 0) + Math.max(0, st.stock[k] | 0));
    if (!clean.stock[mk]) delete clean.stock[mk];
  }
  for (const it of (Array.isArray(st.items) ? st.items : [])) {
    const ms = typeof __pwV43Link('baseItemMigrate') === 'function' ? baseItemMigrate(it.s) : (baseItemGet(it.s) ? it.s : null);
    if (!ms) continue;
    const chk = baseCanPlace(clean, ms, it.x | 0, it.y | 0, 0, { free: true });
    if (chk.ok) {
      clean.items.push({ uid: clean.uidSeq++, s: ms, x: chk.x, y: chk.y, rot: 0 });
    }
  }
  for (const n of (Array.isArray(st.npcs) ? st.npcs : [])) {
    // Fix: allow NPCs with an empty team (decor) – do not delete them at sanitization
    if (!Array.isArray(n.team)) n.team = [];
    if (n.x == null || !baseCellWalkable(clean, baseBuildGrid(clean), n.x, n.y, null)) { n.x = null; n.y = null; clean.npcs.push(n); }
    else clean.npcs.push(n);
  }
  // Requested fix: no NPC stock save (invisible bank that blocked the creator)
  // Empty the stock on each load
  clean.npcStock = [];
  clean.pcMessage = (st.pcMessage || '').slice(0, 200);
  clean.uidSeq = Math.max(clean.uidSeq, (st.uidSeq | 0) || 1);
  clean.record = { w: (st.record && st.record.w | 0) || 0, l: (st.record && st.record.l | 0) || 0, visits: (st.record && st.record.visits | 0) || 0 };
  // Phase 43: no custom spawn — always the door marker.
  return clean;
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCreateDefault', baseCreateDefault); } else if (typeof globalThis !== 'undefined') { globalThis.baseCreateDefault = baseCreateDefault; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseGetState', baseGetState); } else if (typeof globalThis !== 'undefined') { globalThis.baseGetState = baseGetState; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseStockAdd', baseStockAdd); } else if (typeof globalThis !== 'undefined') { globalThis.baseStockAdd = baseStockAdd; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseStockRemove', baseStockRemove); } else if (typeof globalThis !== 'undefined') { globalThis.baseStockRemove = baseStockRemove; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseStockCount', baseStockCount); } else if (typeof globalThis !== 'undefined') { globalThis.baseStockCount = baseStockCount; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseBuildGrid', baseBuildGrid); } else if (typeof globalThis !== 'undefined') { globalThis.baseBuildGrid = baseBuildGrid; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCellWalkable', baseCellWalkable); } else if (typeof globalThis !== 'undefined') { globalThis.baseCellWalkable = baseCellWalkable; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCarrierAt', baseCarrierAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseCarrierAt = baseCarrierAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseSurfaceAt', baseSurfaceAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseSurfaceAt = baseSurfaceAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseReachableSet', baseReachableSet); } else if (typeof globalThis !== 'undefined') { globalThis.baseReachableSet = baseReachableSet; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCanPlace', baseCanPlace); } else if (typeof globalThis !== 'undefined') { globalThis.baseCanPlace = baseCanPlace; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('basePlace', basePlace); } else if (typeof globalThis !== 'undefined') { globalThis.basePlace = basePlace; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('basePickup', basePickup); } else if (typeof globalThis !== 'undefined') { globalThis.basePickup = basePickup; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('basePlacedFind', basePlacedFind); } else if (typeof globalThis !== 'undefined') { globalThis.basePlacedFind = basePlacedFind; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseRotate', baseRotate); } else if (typeof globalThis !== 'undefined') { globalThis.baseRotate = baseRotate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseClearAll', baseClearAll); } else if (typeof globalThis !== 'undefined') { globalThis.baseClearAll = baseClearAll; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseRelocate', baseRelocate); } else if (typeof globalThis !== 'undefined') { globalThis.baseRelocate = baseRelocate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCreate', baseCreate); } else if (typeof globalThis !== 'undefined') { globalThis.baseCreate = baseCreate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcAdd', baseNpcAdd); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcAdd = baseNpcAdd; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcPlace', baseNpcPlace); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcPlace = baseNpcPlace; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcPickup', baseNpcPickup); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcPickup = baseNpcPickup; }
// Phase 45 — editeur of PNJ (creation/edition/deletion + import of preset)
if (typeof globalThis !== 'undefined') globalThis.BASE_NPC_MAX = BASE_NPC_MAX;
if (typeof globalThis !== 'undefined') globalThis.BASE_NPC_SPRITES = BASE_NPC_SPRITES;
if (typeof globalThis !== 'undefined') globalThis.BASE_NPC_SPRITE_DEFAULT = BASE_NPC_SPRITE_DEFAULT;
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcSpriteUrl', baseNpcSpriteUrl); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcSpriteUrl = baseNpcSpriteUrl; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcFind', baseNpcFind); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcFind = baseNpcFind; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcCount', baseNpcCount); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcCount = baseNpcCount; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcNormalizeTeam', baseNpcNormalizeTeam); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcNormalizeTeam = baseNpcNormalizeTeam; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcCreate', baseNpcCreate); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcCreate = baseNpcCreate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcPlaceNew', baseNpcPlaceNew); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcPlaceNew = baseNpcPlaceNew; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcUpdate', baseNpcUpdate); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcUpdate = baseNpcUpdate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcDelete', baseNpcDelete); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcDelete = baseNpcDelete; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcTeamFromPreset', baseNpcTeamFromPreset); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcTeamFromPreset = baseNpcTeamFromPreset; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseSanitizeState', baseSanitizeState); } else if (typeof globalThis !== 'undefined') { globalThis.baseSanitizeState = baseSanitizeState; }
// Phase 44 — heights of items (display/slide) + stairs 2 colonnes
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseStairsAt', baseStairsAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseStairsAt = baseStairsAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseZoneTopAt', baseZoneTopAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseZoneTopAt = baseZoneTopAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseZoneStairAt', baseZoneStairAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseZoneStairAt = baseZoneStairAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseZoneBlockedAt', baseZoneBlockedAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseZoneBlockedAt = baseZoneBlockedAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseSlideRampAt', baseSlideRampAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseSlideRampAt = baseSlideRampAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseTentAt', baseTentAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseTentAt = baseTentAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseZoneGateOK', baseZoneGateOK); } else if (typeof globalThis !== 'undefined') { globalThis.baseZoneGateOK = baseZoneGateOK; }


// --- Exported globals ---
if (typeof baseCellAt !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseCellAt', baseCellAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseCellAt = baseCellAt; } }
if (typeof basePcSpot !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('basePcSpot', basePcSpot); } else if (typeof globalThis !== 'undefined') { globalThis.basePcSpot = basePcSpot; } }
if (typeof baseWithPlaced !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWithPlaced', baseWithPlaced); } else if (typeof globalThis !== 'undefined') { globalThis.baseWithPlaced = baseWithPlaced; } }
if (typeof baseZoneDefAt !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseZoneDefAt', baseZoneDefAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseZoneDefAt = baseZoneDefAt; } }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseCreateDefault,
  baseGetState,
  baseStockAdd,
  baseStockRemove,
  baseStockCount,
  baseBuildGrid,
  baseCellWalkable,
  baseCarrierAt,
  baseSurfaceAt,
  baseReachableSet,
  baseCanPlace,
  basePlace,
  basePickup,
  basePlacedFind,
  baseRotate,
  baseClearAll,
  baseRelocate,
  baseCreate,
  baseNpcAdd,
  baseNpcPlace,
  baseNpcPickup,
  baseNpcSpriteUrl,
  baseNpcFind,
  baseNpcCount,
  baseNpcNormalizeTeam,
  baseNpcCreate,
  baseNpcPlaceNew,
  baseNpcUpdate,
  baseNpcDelete,
  baseNpcTeamFromPreset,
  baseSanitizeState,
  baseStairsAt,
  baseZoneTopAt,
  baseZoneStairAt,
  baseZoneBlockedAt,
  baseSlideRampAt,
  baseTentAt,
  baseZoneGateOK,
  baseCellAt,
  basePcSpot,
  baseWithPlaced,
  baseZoneDefAt,
};
