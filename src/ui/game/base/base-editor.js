// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// Phase 38 — SECRET BASE EDITOR / VISIT CONTROLLER
// ----------------------------------------------------------------------------
// State machine with no hard DOM (testable in vm): stock selection,
// placement ghost, place/pivot/pickup by click, buddy placement,
// "touch-to-walk" visits + interactions, bounded battle launch.
// The screen (base-window.js) only reads baseEditorGet(), converts mouse
// events to cells (baseEditorCellFromEvent) and passes the overlay to the
// 2D renderer. The 3D view is postponed (user decision: 2D first).
//
// Owner record (RSE canon, from the owner's point of view):
//   visits++ on each visit received · w = victorious buddy · l = beaten buddy.
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseBuildGrid(...args) { const f = __pwV43Link('baseBuildGrid'); return f ? f(...args) : undefined; }
function baseCanPlace(...args) { const f = __pwV43Link('baseCanPlace'); return f ? f(...args) : undefined; }
function baseCellAt(...args) { const f = __pwV43Link('baseCellAt'); return f ? f(...args) : undefined; }
function baseCellWalkable(...args) { const f = __pwV43Link('baseCellWalkable'); return f ? f(...args) : undefined; }
function baseItemFootprint(...args) { const f = __pwV43Link('baseItemFootprint'); return f ? f(...args) : undefined; }
function baseItemGet(...args) { const f = __pwV43Link('baseItemGet'); return f ? f(...args) : undefined; }
function baseItemRotCount(...args) { const f = __pwV43Link('baseItemRotCount'); return f ? f(...args) : undefined; }
function baseItemRotNormalize(...args) { const f = __pwV43Link('baseItemRotNormalize'); return f ? f(...args) : undefined; }
function baseLayoutGet(...args) { const f = __pwV43Link('baseLayoutGet'); return f ? f(...args) : undefined; }
function baseNpcDelete(...args) { const f = __pwV43Link('baseNpcDelete'); return f ? f(...args) : undefined; }
function baseNpcFind(...args) { const f = __pwV43Link('baseNpcFind'); return f ? f(...args) : undefined; }
function baseNpcPickup(...args) { const f = __pwV43Link('baseNpcPickup'); return f ? f(...args) : undefined; }
function baseNpcPlace(...args) { const f = __pwV43Link('baseNpcPlace'); return f ? f(...args) : undefined; }
function baseNpcPlaceNew(...args) { const f = __pwV43Link('baseNpcPlaceNew'); return f ? f(...args) : undefined; }
function basePickup(...args) { const f = __pwV43Link('basePickup'); return f ? f(...args) : undefined; }
function basePlace(...args) { const f = __pwV43Link('basePlace'); return f ? f(...args) : undefined; }
function basePlacedFind(...args) { const f = __pwV43Link('basePlacedFind'); return f ? f(...args) : undefined; }
function baseRotate(...args) { const f = __pwV43Link('baseRotate'); return f ? f(...args) : undefined; }
function baseStockCount(...args) { const f = __pwV43Link('baseStockCount'); return f ? f(...args) : undefined; }
function baseSurfaceAt(...args) { const f = __pwV43Link('baseSurfaceAt'); return f ? f(...args) : undefined; }
function baseVisitCreate(...args) { const f = __pwV43Link('baseVisitCreate'); return f ? f(...args) : undefined; }
function baseVisitInteract(...args) { const f = __pwV43Link('baseVisitInteract'); return f ? f(...args) : undefined; }
function baseVisitSetDestination(...args) { const f = __pwV43Link('baseVisitSetDestination'); return f ? f(...args) : undefined; }
function baseVisitStepAlong(...args) { const f = __pwV43Link('baseVisitStepAlong'); return f ? f(...args) : undefined; }

const _baseEd = {
  mode: 'edit',          // 'edit' | 'visit'
  slug: null,            // deco chosen in the stock (placed)
  rot: 0,                // rotation of the current placement (index, cf baseItemRot*)
  npcId: null,           // buddy chosen in the pool (placement)
  selUid: null,          // placed furniture selected (rotation/pickup)
  selNpc: null,          // placed buddy selected (removal)
  moveUid: null,         // phase 40: furniture HELD by the mouse (re-click on a selected item = move)
  hover: null,           // {x,y} cell under the cursor
  visit: null,           // baseVisitCreate session
  visitOwn: false,       // visiting ONE'S OWN base (→ credit G.base.record)
  visitName: '',         // name of the visited owner (display)
  visitSig: null,        // unique export ID (baseId) for unique flag collection
  visitOwnerId: null,    // saveMeta.id of the owner — to avoid visiting one's own exported base
  visitPath: [],         // path mirror for the overlay (reference sess.path)
  visitPending: null,    // phase 46: {x,y} of the approached buddy — the interaction
                         // fires on ARRIVAL (clicking a distant NPC)
  moveNpc: null,         // phase 46: NPC HELD by the mouse (one-click move,
                         // exactly like a furniture)
  npcNew: false,         // phase 47: "NPC item" taken from the stock, ready to
                         // be placed on a cell (like a brand-new furniture)
};

function baseEditorGet() { return _baseEd; }

