import test from 'node:test';
import assert from 'node:assert/strict';
import { ECSWorld } from '../src/engine/core/ECS.js';
import { ECSSystemsManager } from '../src/application/ecs-gameplay-systems.js';
import { PokemonFactory } from '../src/domain/pokemon/pokemon-factory.js';
import { eventBus } from '../src/core/event-bus.js';

test('Complete ECS Combat Loop (Tick -> Attack -> Enemy Faint -> XP Reward -> Level Up)', () => {
  const world = new ECSWorld();
  const systemsMgr = new ECSSystemsManager(world);

  // 1. Create Player-owned Pokémon Pikachu (with Experience component)
  const pikaEid = PokemonFactory.createPlayerPokemon(world, {
    id: 25,
    name: 'Pikachu',
    level: 5,
    maxHP: 50,
    atk: 100,
    spa: 100,
    currentExp: 900, // 100 XP away from level 6 (expToNextLevel = 1000)
    currentMoves: [{ id: 'thunderbolt', power: 90, type: 'Electric' }],
  });

  // 2. Create Enemy Pokémon Pidgey (no Experience component)
  const pidgeyEid = PokemonFactory.createEnemyPokemon(world, {
    id: 16,
    name: 'Pidgey',
    level: 4,
    maxHP: 20,
    def: 10,
    spd: 10,
  });

  // Attach Fighter components
  world.add(pikaEid, 'Fighter', {
    active: true,
    currentHP: 50,
    cooldown: 50,
    maxCooldown: 100,
    targetEid: pidgeyEid,
    currentMove: { power: 90, category: 'spec', type: 'Electric' },
  });

  world.add(pidgeyEid, 'Fighter', {
    active: true,
    currentHP: 20,
    cooldown: 200,
    maxCooldown: 200,
  });

  let damageFired = 0;
  let faintFired = false;
  let levelUpFired = false;
  let newLevel = 5;

  const offDmg = eventBus.on('OnPokemonTakeDamage', () => { damageFired++; });
  const offFaint = eventBus.on('combat:faint', (payload) => {
    if (payload.eid === pidgeyEid) {
      faintFired = true;
      // When enemy faints, award XP to active player fighter
      const pikaFighter = world.get(pikaEid, 'Fighter');
      if (pikaFighter) pikaFighter.pendingExpReward = 150;
    }
  });
  const offLvl = eventBus.on('pokemon:level-up', (payload) => {
    if (payload.eid === pikaEid) {
      levelUpFired = true;
      newLevel = payload.level;
    }
  });

  // Step 1: Tick 50ms -> cooldown reaches 0 -> Pikachu readyToAttack = true -> Attack fires!
  systemsMgr.update(50);
  assert.equal(damageFired, 1, 'Damage applied to Pidgey');
  assert.equal(world.get(pidgeyEid, 'Fighter').currentHP, 0, 'Pidgey HP reduced to 0');
  assert.equal(faintFired, true, 'combat:faint emitted on EventBus');

  // Step 2: Next frame update -> combat:xp-reward runs -> awards 150 XP -> 900+150 = 1050 >= 1000 -> Level up!
  systemsMgr.update(16);
  assert.equal(levelUpFired, true, 'pokemon:level-up emitted on EventBus');
  assert.equal(world.get(pikaEid, 'Level').level, 6, 'Pikachu level increased to 6');
  assert.equal(newLevel, 6, 'EventBus received level 6');
  assert.equal(world.get(pikaEid, 'Experience').currentExp, 50, 'Remainder XP (50) carried over');

  offDmg();
  offFaint();
  offLvl();
});
