import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ecsGameplayBundleSource } from '../tools/ecs-loop-bundle.mjs';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { moveButtonsBarHTML } from '../src/ui/components/move-buttons.js';
// Wave 12: the battle-session summary renders through the real ECS view —
// other sandboxes in this file run battle-summary.js, so inject the real
// view too (same pattern as the components above).
import { SessionSummaryView } from '../src/ui/views/SessionSummaryView.js';
// Wave 20 (legitimate move): the offline recap/progress panel renders
// through the real ECS AfkRecapView — inject it exactly like the views
// above (paints are asserted on `afk-ff-bar`/`afk-result-grid`, which the
// view still emits).
import { AfkRecapView } from '../src/ui/views/AfkRecapView.js';

// ── Phase 28: OfflineEngine — offline catch-up via fast-forward ─────────────
//  A. Single orchestrator (registry) + heartbeat-gap detection (>15 s,
//     regardless of visibility) + tab lock + 12 h cap.
//  B. Wild-battle fast-forward: the REAL battleTick() engine replayed
//     at speed (live vs FF differential test on seeded RNG).
//  C. Per-system TIME budget: hidden caps removed (720 wins /
//     120 training ticks / 500 mine steps) — interleaved energy
//     regeneration for the auto mine (live fidelity).
//  D. Debug 30-min timeskip rewired onto OfflineEngine.simulate (API ready for
//     future time-skip items).
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, scrollTop: 0,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
  };
}

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    _map: m,
  };
}

// Sentinel in SANDBOX_FILES: the ECS-driven battle loop bundle replaces
// the retired src/game/combat/battle-tick.js at its original position.
const ECS_BATTLE_LOOP = '@ecs/application/battle-loop.js';

const SANDBOX_FILES = [
  'src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js',
  'src/data/moves.js', 'src/data/pd-data.js',
  'src/data/items-data.js', 'src/data/items-helpers.js',
  'src/data/poke-talents-data.js', 'src/data/talents-full.js',
  'src/data/locations-data.js', 'src/data/locations-johto.js',
  'src/data/shops-data.js', 'src/data/route-drops.js', 'src/data/ctcs-shop-data.js',
  'src/data/game-helpers.js',
  'src/localization/fr/types.js', 'src/localization/en/types.js',
  'src/localization/fr/talents.js', 'src/localization/en/talents.js',
  'src/localization/fr/move-descs.js',
  'src/localization/fr/ui.js', 'src/localization/en/ui.js',
  'src/localization/fr/items.js', 'src/localization/en/items.js',
  'src/localization/fr/messages.js', 'src/localization/en/messages.js',
  'src/localization/fr/combat.js', 'src/localization/en/combat.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/ui/game/badge-helper.js',
  'src/core/game-utils.js', 'src/application/game-state.js', 'src/application/pokemon-factory.js',
  'src/application/world/roaming.js', 'src/ui/game/header-window.js', 'src/application/world/collection.js', 'src/application/world/team.js',
  'src/application/economy/mine.js', 'src/ui/game/inventory.js',
  'src/application/combat/battle-init.js', 'src/application/combat/battle-encounter.js',
  ECS_BATTLE_LOOP, 'src/application/combat/battle-attack.js',
  'src/application/combat/battle-status.js', 'src/ui/game/battle-ui.js',
  'src/ui/game/battle-team-ui.js', 'src/application/combat/battle-flow.js',
  'src/application/combat/battle-switch.js', 'src/ui/game/battle-summary.js',
  'src/application/combat/progression.js', 'src/application/combat/catch.js',
  'src/application/combat/training.js', 'src/ui/game/move-learning.js',
  'src/application/breeding/hatchery.js',
  'src/ui/game/sprite-helpers.js',
  'src/ui/game/team-ui.js',
  'src/application/world/exploration-actions.js',
  'src/application/save/save.js',
  'src/application/save/offline-engine.js',
];

function makeLcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function makeSandbox({ seed } = {}) {
  const store = makeStorage();
  const elRegistry = new Map(); // auto-vivification: simulates the game's full real DOM
  const getEl = (id) => { if (!elRegistry.has(id)) elRegistry.set(id, makeEl()); return elRegistry.get(id); };
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: makeEl(), head: makeEl(), documentElement: makeEl(),
      getElementById: (id) => getEl(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => makeEl(),
      createTextNode: () => ({}),
      addEventListener() {}, removeEventListener() {},
    },
    localStorage: store,
    navigator: { language: 'fr' },
    location: { href: 'http://localhost/', reload() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    setInterval: () => 1, clearInterval: () => {},
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    PokeWorldGameStarted: false,
    _storage: store,
  };
  if (seed != null) {
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = makeLcg(seed);
  }
  sandbox.window = sandbox;
  sandbox.PokeUI = sandbox.PokeUI || {}; sandbox.PokeUI.components = Object.assign({}, sandbox.PokeUI.components, { pokeFullCardHTML, moveButtonsBarHTML });
  sandbox.PokeUI.views = Object.assign({}, sandbox.PokeUI.views, { SessionSummaryView, AfkRecapView });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  sandbox.runInContextAsync = (code) => {
    const r = vm.runInContext(code, sandbox);
    return (r && typeof r.then === 'function') ? r : Promise.resolve(r);
  };
  for (const f of SANDBOX_FILES) {
    // The real battle loop is the ECS-driven one (battle-tick.js deleted):
    // load the SAME production bundle the browser gets through Vite.
    if (f === ECS_BATTLE_LOOP) vm.runInContext(ecsGameplayBundleSource(), sandbox, { filename: 'src/application/gameplay-bundle.js [esbuild iife]' });
    else {
      // T2-D (vague 37) : classiques en vm directe ; converts ESM bundlés à la volée.
      const __text = R(f);
      vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
    }
  }
  // Light stubs (override the real DOM-dependent versions)
  vm.runInContext(`
    spriteImg = function(){ return '<span class="sprite-stub"></span>'; };
    itemSpriteHtml = function(){ return '<span class="sprite-stub"></span>'; };
    if (typeof renderMap === 'function') renderMap = function(){};
    if (typeof renderMineWindow === 'undefined') renderMineWindow = function(){}; // mine-ui.js outside the sandbox
    window.PokeWorldGameStarted = true;
  `, sandbox);
  return sandbox;
}

function seedGame(sb, { location = 'route1', level = 12, money = 1000 } = {}) {
  vm.runInContext(`
    currentSaveId = 'PW-TEST';
    G.starter = true;
    G.location = '${location}';
    G.region = 'kanto';
    G.money = ${money};
    G.inventory = {};
    G.pokedex = {};
    G.hatchery = [];
    G.badges = [];
    G.team = [createPoke(4, ${level}, false)];
    G.team[0].currentHP = G.team[0].maxHP;
    battle.active = false; battle.enemyPoke = null; battle.chill = true; battle.speed = 1;
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0;
  `, sb);
}

// comparable state projection (ignores the boxes' Date.now keys)
function projectState(sb) {
  return JSON.parse(JSON.stringify(vm.runInContext(`({
    team: G.team.map(p => ({ id: p.id, lvl: p.level, xp: p.xp, hp: p.currentHP, max: p.maxHP, moves: (p.moves||[]).map(m=>m.id), status: p.status })),
    money: G.money,
    inv: G.inventory,
    dex: G.pokedex,
    dupe: G.dupeCatches,
    collection: Object.keys(G.collection).sort().map(k => { const p = G.collection[k]; return { id: p.id, lvl: p.level, sh: !!p.shiny }; }),
  })`, sb)));
}