function baseEditorResetSel() {
  _baseEd.slug = null; _baseEd.npcId = null;
  _baseEd.selUid = null; _baseEd.selNpc = null; _baseEd.rot = 0;
  _baseEd.moveNpc = null; _baseEd.npcNew = false;
  // NB: moveUid/_moveUid are not purged here — an ongoing move is ended
  // by baseEditorMoveCancel (right-click) or by the placement.
}

// ——— selection stock / pool —————————————————————————————————————————————
// Click on a stock item: select (re-click = deselect). Placement then
// happens by clicking a tile (green/red ghost meanwhile).
function baseEditorSelectSlug(st, slug) {
  if (_baseEd.mode !== 'edit' || _baseEd.moveUid != null) return null; // a furniture is held at the mouse
  if (slug && (!baseItemGet(slug) || baseStockCount(st, slug) <= 0)) return null;
  const was = _baseEd.slug;
  baseEditorResetSel();
  _baseEd.slug = (was === slug) ? null : slug; // re-click = deselect
  return _baseEd.slug;
}

// Phase 47: take the "NPC item" from the stock (place a brand-new NPC).
function baseEditorSelectNpcNew(st, on) {
  if (_baseEd.mode !== 'edit') return false;
  _baseEd.npcNew = (on === undefined) ? !_baseEd.npcNew : !!on;
  if (_baseEd.npcNew) {
    _baseEd.slug = null; _baseEd.npcId = null;
    _baseEd.selUid = null; _baseEd.selNpc = null; _baseEd.moveNpc = null;
  }
  return _baseEd.npcNew;
}

function baseEditorSelectNpc(st, npcId) {
  if (_baseEd.mode !== 'edit' || _baseEd.moveUid != null) return null;
  if (npcId && !st.npcStock.some((n) => n.id === npcId)) return null;
  baseEditorResetSel();
  _baseEd.npcId = npcId;
  return _baseEd.npcId;
}

// Rotation before placement (stock item in hand).
function baseEditorRotatePlacement() {
  const def = _baseEd.slug && baseItemGet(_baseEd.slug);
  if (!def || baseItemRotCount(def) <= 1) return 0;
  _baseEd.rot = baseItemRotNormalize(def, _baseEd.rot + 1);
  return _baseEd.rot;
}

// —────────────────────────────────────────────────────────────────────────
// 2D canvas: width = layout.w*32+8 (4px margin), sometimes CSS-scaled.
// ev = {clientX, clientY}; canvas must have width/height + getBoundingClientRect.
// Phase 47 — HEIGHT resolution (user feedback: "clicking one of the
// two tiles up brings us behind; the game must always pick the
// HIGHEST point when clicking a tile").
//
// The 2D render is a 3/4 view: a "top" item (slide, mezzanine) is
// DRAWN above its floor footprint. The pixels of a screen tile
// may therefore belong to TWO cells: the floor cell located there, and the
// (lower on screen) cell of a volume overflowing upward. The naive
// pixel→tile conversion always returned the former: hence "it
// takes me behind the slide".
//
// baseEditorCellResolve therefore tests candidates from the HIGHEST (in
// gameplay terms: mezzanine elevation, then item overhang) to the lowest, and
// keeps the first one that truly "covers" the clicked pixel.
function baseEditorCellResolve(st, cx, cy) {
  const layout = st && baseLayoutGet(st.layoutId);
  if (!layout) return null;
  const C = (typeof BASE2D_CELL === 'number') ? BASE2D_CELL : 32;
  // Phase 53: the renderer no longer offsets the mezzanine (the background is
  // baked tile by tile, the cliff lands exactly on its tile). The click
  // resolution of an "elevated" item must follow, otherwise it detours clicks
  // toward the tile above while nothing is offset on screen.
  const ELEV_PX = 0;
  const base = { x: Math.floor(cx / C), y: Math.floor(cy / C) };
  if (base.x < 0 || base.y < 0 || base.x >= layout.w || base.y >= layout.h) return null;

  const cand = [];
  // Phase 49: HEIGHT resolution must only apply to
  // NAVIGATION/selection, never during a PLACEMENT. When the player holds an
  // item, they aim at the floor tile they see under the cursor: detouring the
  // click toward the footprint of a neighboring slide broke placements near
  // a wall ("the game thinks I am targeting the wall").
  const placing = !!(_baseEd.slug || _baseEd.moveUid != null || _baseEd.npcNew || _baseEd.moveNpc);
  if (placing) return { x: base.x, y: base.y };

  // 1) ITEM OVERHANG (slide): its `over` top rows are drawn above the
  //    footprint (phase 51 — user feedback: "I can never select the two
  //    top tiles") — these tiles are exactly what the player aims at,
  //    so target THEM, and especially do not redirect to the footprint.
  //    Return them as-is, with maximal priority: the fact that they
  //    have no floor footprint must no longer make them unclickable.
  for (const it of (st.items || [])) {
    const def = (typeof __pwV43Link('baseItemGet') === 'function') ? baseItemGet(it.s) : null;
    if (!def || !def.over) continue;
    const fp = baseItemFootprint(def, it.rot);
    for (let o = def.over; o >= 1; o--) {
      const sy = it.y - o;                       // on-screen row of the overhang
      if (base.y !== sy) continue;
      if (base.x < it.x || base.x >= it.x + fp.w) continue;
      cand.push({ x: base.x, y: sy, prio: 3 });  // the HIGH cell itself
    }
  }
  // 2) MEZZANINE: elevation-1 cells are raised by ELEV_PX on
  //    screen; a click in this band belongs to the tile above.
  const belowY = Math.floor((cy + ELEV_PX) / C);
  if (belowY !== base.y && belowY >= 0 && belowY < layout.h) {
    const c = layout.cells[belowY] && layout.cells[belowY][base.x];
    if (c && c.elev) cand.push({ x: base.x, y: belowY, prio: 2 });
  }
  // 3) the floor tile, as is (lowest priority)
  cand.push({ x: base.x, y: base.y, prio: 1 });

  cand.sort((a, b) => b.prio - a.prio);
  for (const k of cand) {
    if (k.x < 0 || k.y < 0 || k.x >= layout.w || k.y >= layout.h) continue;
    return { x: k.x, y: k.y };
  }
  return null;
}

