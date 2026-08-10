import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 33: secret-base engine (no rendering) ───────────────────────────
//  A. Catalog + layouts + i18n integrity
//  B. Placement rules (layers, limits, rotation, anti-blocking, cap 26)
//  C. Stock / cascading pickup / moving out
//  D. Visit: pathfinding, elevation (stairs), ORAS traps, NPCs
//  E. JSON exchange: strict export/import, nothing is ever credited
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const SANDBOX_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/application/game-state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/application/base/base-core.js',
  'src/ui/game/base/base-visit.js',
  'src/ui/game/base/base-exchange.js',
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
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, click() {}, remove() {} }),
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe33-base [iife]' });
  return sandbox;
}

// ——— A — Catalogue, layouts, i18n ————————————————————————————————————————
test('phase 33 A: coherent catalog + 12 canon layouts + complete FR/EN i18n', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    const slugs = new Set();
    for (const it of BASE_ITEMS) {
      if (slugs.has(it.s)) throw new Error('doublon ' + it.s);
      slugs.add(it.s);
      if (!BASE_ITEM_CATEGORIES.includes(it.cat)) throw new Error('cat inconnue ' + it.s);
      if (it.rot !== 0) throw new Error('rot must be 0 (pass 42) ' + it.s);
      if (!['floor', 'wall', 'surface'].includes(it.layer)) throw new Error('layer invalide ' + it.s);
    }
    window._cats = BASE_ITEM_CATEGORIES.length;
    window._n = BASE_ITEMS.length;
    window._layouts = baseLayoutIds().length;
  `, sb);
  assert.equal(vm.runInContext('window._cats', sb), 8, '8 RSE canon categories (phase 42)');
  assert.equal(vm.runInContext('window._n', sb), 122, '122 objects (120 RSE canon + stairs/pc — phase 43: welcome mat removed)');
  assert.equal(vm.runInContext('window._layouts', sb), 36, '36 layouts (24 canon + 6 custom + 6 colored multi-floor caves, phase 42)');
  // phase 42: rotation removed (RSE canon has none) — kept at 1
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('surf_mat'))`, sb), 1, 'mat: fixed (rotation removed)');
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('small_desk'))`, sb), 1, 'desk: fixed (rotation removed)');
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('blue_poster'))`, sb), 1, 'mural : fixe');
  vm.runInContext(`
    for (const it of BASE_ITEMS) {
      for (const lang of ['fr', 'en']) {
        const dict = I18N[lang] && I18N[lang].base && I18N[lang].base.i;
        if (!dict || !dict[it.s]) throw new Error(lang + ' manque nom ' + it.s);
      }
    }
    for (const lang of ['fr', 'en']) {
      const v = I18N[lang].base.visit, e = I18N[lang].base.err;
      for (const k of ['burst','glitter','jump','spin','door_break','note']) if (!v[k]) throw new Error(lang + ' visit.' + k);
      for (const k of ['occupied','needs_surface','wall_only','blocks_spawn','max_placed','import_json']) if (!e[k]) throw new Error(lang + ' err.' + k);
      if (!Array.isArray(I18N[lang].base.notes) || I18N[lang].base.notes.length !== 8) throw new Error(lang + ' notes');
    }
    window._i18n_ok = true;
  `, sb);
  assert.ok(vm.runInContext('window._i18n_ok', sb), 'names + messages in both languages');
  // Game default language = EN; both locales are checked explicitly.
  assert.equal(vm.runInContext(`(G.lang='fr', t('base.i.surf_mat'))`, sb), 'Tapis Surf');
  assert.equal(vm.runInContext(`(G.lang='en', t('base.i.surf_mat'))`, sb), 'Surf Mat');
});