// ————————————————————————— A — Orchestrator & detection —————————————————————
test('phase 28 A: OfflineEngine exposed, 3 default handlers, 12 h cap', () => {
  const sb = makeSandbox();
  assert.ok(sb.OfflineEngine, 'OfflineEngine existe');
  assert.ok(sb.OfflineEngine.handler('wild-battles'), 'battle handler registered');
  assert.ok(sb.OfflineEngine.handler('training'), 'training handler registered');
  assert.ok(sb.OfflineEngine.handler('mine'), 'mine handler registered');
  assert.equal(sb.OfflineEngine.MAX_MS, 12 * 3600 * 1000, '12-hour cap (user decision)');
  const src = R('src/application/save/offline-engine.js');
  assert.ok(src.includes('const OFFLINE_MIN_GAP_MS = 15000;'), '15 s heartbeat-gap threshold');
  assert.ok(src.includes("appTimer('offline-heartbeat', offlinePollHeartbeat, 2000)"), '2 s heartbeat installed');
  assert.ok(R('src/main.js').includes('"./application/save/offline-engine.js"'), 'loader charge le moteur');
});

test('phase 28 A: tab lock against double catch-up', () => {
  const sb = makeSandbox();
  vm.runInContext(`currentSaveId = 'PW-TEST';`, sb);
  const key = 'pokeworld_ff_lock_PW-TEST';
  // fresh lock from another tab → refuse
  sb._storage.setItem(key, JSON.stringify({ tabId: 'tab-other', ts: Date.now() }));
  assert.equal(sb.offlineAcquireLock(), false, 'fresh foreign tab = refusal');
  // expired lock → acquisition
  sb._storage.setItem(key, JSON.stringify({ tabId: 'tab-other', ts: Date.now() - 30000 }));
  assert.equal(sb.offlineAcquireLock(), true, 'expired lock = acquisition');
  // our own lock → ok
  assert.equal(sb.offlineAcquireLock(), true, 'our own lock = ok');
});

test('phase 28 A: heartbeat gap triggers catch-up, no double triggering', async () => {
  const sb = makeSandbox({ seed: 42 });
  seedGame(sb);
  // last sign of life 30 min ago → gap → simulate
  vm.runInContext(`
    storageSet(afkStorageKey(), JSON.stringify({ ts: Date.now() - 30 * 60 * 1000 }));
    offlinePollHeartbeat();
  `, sb);
  const sim = vm.runInContext(`_offlineGetLastSim()`, sb);
  assert.ok(sim, 'the heartbeat gap started a simulation');
  const result = await sim;
  assert.ok(result, 'result produced');
  assert.ok(result.timeMs >= 30 * 60 * 1000 && result.timeMs <= 30 * 60 * 1000 + 2500, `≈30 min duration contained in the gap (${result.timeMs})`);
  // next immediate poll: fresh timestamp → NO new simulation
  vm.runInContext(`window._lastSimBefore = _offlineGetLastSim(); offlinePollHeartbeat();`, sb);
  const sim2 = vm.runInContext(`_offlineGetLastSim()`, sb);
  assert.equal(sim2, vm.runInContext(`window._lastSimBefore`, sb), 'no second catch-up with a fresh timestamp');
  assert.equal(sim2, sim, 'always the same promise (idempotent)');
});

test('phase 28 A: hidden tab = frozen sign of life then full-duration catch-up', async () => {
  const sb = makeSandbox({ seed: 7 });
  seedGame(sb);
  // switching to hidden: freezes the timestamp at masking time…
  vm.runInContext(`
    document.visibilityState = 'hidden';
    offlinePollHeartbeat(); // captures the hiding at t0 — must not trigger anything
  `, sb);
  assert.equal(vm.runInContext(`_offlineGetLastSim()`, sb), null, 'nothing triggers while the tab is hidden');
  // …then 2 h really pass (throttled heartbeat): backdating both markers
  vm.runInContext(`
    offlineHiddenSince = Date.now() - 2 * 3600 * 1000;
    storageSet(afkStorageKey(), JSON.stringify({ ts: Date.now() - 2 * 3600 * 1000 }));
    document.visibilityState = 'visible';
    offlinePollHeartbeat();
  `, sb);
  const result = await vm.runInContext(`_offlineGetLastSim()`, sb);
  assert.ok(result.timeMs >= 2 * 3600 * 1000 && result.timeMs <= 2 * 3600 * 1000 + 2500, `the 2 hidden hours are caught up on return (${result.timeMs} ms, tolerated Date.now() δ)`);
});