function baseEditorCellFromEvent(st, canvas, ev) {
  const layout = st && baseLayoutGet(st.layoutId);
  if (!layout || !canvas || !ev || typeof canvas.getBoundingClientRect !== 'function') return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return null;
  const sx = canvas.width / rect.width, syCanvas = canvas.height / rect.height;
  const px = (ev.clientX - rect.left) * sx - 4;
  const py = (ev.clientY - rect.top) * syCanvas - 4;
  return baseEditorCellResolve(st, px, py);
}

function baseEditorSetHover(cell) { _baseEd.hover = cell || null; return _baseEd.hover; }

// —────────────────────────────────────────────────────────────────────────
// -> null | {x,y,w,d,ok,reason,slug} — x/y = EFFECTIVE origin (the stairs is
// normalized by its anchor; the ghost covers the real footprint).
function baseEditorGhost(st) {
  if (_baseEd.mode !== 'edit') return null;
  const hov = _baseEd.hover;
  if (!hov) return null;
  if (_baseEd.npcId || _baseEd.moveNpc || _baseEd.npcNew) {
    // Buddy ghost: 1×1, legal if the cell would accept baseNpcPlace.
    // Phase 44: aligned with baseNpcPlace (no stair anchor, no cell
    // blocked inside a walkable item — display/slide).
    const grid = baseBuildGrid(st);
    const cell = baseCellAt(grid, hov.x, hov.y);
    let ok = false;
    if (cell && cell.t === 'floor' && !cell.stairAnchor) {
      const cur = grid.occ[hov.y][hov.x];
      if (cur == null) ok = true;
      else if (typeof cur === 'number') ok = baseCellWalkable(st, grid, hov.x, hov.y, null);
    }
    return { x: hov.x, y: hov.y, w: 1, d: 1, ok, reason: ok ? null : 'base.err.occupied', npc: true };
  }
  if (_baseEd.moveUid != null) {
    const itm = basePlacedFind(st, _baseEd.moveUid);
    if (!itm) return null;
    const d2 = baseItemGet(itm.s);
    if (!d2) return null;
    const chk2 = baseCanPlace(st, itm.s, hov.x, hov.y, _baseEd.rot);
    const fp2 = baseItemFootprint(d2, _baseEd.rot);
    return {
      x: chk2.ok ? chk2.x : hov.x, y: chk2.ok ? chk2.y : hov.y,
      w: fp2.w, d: fp2.d, ok: !!chk2.ok, reason: chk2.ok ? null : chk2.reason,
      slug: itm.s, rot: chk2.ok ? chk2.rot : _baseEd.rot, moving: true,
    };
  }
  if (!_baseEd.slug) return null;
  const def = baseItemGet(_baseEd.slug);
  if (!def) return null;
  let hx = hov.x, hy = hov.y;
  if (def.layer === 'wall') {
    const wcell = baseEditorWallCell(st, hov.x, hov.y);
    if (wcell) { hx = wcell.x; hy = wcell.y; }
  }
  const chk = baseCanPlace(st, _baseEd.slug, hx, hy, 0);
  const fp = baseItemFootprint(def, 0);
  return {
    x: chk.ok ? chk.x : hx, y: chk.ok ? chk.y : hy,
    w: fp.w, d: fp.d, ok: !!chk.ok, reason: chk.ok ? null : chk.reason,
    slug: _baseEd.slug, rot: 0,
  };
}


// Phase 42 — hanging a wall item by clicking the floor in front of it:
// "wall" item in hand: click on the wall/cliff tile, or on the FLOOR tile
// directly in front — in both cases target the face (x, y-1). The
// engine then re-validates (visible face + floor to the south).
function baseEditorWallCell(st, x, y) {
  const g = baseBuildGrid(st);
  const at = (cx, cy) => baseCellAt(g, cx, cy);
  const c = at(x, y);
  if (!c) return null;
  if (c.t === 'wall' || c.t === 'cliff') return { x, y };
  if (c.t === 'floor') {
    const n = at(x, y - 1);
    if (n && (n.t === 'wall' || n.t === 'cliff')) return { x, y: y - 1 };
  }
  return { x, y };
}

