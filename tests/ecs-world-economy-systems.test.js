import test from 'node:test';
import assert from 'node:assert/strict';
import { ECSWorld } from '../src/engine/core/ECS.js';
import { ECSSystemsManager, setGameplayPorts } from '../src/application/ecs-gameplay-systems.js';
import { eventBus } from '../src/core/event-bus.js';
import {
  pickWildFromTable, ROAMING_CHANCE, ROAMING_LEVEL,
} from '../src/domain/world/encounter-rules.js';
import {
  computeRequiredHatchKos, applyIncubationKills, applyDaycareKills, computeDaycareFee, DAYCARE_KOS_PER_LEVEL,
} from '../src/domain/breeding/hatchery-rules.js';
import {
  MARKET_PRICE_OVERRIDES, MARKET_STOCK, getPokemonPrice, computeMarketStock, categorizeMarketSpecies,
} from '../src/domain/economy/market.js';
import { canAffordPurchase, canAddToBag, canSellTreasure, computeSaleValue, mergeShopStock } from '../src/domain/economy/shop-rules.js';

// ─── world:encounter — real ECS spawn (§1.1) ────────────────────────────────

test('world:encounter spawns a wild Pokemon through a real ECS entity on component data', () => {
  const world = new ECSWorld();
  const systems = new ECSSystemsManager(world);
  const spawned = [];
  setGameplayPorts({
    createPoke: (id, level) => ({ id, level, name: 'Mon#' + id, maxHP: 50 }),
    rng: () => 0.9, // common bucket, first entry, deterministic
  });

  const eid = world.create();
  world.add(eid, 'WorldLocation', { id: 'route1' });
  world.add(eid, 'WildSpawnTable', { entries: [[16, 2, 5, 'common']], roamingId: 0 });
  world.add(eid, 'EncounterCooldown', { elapsedMs: 0, intervalMs: 0, pendingSpawn: true, pendingReason: 'ko-chain', lastSpawnEid: -1 });

  const off = eventBus.on('world:encounter-spawned', (p) => spawned.push(p));
  const matched = world.run('world:encounter', 0);
  off();

  assert.equal(matched, 1, 'the system iterated exactly one presence entity');
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].speciesId, 16);
  assert.equal(spawned[0].reason, 'ko-chain');
  const cd = world.get(eid, 'EncounterCooldown');
  assert.ok(cd.lastSpawnEid > 0);
  assert.ok(world.get(cd.lastSpawnEid, 'WildPokemon'), 'wild pokemon is a real ECS entity');
  assert.ok(world.get(cd.lastSpawnEid, 'PokemonRef').poke.id === 16);
  assert.equal(cd.pendingSpawn, false);
});

test('world:encounter record cadence explicitly on EncounterCooldown (strict parity: interval 0)', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  setGameplayPorts({ createPoke: (id, level) => ({ id, level }), rng: () => 0.9 });
  const eid = world.create();
  world.add(eid, 'WorldLocation', { id: 'route2' });
  world.add(eid, 'WildSpawnTable', { entries: [[10, 3, 6, 'common']], roamingId: 0 });
  world.add(eid, 'EncounterCooldown', { elapsedMs: 0, intervalMs: 250, pendingSpawn: true, pendingReason: 'explore', lastSpawnEid: -1 });

  world.run('world:encounter', 100); // 100 < 250 → no spawn yet, timer records
  assert.equal(world.get(eid, 'EncounterCooldown').elapsedMs, 100);
  assert.equal(world.get(eid, 'EncounterCooldown').lastSpawnEid, -1);
  world.run('world:encounter', 200); // 300 >= 250 → spawn + timer reset
  assert.ok(world.get(eid, 'EncounterCooldown').lastSpawnEid > 0);
  assert.equal(world.get(eid, 'EncounterCooldown').elapsedMs, 0);
});

