// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// SECRET BASE — VISIT ENGINE (pure session)
// ----------------------------------------------------------------------------
// Pure visit session: position, elevation, pathfinding (touch-to-walk),
// ORAS traps, NPC/item interactions. Consumable by any renderer (3D/2.5D)
// as well as by headless tests.
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseBuildGrid(...args) { const f = __pwV43Link('baseBuildGrid'); return f ? f(...args) : undefined; }
function baseCellAt(...args) { const f = __pwV43Link('baseCellAt'); return f ? f(...args) : undefined; }
function baseCellWalkable(...args) { const f = __pwV43Link('baseCellWalkable'); return f ? f(...args) : undefined; }
function baseItemFootprint(...args) { const f = __pwV43Link('baseItemFootprint'); return f ? f(...args) : undefined; }
function baseItemGet(...args) { const f = __pwV43Link('baseItemGet'); return f ? f(...args) : undefined; }
function baseItemRotNormalize(...args) { const f = __pwV43Link('baseItemRotNormalize'); return f ? f(...args) : undefined; }
function baseLayoutGet(...args) { const f = __pwV43Link('baseLayoutGet'); return f ? f(...args) : undefined; }
function basePlacedFind(...args) { const f = __pwV43Link('basePlacedFind'); return f ? f(...args) : undefined; }
function baseSlideRampAt(...args) { const f = __pwV43Link('baseSlideRampAt'); return f ? f(...args) : undefined; }
function baseStairsAt(...args) { const f = __pwV43Link('baseStairsAt'); return f ? f(...args) : undefined; }
function baseZoneGateOK(...args) { const f = __pwV43Link('baseZoneGateOK'); return f ? f(...args) : undefined; }
function baseZoneTopAt(...args) { const f = __pwV43Link('baseZoneTopAt'); return f ? f(...args) : undefined; }

// Creates a visit session from the OWNER's state (isolated copy).
function baseVisitCreate(src) {
  const st = (typeof structuredClone === 'function') ? structuredClone(src) : JSON.parse(JSON.stringify(src));
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return null;
  const spawn = st.spawn || layout.spawn;
  const grid = baseBuildGrid(st);
  const sess = {
    st, grid,
    pos: { x: spawn.x, y: spawn.y },
    elev: grid.layout.cells[spawn.y][spawn.x].elev,
    path: [],
    // Phase 42: orientation + walk phase (true GBA frames in 2D)
    dir: 'down',           // down|up|left|right (last direction)
    animStep: 0,           // advances each step → paces the walk frames
    subElev: 0,            // phase 44: on top of an item (display/slide)
    trapsFired: {},      // uid -> true (pitfall/squareone/warp consumed)
    broken: {},          // uid -> true (balloons/mud/broken door)
    lit: {},             // uid -> bool (lights)
    talkedToday: {},     // npcId -> number of duels ACTUALLY fought during the
                         // visit (phase 52: no longer a lock, just a counter —
                         // rebattles are allowed)
    battlesWon: 0, battlesLost: 0,
    log: [],
  };
  return sess;
}

function baseVisitCellWalk(sess, x, y, elev) { return baseCellWalkable(sess.st, sess.grid, x, y, elev); }

// Vertical transition: is the cell an active stair passage?
// (cliff tile whose SOUTH tile is an anchor with placed stairs)
function baseStairPass(sess, x, y) {
  const cell = baseCellAt(sess.grid, x, y);
  if (!cell || cell.t !== 'cliff') return false;
  const below = baseCellAt(sess.grid, x, y + 1);
  return !!(below && below.stairAnchor && baseStairsAt(sess.st, x, y + 1));
}

// Neighbors, taking elevation into account (stairs).
// Phase 44: + ITEM HEIGHT lock (canon) — you only go up/down a display
// or a slide landing via its built-in stairs.
function baseVisitNeighbors(sess, x, y, elev) {
  const out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    // stairs passage?
    if (baseStairPass(sess, nx, ny)) { out.push({ x: nx, y: ny, elev }); continue; }
    // cliff cell (currently on the stairs) → cross to the other elevation
    if (baseStairPass(sess, x, y)) {
      const c = baseCellAt(sess.grid, nx, ny);
      if (c && c.t === 'floor' && c.elev !== elev && baseCellWalkable(sess.st, sess.grid, nx, ny, c.elev)) {
        out.push({ x: nx, y: ny, elev: c.elev });
        continue;
      }
    }
    if (baseVisitCellWalk(sess, nx, ny, elev)) out.push({ x: nx, y: ny, elev });
  }
  return out.filter((n) => baseZoneGateOK(sess.st, x, y, n.x, n.y));
}

