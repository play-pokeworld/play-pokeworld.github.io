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

// ── Phase 30: beta-feedback fixes ────────────────────────────────────────────
//  A. AFK/timeskip: catch-up replays ONLY what the player was actually
//     doing when leaving — idle or training on a route = 0 simulated wild
//     battles and NO battle started on return. Active wild chain =
//     catch-up (live tab) or rebuild (restarted game, persisted
//     G.wildSessionActive flag).
//  B. Route money: loot is converted to ₽ ONLY when its stack is
//     full (25 for battle items/berries) — before, from the 2nd copy everything
//     partait en argent.
//  C. Day Care: shared K.O. counter (decision: 10 K.O. = 1 Day-Care
//     level), fed by routes, trainers AND training;
//     the Day Care no longer uses an XP counter.
//  D. Source rewiring + i18n keys.
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
    if (typeof renderMap === 'function') renderMap = function(){};
    if (typeof renderMineWindow === 'undefined') renderMineWindow = function(){};
    if (typeof renderTeamWindow === 'undefined') renderTeamWindow = function(){};
    if (typeof renderHatcheryWindow === 'undefined') renderHatcheryWindow = function(){};
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

function seedTrainingSlot() {
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

// ————————————————— A — AFK: only what the player was doing ———————————————
test('phase 30 A: IDLE on a route = no simulated battle AND no battle started on return', async () => {
  const sb = makeSandbox({ seed: 11 });
  seedGame(sb, { location: 'route1', level: 30 });
  // neither active chain nor persisted flag: the player was simply there.
  const result = await vm.runInContext(`offlineSimulate(120000, 'return')`, sb);
  assert.ok(result, 'result produced');
  assert.equal(result.wins, 0, 'zero wins: the player was NOT in battle');
  assert.equal(result.captures, 0, 'no ghost capture');
  assert.equal(result.lost, false, 'no imaginary defeat');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'no battle restarted on return');
  assert.equal(vm.runInContext(`battle.enemyPoke`, sb), null, 'no enemy materialized on the route');
  assert.equal(vm.runInContext(`battle.sessionWins || 0`, sb), 0, 'no improvised exploration session');
});

test('phase 30 A: TRAINING while away = training progresses, NO route battle', async () => {
  const sb = makeSandbox({ seed: 21 });
  vm.runInContext(seedTrainingSlot(), sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  const enemyIndex = vm.runInContext(`(() => { const s = G.trainingSlots[0]; return s.battle ? s.battle.enemyIndex : 999; })()`, sb);
  assert.ok(enemyIndex > 3, `training rounds actually replayed offline (enemyIndex=${enemyIndex})`);
  assert.equal(result.wins, 0, 'no wild battle simulated during training');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'no route battle started on return');
  assert.equal(vm.runInContext(`battle.enemyPoke`, sb), null, 'no enemy on the route');
  const hpTrainee = vm.runInContext(`G.team[0].currentHP`, sb);
  assert.ok(hpTrainee === null || hpTrainee >= 0, 'boarder intact (no wild battle suffered)');
});

test('phase 30 A: ACTIVE exploration chain at close = caught up, chain resumed on return', async () => {
  const sb = makeSandbox({ seed: 31 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location)); // the player actually battles
    battle.paused = true; // hidden tab: offlineSuspendBattle paused the chain
  `, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  assert.ok(result.wins > 5, `caught-up wins (got: ${result.wins})`);
  assert.equal(vm.runInContext(`battle.active && !battle.paused`, sb), true, 'chain resumed on screen');
  assert.ok(vm.runInContext(`battle.timerId`, sb), 'ticker restarted');
});

test('phase 30 A: RELAUNCHED game — persisted flag = rebuilt chain; flag maintained by saveGame/endBattle', async () => {
  // 1) game relaunched (battle reset at boot) but flag present → catch-up anyway
  const sb = makeSandbox({ seed: 41 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`battle.active = false; battle.enemyPoke = null; G.wildSessionActive = true;`, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.ok(result.wins > 5, `chain rebuilt from the persisted flag (got: ${result.wins})`);

  // 2) the flag reflects reality: true mid-chain (persisted to disk), false after endBattle
  const sb2 = makeSandbox({ seed: 42 });
  seedGame(sb2, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location));
    battle.paused = false;
    window._saveOk = saveGame(true);
  `, sb2);
  assert.equal(vm.runInContext(`window._saveOk`, sb2), true, 'save written mid-chain');
  assert.equal(vm.runInContext(`G.wildSessionActive`, sb2), true, 'flag true in memory');
  assert.equal(vm.runInContext(`(readSlot(currentSaveId) || {}).G ? readSlot(currentSaveId).G.wildSessionActive : null`, sb2), true, 'flag true on disk');
  vm.runInContext(`endBattle();`, sb2);
  assert.equal(vm.runInContext(`G.wildSessionActive`, sb2), false, 'flag cleared at battle end');
});