test('pickWildFromTable reproduces the classic rule (roaming, buckets, fallbacks)', () => {
  // roaming roll: first rng call below 0.003 forces the roaming legendary at 45
  const roam = pickWildFromTable([[16, 2, 5, 'common']], { roamingId: 144, rng: () => 0.001 });
  assert.equal(roam.isRoaming, true);
  assert.equal(roam.speciesId, 144);
  assert.equal(roam.level, ROAMING_LEVEL);
  assert.ok(ROAMING_CHANCE > 0 && ROAMING_CHANCE < 0.01, 'roaming stays a rare 0.3% roll');

  // bucket roll: 0.0 → rare bucket; table without rare entries falls back to common
  const wild = [[10, 3, 6, 'common'], [13, 3, 6, 'uncommon'], [150, 50, 55, 'rare']];
  const rarePick = pickWildFromTable(wild, { rng: () => 0.0 });
  assert.equal(rarePick.bucket, 'rare');
  assert.equal(rarePick.speciesId, 150);
  const fallback = pickWildFromTable([[10, 3, 6, 'common']], { rng: () => 0.0 });
  assert.equal(fallback.speciesId, 10, 'empty rare bucket falls back to common');

  // empty table → null (caller ends the battle, parity)
  assert.equal(pickWildFromTable([], { rng: () => 0.5 }), null);
});

// ─── breeding:hatch — real ECS daycare/incubation (§1.2) ────────────────────

test('breeding:hatch daycare mode levels through the injected port and settles the fee on the Wallet component', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  const poke = { id: 25, name: 'Pika', level: 5 };
  const levelUps = [];
  setGameplayPorts({
    levelUpPokemon: (p) => { levelUps.push(p); p.level += 1; },
    getDaycareLevelUpFee: () => 100,
  });

  const walletEid = world.create();
  world.add(walletEid, 'Wallet', { money: 1000 });
  world.add(walletEid, 'InventoryItems', { counts: {} });

  const slotEid = world.create();
  world.add(slotEid, 'HatcheryProgress', { mode: 'daycare', stepsKo: 0, requiredKos: 10, kosPerLevel: 10, autoHatch: false });
  world.add(slotEid, 'SlotIndex', { index: 1 });
  world.add(slotEid, 'PokemonRef', { poke });

  world.run('breeding:hatch', 25); // 25 K.O. → 2 levels (20 K.O.), 5 kept
  assert.equal(levelUps.length, 2, 'two level-ups performed inside the system');
  assert.equal(poke.level, 7);
  assert.equal(world.get(slotEid, 'HatcheryProgress').stepsKo, 5, 'leftover K.O. remain on the component');
  assert.equal(world.get(walletEid, 'Wallet').money, 800, 'daycare fee settled on the Wallet component (2 × 100)');
  const outcome = world.get(slotEid, 'HatcheryProgress').lastOutcome;
  assert.equal(outcome.kind, 'daycare-levelup');
  assert.equal(outcome.fee, 200);
});

test('breeding:hatch evicts on insufficient funds (parity) without paying', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  const poke = { id: 4, name: 'Salam', level: 12 };
  setGameplayPorts({ levelUpPokemon: (p) => { p.level += 1; }, getDaycareLevelUpFee: () => 500 });
  const walletEid = world.create();
  world.add(walletEid, 'Wallet', { money: 300 });

  const evictEvents = [];
  const off = eventBus.on('breeding:daycare-evict', (p) => evictEvents.push(p));

  const slotEid = world.create();
  world.add(slotEid, 'HatcheryProgress', { mode: 'daycare', stepsKo: 0, requiredKos: 10, kosPerLevel: 10 });
  world.add(slotEid, 'SlotIndex', { index: 2 });
  world.add(slotEid, 'PokemonRef', { poke });

  world.run('breeding:hatch', 10); // would cost 500, wallet has 300
  off();
  const outcome = world.get(slotEid, 'HatcheryProgress').lastOutcome;
  assert.equal(outcome.kind, 'evict');
  assert.equal(outcome.reason, 'insufficient-funds');
  assert.equal(poke.level, 13, 'level already applied — eviction moves the pokemon out (parity)');
  assert.equal(world.get(walletEid, 'Wallet').money, 300, 'no fee collected on eviction');
  assert.equal(evictEvents.length, 1);
});