// —────────────────────────────────────────────────────────────────────────
// Priority: "surface" item (doll on a desk…) then the cell occupant.
function baseEditorSelAt(st, x, y) {
  const surf = baseSurfaceAt(st, x, y);
  if (surf) return { kind: 'item', uid: surf.uid };
  const grid = baseBuildGrid(st);
  const cur = grid && grid.occ[y] ? grid.occ[y][x] : null;
  if (typeof cur === 'string' && cur.startsWith('npc:')) return { kind: 'npc', id: cur.slice(4) };
  if (typeof cur === 'number') {
    const it = basePlacedFind(st, cur);
    if (it) return { kind: 'item', uid: cur };
  }
  // Phase 51: the occupation grid only covers FLOOR footprints.
  // A click on the OVERHANG of an "over" item (the two high rows of the
  // slide) therefore found nothing and did not select the item. We
  // complete it here: the overhang does belong to its item.
  for (const it of (st.items || [])) {
    if (it.uid === st._moveUid) continue;
    const def = baseItemGet(it.s);
    if (!def || !def.over) continue;
    const fp = baseItemFootprint(def, it.rot);
    if (x < it.x || x >= it.x + fp.w) continue;
    if (y >= it.y - def.over && y < it.y) return { kind: 'item', uid: it.uid };
  }
  return null;
}

// —────────────────────────────────────────────────────────────────────────
// Place (decor or buddy) if something is in hand, otherwise select.
// → {type:'place'|'place_npc'|'select'|'none', ...} for display.
// Wave 35 (user): FURNISHING FINALE. Placing the last legal item used to be
// a non-event ("j'y ai placé mes objets sans rien") — the arc had no solemn
// moment. When the placed count reaches the canonical cap, celebrate ONCE
// (flag persisted in the base state): fanfare-coloured toast inviting the
// player to press Visiter and enjoy the finished base.
function baseEditorCelebrateIfFurnished(st) {
  if (!st || st.furnishCelebrated) return;
  if (typeof BASE_ITEM_MAX_PLACED === 'undefined' || typeof __pwV43Link('baseItemGet') !== 'function') return;
  const placedTotal = st.items.filter((i) => { const d = baseItemGet(i.s); return d && d.acq !== 'auto'; }).length;
  if (placedTotal < BASE_ITEM_MAX_PLACED) return;
  st.furnishCelebrated = 1;
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  if (typeof notify === 'function') notify(en
    ? '🎉 Your Secret Base is fully furnished (26/26)! A solemn moment — press Visiter and enjoy your finished base.'
    : '🎉 Votre Base Secrète est entièrement meublée (26/26) ! Moment solennel — appuyez sur Visiter pour profiter de votre base achevée.', 'var(--yellow)');
}

