import test from 'node:test';
import assert from 'node:assert/strict';
import { ECSWorld } from '../src/engine/core/ECS.js';
import { PokemonFactory } from '../src/domain/pokemon/pokemon-factory.js';

test('PokemonFactory creates clean ECS Pokémon entities with strict component separation (no location/HeldItem on Pokémon)', () => {
  const world = new ECSWorld();

  // 1. Create a Player-owned Pokémon (Pikachu)
  const specPika = {
    id: 25,
    name: 'Pikachu',
    form: 'normal',
    shiny: true,
    type1: 'Electric',
    level: 50,
    maxHP: 120,
    atk: 90,
    evs: { hp: 10, spe: 252 },
    currentExp: 5000,
    currentMoves: ['thunderbolt', 'quick_attack'],
    activeTalent: 'static',
  };

  const pikaEid = PokemonFactory.createPlayerPokemon(world, specPika);

  // Assert Base Components are present
  assert.ok(world.has(pikaEid, 'Id'), 'Pikachu has Id');
  assert.ok(world.has(pikaEid, 'Name'), 'Pikachu has Name');
  assert.ok(world.has(pikaEid, 'Form'), 'Pikachu has Form');
  assert.ok(world.has(pikaEid, 'Shiny'), 'Pikachu has Shiny');
  assert.ok(world.has(pikaEid, 'Types'), 'Pikachu has Types');
  assert.ok(world.has(pikaEid, 'Level'), 'Pikachu has Level');
  assert.ok(world.has(pikaEid, 'Stats'), 'Pikachu has Stats');
  assert.ok(world.has(pikaEid, 'EVsIVs'), 'Pikachu has EVsIVs');
  assert.ok(world.has(pikaEid, 'Moveset'), 'Pikachu has Moveset');
  assert.ok(world.has(pikaEid, 'Talents'), 'Pikachu has Talents');

  // Assert Player-owned component Experience is present
  assert.ok(world.has(pikaEid, 'Experience'), 'Player Pokémon has Experience component');
  assert.equal(world.get(pikaEid, 'Experience').currentExp, 5000);

  // Assert Excluded components are NOT present on Pokémon Entity
  assert.equal(world.has(pikaEid, 'HeldItem'), false, 'Pokémon Entity does NOT have HeldItem component');
  assert.equal(world.has(pikaEid, 'Location'), false, 'Pokémon Entity does NOT have Location component');
  assert.equal(world.has(pikaEid, 'StatusEffects'), false, 'Pokémon Entity does NOT initially have StatusEffects');

  // 2. Create an Enemy / Wild Pokémon (Charizard) -> NO Experience component!
  const specEnemy = {
    id: 6,
    name: 'Charizard',
    type1: 'Fire',
    type2: 'Flying',
    level: 60,
  };
  const charizardEid = PokemonFactory.createEnemyPokemon(world, specEnemy);
  assert.ok(world.has(charizardEid, 'Id'));
  assert.equal(world.has(charizardEid, 'Experience'), false, 'Enemy Pokémon does NOT have Experience component');

  // 3. Attach and detach StatusEffects conditionally in combat
  PokemonFactory.attachCombatStatus(world, pikaEid, { burn: true, turns: 2 });
  assert.ok(world.has(pikaEid, 'StatusEffects'), 'StatusEffects attached in active combat');
  assert.equal(world.get(pikaEid, 'StatusEffects').burn, true);

  PokemonFactory.detachCombatStatus(world, pikaEid);
  assert.equal(world.has(pikaEid, 'StatusEffects'), false, 'StatusEffects detached after combat/clear');

  // 4. Create Team Slot Entity managing HeldItem and pointing to Pikachu Entity
  const slotEid = PokemonFactory.createTeamSlotEntity(world, 0, pikaEid, 'choice_band');
  assert.ok(world.has(slotEid, 'SlotIndex'));
  assert.ok(world.has(slotEid, 'PokemonRef'));
  assert.ok(world.has(slotEid, 'HeldItem'));

  assert.equal(world.get(slotEid, 'SlotIndex').index, 0);
  assert.equal(world.get(slotEid, 'PokemonRef').pokemonEid, pikaEid);
  assert.equal(world.get(slotEid, 'HeldItem').itemId, 'choice_band');

  // 5. Convert legacy save Pokémon object into clean ECS Pokémon Entity
  const legacyObj = { id: 1, name: 'Bulbasaur', level: 15, exp: 1200 };
  const bulbaEid = PokemonFactory.fromLegacySavePokemon(world, legacyObj, true);
  assert.equal(world.get(bulbaEid, 'Id').id, 1);
  assert.equal(world.get(bulbaEid, 'Experience').currentExp, 1200);
});