// ——— B — Placement rules ————————————————————————————————————————————————
test('phase 33 B: layers, limits, holes/boards (canon cave_1 layout)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`
    const r = {};
    const st = baseGetState();
    baseDebugCreate('cave_1');   // SecretBase_BrownCave1: 11×9, E(5,8), S(2,2), hole o(5,2)
    baseDebugGrantAll();
    r.pcAuto = st.items.some((i) => i.s === 'pc');
    r.deskOk = basePlace(st, 'small_desk', 1, 5, 0).ok;
    r.deskOccupied = baseCanPlace(st, 'small_desk', 1, 5, 0).reason;
    r.deskOob = baseCanPlace(st, 'small_desk', 40, 40, 0).reason;
    r.deskEntrance = baseCanPlace(st, 'small_desk', 5, 8, 0).reason;
    r.deskSpawn = baseCanPlace(st, 'small_desk', 5, 7, 0).reason;   // spawn point S not decorable (pass 43: in front of the door)
    r.matOk = basePlace(st, 'surf_mat', 6, 3, 0).ok;   // 3×3 mat in the southeast
    r.dollFloor = baseCanPlace(st, 'torchic_doll', 4, 5, 0).ok;   // pass 39: doll ON THE FLOOR allowed
    r.dollOnMat = basePlace(st, 'torchic_doll', 6, 3, 0).ok;
    r.dollTaken = baseCanPlace(st, 'azurill_doll', 6, 3, 0).reason;
    r.posterWallOk = baseCanPlace(st, 'blue_poster', 5, 0, 0).ok;   // north wall, floor to the south
    r.posterFloor = baseCanPlace(st, 'blue_poster', 3, 3, 0).reason;
    r.boardOk = basePlace(st, 'solid_board', 3, 5, 0).ok; // passe 42: board placeable on bare floor
    r.stairsWrong = baseCanPlace(st, 'stairs', 1, 3, 0).reason;     // RSE: no stairs anchor
    JSON.stringify(r);
  `, sb));
  assert.equal(out.pcAuto, true, 'automatic PC (phase 43: no more visible welcome mat)');
  assert.equal(out.deskOk, true, 'desk placed on the floor');
  assert.equal(out.deskOccupied, 'base.err.occupied');
  assert.equal(out.deskOob, 'base.err.out_of_bounds');
  assert.equal(out.deskEntrance, 'base.err.entrance', 'the entrance stays free');
  assert.equal(out.deskSpawn, 'base.err.entrance', 'the arrival point (metatile 544) stays free');
  assert.equal(out.matOk, true);
  assert.equal(out.dollFloor, true, 'floor doll allowed (phase 39, user decision)');
  assert.equal(out.dollOnMat, true, 'doll on the rug');
  assert.equal(out.dollTaken, 'base.err.surface_taken', 'a single doll per cell');
  assert.equal(out.posterWallOk, true, 'poster on wall near the floor');
  assert.equal(out.posterFloor, 'base.err.wall_only', 'poster forbidden on the floor');
  assert.equal(out.boardOk, true, 'board placeable on bare floor (phase 42)');
  assert.equal(out.stairsWrong, 'base.err.stairs_anchor', 'RSE: no second level → stairs always refused');
  // dimensions canon DECORSHAPE (header.h) — heavy_desk = 3×2 ; passe 42 :
  // rotation removed → the footprint NEVER swaps (index ignored).
  assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify(baseItemFootprint(baseItemGet('heavy_desk'), 0))`, sb)), { w: 3, d: 2 });
  assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify(baseItemFootprint(baseItemGet('heavy_desk'), 1))`, sb)), { w: 3, d: 2 }, 'rotation removed: unchanged footprint');
  assert.equal(vm.runInContext(`
    baseStockAdd(baseGetState(), 'solid_board', 1);   // debug only gives one: 1st placed at (3,5)
    basePlace(baseGetState(), 'solid_board', 5, 2, 0).ok
  `, sb), true, 'board on the canonical hole (5,2)');
  assert.equal(vm.runInContext(`baseCellWalkable(baseGetState(), baseBuildGrid(baseGetState()), 5, 2, null)`, sb), true, 'filled hole crossable');
});

test('phase 33 B2: BFS anti-blocking + canon cap of 26', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    const st = baseGetState();
    baseDebugCreate('cave_1');   // passe 43: S fixed in front of the door (5,7) — the
    baseDebugGrantAll();         // curtain y=4 would seal the north (9,5 = wall!)
    baseStockAdd(st, 'small_desk', 7);  // debug only gives one: we top up
    const npc = baseNpcAdd(st, { name: 'Rex', team: [{ id: 25, level: 20, moves: ['thunderbolt'] }] });
    window._npcPlace = baseNpcPlace(st, npc.id, 3, 2).ok;  // copain AU NORD
    window._poses = [];
    for (let x = 1; x <= 7; x++) window._poses.push(basePlace(st, 'small_desk', x, 4, 0).ok);
    window._blocking = baseCanPlace(st, 'small_desk', 8, 4, 0).reason;
  `, sb);
  assert.equal(vm.runInContext('window._npcPlace', sb), true, 'buddy placed north');
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(window._poses)', sb)), [true, true, true, true, true, true, true]);
  // phase 43: the curtain seals the buddy to the north → blocks_npc (the fixed
  // spawn in front of the south door can no longer be cut off; canon
  // protection goes through NPCs, always reachable from the entrance).
  assert.equal(vm.runInContext('window._blocking', sb), 'base.err.blocks_npc', 'the full curtain is refused (sealed buddy)');
  // cap 26 (synthetic: only placed objects are counted, canonical)
  assert.equal(vm.runInContext(`
    const st2 = baseGetState();
    for (let i = 0; i < 26; i++) st2.items.push({ uid: 1000 + i, s: 'small_desk', x: 1, y: 1, rot: 0 });
    baseCanPlace(st2, 'small_desk', 5, 5, 0).reason;
  `, sb), 'base.err.max_placed', '26 objets max (limite ROSA)');
});