// Updates the item-height flag (display top / slide landing).
function baseVisitSyncSubElev(sess) {
  sess.subElev = baseZoneTopAt(sess.st, sess.pos.x, sess.pos.y) ? 1 : 0;
  return sess.subElev;
}

// BFS (x,y,elev) -> path [{x,y}...] (without the starting cell) or null.
function baseFindPath(sess, tx, ty) {
  const startK = sess.pos.x + ',' + sess.pos.y + ',' + sess.elev;
  const seen = new Set([startK]);
  const prev = {};
  const q = [{ x: sess.pos.x, y: sess.pos.y, elev: sess.elev }];
  let found = null;
  while (q.length && !found) {
    const cur = q.shift();
    for (const n of baseVisitNeighbors(sess, cur.x, cur.y, cur.elev)) {
      const k = n.x + ',' + n.y + ',' + n.elev;
      if (seen.has(k)) continue;
      seen.add(k);
      prev[k] = cur;
      if (n.x === tx && n.y === ty) { found = n; break; }
      q.push(n);
    }
  }
  if (!found) return null;
  const steps = [];
  let cur = found;
  while (cur && !(cur.x === sess.pos.x && cur.y === sess.pos.y)) {
    steps.unshift({ x: cur.x, y: cur.y, elev: cur.elev });
    cur = prev[cur.x + ',' + cur.y + ',' + cur.elev];
  }
  return steps;
}

function baseVisitSetDestination(sess, tx, ty) {
  if (!baseVisitCellWalk(sess, tx, ty, null) && !baseStairPass(sess, tx, ty)) return null;
  const steps = baseFindPath(sess, tx, ty);
  if (steps) sess.path = steps;
  return steps;
}

// Trap effects when stepping onto the tile → describe the event, update
// the session. Returns null if nothing.
function baseVisitTrigger(sess, uid) {
  const it = basePlacedFind(sess.st, uid);
  if (!it) return null;
  const def = baseItemGet(it.s);
  const fx = def.fx;
  if (!fx) return null;
  const ev = { fx, uid, item: it.s };
  switch (fx) {
    case 'burst':
      if (sess.broken[uid]) return null;
      sess.broken[uid] = true;
      ev.msg = 'base.visit.burst';
      return ev;
    case 'glitter': ev.msg = 'base.visit.glitter'; return ev;
    case 'jump': ev.msg = 'base.visit.jump'; return ev;
    case 'tall_grass': return null;
    case 'note:0': case 'note:1': case 'note:2': case 'note:3':
    case 'note:4': case 'note:5': case 'note:6': case 'note:7': {
      const base = Number(fx.split(':')[1]) || 0;
      ev.note = (base + baseItemRotNormalize(def, it.rot)) % 8; // rotating = changing the note (canon)
      ev.msg = 'base.visit.note';
      return ev;
    }
    case 'spin':
      // pushed back to the previous cell
      ev.msg = 'base.visit.spin';
      ev.pushBack = true;
      return ev;
    case 'spinforce': {
      const dirIdx = baseItemRotNormalize(def, it.rot) % 8;
      const dir = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]][dirIdx];
      // our movement is 4-directional: round to the nearest cardinal
      const cardinal = Math.abs(dir[0]) >= Math.abs(dir[1]) ? [Math.sign(dir[0]), 0] : [0, Math.sign(dir[1])];
      ev.msg = 'base.visit.spinforce';
      ev.force = cardinal;
      return ev;
    }
    case 'pitfall':
      if (sess.trapsFired[uid]) return null;
      sess.trapsFired[uid] = true;
      ev.msg = 'base.visit.pitfall';
      ev.stop = true;
      return ev;
    case 'squareone':
      if (sess.trapsFired[uid]) return null;
      sess.trapsFired[uid] = true;
      ev.msg = 'base.visit.squareone';
      ev.teleportSpawn = true;
      return ev;
    case 'warp': {
      if (sess.trapsFired[uid]) return null;
      const others = sess.st.items.filter((o) => o.s === it.s && o.uid !== uid);
      if (!others.length) return null;
      sess.trapsFired[uid] = true;
      ev.msg = 'base.visit.warp';
      ev.teleport = { x: others[0].x, y: others[0].y };
      return ev;
    }
    case 'door': {
      if (!sess.broken[uid]) { sess.broken[uid] = true; ev.msg = 'base.visit.door_break'; return ev; }
      return null; // already broken: walkable (handled by walk)
    }
    case 'invisible': ev.msg = 'base.visit.invisible'; return ev;
    default: return null;
  }
}

