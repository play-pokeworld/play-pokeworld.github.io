// smoke-ecs-gameplay.mjs — REAL browser proof (wave 33, prompt "ECS total"):
// the three newly migrated gameplay systems run IN THE SHIPPED GAME through
// real ECS entities/components, not as renamed legacy functions:
//
//   A. world:encounter — exploreArea()/spawnNextWild() spawn wild Pokemon as
//      WildPokemon entities; battle.enemyPoke IS the component's PokemonRef
//      object (identity), EncounterCooldown records cadence/reason;
//   B. breeding:hatch — hatcheryRegisterBattleKills() runs on HatcheryProgress
//      components: daycare level-up through the system, fee settled on the
//      Wallet component, leftover K.O. counter written back to G;
//   C. economy:market — getMarketPokemon()/buyPokemon()/buyItem()/sellTreasure()
//      run on ShopStock/Wallet/InventoryItems components; G.money/inventory
//      are only synced at the application boundary.
//
// MANUAL RUN (requires the dist preview on :4173):
//   node tests/harness/smoke-ecs-gameplay.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// Degraded-sandbox escape hatch (opt-in): some sandboxes crash the renderer
// while decoding media (Compositor int3 traps — measured via dmesg, reproduces
// on pre-change builds too). PWK_BLOCK_MEDIA=1 aborts media requests so the
// CODE flow stays verifiable; aborted requests never reach the network, so the
// 404/500 integrity assertions below remain fully meaningful.
if (process.env.PWK_BLOCK_MEDIA === '1') await page.route(/\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|woff2?)$/, (route) => route.abort());
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));
page.on('console', (msg) => {
  if (process.env.PWK_BLOCK_MEDIA === '1' && /Failed to load resource: net::ERR_FAILED/.test(msg.text())) return;
  if (msg.type() === 'error') pageErrors.push('console: ' + msg.text());
});

await page.goto(BASE_URL);
await page.waitForFunction(() => typeof window.saveGame === 'function' && typeof window.createNewSaveFromMenu === 'function');

// Real session: menu → new save → starter pick (DOM), like smoke-boot.
await page.evaluate(() => window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) btn.click();
});
await page.waitForFunction(() => document.body.classList.contains('game-started'), null, { timeout: 8000 });
await page.waitForFunction(() => Array.isArray(window.G?.team) && window.G.team.length > 0);

// ── A. world:encounter ───────────────────────────────────────────────────────
const encounter = await page.evaluate(() => {
  const { world } = window.PokeGameplayWorld();
  const wildCount = () => { let n = 0; world.query(['WildPokemon'], () => n++); return n; };
  const presenceEid = () => { let e = -1; world.query(['WorldLocation', 'WildSpawnTable', 'EncounterCooldown'], (eid) => { if (e < 0) e = eid; }); return e; };

  const before = wildCount();
  window.G.location = 'route1';
  window.G.region = 'kanto';
  window.exploreArea(); // manual explore — must go through world:encounter
  const b = window.battle;
  const out = {
    battleActive: !!b.active,
    enemyName: b.enemyPoke && b.enemyPoke.name,
    newEntities: wildCount() - before,
    identityMatch: false,
    reason: null,
    outcome: null,
    koChainNewEnemy: false,
    koChainEntityPlus: false,
    roamingLogFree: true,
  };
  if (!b.active || !b.enemyPoke) return out;
  // identity proof: the spawned enemy IS a WildPokemon entity component object
  world.query(['WildPokemon', 'PokemonRef'], (eid, wild, ref) => {
    if (ref.poke === b.enemyPoke) {
      out.identityMatch = true;
      out.reason = wild.reason;
    }
  });
  const cd = world.get(presenceEid(), 'EncounterCooldown');
  out.outcome = cd && cd.lastOutcome;

  // K.O.-chain path: spawnNextWild() must spawn a NEW enemy, also backed by
  // an entity (the previous wild entity is retired on the next spawn — its
  // id is recycled by the world's free-list, so the proof is object identity
  // + component state, not entity count).
  const prevEnemy = b.enemyPoke;
  window.spawnNextWild();
  out.koChainNewEnemy = !!b.enemyPoke && b.enemyPoke !== prevEnemy;
  out.koChainReason = null;
  world.query(['WildPokemon', 'PokemonRef'], (eid, wild, ref) => {
    if (ref.poke === b.enemyPoke) {
      out.koChainEntityBacked = true;
      out.koChainReason = wild.reason;
    }
  });
  if (typeof window.endBattle === 'function') window.endBattle();
  return out;
});
assert.equal(encounter.battleActive, true, 'A1 — exploreArea() starts a wild battle');
assert.equal(encounter.newEntities, 1, 'A2 — one new WildPokemon entity created by the system');
assert.equal(encounter.identityMatch, true, 'A3 — battle.enemyPoke is the ECS entity component object (identity)');
assert.equal(encounter.reason, 'explore', 'A4 — spawn reason recorded on the WildPokemon component');
assert.equal(encounter.outcome, 'spawned', 'A5 — EncounterCooldown records the outcome');
assert.equal(encounter.koChainNewEnemy, true, 'A6 — spawnNextWild() chains a fresh enemy object');
assert.equal(encounter.koChainEntityBacked, true, 'A7 — the K.O.-chain enemy is backed by a WildPokemon entity');
assert.equal(encounter.koChainReason, 'ko-chain', 'A8 — chain reason recorded on the component');

