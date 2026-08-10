import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { fileURLToPath } from 'node:url';

// ── Phase 38: 2D placement editor + interactive visit + buddy battle ───────
//  A. Selection from stock → place on click (stock decremented, selection
//     auto-released when exhausted), illegal placement → i18n reason
//  B. Placement ghost (green/red + reason) and mouse → tile conversion
//     (CSS scale handled, out-of-bounds → null)
//  C. Rotating placed furniture (90° bench) + pickup taking along
//     orphaned "surface" objects (desk + doll)
//  D. Visit: start from spawn, touch-to-walk towards a buddy (blocked
//     tile → neighbor tile), face-to-face interaction, bounded battle
//     (startBattle 'base_npc' field, instantiated team, 1× per visit),
//     owner record credited; visiting a friend's file WITHOUT credit
//  E. UI/battle wiring: index.html (bar+actions), postboot, loader,
//     styles, hooks battle (victoire/blackout/abandon), getChampName
//  F. WebGL2 guard: 3D disabled without GL, 2D fallback, visit forced to 2D
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

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

function makeSandbox(withBattleStubs) {
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
  vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: 'passe38-editeur-visite [iife]' });
  if (withBattleStubs) {
    // Battle stand-ins: the bounded duel is tested WITHOUT the real-time engine.
    vm.runInContext(`
      var MOVES = { tackle: { name: 'Charge' }, growl: { name: 'Rugissement' } };
      function createPoke(id, level, shiny) {
        return { id, level, shiny: !!shiny, name: '#' + id, maxHP: 20, currentHP: 20, moves: [{ id: 'tackle' }], talent: null };
      }
      var battle = { active: false };
      var _launches = [];
      function startBattle(enemyPoke, isChamp, champId, team) {
        battle.active = true; battle.isChamp = isChamp; battle.champId = champId; battle.champTeam = team;
        _launches.push({ champId, n: (team || []).length });
        return true;
      }
      function addBattleLog() {}
    `, sandbox);
  }
  return sandbox;
}

// Shared test furnishing: covered hole, desk, buddy to the south.
const FURNISH = `
  const st = baseGetState();
  baseDebugCreate('cave_1');
  baseDebugGrantAll();
  basePlace(st, 'solid_board', 5, 2, 0);            // filled hole (canon)
  baseNpcAdd(st, { name: 'Leo', sprite: 'youngster',
    team: [{ id: 25, level: 50, moves: ['tackle', 'growl'], talent: null, shiny: false }],
    msgs: { pre: 'Go !', win: 'Bien joué.', lose: 'Ouch…' } });
  const npcId = st.npcStock[0].id;
  baseNpcPlace(st, npcId, 2, 6);
`;

// ——— A — Stock → click placement ————————————————————————————————————————————
test('phase 38 A: stock selection then click-placement, stock decremented, auto-release', () => {
  const sb = makeSandbox(false);
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const ed = baseEditorGet();
    const r = { sel: null, placeOk: null, selAfter: 'x', reSel: 'x', bad: null, stockLeft: -1 };
    r.sel = baseEditorSelectSlug(st, 'small_desk');
    r.slugInState = ed.slug;
    const p = baseEditorClickCell(st, 1, 3);
    r.placeOk = p.ok === true && p.type === 'place';
    const it = st.items.find((i) => i.s === 'small_desk');
    r.at = it ? it.x + ',' + it.y : null;
    r.selAfter = ed.slug;                 // stock exhausted (1 copy) → released
    r.stockLeft = baseStockCount(st, 'small_desk');
    r.reSel = baseEditorSelectSlug(st, 'small_desk'); // nothing left in stock
    baseEditorSelectSlug(st, 'pokemon_desk');
    const bad = baseEditorClickCell(st, 5, 7);        // S = spawn point (pass 43: in front of the door)
    r.bad = { ok: bad.ok, reason: bad.reason, kept: ed.slug, stock: baseStockCount(st, 'pokemon_desk') };
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.sel, 'small_desk');
  assert.equal(out.slugInState, 'small_desk');
  assert.equal(out.placeOk, true, 'click placement accepted');
  assert.equal(out.at, '1,3');
  assert.equal(out.selAfter, null, 'selection released once stock is exhausted');
  assert.equal(out.stockLeft, 0);
  assert.equal(out.reSel, null, 'cannot re-select an exhausted item');
  assert.equal(out.bad.ok, false);
  assert.equal(out.bad.reason, 'base.err.entrance', 'i18n reason surfaced');
  assert.equal(out.bad.kept, 'pokemon_desk', 'selection kept after a refusal');
  assert.equal(out.bad.stock, 1, 'stock intact after a refusal');
});