// ————————————————— B — Route money: full stack only ————————————
test('phase 30 B: loot converted to money ONLY when the stack is full (25)', () => {
  const sb = makeSandbox();
  vm.runInContext(`currentSaveId = 'PW-TEST'; G.starter = true; G.money = 0; G.inventory = {};`, sb);
  // 1st copy then next ones: into bag, NO money (that was the beta bug)
  let r = vm.runInContext(`grantRewardItem('occa_berry', 1)`, sb);
  assert.equal(r.added, 1, 'first copy → item into bag');
  assert.equal(r.money, 0, 'no money while the stack is not full');
  // stack at 24 + 5: 1 slots into bag, 4 converted (25% of 45,000₽ = 11,250₽/ea)
  vm.runInContext(`G.inventory['occa_berry'] = 24;`, sb);
  r = vm.runInContext(`grantRewardItem('occa_berry', 5)`, sb);
  assert.equal(r.added, 1, 'the remaining room is filled');
  assert.equal(r.money, 11250 * 4, 'only the excess beyond 25 is converted');
  assert.equal(vm.runInContext(`G.inventory['occa_berry']`, sb), 25, 'stack capped at 25');
  // stack already full: full conversion
  r = vm.runInContext(`grantRewardItem('occa_berry', 1)`, sb);
  assert.equal(r.added, 0);
  assert.equal(r.money, 11250, 'full stack → money');
  assert.equal(vm.runInContext(`G.money`, sb), 11250 * 5, 'exact cumulative total');
  // treasure: never converted, always stocked
  r = vm.runInContext(`grantRewardItem('nugget', 3)`, sb);
  assert.equal(r.added, 3, 'nugget: still in bag');
  assert.equal(r.money, 0);
});

