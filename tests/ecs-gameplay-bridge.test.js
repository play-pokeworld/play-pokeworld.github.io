import test from 'node:test';
import assert from 'node:assert/strict';
import { ECSWorld } from '../src/engine/core/ECS.js';
import { ECSGameplayBridge } from '../src/application/ecs-gameplay-bridge.js';

test('ECSGameplayBridge synchronizes legacy G state to real ECS Entities and syncs HP back', () => {
  const world = new ECSWorld();
  const bridge = new ECSGameplayBridge(world);

  // 1. Mock legacy game state G with 2 team Pokémon and 2 box Pokémon
  const G = {
    team: [
      { uid: 'poke_pikachu', id: 25, name: 'Pikachu', level: 50, maxHP: 120, currentHP: 120, atk: 95 },
      { uid: 'poke_charizard', id: 6, name: 'Charizard', level: 70, maxHP: 220, currentHP: 220, atk: 180 },
    ],
    box: [
      { uid: 'poke_bulbasaur', id: 1, name: 'Bulbasaur', level: 10, maxHP: 45 },
      { uid: 'poke_squirtle', id: 7, name: 'Squirtle', level: 12, maxHP: 48 },
    ],
  };

  // 2. Sync from G to ECS
  const stats = bridge.syncFromGameState(G);
  assert.equal(stats.teamCount, 2, '2 team Pokémon synced to ECS');
  assert.equal(stats.boxCount, 2, '2 box Pokémon synced to ECS');
  assert.equal(stats.totalSynced, 4, '4 total ECS entities created');
  assert.equal(world.stats().entities, 4, '4 active entities in ECSWorld');

  // 3. Verify ECS components on Pikachu (Team slot 0)
  const pikachuEid = bridge._entityMap.get('poke_pikachu');
  assert.ok(world.has(pikachuEid, 'PokemonData'), 'Pikachu has PokemonData component');
  assert.ok(world.has(pikachuEid, 'Stats'), 'Pikachu has Stats component');
  assert.ok(world.has(pikachuEid, 'Fighter'), 'Pikachu has Fighter component');

  const pikaData = world.get(pikachuEid, 'PokemonData');
  const pikaStats = world.get(pikachuEid, 'Stats');
  const pikaFighter = world.get(pikachuEid, 'Fighter');

  assert.equal(pikaData.id, 25);
  assert.equal(pikaData.location, 'team');
  assert.equal(pikaStats.maxHP, 120);
  assert.equal(pikaFighter.currentHP, 120);
  assert.equal(pikaFighter.active, true, 'Slot 0 is active fighter');

  // 4. Simulate ECS combat damage reducing Pikachu HP from 120 to 85
  pikaFighter.currentHP = 85;

  // 5. Sync back to G
  const updated = bridge.syncToGameState(G);
  assert.equal(updated, 2, '2 team Pokémon checked');
  assert.equal(G.team[0].currentHP, 85, 'Pikachu HP in G.team[0] synchronized to 85 from ECS Fighter');

  // 6. Idempotency check: running syncFromGameState again updates existing entities instead of duplicating
  const stats2 = bridge.syncFromGameState(G);
  assert.equal(stats2.totalSynced, 4, 'Still 4 total synced');
  assert.equal(world.stats().entities, 4, 'Still 4 active entities in ECSWorld (no duplicate IDs created)');
});