// ————————————————————————— B — Fast-forward fidelity ——————————————————————
test('phase 28 B: DIFFERENTIAL — 60 s of fast-forward ≡ 600 live ticks (same RNG)', async () => {
  const build = (seed) => {
    const sb = makeSandbox({ seed });
    seedGame(sb, { location: 'route1', level: 12 });
    // phase 30: FF replays wild battles ONLY if the player was
    // mid-exploration at departure time (flag persisted here).
    vm.runInContext(`G.wildSessionActive = true;`, sb);
    // expected by the test: the FF session and the live session start from the same point
    return sb;
  };
  // — A : fast-forward offline
  const sbA = build(1337);
  await sbA.runInContextAsync(`(async () => { window._r = await offlineSimulate(60000, 'debug'); })()`); // 60 s
  // — B: manual live (same session, real battleTick, instant wait = the only shared shortcut)
  const sbB = build(1337);
  await vm.runInContext(`(async () => {
    window.wait = function(){ return Promise.resolve(); };
    offlineStartWildSession(getLocObj(G.location));
    let simMsB = 0;
    for (let i = 0; i < 600 && simMsB < 60000; i++) {
      if (!battle.active) break;
      if (battle.resolvingKO) { await Promise.resolve(); i--; continue; }
      battle.paused = false;
      battleTick();
      simMsB += 100 * (battle.speed || 1);
    }
    window._simMsB = simMsB;
  })()`, sbB);
  const winsA = vm.runInContext(`battle.sessionWins`, sbA);
  const winsB = vm.runInContext(`battle.sessionWins + ' (' + window._simMsB + ' ms)'`, sbB);
  console.log('  [diff] winsA(sim 60s)=%s winsB(live)=%s', winsA, winsB);
  assert.deepEqual(projectState(sbA), projectState(sbB),
    'the fast-forward produces EXACTLY the real game state (team, XP, HP, captures, pokedex, money, inventory) — winsA=' + winsA + ' winsB=' + winsB);
});

test('phase 28 B: fast-forward rewards a strong team (honest wins, XP, catches)', async () => {
  const sb = makeSandbox({ seed: 2024 });
  seedGame(sb, { location: 'route1', level: 30 });
  vm.runInContext(`G.wildSessionActive = true;`, sb); // phase 30: wild chain active at departure
  const before = projectState(sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  assert.equal(result.lost, false, 'no K.O.');
  assert.ok(result.wins > 10, `significant wins over 5 min (got: ${result.wins})`);
  const after = projectState(sb);
  assert.ok(after.team[0].xp >= before.team[0].xp || after.team[0].lvl > before.team[0].lvl, 'XP gained');
  // UI restored after the fast-forward
  assert.notEqual(String(sb.notify), 'function (){}', 'notify restored after the FF');
  assert.equal(vm.runInContext(`window.PW_FF`, sb), false, 'FF flag dropped');
  // the chain continues: battle active, timer restarted
  assert.equal(vm.runInContext(`battle.active && !battle.paused`, sb), true, 'battle chain restarted');
  assert.ok(vm.runInContext(`battle.timerId`, sb), 'battleTick ticker restarted');
});

test('phase 28 B: weak team = party K.O., money penalty, clean end (no loop)', async () => {
  const sb = makeSandbox({ seed: 99 });
  seedGame(sb, { location: 'route1', level: 3, money: 1000 });
  vm.runInContext(`
    LOCS.deathtest = { name: 'Route test', wild: [[249, 60, 65, 'common']] };
    G.location = 'deathtest';
    G.deadTestActive = true;
    G.wildSessionActive = true; // passe 30: the player was exploring this deadly route
  `, sb);
  const result = await vm.runInContext(`offlineSimulate(600000, 'return')`, sb); // 10 min
  assert.equal(result.lost, true, 'defeat detected');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'battle finished');
  assert.equal(vm.runInContext(`G.money`, sb), 900, '10% penalty applied (1000 → 900)');
  assert.ok(result.fainted >= 1, 'at least 1 K.O. accounted');
});