// ——— B — Ghost + mouse geometry ——————————————————————————————————————
test('phase 38 B: green/red ghost + baseEditorCellFromEvent (CSS scale, bounds)', () => {
  const sb = makeSandbox(false);
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    baseEditorSelectSlug(st, 'red_poster');
    baseEditorSetHover({ x: 5, y: 0 });              // north wall, floor to the south → canon
    const g1 = baseEditorGhost(st);
    baseEditorSetHover({ x: 5, y: 8 });              // exit mat (floor)
    const g2 = baseEditorGhost(st);
    baseEditorSetHover(null);
    const g3 = baseEditorGhost(st);
    // buddy ghost: bare hole tile → red
    baseEditorSelectSlug(st, null);
    baseNpcAdd(st, { name: 'N', sprite: 's', team: [{ id: 1, level: 5, moves: [], talent: null, shiny: false }], msgs: {} });
    baseEditorSelectNpc(st, st.npcStock[0].id);
    baseEditorSetHover({ x: 5, y: 2 });
    const g4 = baseEditorGhost(st);
    // mouse: 360×296 canvas (11×9 tiles of 32px + 4 margin), rect at scale 1 then 0.5
    const L = baseLayoutGet('cave_1');
    const fake = (rw, rh) => ({ width: L.w * 32 + 8, height: L.h * 32 + 8,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: rw, height: rh, right: 10 + rw, bottom: 20 + rh }) });
    const c1 = baseEditorCellFromEvent(st, fake(360, 296), { clientX: 51, clientY: 61 });
    const c2 = baseEditorCellFromEvent(st, fake(180, 148), { clientX: 10 + 18.5, clientY: 20 + 18.5 });
    const c3 = baseEditorCellFromEvent(st, fake(360, 296), { clientX: 0, clientY: 0 });
    return JSON.stringify({ g1, g2, g3, g4, c1, c2, c3 });
  })()`, sb));
  assert.equal(out.g1.ok, true, 'poster: north wall with floor to the south → green');
  assert.equal(out.g1.slug, 'red_poster');
  assert.equal(out.g1.w >= 1 && out.g1.d >= 1, true);
  assert.equal(out.g2.ok, false, 'poster on the exit (floor) → red');
  assert.ok(String(out.g2.reason).startsWith('base.err.'), 'i18n reason present');
  assert.equal(out.g3, null, 'no ghost without hover');
  assert.equal(out.g4.ok, false, 'buddy on a bare hole → red');
  assert.equal(out.g4.npc, true);
  assert.deepEqual(out.c1, { x: 1, y: 1 }, 'scale 1: tile (1,1)');
  assert.deepEqual(out.c2, { x: 1, y: 1 }, 'scale 0.5: same tile (CSS scaling handled)');
  assert.equal(out.c3, null, 'hors-limites → null');
});

// ——— C — Placement rotation + chained pickup ———————————————————————————————
test('phase 38 C: pivot of placed furniture + pickup taking the doll along', () => {
  const sb = makeSandbox(false);
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const ed = baseEditorGet();
    // Red brick 1×2 (canon, replaces the old ORAS "bench"): ONE click —
    // even on the 2nd tile of the footprint — = direct pickup (pass 41).
    // Pass 42: ROTATION REMOVED → the pivot is cleanly refused,
    // the item keeps its canon orientation (Emerald 2D art direction).
    basePlace(st, 'red_brick', 2, 4, 0);
    const sel1 = baseEditorClickCell(st, 2, 5);       // second cell of the 1×2 footprint
    const r1 = baseEditorRotateSel(st);               // no effect (rotation removed)
    const bench = st.items.find((i) => i.s === 'red_brick');
    const repose = baseEditorClickCell(st, 2, 4);     // placed back as is
    // Desk + "surface" doll on top
    basePlace(st, 'small_desk', 4, 4, 0);
    basePlace(st, 'pichu_doll', 4, 4, 0);             // surface layer ON the desk
    const pichu = st.items.find((i) => i.s === 'pichu_doll');
    const desk = st.items.find((i) => i.s === 'small_desk');
    const sel2 = baseEditorClickCell(st, 4, 4);       // priority to the surface
    const held2 = baseEditorGet().moveUid;
    const pk1 = baseEditorPickupSel(st);              // "Pick up" PUTS AWAY the held doll
    const sel3 = baseEditorClickCell(st, 4, 4);       // now: the desk
    const held3 = baseEditorGet().moveUid;
    const pk2 = baseEditorPickupSel(st);              // range aussi le bureau tenu
    const left = st.items.filter((i) => i.s === 'small_desk' || i.s === 'pichu_doll').length;
    return JSON.stringify({
      sel1: sel1.type,
      rotOk: r1.ok === false, reposeOk: repose.ok === true,
      benchRot: bench.rot,
      fpAfter: baseItemFootprint(baseItemGet('red_brick'), bench.rot),
      sel2: sel2.type, sel2IsPichu: held2 === pichu.uid,
      pk1, sel3: sel3.type, sel3IsDesk: held3 === desk.uid, pk2,
      left,
      stockDesk: baseStockCount(st, 'small_desk'), stockPichu: baseStockCount(st, 'pichu_doll'),
    });
  })()`, sb));
  assert.equal(out.sel1, 'move_start', 'ONE click on the footprint\'s 2nd tile picks up the brick');
  assert.equal(out.rotOk, true, 'pivot cleanly refused (rotation removed — phase 42)');
  assert.equal(out.reposeOk, true, 'lands back in the same place');
  assert.equal(out.benchRot, 0, 'orientation unchanged (0 — no rotation)');
  assert.deepEqual(out.fpAfter, { w: 1, d: 2 }, 'empreinte 1×2 canon fixe');
  assert.equal(out.sel2, 'move_start');
  assert.equal(out.sel2IsPichu, true, 'the (surface) doll is taken first');
  assert.equal(out.pk1.ok, true, '"Pick up" stores the held doll');
  assert.equal(out.sel3, 'move_start', 'then the desk');
  assert.equal(out.sel3IsDesk, true, 'the desk is indeed the held furniture');
  assert.equal(out.pk2.ok, true);
  assert.equal(out.left, 0, 'desk and doll stored');
  assert.equal(out.stockDesk, 1);
  assert.equal(out.stockPichu, 1);
});