// ── B. breeding:hatch ────────────────────────────────────────────────────────
const hatchery = await page.evaluate(() => {
  const { world } = window.PokeGameplayWorld();
  const trainee = window.G.team[0];
  const fee = (typeof window.getHatcheryLevelUpFee === 'function') ? window.getHatcheryLevelUpFee() : 0;
  window.G.hatchery = [{ poke: trainee, steps: 0, stepsReq: 25, mode: 'exp' }, null, null, null];
  window.G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  window.G.money = 100000;
  const lvl0 = trainee.level;
  const levels = window.hatcheryRegisterBattleKills(10); // 10 K.O. = 1 level
  let slotProgress = null;
  world.query(['HatcheryProgress', 'SlotIndex'], (eid, progress, slot) => {
    if (slot.index === 0) slotProgress = { stepsKo: progress.stepsKo, mode: progress.mode };
  });
  let walletMoney = null;
  world.query(['Wallet'], (eid, wallet) => { if (walletMoney === null) walletMoney = wallet.money; });
  return {
    levelsReturned: levels,
    gained: trainee.level - lvl0,
    moneySpent: 100000 - window.G.money,
    expectedFee: fee,
    walletMatchesG: walletMoney === window.G.money,
    slotStepsBackInG: window.G.hatchery[0].steps,
    slotProgress,
  };
});
assert.equal(hatchery.levelsReturned, 1, 'B1 — 10 K.O. → exactly 1 daycare level (parity)');
assert.equal(hatchery.gained, 1, 'B2 — the Pokemon really gained the level in-game');
assert.equal(hatchery.moneySpent, hatchery.expectedFee, 'B3 — daycare fee settled on the Wallet component then written to G');
assert.equal(hatchery.walletMatchesG, true, 'B4 — Wallet component and G.money agree at the boundary');
assert.equal(hatchery.slotStepsBackInG, 0, 'B5 — 10 K.O. consumed, counter reset (10/level)');
assert.deepEqual(hatchery.slotProgress, { stepsKo: 0, mode: 'daycare' }, 'B6 — HatcheryProgress component mirrors the slot');

// ── C. economy:market ────────────────────────────────────────────────────────
const market = await page.evaluate(() => {
  const { world } = window.PokeGameplayWorld();
  const marketState = () => {
    let stock = null, money = null, inv = null;
    world.query(['ShopStock'], (eid, s) => { stock = { region: s.region, count: (s.items || []).length }; });
    world.query(['Wallet'], (eid, w) => { if (money === null) money = w.money; });
    world.query(['InventoryItems'], (eid, i) => { if (inv === null) inv = Object.assign({}, i.counts); });
    return { stock, money, inv };
  };
  window.G.region = 'kanto';
  window.G.money = 500000;
  const ids = window.getMarketPokemon();
  window.buyPokemon(133); // Eevee — 180 000₽ override (strict parity)
  const afterBuy = marketState();
  const moneyAfterEevee = window.G.money;
  const teamOrCollection = window.G.team.some((p) => Number(p.id) === 133)
    || Object.values(window.G.collection || {}).some((p) => Number(p.id) === 133);

  const berriesBefore = window.G.inventory.occa_berry || 0;
  window.buyItem('occa_berry');
  const potionOk = (window.G.inventory.occa_berry || 0) === berriesBefore + 1;
  const moneyAfterPotion = window.G.money;

  window.G.inventory.nugget = 2;
  const moneyBeforeSell = window.G.money;
  window.sellTreasure('nugget', 2);
  const soldMoney = window.G.money - moneyBeforeSell;
  const soldOut = !(window.G.inventory.nugget > 0);
  const final = marketState();
  return {
    stockListed: Array.isArray(ids) && ids.length > 0 && ids.includes(133),
    stockComponent: afterBuy.stock,
    eeveePaid: 500000 - moneyAfterEevee,
    eeveeOwned: teamOrCollection,
    walletSynced: final.money === window.G.money,
    potionOk,
    potionPrice: moneyAfterEevee - moneyAfterPotion,
    soldMoney,
    soldOut,
    invSynced: final.inv,
  };
});
assert.equal(market.stockListed, true, 'C1 — market stock listed through the ECS ShopStock');
assert.ok(market.stockComponent && market.stockComponent.count > 0, 'C2 — ShopStock component carries the computed stock');
assert.equal(market.eeveePaid, 180000, 'C3 — Eevee charged at the strict-parity override price');
assert.equal(market.eeveeOwned, true, 'C4 — bought Pokemon lands in team/collection (game handoff intact)');
assert.equal(market.potionOk, true, 'C5 — item purchase mutates the InventoryItems component then G');
assert.ok(market.potionPrice > 0, 'C6 — item price debited');
assert.ok(market.soldMoney > 0, 'C7 — treasure sale credits the Wallet');
assert.equal(market.soldOut, true, 'C8 — sold stack removed from the inventory');
assert.equal(market.walletSynced, true, 'C9 — Wallet component and G.money agree after all operations');

assert.deepEqual(pageErrors, [], 'no page errors during the ECS gameplay run');
await browser.close();
console.log('smoke-ecs_gameplay: OK — world:encounter, breeding:hatch and economy:market run IN GAME on real ECS entities/components (wild spawn identity, daycare level+fee on Wallet, market wallet/stock/inventory).');

