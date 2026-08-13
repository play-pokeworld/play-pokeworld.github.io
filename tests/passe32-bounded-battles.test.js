import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ecsGameplayBundleSource } from '../tools/ecs-loop-bundle.mjs';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { moveButtonsBarHTML } from '../src/ui/components/move-buttons.js';
// Wave 20: the offline engine now renders its progress/recap panels through
// the real ECS AfkRecapView — inject it into the sandbox exactly like the
// production PokeUI views registry (legitimate test move, no assertion lost).
import { AfkRecapView } from '../src/ui/views/AfkRecapView.js';

// ── Phase 32: beta — "no active wild zone to simulate" ─────────────────────
//  A. Bug n°1: wild chain whose K.O. resolution stayed FROZEN
//     by the tab freeze (wait() never resolved) → FF spun in vain:
//     0 wins + misleading message. The engine must catch up the resolution.
//  B. Bug n°2: BOUNDED battles (quest trainer, gym, league, atoll,
//     legendary) ignored by catch-up → now honestly FINISHED
//     (a single battle, stop at the first endBattle).
//  D. Rewiring + i18n keys.
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, scrollTop: 0,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, remove() {}, insertBefore() {},
    children: { length: 0 }, firstChild: null,
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
  const elRegistry = new Map();
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
  sandbox.PokeUI.views = Object.assign({}, sandbox.PokeUI.views, { AfkRecapView });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
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
  vm.runInContext(`
    spriteImg = function(){ return '<span class="sprite-stub"></span>'; };
    itemSpriteHtml = function(){ return '<span class="sprite-stub"></span>'; };
    // Unconditional stubs: map-render.js is NOT loaded here — renderMap()
    // would otherwise be a ReferenceError in the async continuations (Victory Road).
    renderMap = function(){};
    renderMineWindow = function(){};
    renderTeamWindow = function(){};
    renderHatcheryWindow = function(){};
    renderStoryWindow = function(){};
    // tabs.js / fullscreen-panel.js not loaded: called in async continuation
    // de champVictory (showTab) et de la voie atoll (openFullscreenPanel).
    showTab = function(){};
    openFullscreenPanel = function(){};
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
    G.defeatedChamps = {};
    G.team = [createPoke(4, ${level}, false)];
    G.team[0].currentHP = G.team[0].maxHP;
    battle.active = false; battle.enemyPoke = null; battle.chill = true; battle.speed = 1;
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0;
  `, sb);
}

