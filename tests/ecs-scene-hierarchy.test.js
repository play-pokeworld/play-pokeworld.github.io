import test from 'node:test';
import assert from 'node:assert/strict';
import { ECSWorld } from '../src/engine/core/ECS.js';
import { ECSUIManager } from '../src/application/ecs-ui-manager.js';

test('ECS Scene Hierarchy and composition work correctly (Scene -> Panel -> Toolbar + Grid -> PokemonCard -> PokemonData)', () => {
  const world = new ECSWorld();
  const ecsUI = new ECSUIManager(world);

  // 1. Create root Scene Entity
  const sceneEid = ecsUI.createSceneEntity('BoxMenuScene');
  assert.ok(world.has(sceneEid, 'Scene'), 'Scene entity has Scene component');
  assert.ok(world.has(sceneEid, 'Hierarchy'), 'Scene entity has Hierarchy component');

  // 2. Create Panel Entity inside Scene
  const panelEid = ecsUI.createPanelEntity('Box PC', '<div id="panel-content"></div>', { variant: 'default' });
  world.addHierarchy(sceneEid, panelEid);
  assert.equal(world.getParent(panelEid), sceneEid, 'Panel parent is Scene');
  assert.deepEqual(world.getChildren(sceneEid), [panelEid], 'Scene children includes Panel');

  // 3. Create Toolbar and Grid Layout Entities inside Panel
  const toolbarEid = ecsUI.createToolbarEntity({ sortOptions: ['name', 'level'] }, panelEid);
  const gridEid = ecsUI.createGridLayoutEntity(4, { gap: '12px' }, panelEid);
  assert.deepEqual(world.getChildren(panelEid), [toolbarEid, gridEid], 'Panel contains Toolbar and Grid');

  // 4. Create Pokemon Data Entities (gameplay layer) and PokemonCard UI Entities inside Grid
  const pokeData1 = { id: 25, name: 'Pikachu', level: 50, currentHP: 100, maxHP: 100 };
  const pokeData2 = { id: 6, name: 'Charizard', level: 70, currentHP: 200, maxHP: 200 };

  const pokeEid1 = ecsUI.createPokemonDataEntity(pokeData1);
  const pokeEid2 = ecsUI.createPokemonDataEntity(pokeData2);

  const cardEid1 = ecsUI.createPokemonCardEntity(pokeData1, { size: 64 }, gridEid, pokeEid1);
  const cardEid2 = ecsUI.createPokemonCardEntity(pokeData2, { size: 64 }, gridEid, pokeEid2);

  assert.deepEqual(world.getChildren(gridEid), [cardEid1, cardEid2], 'Grid contains both Pokemon Card child entities');

  // 5. Verify PokemonRef pointers from UI to Gameplay Data Entities
  const ref1 = world.get(cardEid1, 'PokemonRef');
  const ref2 = world.get(cardEid2, 'PokemonRef');
  assert.equal(ref1.pokemonEid, pokeEid1, 'Card 1 points to Pokemon Data Entity 1');
  assert.equal(ref2.pokemonEid, pokeEid2, 'Card 2 points to Pokemon Data Entity 2');
  assert.equal(ref1.poke.name, 'Pikachu');
  assert.equal(ref2.poke.name, 'Charizard');

  // 6. Verify destroyRecursive cleans up entire scene tree from ECS world
  const totalEntitiesBefore = world._entities.size;
  assert.equal(totalEntitiesBefore, 8, '8 entities created in total');

  world.destroyRecursive(sceneEid);
  assert.equal(world._entities.has(sceneEid), false, 'Scene destroyed');
  assert.equal(world._entities.has(panelEid), false, 'Panel destroyed');
  assert.equal(world._entities.has(toolbarEid), false, 'Toolbar destroyed');
  assert.equal(world._entities.has(gridEid), false, 'Grid destroyed');
  assert.equal(world._entities.has(cardEid1), false, 'Card 1 destroyed');
  assert.equal(world._entities.has(cardEid2), false, 'Card 2 destroyed');

  // Note: Pokemon Data Entities remain in world since they are not children of the UI scene
  assert.equal(world._entities.has(pokeEid1), true, 'Pokemon Data Entity 1 remains alive in gameplay world');
  assert.equal(world._entities.has(pokeEid2), true, 'Pokemon Data Entity 2 remains alive in gameplay world');
});