// ——— C — Stock, cascading pickup, moving out ————————————————————————————
test('phase 33 C: cascading pickup + relocate keeps furniture and NPCs', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    const st = baseGetState();
    baseDebugCreate('bush_1');
    baseDebugGrantAll();
    basePlace(st, 'surf_mat', 1, 3, 0);
    basePlace(st, 'charizard_doll', 1, 3, 0);
    const matUid = st.items.find((i) => i.s === 'surf_mat').uid;
    window._picked = basePickup(st, matUid);
    window._dollBack = baseStockCount(st, 'charizard_doll');
    window._matBack = baseStockCount(st, 'surf_mat');
    // pass 39: a doll on a picked-up holder STAYS on the floor (floor allowed)
    const doll = st.items.find((i) => i.s === 'charizard_doll');
    window._dollStayed = !!(doll && doll.x === 1 && doll.y === 3);
    const npc = baseNpcAdd(st, { name: 'Léo', sprite: 'camper', team: [{ id: 25, level: 50, moves: ['thunderbolt'], talent: 'static' }], msgs: { pre: 'Go !', win: 'Bravo !', lose: 'Bien joué !' } });
    window._npcOk = npc.ok;
    window._npcPlaced = baseNpcPlace(st, npc.id, 5, 4).ok;
    window._reloc = baseRelocate(st, 'tree_2');
    window._npcInStock = st.npcStock.length;
    window._npcsLeft = st.npcs.length;
    window._stockLeft = Object.keys(st.stock).length;
    window._layout = st.layoutId;
  `, sb);
  // phase 39 (user decision): doll/cushion on the floor = legal → picking
  // up the carrier leaves the doll placed on the floor (re-validated); only
  // the rug alone goes back to stock.
  assert.equal(vm.runInContext('window._picked', sb), 1, 'the rug alone goes back to stock');
  assert.equal(vm.runInContext('window._dollBack', sb), 0, 'doll NOT picked up');
  assert.equal(vm.runInContext('window._matBack', sb), 1, 'mat recovered');
  assert.equal(vm.runInContext('window._dollStayed', sb), true, 'the doll stays on the floor in its place');
  assert.equal(vm.runInContext('window._npcOk', sb), true);
  assert.equal(vm.runInContext('window._npcPlaced', sb), true);
  assert.equal(vm.runInContext('window._reloc.ok', sb), true);
  assert.equal(vm.runInContext('window._npcsLeft', sb), 0, 'NPC removed from the base');
  assert.equal(vm.runInContext('window._npcInStock', sb), 0, 'NPC deleted on move-out (requested fix: no invisible bank)');
  assert.equal(vm.runInContext('window._layout', sb), 'tree_2');
  assert.ok(vm.runInContext('window._stockLeft', sb) >= 2, 'furniture kept on relocation');
});

// ——— D — Visit: movement, elevation, traps, NPCs —————————————————————
test('phase 33 D: visit, board over hole and FRLG traps (canon cave_1 layout)', () => {
  const sb = makeSandbox();
  vm.runInContext(`{
    const st = baseGetState();
    baseDebugCreate('cave_1');   // S(2,2), E(5,8), hole o(5,2) — RSE: single level, no stairs
    baseDebugGrantAll();
    // Phase A: board ONLY — traps come after, otherwise the path
    // to the hole would cross the square-one mat.
    basePlace(st, 'solid_board', 5, 2, 0);   // board on the canonical hole
    const sessA = baseVisitCreate(st);       // the visit clones the state! start = spawn point S
    // 1) spawn → hole path (walkable only thanks to the board)
    window._pathLen = (baseVisitSetDestination(sessA, 5, 2) || []).length;
    while (sessA.path.length) baseVisitStepAlong(sessA);
    window._posTop = JSON.stringify([sessA.pos.x, sessA.pos.y]);
    window._elevTop = sessA.elev;            // RSE: no second level → always 0
    // Phase B: canon traps placed, new session cloned from the spawn
    basePlace(st, 'spin_mat', 6, 6, 0);      // spin mat: pushes backward
    basePlace(st, 'd_note_mat', 7, 6, 0);    // D note mat (note 1, fixed)
    const sessB = baseVisitCreate(st);
    // 2) spin: the visitor is PUSHED BACK to the previous tile (never on 6,6)
    baseVisitSetDestination(sessB, 6, 6);
    let before = JSON.stringify([sessB.pos.x, sessB.pos.y]);
    const seq = [];
    while (sessB.path.length) {
      before = JSON.stringify([sessB.pos.x, sessB.pos.y]);
      const stepR = baseVisitStepAlong(sessB);
      if (stepR.ev && stepR.ev.msg === 'base.visit.spin') seq.push('push');
    }
    window._spinPushed = seq.length ? seq[seq.length - 1] : null;
    window._afterSpin = JSON.stringify([sessB.pos.x, sessB.pos.y]);
    window._beforeSpin = before;
    // 3) canon note mat: D = note 1 (rotation removed → fixed)
    baseVisitSetDestination(sessB, 7, 6);
    window._note = null;
    while (sessB.path.length) { const r = baseVisitStepAlong(sessB); if (r.ev && r.ev.msg === 'base.visit.note') window._note = r.ev.note; }
  }`, sb);
  assert.ok(vm.runInContext('window._pathLen', sb) > 0, 'path to the hole via the board');
  assert.equal(vm.runInContext('window._posTop', sb), '[5,2]');
  assert.equal(vm.runInContext('window._elevTop', sb), 0, 'RSE: everything is single-floor (no upper floor)');
  assert.equal(vm.runInContext('window._spinPushed', sb), 'push', 'spin: visitor pushed back');
  assert.equal(vm.runInContext('window._afterSpin', sb), vm.runInContext('window._beforeSpin', sb), 'spin: back to the previous tile');
  assert.equal(vm.runInContext('window._note', sb), 1, 'D note mat = note 1 (fixed)');

  // 4) canonical jump mat (phase 42: ORAS warp panels no longer exist)
  const jump = JSON.parse(vm.runInContext(`{
    const stw = baseGetState();
    baseStockAdd(stw, 'jump_mat', 1);   // the debug only gives one
    basePlace(stw, 'jump_mat', 5, 5, 0);
    const sess2 = baseVisitCreate(stw);
    baseVisitSetDestination(sess2, 5, 5);
    let ev = null;
    while (sess2.path.length) { const r = baseVisitStepAlong(sess2); if (r.ev) ev = r.ev; }
    JSON.stringify({ ev: ev && ev.msg, pos: [sess2.pos.x, sess2.pos.y] });
  }`, sb));
  assert.equal(jump.ev, 'base.visit.jump', 'jump mat: canon message');
  assert.deepEqual(jump.pos, [5, 5], 'the visitor reaches the mat');

  // 5) NPC: talk → bounded battle, once per visit
  const n = JSON.parse(vm.runInContext(`{
    const st3 = baseGetState();
    const added = baseNpcAdd(st3, { name: 'Léo', sprite: 'camper', team: [{ id: 25, level: 50, moves: ['thunderbolt'], talent: 'static' }] });
    baseNpcPlace(st3, added.id, 1, 5);
    const sess3 = baseVisitCreate(st3);
    const first = baseVisitInteract(sess3, 1, 5);
    const second = baseVisitInteract(sess3, 1, 5);
    JSON.stringify({ t1: first.type, kind: first.battle && first.battle.kind, team: first.battle && first.battle.team.length, t2: second.type });
  }`, sb));
  assert.equal(n.t1, 'npc_battle', 'talking to the NPC offers the battle');
  assert.equal(n.kind, 'base_npc');
  assert.equal(n.team, 1);
  // Phase 52 (user feedback: "we must be able to battle it as much
  //    as we want"): no more one-battle-per-visit lock. Opening the
  //    dialogue no longer consumes anything either — that was the second bug:
  //    "walking away" still burned the duel.
  assert.equal(n.t2, 'npc_battle', 'the NPC stays battleable as many times as wanted');

  // 6) canonical balloon (burst fx): pops exactly ONCE per visit (base
  //    reset flat to isolate the trap from other already-placed mechanisms)
  const pit = JSON.parse(vm.runInContext(`{
    const st4 = baseGetState();
    baseRelocate(st4, 'cave_1');
    baseStockAdd(st4, 'yellow_balloon', 1);
    basePlace(st4, 'yellow_balloon', 3, 3, 0);
    const sess4 = baseVisitCreate(st4);
    baseVisitSetDestination(sess4, 3, 3);
    let first = null, second = null;
    while (sess4.path.length) { const r = baseVisitStepAlong(sess4); if (r.ev) first = r.ev; }
    baseVisitSetDestination(sess4, 3, 6);
    while (sess4.path.length) baseVisitStepAlong(sess4);
    baseVisitSetDestination(sess4, 3, 3);
    while (sess4.path.length) { const r = baseVisitStepAlong(sess4); if (r.ev) second = r.ev; }
    JSON.stringify({ first: first && first.msg, second: second && second.msg, stopped: sess4.pos.x + ',' + sess4.pos.y });
  }`, sb));
  assert.equal(pit.first, 'base.visit.burst', 'balloon burst on the way');
  assert.equal(pit.second, null, 'the same balloon does not re-inflate during the visit');
});

// ——— E — JSON exchange —————————————————————————————————————————————————————
test('phase 33 E: strict export/import — visit only, nothing is credited', () => {
  const sb = makeSandbox();
  vm.runInContext(`{
    const st = baseGetState();
    baseDebugCreate('tree_1');
    baseDebugGrantAll();
    basePlace(st, 'small_desk', 3, 3, 0);
    basePlace(st, 'surf_mat', 4, 3, 0);
    basePlace(st, 'blastoise_doll', 4, 3, 0);
    const npc = baseNpcAdd(st, { name: 'Élise<b>', team: [{ id: 6, level: 256, moves: ['flamethrower', 'wing', 'x5', 'y6', 'z7'] }] });
    baseNpcPlace(st, npc.id, 2, 4);
    st.record.w = 7;
    window._json = baseExportString(st, 'Dresseur');
    window._stockBefore = JSON.stringify(Object.keys(st.stock).sort());
  }`, sb);
  assert.ok(vm.runInContext('window._json', sb).includes('pw-secret-base'), 'type marker present');

  const imp = JSON.parse(vm.runInContext(`{
    const chk = baseImportValidate(window._json);
    JSON.stringify({ ok: chk.ok, items: chk.visit.items.length, npcs: chk.visit.npcs.length,
      npcLvl: chk.visit.npcs[0].team[0].level, npcMoves: chk.visit.npcs[0].team[0].moves.length,
      npcName: chk.visit.npcs[0].name, recW: chk.meta.record.w });
  }`, sb));
  assert.equal(imp.ok, true, 'import accepted');
  assert.equal(imp.items, 4, '3 objects + PC (auto — phase 43: no more welcome mat)');
  assert.equal(imp.npcs, 1);
  assert.equal(imp.npcLvl, 100, 'level capped at 100');
  assert.equal(imp.npcMoves, 4, '4 coups max');
  assert.equal(imp.npcName.includes('<'), false, 'HTML cleaned from names');
  assert.equal(imp.recW, 7, 'record carried over');

  // nothing is credited to the player by the visit
  assert.equal(vm.runInContext(`
    baseVisitFromJson(window._json);
    JSON.stringify(Object.keys(baseGetState().stock).sort());
  `, sb), vm.runInContext('window._stockBefore', sb), 'no gifted item on import');

  // rejets stricts
  assert.equal(vm.runInContext(`baseImportValidate('not the json').reason`, sb), 'base.err.import_json');
  assert.equal(vm.runInContext(`baseImportValidate('{"kind":"autre"}').reason`, sb), 'base.err.import_kind');
  assert.equal(vm.runInContext(`baseImportValidate(JSON.stringify({kind:'pw-secret-base', v:99})).reason`, sb), 'base.err.import_version');
  assert.equal(vm.runInContext(`
    const dr = JSON.parse(window._json);
    dr.items = new Array(40).fill(dr.items[1]);
    baseImportValidate(JSON.stringify(dr)).reason;
  `, sb), 'base.err.import_items', 'too many items rejected');

  // out-of-bounds tampered object → cleanly discarded
  const t2 = JSON.parse(vm.runInContext(`{
    const d = JSON.parse(window._json);
    d.items[0].x = 99;
    const chk2 = baseImportValidate(JSON.stringify(d));
    JSON.stringify({ ok: chk2.ok, items: chk2.visit.items.length });
  }`, sb));
  assert.equal(t2.ok, true, 'partially valid file accepted');
  assert.equal(t2.items, 3, 'tampered object (items[0]) discarded, the 3 others kept (+ PC phase 40)');

  // and the friend's base visit starts
  assert.equal(vm.runInContext(`baseVisitFromJson(window._json).ok`, sb), true);
});