test('breeding:hatch incubate counts K.O. and flags hatch-ready only with autoHatch (parity)', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  const slotEid = world.create();
  world.add(slotEid, 'HatcheryProgress', { mode: 'incubate', stepsKo: 24, requiredKos: 25, autoHatch: false, hatchPending: false });
  world.add(slotEid, 'SlotIndex', { index: 0 });
  world.add(slotEid, 'PokemonRef', { poke: { id: 138 } });

  world.run('breeding:hatch', 1);
  assert.equal(world.get(slotEid, 'HatcheryProgress').stepsKo, 25);
  assert.equal(world.get(slotEid, 'HatcheryProgress').hatchPending, false, 'no auto-hatch without automation (parity)');

  world.add(slotEid, 'HatcheryProgress', { mode: 'incubate', stepsKo: 24, requiredKos: 25, autoHatch: true, hatchPending: false });
  world.run('breeding:hatch', 1);
  assert.equal(world.get(slotEid, 'HatcheryProgress').hatchPending, true, 'auto-hatch fires at the requirement');
});

test('domain breeding rules reproduce the classic daycare/incubation arithmetic', () => {
  assert.equal(DAYCARE_KOS_PER_LEVEL, 10);
  assert.equal(computeRequiredHatchKos({ bst: 200 }), 25);
  assert.equal(computeRequiredHatchKos({ bst: 330 }), 35);
  assert.equal(computeRequiredHatchKos({ bst: 500 }), 70);
  assert.equal(computeRequiredHatchKos({ bst: 999 }), 100);
  assert.equal(computeRequiredHatchKos({ bst: 600, isLegendary: true }), 100);
  assert.equal(computeRequiredHatchKos({ bst: 500, staffBonus: 0.5 }), 35, 'staff speed bonus scales the requirement');
  assert.deepEqual(applyIncubationKills({ stepsKo: 20, requiredKos: 25 }, 5, { autoHatch: true }), { stepsKo: 25, hatchReady: true });
  assert.deepEqual(applyDaycareKills({ stepsKo: 0, level: 99 }, 25, {}), { stepsKo: 15, level: 100, levelsGained: 1 }, 'level capped at 100, K.O. leftover kept');
  assert.equal(computeDaycareFee(3, 150), 450);
});

// ─── economy:market — real ECS wallet/stock (§1.3) ──────────────────────────

test('economy:market refresh computes stock through domain rules on ShopStock', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  setGameplayPorts({
    getWildSpeciesIds: () => new Set([106]), // Hitmonlee catchable → filtered out
    getEvoTargetIds: () => new Set([107]),   // Hitmonchan is an evo base → filtered (not allow-listed)
    getPokemonData: () => ({}),
  });
  const marketEid = world.create();
  world.add(marketEid, 'Marketplace', {});
  world.add(marketEid, 'ShopStock', { region: 'kanto', items: [] });

  world.run('economy:market', { op: 'refresh-market', region: 'kanto' });
  const ids = world.get(marketEid, 'ShopStock').items.map((it) => it.id);
  assert.ok(!ids.includes(106), 'wild-catchable excluded (classic filter)');
  assert.ok(!ids.includes(107), 'evo base excluded (classic filter)');
  assert.deepEqual(ids, MARKET_STOCK.kanto.filter((id) => id !== 106 && id !== 107));
});

test('economy:market buy-pokemon debits the Wallet component (strict parity prices)', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  setGameplayPorts({
    getWildSpeciesIds: () => new Set(),
    getEvoTargetIds: () => new Set(),
    getPokemonData: () => ({}),
  });
  const walletEid = world.create();
  world.add(walletEid, 'Wallet', { money: 200000 });
  const marketEid = world.create();
  world.add(marketEid, 'Marketplace', {});
  world.add(marketEid, 'ShopStock', { region: 'kanto', items: [] });

  world.run('economy:market', { op: 'refresh-market', region: 'kanto' });
  world.run('economy:market', { op: 'buy-pokemon', speciesId: 133 }); // Eevee: 180000 override
  assert.equal(world.get(walletEid, 'Wallet').money, 20000);
  assert.equal(world.get(marketEid, 'Marketplace').lastOutcome.price, MARKET_PRICE_OVERRIDES[133]);

  world.run('economy:market', { op: 'buy-pokemon', speciesId: 1 }); // 100000 > 20000 → denied
  const denied = world.get(marketEid, 'Marketplace').lastOutcome;
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'insufficient-funds');
  assert.equal(world.get(walletEid, 'Wallet').money, 20000, 'wallet untouched on denial');
});