// ————————————————————————— C — Per-system time budget —————————————————————
test('phase 28 C: auto mine uncapped (12 h ≠ 10 min) AND interleaved regeneration', () => {
  const sb = makeSandbox({ seed: 5 });
  vm.runInContext(`
    currentSaveId = 'PW-TEST';
    G.starter = true; G.badges = []; G.money = 1000000;
    initMineIfNeeded();
    G.mine.automation = { enabled: true, purchased: true };
    G.mine.energy = 0;
    window._digs = simulateAfkMineAutomation(3600); // 1 h = 3000 steps (old cap: 500)
  `, sb);
  const digs = vm.runInContext(`window._digs`, sb);
  assert.ok(digs > 500, `> 500 digs in 1 h (legacy cap smashed, got: ${digs})`);
  const src = R('src/application/economy/mine.js');
  assert.ok(src.includes('Math.min(40000'), '500 cap removed (40000 perf guard)');
  assert.ok(src.includes('regenPerStep'), 'interleaved regeneration documented');
});

function seedTrainingSlot(sbScript) {
  return `
    currentSaveId = 'PW-TEST';
    G.starter = true; G.location = 'route1'; G.region = 'kanto';
    G.badges = ['boulder'];
    G.team = [createPoke(4, 30, false)];
    ensureTrainingSlots();
    const slot = G.trainingSlots[0];
    slot.active = true; slot.mode = 'ev';
    slot.uid = G.team[0].uid;
    const enemies = [];
    for (let i = 0; i < 400; i++) enemies.push(createPoke(19, 3, false));
    slot.battle = {
      enemies: enemies, enemyIndex: 0, enemy: enemies[0], mode: 'ev',
      pMoveIdx: 0, eMoveIdx: 0, logs: [],
      pCd: trainingCalcCd(G.team[0]), eCd: trainingCalcCd(enemies[0]),
      pCdMax: trainingCalcCd(G.team[0]), eCdMax: trainingCalcCd(enemies[0]),
    };
  `;
}

test('phase 29 C: DIFFERENTIAL training — 60 s of FF ≡ 600 live ticks (same RNG)', async () => {
  // — A: offline fast-forward of the real updateTrainingSlots loop
  const sbA = makeSandbox({ seed: 4242 });
  vm.runInContext(seedTrainingSlot(), sbA);
  await vm.runInContext(`(async () => { await offlineFastForwardTraining(60); })()`, sbA);
  // — B: manual live, call by call like the ticker
  const sbB = makeSandbox({ seed: 4242 });
  vm.runInContext(seedTrainingSlot(), sbB);
  await vm.runInContext(`(async () => {
    let simMs = 0;
    for (let i = 0; i < 600 && simMs < 60000; i++) {
      updateTrainingSlots();
      simMs += 100 * (battle.speed || 1);
    }
  })()`, sbB);
  const projA = JSON.parse(JSON.stringify(vm.runInContext(`(() => { const s = G.trainingSlots[0]; const tb = s.battle; return {
    active: s.active, eidx: tb ? tb.enemyIndex : null, ehp: tb && tb.enemy ? tb.enemy.currentHP : null,
    pCd: tb ? Math.round(tb.pCd) : null, eCd: tb ? Math.round(tb.eCd) : null,
    trainee: { hp: G.team[0].currentHP, lvl: G.team[0].level, evs: G.team[0].evs },
    lastResult: s.lastResult,
  }; })()`, sbA)));
  const projB = JSON.parse(JSON.stringify(vm.runInContext(`(() => { const s = G.trainingSlots[0]; const tb = s.battle; return {
    active: s.active, eidx: tb ? tb.enemyIndex : null, ehp: tb && tb.enemy ? tb.enemy.currentHP : null,
    pCd: tb ? Math.round(tb.pCd) : null, eCd: tb ? Math.round(tb.eCd) : null,
    trainee: { hp: G.team[0].currentHP, lvl: G.team[0].level, evs: G.team[0].evs },
    lastResult: s.lastResult,
  }; })()`, sbB)));
  assert.deepEqual(projA, projB, 'fast-forward training reproduces EXACTLY the live loop (rounds, HP, EV, cooldowns)');
  assert.ok(projA.eidx === null || projA.eidx > 10, `rounds were actually played (enemyIndex=${projA.eidx})`);
});

