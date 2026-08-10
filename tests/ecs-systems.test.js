import test from 'node:test';
import assert from 'node:assert/strict';
import { ECSWorld } from '../src/engine/core/ECS.js';
import { ECSSystemsManager } from '../src/application/ecs-gameplay-systems.js';
import { eventBus } from '../src/core/event-bus.js';

test('ECSSystemsManager executes real ECS gameplay systems (combat:tick, combat:attack, world:encounter, breeding:hatch)', async () => {
  const world = new ECSWorld();
  const systemsMgr = new ECSSystemsManager(world);

  // 1. Test Combat Systems (Tick + Attack -> OnPokemonTakeDamage emission)
  const attackerEid = world.create();
  const defenderEid = world.create();

  world.add(attackerEid, 'Stats', { level: 50, atk: 150, spa: 100, maxHP: 150 });
  world.add(attackerEid, 'Fighter', {
    active: true,
    currentHP: 150,
    cooldown: 100,
    maxCooldown: 2000,
    targetEid: defenderEid,
    currentMove: { power: 80, category: 'phys', type: 'Normal' },
  });

  world.add(defenderEid, 'Stats', { level: 50, def: 100, spd: 100, maxHP: 200 });
  world.add(defenderEid, 'Fighter', {
    active: true,
    currentHP: 200,
  });

  let damageEventFired = false;
  let receivedDamage = 0;
  const offDamage = eventBus.on('OnPokemonTakeDamage', (payload) => {
    if (payload.pokemonEid === defenderEid) {
      damageEventFired = true;
      receivedDamage = payload.damage;
    }
  });

  // Step 1: Tick 50ms -> cooldown goes from 100 to 50, not ready yet
  world.run('combat:tick', 50);
  assert.equal(world.get(attackerEid, 'Fighter').readyToAttack, undefined);

  // Step 2: Tick 60ms -> cooldown reaches 0, readyToAttack = true
  world.run('combat:tick', 60);
  assert.equal(world.get(attackerEid, 'Fighter').readyToAttack, true, 'Attacker is ready to attack');

  // Step 3: Run attack system -> calculates damage via domain rules and applies to target HP
  world.run('combat:attack');
  assert.equal(damageEventFired, true, 'OnPokemonTakeDamage emitted on EventBus');
  assert.ok(receivedDamage > 0, `Received positive damage: ${receivedDamage}`);
  assert.equal(world.get(defenderEid, 'Fighter').currentHP, 200 - receivedDamage, 'Defender HP reduced properly');
  offDamage();

  // 2. Test Breeding & Hatchery System (breeding:hatch -> domain rules,
  //    wave 33 signature: HatcheryProgress + SlotIndex + PokemonRef)
  const eggEid = world.create();
  world.add(eggEid, 'HatcheryProgress', { mode: 'incubate', stepsKo: 20, requiredKos: 25, autoHatch: true, hatchPending: false });
  world.add(eggEid, 'SlotIndex', { index: 0 });
  world.add(eggEid, 'PokemonRef', { poke: null });

  let hatchEventFired = false;
  const offHatch = eventBus.on('breeding:hatch-ready', (payload) => {
    if (payload.slotIndex === 0) hatchEventFired = true;
  });

  world.run('breeding:hatch', 3); // 20 + 3 = 23 < 25 (not ready)
  assert.equal(world.get(eggEid, 'HatcheryProgress').hatchPending, false);

  world.run('breeding:hatch', 3); // 23 + 3 = 26 >= 25 (ready!)
  assert.equal(world.get(eggEid, 'HatcheryProgress').hatchPending, true, 'Egg ready when the K.O. requirement is reached');
  assert.equal(hatchEventFired, true, 'breeding:hatch-ready emitted on EventBus');
  offHatch();

  // 3. Test World Encounter System (world:encounter, wave 33 signature:
  //    WorldLocation + WildSpawnTable + EncounterCooldown; spawn resolved
  //    inside the system via the injected factory port)
  const { setGameplayPorts } = await import('../src/application/ecs-gameplay-systems.js');
  let factoryCalls = 0;
  setGameplayPorts({
    createPoke: (id, level) => { factoryCalls++; return { id, level, name: 'Mon#' + id, maxHP: 40, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }; },
  });

  const locEid = world.create();
  world.add(locEid, 'WorldLocation', { id: 'route_1' });
  world.add(locEid, 'WildSpawnTable', { entries: [[16, 2, 5, 'common'], [19, 2, 5, 'common']], roamingId: 0 });
  world.add(locEid, 'EncounterCooldown', { elapsedMs: 0, intervalMs: 0, pendingSpawn: true, pendingReason: 'ko-chain', lastSpawnEid: -1 });

  let spawnEventFired = false;
  const offSpawn = eventBus.on('world:encounter-spawned', (payload) => {
    if (payload.locationId === 'route_1') spawnEventFired = true;
  });

  world.run('world:encounter', 0); // pending spawn + interval 0 -> spawn now
  assert.equal(spawnEventFired, true, 'world:encounter-spawned emitted on EventBus');
  assert.equal(factoryCalls, 1, 'poke factory port called exactly once');
  const cd = world.get(locEid, 'EncounterCooldown');
  assert.ok(cd.lastSpawnEid > 0, 'cooldown tracks the spawned wild entity');
  const wildRef = world.get(cd.lastSpawnEid, 'PokemonRef');
  assert.ok(wildRef && wildRef.poke && wildRef.poke.id >= 16, 'wild entity carries the spawned Pokemon object');
  const wildComp = world.get(cd.lastSpawnEid, 'WildPokemon');
  assert.ok(wildComp && wildComp.locationId === 'route_1' && wildComp.reason === 'ko-chain');
  offSpawn();
});