test('economy:market buy-item and sell-treasure mutate Wallet + InventoryItems components', () => {
  const world = new ECSWorld();
  new ECSSystemsManager(world);
  setGameplayPorts({
    getItemDef: (key) => ({ potion: { price: 300, type: 'heal' }, gem: { type: 'treasure', value: 5000 }, oddkeystone: { type: 'fossil' } })[key] || null,
    getShopBaseStock: () => ['potion'],
    getShopGeneratedStock: () => ['potion', 'ct01'],
  });
  const walletEid = world.create();
  world.add(walletEid, 'Wallet', { money: 10000 });
  world.add(walletEid, 'InventoryItems', { counts: { gem: 3, oddkeystone: 1 } });
  const marketEid = world.create();
  world.add(marketEid, 'Marketplace', {});
  world.add(marketEid, 'ShopStock', {});

  // shop stock merge rule runs inside the system
  world.run('economy:market', { op: 'refresh-shop', shopId: 'pewter' });
  assert.deepEqual(world.get(marketEid, 'ShopStock').shopItems, ['potion', 'ct01']);

  world.run('economy:market', { op: 'buy-item', itemKey: 'potion' });
  assert.equal(world.get(walletEid, 'Wallet').money, 9700);
  assert.equal(world.get(walletEid, 'InventoryItems').counts.potion, 1);

  world.run('economy:market', { op: 'sell-treasure', itemKey: 'gem', count: 2 });
  const inv = world.get(walletEid, 'InventoryItems').counts;
  assert.equal(inv.gem, 1);
  assert.equal(world.get(walletEid, 'Wallet').money, 9700 + 10000);

  world.run('economy:market', { op: 'sell-treasure', itemKey: 'oddkeystone', count: 1 });
  const denied = world.get(marketEid, 'Marketplace').lastOutcome;
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'not-sellable', 'fossils stay unsellable (classic guard)');
});

// ─── domain economy rules parity ────────────────────────────────────────────

test('market domain keeps the exact classic pricing and stock tables', () => {
  assert.equal(getPokemonPrice(1, {}), 100000);
  assert.equal(getPokemonPrice(137, {}), 250000);
  assert.equal(getPokemonPrice(152, {}), 150000);
  assert.equal(getPokemonPrice(999, {}), 999999, 'unknown species keep the classic sentinel price');
  const pd = { 999: ['Test', 'Normal', null, 40, 50, 50, 50, 50, 50] };
  assert.equal(getPokemonPrice(999, pd), 80000, 'BST 290 × 240 → floored at 80 000 (classic formula)');
  const pdBoss = { 1000: ['Boss', 'Dragon', null, 100, 120, 100, 120, 100, 100] };
  assert.equal(getPokemonPrice(1000, pdBoss), 332800, 'BST 640 × 520 (classic band)');

  const stock = computeMarketStock('johto', {
    wildSpeciesIds: new Set([172]),
    evoTargetIds: new Set([196]),
    pokemonData: {},
  });
  const ids = stock.map((it) => it.id);
  assert.ok(!ids.includes(172) && !ids.includes(196));
  assert.deepEqual(ids, MARKET_STOCK.johto.filter((i) => ![172, 196].includes(i)));
  assert.equal(categorizeMarketSpecies(133), 'rare');
  assert.equal(categorizeMarketSpecies(1), 'starter');
});

test('shop domain rules reproduce the classic bag/sale rules', () => {
  assert.equal(canAffordPurchase(1000, 1000), true);
  assert.equal(canAffordPurchase(999, 1000), false);
  assert.equal(canAddToBag({ type: 'held' }, 24), true);
  assert.equal(canAddToBag({ type: 'held' }, 25), false, 'held items capped at 25');
  assert.equal(canAddToBag({ type: 'heal' }, 5000), true);
  assert.equal(canSellTreasure({ type: 'fossil' }, 2), false);
  assert.equal(canSellTreasure({ type: 'treasure' }, 2), true);
  assert.equal(computeSaleValue({ value: 5000 }, 3), 15000);
  assert.equal(computeSaleValue({}, 2), 4000, 'default 2 000₽ per unit (classic)');
  assert.deepEqual(mergeShopStock(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
});