function baseEditorClickCell(st, x, y) {
  if (_baseEd.mode !== 'edit' || !st) return { type: 'none' };
  if (_baseEd.moveUid != null) {
    // Place the furniture held by the mouse if the tile is legal (otherwise keep holding).
    const it = basePlacedFind(st, _baseEd.moveUid);
    if (!it) { _baseEd.moveUid = null; st._moveUid = null; return { type: 'none' }; }
    const chk = baseCanPlace(st, it.s, x, y, _baseEd.rot);
    if (chk.ok) {
      it.x = chk.x; it.y = chk.y; it.rot = chk.rot;
      st._moveUid = null;
      _baseEd.moveUid = null;
      return { type: 'move', ok: true, slug: it.s, uid: it.uid };
    }
    return { type: 'move', ok: false, slug: it.s, reason: chk.reason };
  }
  // Phase 47: new "NPC item" in hand -> create it and place it here.
  if (_baseEd.npcNew) {
    const res = baseNpcPlaceNew(st, x, y, {});
    if (res.ok) {
      _baseEd.npcNew = false;
      _baseEd.selNpc = res.id;      // selected: the "Edit" button appears
      return { type: 'place_npc', ok: true, npcId: res.id, fresh: true };
    }
    return { type: 'place_npc', ok: false, reason: res.reason };
  }
  // Phase 46: NPC HELD by the mouse -> drop it back here if there is room.
  if (_baseEd.moveNpc) {
    const npcId = _baseEd.moveNpc;
    const res = baseNpcPlace(st, npcId, x, y);
    if (res.ok) {
      _baseEd.moveNpc = null; _baseEd.npcNew = false;
      return { type: 'move_npc', ok: true, npcId };
    }
    return { type: 'move_npc', ok: false, npcId, reason: res.reason };
  }
  if (_baseEd.npcId) {
    const npcId = _baseEd.npcId;
    const res = baseNpcPlace(st, npcId, x, y);
    if (res.ok) { if (!st.npcStock.some((n) => n.id === npcId)) _baseEd.npcId = null; return { type: 'place_npc', ok: true, npcId }; }
    return { type: 'place_npc', ok: false, reason: res.reason };
  }
  if (_baseEd.slug) {
    const slug = _baseEd.slug;
    const defW = baseItemGet(slug);
    let tx = x, ty = y;
    if (defW && defW.layer === 'wall') {
      const wcell = baseEditorWallCell(st, x, y);
      if (!wcell) return { type: 'place', ok: false, slug, reason: 'base.err.wall_only' };
      tx = wcell.x; ty = wcell.y;
    }
    const res = basePlace(st, slug, tx, ty, 0);
    if (res.ok) {
      // Phase 39 (user decision): stacked placement forbidden — the hand
      // released after each successful placement (re-click the stock otherwise).
      _baseEd.slug = null;
      baseEditorCelebrateIfFurnished(st);
      return { type: 'place', ok: true, slug, uid: res.uid };
    }
    return { type: 'place', ok: false, slug, reason: res.reason };
  }
  const sel = baseEditorSelAt(st, x, y);
  if (!sel) { _baseEd.selUid = null; _baseEd.selNpc = null; return { type: 'none' }; }
  // PC in edit mode: Edit button like NPCs, no auto-open
  if (sel.kind === 'item') {
    const itPc = basePlacedFind(st, sel.uid);
    if (itPc && itPc.s === 'pc') {
      // if already selected, take it in hand (2nd click)
      if (_baseEd.selUid === sel.uid) {
        const mv = baseEditorMoveStart(st, sel.uid);
        if (mv.ok) {
          // Keep the selection so the Edit button stays visible while moving
          _baseEd.selUid = sel.uid;
          return { type: 'move_start', slug: mv.slug };
        }
        return { type: 'select', kind: 'item', uid: sel.uid, pc: true };
      }
      // 1st click: select only (shows Edit button), not moved yet
      // but to satisfy the "PC is picked up like any furniture" rule, take it
      // in hand directly as well, while keeping selUid for the button
      _baseEd.selUid = sel.uid;
      _baseEd.selNpc = null;
      const mv = baseEditorMoveStart(st, sel.uid);
      if (mv.ok) {
        _baseEd.selUid = sel.uid; // keep selection for the button
        return { type: 'move_start', slug: mv.slug };
      }
      return { type: 'select', kind: 'item', uid: sel.uid, pc: true };
    }
  }
  if (sel.kind === 'npc') {
    // Phase 49 (user feedback: "I cannot move the NPC by
    // clicking on it while it should work like the other items"):
    // a SINGLE click takes the NPC in hand, exactly like a furniture. It also
    // stays selected, so the "Edit NPC" button stays accessible
    // in the bar while it is being moved.
    const npc = baseNpcFind(st, sel.id);
    if (npc && baseNpcPickup(st, sel.id)) {
      _baseEd.moveNpc = sel.id;
      _baseEd.selNpc = sel.id;      // kept: "Edit" stays available
      _baseEd.selUid = null; _baseEd.slug = null; _baseEd.npcId = null;
      return { type: 'move_npc_start', npcId: sel.id, name: npc.name };
    }
    _baseEd.selNpc = sel.id;
    _baseEd.selUid = null;
    return { type: 'select', kind: 'npc', id: _baseEd.selNpc };
  }
  // Phase 41 (user request): ONE click on a placed furniture takes it
  // directly in hand to move it (the two-step selection was
  // invisible and read as "moving does not work").
  const mv = baseEditorMoveStart(st, sel.uid);
  return mv.ok ? { type: 'move_start', slug: mv.slug } : { type: 'select', kind: 'item', uid: null, reason: mv.reason };
}

// Phase 40 — one-click move (user request: "moving furniture takes too
// many clicks"): the furniture is HELD at the mouse. Its footprint is
// freed (st._moveUid, transient), the ghost follows the cursor, a click
// puts it down if legal, right-click (base-editor-cancel) returns it to
// its original spot. The canon welcome mat stays fixed; the PC can move
// (access rule in canPlace).
function baseEditorMoveStart(st, uid) {
  if (_baseEd.mode !== 'edit' || uid == null) return { ok: false };
  const it = basePlacedFind(st, uid);
  if (!it) return { ok: false };
  _baseEd.moveUid = uid; st._moveUid = uid;
  _baseEd.rot = it.rot; _baseEd.selUid = null; _baseEd.selNpc = null; _baseEd.slug = null; _baseEd.npcId = null;
  return { ok: true, slug: it.s };
}

function baseEditorMoveCancel(st) {
  if (_baseEd.moveUid == null) return { ok: false };
  st._moveUid = null; _baseEd.moveUid = null;
  return { ok: true };
}

// Pick up the placed selection (or the HELD furniture) → back to stock.
// NPC: the Pick up button DELETES the NPC (user request: no saving of already-placed NPCs, no accumulating bank)
function baseEditorPickupSel(st) {
  if (_baseEd.moveUid != null) {
    // Phase 41: furniture in hand + "Pick up" = store it away (right-click
    // cancels and returns it to its spot). The PC is automatic: it cannot
    // be stored (right-click to cancel).
    const held = basePlacedFind(st, _baseEd.moveUid);
    if (!held) { _baseEd.moveUid = null; st._moveUid = null; return { ok: false }; }
    if (held.s === 'pc') return { ok: false, reason: 'base.err.fixed' };
    const heldSlug = held.s;
    const hn = basePickup(st, _baseEd.moveUid);
    _baseEd.moveUid = null; st._moveUid = null;
    return hn > 0 ? { ok: true, slug: heldSlug, count: hn } : { ok: false };
  }
  if (_baseEd.selNpc) {
    const id = _baseEd.selNpc;
    _baseEd.selNpc = null;
    // Requested fix: picking up an NPC DELETES it, no invisible stocking
    if (typeof __pwV43Link('baseNpcDelete') === 'function') {
      return baseNpcDelete(st, id) ? { ok: true, npc: true, deleted: true } : { ok: false };
    }
    return baseNpcPickup(st, id) ? { ok: true, npc: true } : { ok: false };
  }
  if (_baseEd.selUid == null) return { ok: false };
  const it = basePlacedFind(st, _baseEd.selUid);
  const slug = it && it.s;
  const n = basePickup(st, _baseEd.selUid);
  _baseEd.selUid = null;
  return n > 0 ? { ok: true, slug, count: n } : { ok: false };
}