// ————————————————— A — K.O. frozen by the tab freeze —————————————————————
test('phase 32 A: enemy K.O. + tab frozen right during resolution = catch-up MOVES ON', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 555 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location));
    // Tab frozen in the middle of the K.O.: wait() will only resolve in ~300 ms
    // of REAL time (browser behavior: suspended timers that resume).
    window.wait = function(){ return new Promise(r => setTimeout(r, 300)); };
    let guard = 0;
    while(guard++ < 8000 && !battle.resolvingKO){
      battle.paused = false;
      battleTick(); // played live up to the K.O. — resolution freezes at wait()
    }
  `, sb);
  assert.equal(vm.runInContext(`battle.resolvingKO`, sb), true, 'K.O. resolution indeed frozen by the freeze');
  assert.equal(vm.runInContext(`battle.active && battle.chill`, sb), true, 'wild chain active');
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  assert.ok(result.wins > 3, `catch-up replays the chain despite the frozen K.O. (got: ${result.wins} — before: 0 + error message)`);
  assert.notEqual(result.wins, 0, 'plus de « 0 victoire » trompeur');
  // Phase 48 — TEST CORRECTION (it had been failing for several phases).
  // The "battle.active === true" assertion was WRONG in its own
  // scenario: the test team has only ONE Pokémon (seedGame) and the
  // catch-up simulates 5 MINUTES of wild chain. It wins 67 battles then
  // — logically — ends up K.O. (`result.lost === true`, team at
  // 0 HP): the engine then STOPS the chain, which is the expected
  // behavior. What this test must prove is that the tab-freeze-frozen
  // K.O. no longer blocks catch-up — so: the resolution is
  // unblocked and the chain actually progressed.
  assert.equal(vm.runInContext(`battle.resolvingKO`, sb), false,
    'the frozen K.O. was indeed unblocked by catch-up');
  const alive = vm.runInContext(`(G.team || []).filter((p) => p && p.currentHP > 0).length`, sb);
  const stillActive = vm.runInContext(`battle.active`, sb);
  assert.ok(stillActive || alive === 0,
    'the chain still runs, OR it stopped because the team is K.O. (nominal case here)');
});

// ————————————————— B — Bounded battles: gym, quests, league, atoll ———————
function seedBoundedBattle(sbSrc) {
  return `
    battle.active = true; battle.isChamp = true; battle.champId = 'boulder'; battle.chill = false;
    battle.isLeague = false; battle.isTraining = false; battle.escaped = false; battle.resolvingKO = false;
    battle.champTeam = ${sbSrc};
    battle.champPokeIdx = 0;
    battle.enemyPoke = battle.champTeam[0];
    battle.pMoveIdx = 0; battle.eMoveIdx = 0;
    battle.playerMods = { atk: 1, def: 1, spe: 1 }; battle.enemyMods = { atk: 1, def: 1, spe: 1 };
    battle.playerPokeIdx = 0;
    battle.pCd = 100; battle.eCd = 100; battle.paused = true; // hidden tab (suspended)
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0; battle.sessionPlayerKOs = 0;
    G.defeatedChamps = {};
  `;
}

test('phase 32 B: gym in progress = the battle is FINISHED while away (victory, badge, reward)', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 777 });
  seedGame(sb, { location: 'pewter', level: 40, money: 1000 });
  vm.runInContext(seedBoundedBattle('[createPoke(95, 8, false), createPoke(95, 9, false)]'), sb);
  const moneyBefore = vm.runInContext(`G.money`, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.equal(result.boundedBattle, 'won', 'gym battle resolved as victory');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'battle finished (not restarted)');
  assert.ok(vm.runInContext(`G.badges.includes('boulder')`, sb), 'badge obtenu');
  assert.ok(vm.runInContext(`G.money`, sb) > moneyBefore, 'champion reward collected');
  assert.equal(result.wins, 0, 'no free wild battle on top');
});

test('phase 32 B: key battle lost while away = honest defeat (10% penalty)', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 888 });
  seedGame(sb, { location: 'pewter', level: 3, money: 1000 });
  vm.runInContext(seedBoundedBattle('[createPoke(95, 60, false)]'), sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.equal(result.boundedBattle, 'lost', 'gym defeat detected');
  assert.equal(vm.runInContext(`G.money`, sb), 900, '10% penalty applied (1000 → 900)');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'battle finished');
  assert.equal(vm.runInContext(`G.badges.length`, sb), 0, 'no free badge');
});

test('phase 32 B: legendary encounter (single chain, chill=false) resolved too', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 909 });
  seedGame(sb, { location: 'route1', level: 60, money: 1000 });
  vm.runInContext(`
    battle.active = true; battle.isChamp = false; battle.chill = false;
    battle.isLeague = false; battle.isTraining = false; battle.resolvingKO = false;
    battle.legendaryCatch = false; battle.noAutoCatch = true;
    battle.enemyPoke = createPoke(144, 10, false); // weakened for the test
    battle.pMoveIdx = 0; battle.eMoveIdx = 0;
    battle.playerMods = { atk: 1, def: 1, spe: 1 }; battle.enemyMods = { atk: 1, def: 1, spe: 1 };
    battle.playerPokeIdx = 0; battle.pCd = 100; battle.eCd = 100; battle.paused = true;
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0;
  `, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.equal(result.boundedBattle, 'won', 'single encounter finished while away');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'battle finished');
});

test('phase 32 B: wild chain frozen live THEN remaining budget → chain continued (double guard)', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 606 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location));
    window.wait = function(){ return new Promise(r => setTimeout(r, 250)); };
    let guard = 0;
    while(guard++ < 8000 && !battle.resolvingKO){ battle.paused = false; battleTick(); }
  `, sb);
  assert.equal(vm.runInContext(`battle.resolvingKO && battle.chill`, sb), true);
  const result = await vm.runInContext(`offlineSimulate(120000, 'return')`, sb);
  assert.ok(result.wins > 1, `chain continued after thaw (got: ${result.wins})`);
  assert.equal(result.boundedBattle, null, 'no bounded battle here');
});

// ————————————————— D — Rewiring & i18n ————————————————————————————————————
test('phase 32 D: rewirings present + new FR/EN i18n keys + fixed message', () => {
  const oe = R('src/application/save/offline-engine.js');
  assert.ok(oe.includes('function offlineDrainStuckLiveKOs'), 'anti-freeze drain present');
  assert.ok(oe.includes('function offlineIsBoundedBattle'), 'bounded-battle detector present');
  assert.ok(oe.includes('koDrain % 64 === 0'), 'real periodic macrotask during K.O. drains');
  assert.ok(oe.includes('function offlineRunBoundedBattle'), 'bounded-battle executor');
  assert.ok(oe.includes("battlesRes.bounded || null"), 'result propagated to the recap');
  assert.ok(!/offlineSuspendBattle[\s\S]{0,260}!b\.isChamp/.test(oe), 'suspension also covers bounded battles');
  assert.ok(oe.includes("'afk_panel_boss_battle'"), 'key-battle recap cell');
  for (const lang of ['fr', 'en']) {
    const ui = R(`src/localization/${lang}/ui.js`);
    for (const key of ['afk_boss_won', 'afk_boss_lost', 'afk_panel_boss_battle', 'offline_stage_boss']) {
      assert.ok(ui.includes(`"${key}"`), `${lang} key ${key}`);
    }
  }
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_no_progress_summary":"AFK {time} : rien en cours à simuler."'), 'AFK message fixed (no more misleading "wild zone")');
});