test('phase 29 C: FF training beyond the old cap (12 h ≠ 50 min / 120 ticks)', async () => {
  const sb = makeSandbox({ seed: 55 });
  vm.runInContext(seedTrainingSlot(), sb);
  const res = await vm.runInContext(`offlineFastForwardTraining(3600)`, sb); // 1 h
  const idx = vm.runInContext(`(() => { const s = G.trainingSlots[0]; return s.battle ? s.battle.enemyIndex : 999; })()`, sb);
  assert.ok(idx > 120, `over 120 rounds in 1 h (old cap smashed, got: ${idx})`);
  assert.ok(res.sessions >= 1 || res.secondsUsed > 0, 'sessions/activity accounted');
  assert.ok(!R('src/application/combat/training.js').includes('simulateAfkTrainingProgress'), 'old training simulator removed');
});

// ————————————————————————— D — Timeskip 30 min + purge ———————————————————————
test('phase 28 D: debug 30-min timeskip wired everywhere', async () => {
  assert.ok(R('index.html').includes('data-call="debugTimeSkip30Minutes"'), 'debug button → 30 min');
  assert.ok(R('src/application/save/settings.js').includes('debugTimeSkipAfk30Minutes'), 'settings wrapper renamed');
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes("'debug-timeskip-30m'"), 'postboot action renamed');
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes("'debug-timeskip-30m'"), 'preflight mapping renamed');
  assert.ok(R('src/localization/fr/ui.js').includes('"debug_afk":"AFK +30 min"'), 'FR 30 min label');
  assert.ok(R('src/localization/en/ui.js').includes('"debug_afk":"AFK +30 min"'), 'EN 30 min label');
  const sb = makeSandbox({ seed: 3 });
  seedGame(sb, { location: 'route1', level: 25 });
  await vm.runInContext(`(async () => { await debugTimeSkip30Minutes(); })()`, sb);
  const result = sb.OfflineEngine._lastResult;
  assert.equal(result.timeMs, 30 * 60 * 1000, '30 minutes simulated');
  assert.equal(result.debug, true, 'marqueur debug');
});

test('phase 28 D: old AFK estimator purged (single source of truth)', () => {
  for (const dead of ['estimateAfkMoveDamage', 'simulateAfkWildWin', 'simulateAfkFight', 'applyAfkProgress', 'applyAfkReturn', 'AFK_MAX_WINS', 'debugTimeSkip10Minutes', 'debugTimeskip10m']) {
    assert.ok(!R('src/application/save/save.js').includes(dead), `save.js no longer references ${dead}`);
  }
  for (const f of ['src/engine/input/action-dispatcher.js', 'src/engine/runtime/classic-bridge.js', 'src/application/save/settings.js', 'index.html']) {
    assert.ok(!R(f).includes('debugTimeSkip10Minutes') && !R(f).includes('debugTimeSkipAfk10Minutes'), `${f} no longer references the 10-min timeskip`);
  }
  // saveGame guarded during a fast-forward
  assert.ok(R('src/application/save/save.js').includes("if(typeof afkApplying !== 'undefined' && afkApplying) return false;"), 'saveGame skipped during FF');
  // compat shim kept (saveGame/activateCurrentSave use it)
  assert.ok(R('src/application/save/save.js').includes('function markAfkSeen(force)'), 'markAfkSeen kept');
  assert.ok(R('src/application/save/save.js').includes('function scheduleAfkCatchup(reason)'), 'scheduleAfkCatchup → offlineScheduleCatchup');
});