// Rotate the placed selection (right-click / button) — otherwise the in-hand placement.
function baseEditorRotateSel(st) {
  if (_baseEd.moveUid != null) {
    // rotates the HELD furniture (ghost) — placed on the next click with this rotation
    const itm = basePlacedFind(st, _baseEd.moveUid);
    const d3 = itm && baseItemGet(itm.s);
    if (!d3 || baseItemRotCount(d3) <= 1) return { placed: false, ok: false, reason: 'base.err.not_rotatable' };
    _baseEd.rot = baseItemRotNormalize(d3, _baseEd.rot + 1);
    return { placed: false, ok: true, rot: _baseEd.rot, moving: true };
  }
  if (_baseEd.selUid != null) {
    const res = baseRotate(st, _baseEd.selUid, 1);
    return { placed: true, ...res };
  }
  if (_baseEd.slug) return { placed: false, ok: true, rot: baseEditorRotatePlacement() };
  return { placed: false, ok: false, reason: 'base.err.not_rotatable' };
}

// ——— Visited interactive ———————————————————————————————————————————————————
// srcState = state OWNER (copie by baseVisitCreate). meta = {name, source}
// source 'ownot  = its own base (record credite) · 'imporyou  = fichier of has ami.
function baseEditorStartVisit(srcState, meta) {
  const sess = baseVisitCreate(srcState);
  if (!sess) return { ok: false, reason: 'base.err.no_base' };
  baseEditorResetSel();
  _baseEd.mode = 'visit';
  _baseEd.visit = sess;
  _baseEd.visitOwn = !!(meta && meta.source === 'own');
  _baseEd.visitName = (meta && meta.name) || '';
  _baseEd.visitPath = sess.path;
  _baseEd.hover = null;
  if (_baseEd.visitOwn && typeof G !== 'undefined' && G && G.base && G.base.record) {
    G.base.record.visits = (G.base.record.visits | 0) + 1;
  }
  return { ok: true, sess };
}

// Adopte has session already construite (import JSON of has ami valid).
function baseEditorAdoptVisit(sess, meta) {
  if (!sess) return { ok: false, reason: 'base.err.import_layout' };
  baseEditorResetSel();
  _baseEd.mode = 'visit';
  _baseEd.visit = sess;
  // if ownerId correspond has the save current, it is its OWN base exportee → on the considere as own for avoid the farm of flag
  let isOwnFile = false;
  try {
    const curOwner = (typeof G !== 'undefined' && G && G.saveMeta && G.saveMeta.id) ? String(G.saveMeta.id) : null;
    const impOwner = meta && meta.ownerId ? String(meta.ownerId) : null;
    if (curOwner && impOwner && curOwner === impOwner) isOwnFile = true;
  } catch(_){}
  _baseEd.visitOwn = isOwnFile; // own file = not of flag, as its own base
  _baseEd.visitName = (meta && meta.name) || '';
  _baseEd.visitSig = (meta && meta.id) ? String(meta.id) : null;
  _baseEd.visitOwnerId = (meta && meta.ownerId) ? String(meta.ownerId) : null;
  _baseEd.visitPath = sess.path;
  _baseEd.hover = null;
  // Discovery quest (217): visiting a friend's base counts too (your own file counts for discovery, but not for the flag).
  try { if (typeof advanceQuests === 'function') advanceQuests('base_visit', (typeof G !== 'undefined' && G) ? G.location : null, 1); } catch (_) {}
  return { ok: true, sess };
}

// Click during a visit: ADJACENT occupied tile (face-to-face, 4 directions) →
// interaction; otherwise touch-to-walk (engine BFS). → description.
function baseEditorVisitClick(x, y) {
  const sess = _baseEd.visit;
  if (!sess) return { type: 'none' };
  const dist = Math.abs(sess.pos.x - x) + Math.abs(sess.pos.y - y);
  const uid = sess.grid.occ[y] && sess.grid.occ[y][x];
  if (dist === 0) return { type: 'none' };
  // Facing a NON-walkable occupied tile → interaction (talk to the buddy,
  // read the board, heal…). Walkable items are stepped on: moving
  // on top naturally triggers their traps.
  if (dist === 1 && uid != null) {
    let walkThrough = false;
    if (typeof uid === 'number') {
      const it = basePlacedFind(sess.st, uid);
      walkThrough = !!(it && baseItemGet(it.s).walk);
    }
    if (!walkThrough) {
      const res = baseVisitInteract(sess, x, y);
      return { type: 'interact', res, x, y };
    }
  }
  let steps = baseVisitSetDestination(sess, x, y);
  if (!steps) {
    // Non-walkable tile (furniture or distant buddy): approach the
    // NEAREST FREE neighboring tile — in front, behind or beside (Phase 46 —
    // legacy feature update); we keep the shortest path instead of the first
    // one that works.
    let best = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const s = baseVisitSetDestination(sess, x + dx, y + dy);
      if (s && (!best || s.length < best.length)) best = s;
    }
    // replay the best approach (setDestination overwrote sess.path)
    if (best) {
      const last = best[best.length - 1] || { x, y };
      steps = baseVisitSetDestination(sess, last.x, last.y);
    }
  }
  _baseEd.visitPath = sess.path;
  if (!steps) return { type: 'blocked', x, y };
  // Phase 46 (user feedback): clicking a BUDDY from a distance must
  // approach it — we walk up to it, then the interaction fires on
  // arrival (baseEditorVisitTick). The player may come from any
  // side: in front, behind or beside.
  if (typeof uid === 'string' && uid.startsWith('npc:')) {
     // Secret base decoration editor and placement rules
    // We do NOT interact from afar: we path toward the buddy and the
    // approach is stored; the dialog then opens on arrival.
    _baseEd.visitPending = { x, y };
    return { type: 'move', steps: steps.length, approach: 'npc' };
  }
  _baseEd.visitPending = null;
  return { type: 'move', steps: steps.length };
}