// One step along the current path. Returns the possible event.
function baseVisitStepAlong(sess) {
  if (!sess.path.length) return { moved: false };
  const step = sess.path.shift();
  const prev = { ...sess.pos };
  // Phase 42: walk orientation (at the moment of the step, before triggers)
  if (step.x > prev.x) sess.dir = 'right';
  else if (step.x < prev.x) sess.dir = 'left';
  else if (step.y > prev.y) sess.dir = 'down';
  else if (step.y < prev.y) sess.dir = 'up';
  sess.animStep = (sess.animStep | 0) + 1;
  sess.pos = { x: step.x, y: step.y };
  if (step.elev != null) sess.elev = step.elev;
  const uid = sess.grid.occ[step.y][step.x];
  let ev = null;
  if (typeof uid === 'number') ev = baseVisitTrigger(sess, uid);
  // Phase 44 (canon): slide RAMP HEAD → FORCED slide all the way down to
  // the reception rug to the south. The ramp is never crossed on foot.
  const ramp = baseSlideRampAt(sess.st, step.x, step.y);
  if (ramp) {
    sess.dir = 'down';
    sess.animStep = (sess.animStep | 0) + 2;
    // Phase 45 — the rug cell derives from the DRAWN slide shape (footprint
    // 2×3, since the housing is a visual overhang outside the footprint).
    const rfp = baseItemFootprint(baseItemGet('slide'), ramp.rot);
    sess.pos = { x: ramp.x + 1, y: ramp.y + rfp.d - 1 };
    sess.path = [];
    const evs = { fx: 'slide', uid: ramp.uid, item: 'slide', msg: 'base.visit.slide', stop: true };
    sess.log.push(evs);
    baseVisitSyncSubElev(sess);
    return { moved: true, ev: evs };
  }
  baseVisitSyncSubElev(sess);
  if (ev) {
    if (ev.pushBack) { sess.pos = prev; sess.path = []; baseVisitSyncSubElev(sess); }
    if (ev.teleport) {
      sess.pos = { ...ev.teleport };
      sess.path = [];
      const dc = sess.grid.layout.cells[ev.teleport.y] && sess.grid.layout.cells[ev.teleport.y][ev.teleport.x];
      if (dc) sess.elev = dc.elev;
      baseVisitSyncSubElev(sess);
    }
    if (ev.teleportSpawn) {
      const sp = sess.st.spawn || sess.grid.layout.spawn;
      sess.pos = { x: sp.x, y: sp.y }; sess.path = [];
      sess.elev = sess.grid.layout.cells[sp.y][sp.x].elev;
      baseVisitSyncSubElev(sess);
    }
    if (ev.force && !sess.broken[ev.uid]) {
      // forced step only if the target cell is walkable
      const nx = sess.pos.x + ev.force[0], ny = sess.pos.y + ev.force[1];
      if (baseVisitCellWalk(sess, nx, ny, sess.elev)) { sess.pos = { x: nx, y: ny }; }
    }
    if (ev.stop) sess.path = [];
    sess.log.push(ev);
    return { moved: true, ev };
  }
  return { moved: true };
}

// Advances along the path until exhaustion or interruption (tests/FF).
function baseVisitRunPath(sess, maxSteps) {
  let n = 0, lastEv = null;
  const cap = maxSteps || 200;
  while (sess.path.length && n < cap) {
    const r = baseVisitStepAlong(sess);
    if (!r.moved) break;
    n++;
    if (r.ev) lastEv = r.ev;
    if (r.ev && (r.ev.pushBack || r.ev.teleport || r.ev.teleportSpawn || r.ev.stop)) break;
  }
  return { steps: n, lastEv };
}