// ——— D — Interactive visit + bounded battle + record ————————————————————
test('phase 38 D: tap-to-move visit, buddy interaction, bounded battle, record credited', () => {
  const sb = makeSandbox(true);
  const out = JSON.parse(vm.runInContext(`(() => {
    ${FURNISH}
    const r = {};
    const rec0 = { ...st.record };
    const start = baseEditorStartVisit(st, { name: '', source: 'own' });
    r.startOk = start.ok === true;
    r.mode = baseEditorGet().mode;
    r.pos0 = baseEditorGet().visit.pos.x + ',' + baseEditorGet().visit.pos.y;
    r.visits = st.record.visits;
    // Click ON the buddy (2,6) from the spawn → too far: approach it
    const mv = baseEditorVisitClick(2, 6);
    r.moveType = mv.type;
    r.moveSteps = mv.steps;
    // Pass 46: clicking a buddy FROM A DISTANCE approaches it — we walk up to it
    // and the interaction fires ALL BY ITSELF on arrival (user
    // feedback: "a visit interaction when you click it").
    let guard = 0, arrival = null;
    while (guard++ < 40) {
      const tk = baseEditorVisitTick();
      if (tk.interact) arrival = tk.interact;
      if (tk.done) break;
    }
    const v = baseEditorGet().visit;
    r.pos1 = v.pos.x + ',' + v.pos.y;
    r.adjacent = Math.abs(v.pos.x - 2) + Math.abs(v.pos.y - 6) === 1;
    r.autoInteract = arrival && arrival.type;
    const it = { type: 'interact', res: arrival };
    r.interact = it.type;
    r.battleType = it.res && it.res.type;
    const launch = baseEditorLaunchNpcBattle(it.res);
    r.launchOk = launch.ok === true;
    r.champId = battle.champId;
    r.isNpcBattle = battle.isBaseNpcBattle === true;
    r.npcName = battle.baseNpcName;
    r.noCatch = battle.noAutoCatch === true;
    r.teamLen = battle.champTeam.length;
    r.teamMoves = battle.champTeam[0].moves.map((m) => m.id);
    r.teamLevel = battle.champTeam[0].level;
    r.teamShiny = !!battle.champTeam[0].shiny;
    r.launches = _launches.length;
    // Visitor victory → owner record: l++; session: battlesWon++
    battle.active = false;
    r.credit = baseEditorCreditBattle(true);
    r.recL = st.record.l; r.recW = st.record.w;
    r.sessW = v.battlesWon;
    // 1 combat par copain et par visite
    // 1 battle per buddy per visit: re-approaching restarts nothing
    const again = baseEditorVisitClick(2, 6);
    r.again = (again.res && again.res.type)
      || (baseVisitInteract(baseEditorGet().visit, 2, 6).type);
    const sum = baseEditorStopVisit();
    r.sum = sum; r.modeAfter = baseEditorGet().mode;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.startOk, true);
  assert.equal(out.mode, 'visit');
  assert.equal(out.pos0, '5,7', 'start at the S arrival point (phase 43: in front of the door)');
  assert.equal(out.visits, 1, 'visit counted on the owner record');
  assert.equal(out.moveType, 'move', 'tile occupied at distance → neighbor approach');
  assert.ok(out.moveSteps >= 2);
  assert.notEqual(out.pos1, '5,7', 'the visitor walked');
  assert.equal(out.adjacent, true, 'stop face to the buddy');
  assert.equal(out.interact, 'interact');
  assert.equal(out.battleType, 'npc_battle');
  assert.equal(out.launchOk, true, 'bounded battle started');
  assert.equal(out.champId, 'base_npc');
  assert.equal(out.isNpcBattle, true);
  assert.equal(out.npcName, 'Leo');
  assert.equal(out.noCatch, true, 'never a capture at a buddy\'s');
  assert.equal(out.teamLen, 1);
  assert.deepEqual(out.teamMoves, ['tackle', 'growl'], 'named moves instantiated as objects');
  assert.equal(out.teamLevel, 50);
  assert.equal(out.teamShiny, false);
  assert.equal(out.launches, 1, 'a single duel launched');
  assert.equal(out.credit, true);
  assert.equal(out.recL, 1, 'buddy beaten → l++ (owner point of view, canon)');
  assert.equal(out.recW, 0);
  assert.equal(out.sessW, 1);
  // Phase 52 (user feedback: "we must be able to battle it as much
  //    as we want"): no more one-battle-per-visit lock. Opening the
  //    dialogue no longer consumes anything either — that was the second bug:
  //    "walking away" still burned the duel.
  assert.equal(out.again, 'npc_battle', 'the NPC stays battleable — rematch possible');
  assert.deepEqual(out.sum, { w: 1, l: 0 });
  assert.equal(out.modeAfter, 'edit');
});

test('phase 38 D2: bounded team conversion + friend\'s-file visit WITHOUT credit', () => {
  const sb = makeSandbox(true);
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    // Conversion: id/level bounds, unknown moves filtered, 4 max, shiny/ability
    const team = baseNpcTeamToChampTeam([
      { id: 9999, level: 0, moves: ['tackle', 'nope', 'growl', 'tackle', 'growl', 'nope2'], talent: 'statik', shiny: true },
      { id: -5, level: 250, moves: null, talent: null, shiny: false },
    ]);
    r.t0 = { id: team[0].id, level: team[0].level, shiny: team[0].shiny, talent: team[0].talent, moves: team[0].moves.map((m) => m.id) };
    r.t1 = { id: team[1].id, level: team[1].level, moves: team[1].moves.map((m) => m.id) };
    r.empty = baseNpcTeamToChampTeam(null).length === 0;
    // Export → visit by file: NO credit on the local record
    ${FURNISH}
    const txt = baseExportString(st, 'Ami');
    const res = baseVisitFromJson(txt);
    r.importOk = res.ok === true;
    r.adopt = baseEditorAdoptVisit(res.sess, { name: res.meta.name, source: 'import' }).ok === true;
    r.own = baseEditorGet().visitOwn;
    r.winsBefore = res.sess.battlesWon;
    r.recBefore = { w: st.record.w, l: st.record.l, v: st.record.visits };
    baseEditorCreditBattle(true);
    const v = baseEditorGet().visit;
    r.sessW = v.battlesWon;
    r.recAfter = { w: st.record.w, l: st.record.l, v: st.record.visits };
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.t0.id, 1025, 'id bounded to the national dex');
  assert.equal(out.t0.level, 1, 'niveau plancher 1');
  assert.equal(out.t0.shiny, true);
  assert.equal(out.t0.talent, 'statik');
  assert.deepEqual(out.t0.moves, ['tackle', 'growl', 'tackle', 'growl'], 'unknown moves filtered, 4 kept');
  assert.equal(out.t1.id, 1);
  assert.equal(out.t1.level, 100, 'niveau plafond 100');
  assert.deepEqual(out.t1.moves, ['tackle'], 'no names → natural moveset kept');
  assert.equal(out.empty, true);
  assert.equal(out.importOk, true);
  assert.equal(out.adopt, true);
  assert.equal(out.own, false, 'friend visit: never "own"');
  assert.deepEqual(out.recBefore, out.recAfter, 'no credit on the local record (anti-cheat)');
  assert.equal(out.sessW, 1, 'session counter only');
});

// ——— E — UI wiring + battle hooks ———————————————————————————————————————
test('phase 38 E: index/postboot/loader/styles + victory/blackout/forfeit hooks', () => {
  const html = R('index.html');
  for (const id of ['base-toolbar', 'base-stock', 'base-ed-hint', 'base-ed-visit', 'base-ed-export', 'base-ed-import']) {
    assert.ok(html.includes(`id="${id}"`), `index.html #${id}`);
  }
  for (const act of ['base-ed-rotate', 'base-ed-pickup', 'base-ed-visit', 'base-ed-export', 'base-ed-import', 'base-ed-select']) {
    assert.ok(html.includes(`data-action="${act}"`) || act === 'base-ed-select', `action ${act}`);
  }
  const post = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  for (const act of ['base-ed-select', 'base-ed-select-npc', 'base-ed-rotate', 'base-ed-pickup', 'base-ed-visit', 'base-ed-export', 'base-ed-import', 'debug-base-add-npc']) {
    assert.ok(post.includes(`'${act}'`), `postboot ${act}`);
  }
  const loader = R('src/main.js');
  assert.ok(loader.indexOf('base-editor.js') > -1 && loader.indexOf('base-editor.js') < loader.indexOf('base-window.js'), 'base-editor loaded before base-window');
  const css = R('src/assets/css/style.css');
  for (const sel of ['.base-stock-item', '#base-ed-hint', '#base-toolbar']) assert.ok(css.includes(sel), `style ${sel}`);
  // Renderer: optional overlay drawn AFTER the NPC
  const v2d = R('src/ui/game/base/base-view2d.js');
  assert.ok(/baseView2dDraw\(canvas, st, sprites, overlay\)/.test(v2d), 'signature overlay');
  assert.ok(v2d.includes('base2dOverlay') && v2d.includes('overlay.ghost') && v2d.includes('overlay.visitor') && v2d.includes('overlay.select') && v2d.includes('overlay.path'), 'complete overlay');
  // Battle hooks of the bounded duel (3 outcomes: victory, blackout, forfeit)
  assert.ok(R('src/application/combat/battle-switch.js').includes('battle.isBaseNpcBattle'), 'champVictory hook');
  assert.ok(R('src/application/combat/battle-encounter.js').includes('battle.isBaseNpcBattle'), 'blackout hook');
  assert.ok(R('src/application/combat/battle-flow.js').includes('battle.isBaseNpcBattle'), 'abandon hook');
  for (const f of ['battle-switch.js', 'battle-encounter.js', 'battle-flow.js']) {
    assert.ok(R(`src/application/combat/${f}`).includes('baseEditorCreditBattle'), `credit in ${f}`);
  }
  const i18n = R('src/localization/i18n.js');
  assert.ok(i18n.includes("id==='base_npc'"), 'getChampName : nom dynamique du copain');
  // fr/en i18n parity of the new keys
  const fr = R('src/localization/fr/base.js'), en = R('src/localization/en/base.js');
  const keys = (src, re) => [...src.matchAll(re)].map((m) => m[1]);
  const editFr = keys(fr, /"([a-z_0-9]+)":"/g);
  for (const k of ['"visit_start_own"', '"battle_done"', '"battle_challenge"', '"picked_up"', '"npc_placed"', '"visit_end"', '"blocked"', '"heal"']) {
    assert.ok(fr.includes(k + ':'), `fr ${k}`);
    assert.ok(en.includes(k + ':'), `en ${k}`);
  }
  assert.ok(R('src/localization/fr/ui.js').includes('"debug_base_npc"') && R('src/localization/en/ui.js').includes('"debug_base_npc"'), 'debug_base_npc key fr+en');
  assert.ok(R('index.html').includes('data-action="debug-base-add-npc"'), 'buddy debug button');
});

// ——— F — WebGL2 guard ————————————————————————————————————————————————————
test('phase 38 F: without WebGL2, 3D is disabled, 2D fallback, visit forced to 2D', () => {
  // Pass 55: the "Secret Base" window is PURELY 2D — the 3D has its
  // own window (win-base3d), with its own gameplay. The WebGL2 guard has
  // therefore moved: the 3D window shows the message when the context
  // is unavailable, and the 2D has nothing left to fall back to.
  const win = R('src/ui/game/base/base-window.js');
  assert.ok(win.includes("_baseWin.c2d.addEventListener('click', baseWindowCanvasClick)"), 'editor interactions ONLY on the 2D canvas');
  // drawSt = owner state OR visit session state (empty alcove / friend's base)
  assert.ok(win.includes('baseView2dDraw(_baseWin.c2d, drawSt, _baseWin.sprites2d, overlay)'), 'overlay passed to the 2D renderer');
  assert.ok(!win.includes("modeSel.value = hasGl"), 'no more mode switch in the 2D window');

  assert.ok(!E('src/game/base/base3d-window.js'), '3D window removed');
  assert.ok(!E('src/game/base/base3d-view.js'), '3D renderer removed');
});