// One animated step (called by the screen's timer). → {moved, ev, done}
function baseEditorVisitTick() {
  const sess = _baseEd.visit;
  if (!sess) return { moved: false, done: true };
  // Paused during a battle: the visitor waits for the end of the duel.
  if (typeof battle !== 'undefined' && battle && battle.active) return { moved: false, done: false };
  const r = baseVisitStepAlong(sess);
  _baseEd.visitPath = sess.path;
  const done = !sess.path.length;
  // Phase 46: once next to the targeted buddy, fire the interaction —
  // this is what makes a distant click on an NPC "talk".
  if (done && _baseEd.visitPending) {
    const { x, y } = _baseEd.visitPending;
    _baseEd.visitPending = null;
    if (Math.abs(sess.pos.x - x) + Math.abs(sess.pos.y - y) === 1) {
      const res = baseVisitInteract(sess, x, y);
      return { moved: r.moved, ev: r.ev || null, done: true, interact: res };
    }
  }
  return { moved: r.moved, ev: r.ev || null, done };
}

// Phase 38 C — battle credit. won = the VISITOR won. From the OWNER's
// point of view (canon): victorious buddy → record.w++, beaten buddy →
// record.l++. The session counter mirrors it (battlesWon/battlesLost).
function baseEditorCreditBattle(won) {
  const sess = _baseEd.visit;
  if (!sess) return false;
  if (won) sess.battlesWon++; else sess.battlesLost++;
  if (_baseEd.visitOwn && typeof G !== 'undefined' && G && G.base && G.base.record) {
    if (won) G.base.record.l = (G.base.record.l | 0) + 1;
    else G.base.record.w = (G.base.record.w | 0) + 1;
  }
  return true;
}

function baseEditorStopVisit() {
  const sess = _baseEd.visit;
  _baseEd.mode = 'edit';
  _baseEd.visit = null; _baseEd.visitOwn = false; _baseEd.visitPath = [];
  baseEditorResetSel();
  return sess ? { w: sess.battlesWon | 0, l: sess.battlesLost | 0 } : null;
}

// —────────────────────────────────────────────────────────────────────────
// Stored team (snapshot {id,level,moves:[names],talent,shiny}) → live
// team of Poke instances (phase 19: move names resolved against MOVES,
// fallback on the natural moveset when a move name is unknown/absent).
function baseNpcTeamToChampTeam(team) {
  if (!Array.isArray(team)) return [];
  const hasFactory = (typeof createPoke === 'function') && (typeof MOVES !== 'undefined') && MOVES;
  const out = [];
  for (const p of team.slice(0, 6)) {
    const id = Math.min(1025, Math.max(1, (p && p.id) | 0));
    const level = Math.min(100, Math.max(1, (p && p.level) | 0));
    if (!hasFactory) { out.push({ id, level, shiny: !!(p && p.shiny), moves: [] }); continue; }
    const mon = createPoke(id, level, !!(p && p.shiny));
    if (!mon) continue;
    const named = (Array.isArray(p.moves) ? p.moves : []).filter((m) => m && MOVES[m]).slice(0, 4);
    if (named.length) mon.moves = named.map((m) => ({ id: m }));
    if (p.talent) mon.talent = p.talent;
    if (p.item) mon.heldItem = p.item;   // phase 47 : item held of the PNJ
    out.push(mon);
  }
  return out;
}