// ————————————————— C — Day Care: shared K.O. counter ——————————————————————
test('phase 30 C: Day Care = 10 K.O. / level (decision), no more drip-fed XP, incubation preserved', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    currentSaveId = 'PW-TEST'; G.starter = true; G.money = 1000000; G.inventory = {};
    G.team = [createPoke(4, 40, false)];
    const petit = createPoke(1, 20, false);
    ensurePokemonUid(petit);
    G.hatcheryModes = ['exp', 'breed'];
    G.hatchery = [
      { poke: petit, steps: 0, stepsReq: 25, queuedUid: petit.uid, paid: false, mode: 'exp' },
      { poke: createPoke(3, 100, false), steps: 24, stepsReq: 25, paid: false, mode: 'breed' },
    ];
    G.automation = { autoHatch: true, autoSeedHatchery: false };
    window._petit = petit;
  `, sb);
  // 10 K.O.: +1 Day-Care level (and NO hatching of the exp slot despite autoHatch)
  const gained1 = vm.runInContext(`hatcheryRegisterBattleKills(10)`, sb);
  assert.equal(gained1, 1, '1 Day-Care level gained');
  assert.equal(vm.runInContext(`window._petit.level`, sb), 21, 'Lv. 20 → 21 (NO reset to 1: the old autoHatch bug is dead)');
  assert.equal(vm.runInContext(`G.hatchery[0].steps`, sb), 0, 'counter consumed');
  // the incubation slot took 10 K.O. → 24+10 ≥ 25 → auto hatch
  assert.equal(vm.runInContext(`G.hatchery[1]`, sb), null, 'hatch triggered on the incubation slot');
  assert.ok(vm.runInContext(`Object.values(G.collection).some(p => p && p.level === 1)`, sb), 'incubated boarder recreated level 1');
  // 25 more K.O.: +2 levels, 5 left on the counter
  const gained2 = vm.runInContext(`hatcheryRegisterBattleKills(25)`, sb);
  assert.equal(gained2, 2);
  assert.equal(vm.runInContext(`window._petit.level`, sb), 23, 'niv. 21 → 23');
  assert.equal(vm.runInContext(`G.hatchery[0].steps`, sb), 5, 'the rest is kept');
  // XP no LONGER drives the Day Care: gainXP does not touch it
  const lvlAvant = vm.runInContext(`window._petit.level`, sb);
  vm.runInContext(`gainXP(createPoke(19, 30, false));`, sb);
  assert.equal(vm.runInContext(`window._petit.level`, sb), lvlAvant, 'gainXP no longer feeds the Day Care');
  // fees kept: unpaid → the boarder keeps its levels but goes out to the PC
  vm.runInContext(`
    getHatcheryLevelUpFee = function(){ return 1000000; }; // stub: sandbox without automation.js
    G.money = 500000;
  `, sb);
  const gained3 = vm.runInContext(`hatcheryRegisterBattleKills(20)`, sb);
  assert.equal(gained3, 2);
  assert.equal(vm.runInContext(`window._petit.level`, sb), 25, 'levels kept despite the unpaid fee');
  assert.equal(vm.runInContext(`G.hatchery[0]`, sb), null, 'unpaid → leaves the Day Care');
  assert.equal(vm.runInContext(`G.collection['1'] === window._petit`, sb), true, 'returned to the PC (collection)');
  assert.equal(vm.runInContext(`G.money`, sb), 500000, 'no partial debit');
});

test('phase 30 C: training K.O.s also feed the day care (live AND fast-forward)', async () => {
  const sb = makeSandbox({ seed: 77 });
  vm.runInContext(seedTrainingSlot(), sb);
  vm.runInContext(`
    const petit = createPoke(2, 18, false);
    ensurePokemonUid(petit);
    G.hatcheryModes = ['exp'];
    G.hatchery = [{ poke: petit, steps: 0, stepsReq: 25, queuedUid: petit.uid, paid: false, mode: 'exp' }];
    window._petit = petit;
  `, sb);
  // live: the real loop run by hand
  vm.runInContext(`for (let i = 0; i < 200; i++) { updateTrainingSlots(); }`, sb);
  const progressionLive = vm.runInContext(`G.hatchery[0].steps + (window._petit.level - 18) * 10`, sb);
  assert.ok(progressionLive > 0, `training K.O.s fed the day care live (progression=${progressionLive})`);
  // offline fast-forward: same feeding
  const lvlAvant = vm.runInContext(`window._petit.level`, sb);
  const stepsAvant = vm.runInContext(`G.hatchery[0] ? G.hatchery[0].steps : -1`, sb);
  await vm.runInContext(`(async () => { await offlineFastForwardTraining(60); })()`, sb);
  const lvlApres = vm.runInContext(`window._petit.level`, sb);
  const stepsApres = vm.runInContext(`G.hatchery[0] ? G.hatchery[0].steps : -1`, sb);
  assert.ok(lvlApres > lvlAvant || stepsApres > stepsAvant,
    `training FF also feeds the day care (lvl ${lvlAvant}→${lvlApres}, counter ${stepsAvant}→${stepsApres})`);
});

// ————————————————— D — Rewiring & decisions ————————————————————————————————
test('phase 30 D: rewirings present, old blocks removed, i18n keys', () => {
  const oe = R('src/application/save/offline-engine.js');
  assert.ok(oe.includes('if(!(G && G.wildSessionActive)) return res;'), 'wild FF locked by the real session');
  assert.ok(oe.includes('afk_panel_daycare_levels'), 'recap: day-care levels row');
  assert.ok(R('src/application/save/save.js').includes('G.wildSessionActive = (typeof isWildChillChainActive'), 'saveGame persiste le drapeau');
  assert.ok(R('src/application/combat/battle-flow.js').includes('G.wildSessionActive = false'), 'endBattle efface le drapeau');
  const hj = R('src/application/breeding/hatchery.js');
  assert.ok(hj.includes('getDaycareKosPerLevel'), 'daycare K.O. accessor kept in the classic module');
  assert.ok(R('src/domain/breeding/hatchery-rules.js').includes('DAYCARE_KOS_PER_LEVEL = 10'), 'user decision: 10 K.O. = 1 level (domain rule)');
  assert.ok(R('src/application/hatchery-system.js').includes('function hatcheryRegisterBattleKills'), 'shared day care function, ECS-backed entry (wave 33)');
  assert.ok(R('src/application/combat/battle-status.js').includes('hatcheryRegisterBattleKills'), 'routes/dresseurs → pension');
  assert.ok(R('src/application/combat/training.js').includes('hatcheryRegisterBattleKills'), 'training → day care');
  assert.ok(!R('src/application/combat/progression.js').includes('daycareShare'), 'Day-Care XP drip removed');
  assert.ok(!R('src/application/combat/battle-switch.js').includes('Daycare passive EXP'), 'XP block on champion removed (K.O.s are enough)');
  assert.ok(R('src/data/game-helpers.js').includes('function getItemStackLimit'), 'factorized stack limit');
  assert.ok(R('src/ui/game/hatchery-ui.js').includes('getDaycareKosPerLevel'), 'UI: Day-Care K.O. counter');
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_panel_daycare_levels"'), 'FR day-care recap key');
  assert.ok(R('src/localization/en/ui.js').includes('"afk_panel_daycare_levels"'), 'EN day-care recap key');
});