// Face-to-face interaction (talk to NPC, read board, bed, light…).
function baseVisitInteract(sess, tx, ty) {
  const uid = sess.grid.occ[ty] && sess.grid.occ[ty][tx];
  if (uid == null) return { type: 'nothing' };
  if (typeof uid === 'string' && uid.startsWith('npc:')) {
    const npc = sess.st.npcs.find((n) => 'npc:' + n.id === uid);
    if (!npc) return { type: 'nothing' };
    // Phase 47: an NPC placed but not configured yet (empty team) does
    // not offer a battle — it simply greets.
    if (!Array.isArray(npc.team) || !npc.team.length) return { type: 'npc_idle', npc };
    // Phase 52 (user feedback: "walking past the NPC burns the battle;
    // opening their panel counts as if we had already fought").
    // Two bugs in one: (1) the `talkedToday` lock limited the NPC to ONE
    // battle per visit; (2) it was set by merely OPENING the dialog, so
    // "walking past" burned the battle anyway. `talkedToday` now only
    // counts duels ACTUALLY fought (set by baseEditorLaunchNpcBattle when
    // the duel is accepted).
    return {
      type: 'npc_battle', npc,
      battle: {
        kind: 'base_npc',
        trainerName: npc.name,
        intro: npc.msgs.pre, win: npc.msgs.win, lose: npc.msgs.lose,
        team: npc.team.map((p) => ({ ...p })),
      },
    };
  }
  const it = basePlacedFind(sess.st, uid);
  if (!it) return { type: 'nothing' };
  const def = baseItemGet(it.s);
  switch (def.fx) {
    case 'heal': return { type: 'heal', item: it.s };
    case 'message': return { type: 'message', item: it.s };
    case 'light': sess.lit[uid] = !sess.lit[uid]; return { type: 'light', on: sess.lit[uid] };
    case 'punch': return { type: 'punch', item: it.s };
    case 'pc': return { type: 'pc', record: sess.st.record || null };
    case 'battle_rules': return { type: 'rules', item: it.s };
    case 'sit': return { type: 'sit', item: it.s };
    case 'invisible': sess.broken[uid] = true; return { type: 'reveal', item: it.s };
    case 'cuttable': return { type: 'msg', msg: 'base.visit.makiwara' };
    default: return { type: 'item', item: it.s };
  }
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitCreate', baseVisitCreate); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitCreate = baseVisitCreate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitNeighbors', baseVisitNeighbors); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitNeighbors = baseVisitNeighbors; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitSyncSubElev', baseVisitSyncSubElev); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitSyncSubElev = baseVisitSyncSubElev; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseFindPath', baseFindPath); } else if (typeof globalThis !== 'undefined') { globalThis.baseFindPath = baseFindPath; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitSetDestination', baseVisitSetDestination); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitSetDestination = baseVisitSetDestination; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitStepAlong', baseVisitStepAlong); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitStepAlong = baseVisitStepAlong; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitRunPath', baseVisitRunPath); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitRunPath = baseVisitRunPath; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitTrigger', baseVisitTrigger); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitTrigger = baseVisitTrigger; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitInteract', baseVisitInteract); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitInteract = baseVisitInteract; }


// --- Exported globals ---
if (typeof baseStairPass !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseStairPass', baseStairPass); } else if (typeof globalThis !== 'undefined') { globalThis.baseStairPass = baseStairPass; } }
if (typeof baseVisitCellWalk !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseVisitCellWalk', baseVisitCellWalk); } else if (typeof globalThis !== 'undefined') { globalThis.baseVisitCellWalk = baseVisitCellWalk; } }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseVisitCreate,
  baseVisitNeighbors,
  baseVisitSyncSubElev,
  baseFindPath,
  baseVisitSetDestination,
  baseVisitStepAlong,
  baseVisitRunPath,
  baseVisitTrigger,
  baseVisitInteract,
  baseStairPass,
  baseVisitCellWalk,
};