// Launches the bounded duel resulting from baseVisitInteract's npc_battle.
function baseEditorLaunchNpcBattle(battleSpec) {
  if (!battleSpec || !battleSpec.npc) return { ok: false };
  const npc = battleSpec.npc;
  const team = baseNpcTeamToChampTeam(npc.team);
  if (!team.length || typeof startBattle !== 'function') return { ok: false, reason: 'base.err.npc_team' };
  const ok = startBattle(null, true, 'base_npc', team);
  // startBattle historically returns undefined on success: if the team
  // adverse team is properly set, the battle is active.
  if (ok === false || (typeof battle === 'undefined' || !battle || !battle.active)) return { ok: false, reason: 'base.err.npc_team' };
  // Phase 52: it is here (duel actually accepted) that the battle is counted,
  // not at the dialogue opening.
  if (_baseEd.visit && _baseEd.visit.talkedToday) {
    _baseEd.visit.talkedToday[npc.id] = (_baseEd.visit.talkedToday[npc.id] | 0) + 1;
  }
  battle.isBaseNpcBattle = true;
  battle.baseNpcName = npc.name;
  // Phase 52: the NPC is remembered for the battle-END panel — the
  // player never saw the victory/defeat quote (it only went to the
  // battle log, which closes with the duel).
  battle.baseNpcRef = npc;
  battle.baseNpcSprite = npc.sprite || null;
  battle.baseNpcMsgs = { win: npc.msgs.win || '', lose: npc.msgs.lose || '' };
  battle.chill = false;           // real duel, not an exploration chain
  battle.noAutoCatch = true;      // never any capture at a buddy's place!
  if (npc.msgs.pre && typeof addBattleLog === 'function') addBattleLog('« ' + npc.msgs.pre + ' » — ' + npc.name);
  return { ok: true };
}

// Visit-end text (counters) — the screen notifies it.
function baseEditorVisitSummary() {
  const sess = _baseEd.visit;
  return sess ? { w: sess.battlesWon | 0, l: sess.battlesLost | 0, name: _baseEd.visitName } : null;
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorGet', baseEditorGet); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorGet = baseEditorGet; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorResetSel', baseEditorResetSel); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorResetSel = baseEditorResetSel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorSelectSlug', baseEditorSelectSlug); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorSelectSlug = baseEditorSelectSlug; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorSelectNpc', baseEditorSelectNpc); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorSelectNpc = baseEditorSelectNpc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorSelectNpcNew', baseEditorSelectNpcNew); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorSelectNpcNew = baseEditorSelectNpcNew; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorRotatePlacement', baseEditorRotatePlacement); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorRotatePlacement = baseEditorRotatePlacement; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorCellFromEvent', baseEditorCellFromEvent); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorCellFromEvent = baseEditorCellFromEvent; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorCellResolve', baseEditorCellResolve); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorCellResolve = baseEditorCellResolve; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorSetHover', baseEditorSetHover); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorSetHover = baseEditorSetHover; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorGhost', baseEditorGhost); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorGhost = baseEditorGhost; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorWallCell', baseEditorWallCell); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorWallCell = baseEditorWallCell; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorSelAt', baseEditorSelAt); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorSelAt = baseEditorSelAt; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorClickCell', baseEditorClickCell); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorClickCell = baseEditorClickCell; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorMoveStart', baseEditorMoveStart); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorMoveStart = baseEditorMoveStart; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorMoveCancel', baseEditorMoveCancel); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorMoveCancel = baseEditorMoveCancel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorPickupSel', baseEditorPickupSel); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorPickupSel = baseEditorPickupSel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorRotateSel', baseEditorRotateSel); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorRotateSel = baseEditorRotateSel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorStartVisit', baseEditorStartVisit); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorStartVisit = baseEditorStartVisit; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorAdoptVisit', baseEditorAdoptVisit); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorAdoptVisit = baseEditorAdoptVisit; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorVisitClick', baseEditorVisitClick); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorVisitClick = baseEditorVisitClick; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorVisitTick', baseEditorVisitTick); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorVisitTick = baseEditorVisitTick; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorCreditBattle', baseEditorCreditBattle); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorCreditBattle = baseEditorCreditBattle; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorStopVisit', baseEditorStopVisit); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorStopVisit = baseEditorStopVisit; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorVisitSummary', baseEditorVisitSummary); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorVisitSummary = baseEditorVisitSummary; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseNpcTeamToChampTeam', baseNpcTeamToChampTeam); } else if (typeof globalThis !== 'undefined') { globalThis.baseNpcTeamToChampTeam = baseNpcTeamToChampTeam; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseEditorLaunchNpcBattle', baseEditorLaunchNpcBattle); } else if (typeof globalThis !== 'undefined') { globalThis.baseEditorLaunchNpcBattle = baseEditorLaunchNpcBattle; }


// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseEditorGet,
  baseEditorResetSel,
  baseEditorSelectSlug,
  baseEditorSelectNpc,
  baseEditorSelectNpcNew,
  baseEditorRotatePlacement,
  baseEditorCellFromEvent,
  baseEditorCellResolve,
  baseEditorSetHover,
  baseEditorGhost,
  baseEditorWallCell,
  baseEditorSelAt,
  baseEditorClickCell,
  baseEditorMoveStart,
  baseEditorMoveCancel,
  baseEditorPickupSel,
  baseEditorRotateSel,
  baseEditorStartVisit,
  baseEditorAdoptVisit,
  baseEditorVisitClick,
  baseEditorVisitTick,
  baseEditorCreditBattle,
  baseEditorStopVisit,
  baseEditorVisitSummary,
  baseNpcTeamToChampTeam,
  baseEditorLaunchNpcBattle,
  baseEditorCelebrateIfFurnished,
};

// Wave 41 — DELIBERATE kept surface: driven by the simulation
// harnesses (26/26 ceremony — external consumer measured in
// tests/vague35-base-visit-finale.test.js). Never placed in prod (module).
if (typeof globalThis !== 'undefined') globalThis.baseEditorCelebrateIfFurnished = baseEditorCelebrateIfFurnished;