test('phase 28 D: recap modal = 8 measures (training + minings added), 60 s threshold', () => {
  const src = R('src/application/save/offline-engine.js');
  assert.ok(src.includes("'afk_panel_training'") && src.includes("'afk_panel_mine_digs'"), 'training/mining rows in the grid');
  assert.ok(src.includes('const OFFLINE_RECAP_MIN_MS = 60000;'), 'silent modal under 60 s');
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_panel_training":"Entraînement"'), 'FR training key');
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_panel_mine_digs":"Minages auto"'), 'FR digs key');
  assert.ok(R('src/localization/en/ui.js').includes('"afk_ff_progress"'), 'EN FF progress key');
});

// ———————————————————— E — passe 29 : barre de progression vivante —————————————
test('phase 29 E: progress is PAINTED (growing bar + steps), then the recap', async () => {
  const sb = makeSandbox({ seed: 314 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`G.wildSessionActive = true; G.lang = 'fr';`, sb); // phase 30: active chain; FR labels expected by the test
  // capture every innerHTML write on the modal
  const paints = [];
  const el = sb.document.getElementById('afk-result-modal');
  let _html = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _html; },
    set(v) { _html = String(v); if (_html) paints.push(_html); },
    configurable: true,
  });
  await vm.runInContext(`(async () => { await debugTimeSkip30Minutes(); })()`, sb);
  const withBar = paints.filter(h => h.includes('afk-ff-bar'));
  assert.ok(withBar.length >= 2, `au moins 2 peintures de la barre (obtenu : ${withBar.length})`);
  const pcts = withBar.map(h => { const m = h.match(/width:(\d+)%/); return m ? Number(m[1]) : -1; });
  assert.ok(pcts.every(p => p >= 0), 'pourcentages extraits');
  for (let i = 1; i < pcts.length; i++) assert.ok(pcts[i] >= pcts[i - 1], `barre croissante (${pcts.join('→')})`);
  assert.ok(pcts[pcts.length - 1] >= 90, `bar reaches the end (${pcts[pcts.length - 1]}%)`);
  assert.ok(paints.some(h => h.includes(t => t) || h.includes('Combats sauvages')), '"Wild battles" step shown');
  assert.ok(paints.some(h => h.includes('offline_ff_title') || h.includes('Calcul du temps écoulé')), 'computation title shown');
  // at the end: the recap replaces the bar
  assert.ok(paints[paints.length - 1].includes('afk-result-grid'), 'last render = recap');
  assert.ok(paints[paints.length - 1].includes('Entraînement') && paints[paints.length - 1].includes('Minages auto'), 'recap contains the training/mine rows');
});

test('phase 29 E: FR+EN localized title/steps', () => {
  for (const key of ['offline_ff_title', 'offline_stage_battles', 'offline_stage_battles_wins', 'offline_stage_training', 'offline_stage_training_sessions', 'offline_stage_mine']) {
    assert.ok(R('src/localization/fr/ui.js').includes(`"${key}"`), `FR key ${key}`);
    assert.ok(R('src/localization/en/ui.js').includes(`"${key}"`), `EN key ${key}`);
  }
  assert.ok(R('src/assets/styles/design-system.css').includes('.afk-ff-stage'), 'stage line style');
});


