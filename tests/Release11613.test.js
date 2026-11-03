/**
 * @file Release11613.test.js
 * @brief 1.16.13 — evolutions match the reference: the Pokémon is kept and the evolved species
 * joins the collection at level 1; levels, split branches, IV conditions, item evolutions and the
 * region gate follow the content data.
 */
import { describe, assert } from './TestRunner.js';
import { installFakeDom } from './FakeDom.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { EvolutionSystem } from '../src/systems/EvolutionSystem.js';
import { ItemUseSystem } from '../src/systems/ItemUseSystem.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { ItemUseActions, ItemUseResults } from '../src/config/ItemUseRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { setRoster, addOwned } from './RosterFixtures.js';

installFakeDom();

const saves = SaveSystem.getInstance();
const evolution = EvolutionSystem.getInstance();
const itemUse = ItemUseSystem.getInstance();

/** @param {string} name @param {string} [region='kanto'] @returns {Object} Fresh save */
function fixture(name, region = 'kanto') {
  const save = saves.createNewSave(name, 'bulbasaur');
  save.tutorial.enabled = false;
  save.player.region = region;
  FeatureAccessSystem.getInstance().refresh('evolution-fixture', { force: true, persist: false });
  return save;
}

/** @param {string} name @returns {string[]} */
function allRegionIds() {
  return PokemonDB.getInstance().getAll().map((species) => species.region).filter((id, index, list) => list.indexOf(id) === index);
}

/**
 * Runs `action` with every region unlocked. Branch tests check the content data, not the region
 * gate: the gate itself has its own test below.
 * @param {Function} action
 */
function withAllRegions(action) {
  const access = FeatureAccessSystem.getInstance();
  const original = access.getSnapshot;
  access.getSnapshot = function () {
    return { ...original.call(this), regions: allRegionIds() };
  };
  try {
    return action();
  } finally {
    access.getSnapshot = original;
  }
}

/** @param {Object} save @param {string} species @returns {Object[]} */
function allOf(save, species) {
  return save.collection.getAll().filter((pokemon) => pokemon.species === species);
}

describe('1.16.13 — evolutions keep the Pokémon and add a level-1 species', (test) => {
  test('a level evolution never transforms the source and adds the target at level 1', () => {
    const save = fixture('Evo keep');
    const charmander = PokemonFactory.create('charmander', 15, { nickname: 'Flammèche' });
    setRoster(save, [charmander]);
    const uid = charmander.uid;

    charmander.setLevel(16);
    const result = evolution.applyLevelEvolutions(charmander);

    assert.deepEqual(result.targets, ['charmeleon']);
    assert.equal(charmander.species, 'charmander', 'the source keeps its species');
    assert.equal(charmander.level, 16, 'the source keeps its level');
    assert.equal(charmander.uid, uid, 'the source keeps its identity');
    assert.equal(charmander.nickname, 'Flammèche');
    assert.ok(charmander.hasEvolvedInto('charmeleon'));
    const created = allOf(save, 'charmeleon');
    assert.equal(created.length, 1);
    assert.equal(created[0].level, 1);
    assert.notEqual(created[0].uid, uid);
    assert.ok(save.pokedex.isCaught('charmeleon'));
    assert.ok(save.teamMembers.includes(uid), 'the party still holds the original Pokémon');
    assert.equal(save.team.length, 1, 'the evolved species does not enter the party');
  });

  test('an evolution is produced once per Pokémon and per target', () => {
    const save = fixture('Evo once');
    const caterpie = PokemonFactory.create('caterpie', 7);
    setRoster(save, [caterpie]);

    assert.deepEqual(evolution.applyLevelEvolutions(caterpie).targets, ['metapod']);
    assert.deepEqual(evolution.applyLevelEvolutions(caterpie).targets, [], 'a second check produces nothing');
    assert.equal(allOf(save, 'metapod').length, 1);
    caterpie.setLevel(30);
    assert.deepEqual(evolution.applyLevelEvolutions(caterpie).targets, [], 'Metapod is not produced again at a higher level');
  });

  test('the shiny state is inherited by the produced Pokémon', () => {
    const save = fixture('Evo shiny');
    const shinyPikachu = PokemonFactory.create('pikachu', 50, { shiny: true });
    setRoster(save, [shinyPikachu]);
    save.inventory.add('thunderstone', 1, { deferSave: true });

    const result = itemUse.useOnPokemon('thunderstone', shinyPikachu.uid);
    assert.equal(result.result, ItemUseResults.SUCCESS);
    assert.equal(result.targetSpecies, 'raichu');
    const raichu = allOf(save, 'raichu')[0];
    assert.ok(raichu, 'Raichu is created');
    assert.equal(raichu.shiny, true, 'the evolved species keeps the shiny state');
    assert.equal(shinyPikachu.species, 'pikachu');
  });

  test('split evolutions produce every branch (Wurmple, Nincada)', () => {
    withAllRegions(() => {
      const save = fixture('Evo split');
      const wurmple = PokemonFactory.create('wurmple', 7);
      const nincada = PokemonFactory.create('nincada', 20);
      setRoster(save, [wurmple], [nincada]);

      assert.deepEqual(evolution.applyLevelEvolutions(wurmple).targets, ['silcoon', 'cascoon']);
      assert.equal(allOf(save, 'silcoon').length, 1);
      assert.equal(allOf(save, 'cascoon').length, 1);

      const branches = evolution.applyLevelEvolutions(nincada).targets.slice().sort();
      assert.deepEqual(branches, ['ninjask', 'shedinja']);
      assert.equal(allOf(save, 'ninjask').length, 1);
      assert.equal(allOf(save, 'shedinja').length, 1);
    });
  });

  test('a conditional evolution follows the IV comparison (Tyrogue)', () => withAllRegions(() => {
    const save = fixture('Evo tyrogue');
    const attacker = PokemonFactory.create('tyrogue', 20);
    const defender = PokemonFactory.create('tyrogue', 20);
    const balanced = PokemonFactory.create('tyrogue', 20);
    attacker.ivs = { ...attacker.ivs, atk: 31, def: 5 };
    defender.ivs = { ...defender.ivs, atk: 5, def: 31 };
    balanced.ivs = { ...balanced.ivs, atk: 20, def: 20 };
    setRoster(save, [], [attacker, defender, balanced]);

    assert.deepEqual(evolution.applyLevelEvolutions(attacker).targets, ['hitmonlee'], 'attack above defence');
    assert.deepEqual(evolution.applyLevelEvolutions(defender).targets, ['hitmonchan'], 'defence above attack');
    assert.deepEqual(evolution.applyLevelEvolutions(balanced).targets, ['hitmontop'], 'equal stats');
  }));

  test('the four Kanto trade evolutions are plain level 40 evolutions, like the reference', () => {
    const save = fixture('Evo trade');
    const pairs = [['kadabra', 'alakazam'], ['machoke', 'machamp'], ['graveler', 'golem'], ['haunter', 'gengar']];
    for (const [source, target] of pairs) {
      const species = PokemonDB.getInstance().getById(source);
      const entries = species.evolutions;
      assert.equal(entries.length, 1, `${source} has a single evolution method`);
      assert.equal(entries[0].level, 40, `${source} evolves at level 40`);
      assert.equal(entries[0].item, undefined, `${source} needs no item`);
      assert.equal(entries[0].to, target);

      const pokemon = PokemonFactory.create(source, 39);
      addOwned(save, pokemon);
      assert.deepEqual(evolution.applyLevelEvolutions(pokemon).targets, [], `${source} is too low at 39`);
      pokemon.setLevel(40);
      assert.deepEqual(evolution.applyLevelEvolutions(pokemon).targets, [target]);
    }
  });

  test('item evolutions respect the minimum level of the content data', () => {
    const save = fixture('Evo stone level');
    const eevee = PokemonFactory.create('eevee', 49);
    setRoster(save, [eevee]);
    save.inventory.add('firestone', 1, { deferSave: true });

    assert.equal(evolution.findItemEvolution(eevee, 'firestone'), null, 'level 49 is below the 50 requirement');
    assert.equal(itemUse.getEligibleTargets('firestone').length, 0);
    assert.equal(itemUse.useOnPokemon('firestone', eevee.uid).result, ItemUseResults.TARGET_INELIGIBLE);
    assert.equal(save.inventory.count('firestone'), 1, 'a refused use never consumes the item');

    eevee.setLevel(50);
    const result = itemUse.useOnPokemon('firestone', eevee.uid);
    assert.equal(result.result, ItemUseResults.SUCCESS);
    assert.equal(result.action, ItemUseActions.EVOLVE);
    assert.equal(result.targetSpecies, 'flareon');
    assert.equal(save.inventory.count('firestone'), 0);
  });

  test('every stone evolution of the content data produces its own target', () => withAllRegions(() => {
    const save = fixture('Evo all stones');
    const eevee = PokemonFactory.create('eevee', 50);
    setRoster(save, [eevee]);
    const stones = { firestone: 'flareon', waterstone: 'vaporeon', thunderstone: 'jolteon', sunstone: 'espeon', moonstone: 'umbreon' };
    for (const [stone, target] of Object.entries(stones)) {
      save.inventory.add(stone, 1, { deferSave: true });
      const result = itemUse.useOnPokemon(stone, eevee.uid);
      assert.equal(result.result, ItemUseResults.SUCCESS, `${stone} is usable on Eevee`);
      assert.equal(result.targetSpecies, target, `${stone} produces ${target}`);
      assert.equal(allOf(save, target).length, 1);
    }
    assert.equal(eevee.species, 'eevee', 'Eevee is kept for every branch');
    assert.equal(evolution.findItemEvolution(eevee, 'firestone'), null, 'a produced branch cannot be produced twice');
  }));

  test('a species from a locked region stays pending instead of being produced', () => {
    const save = fixture('Evo region', 'kanto');
    const feebas = PokemonFactory.create('feebas', 50);
    setRoster(save, [feebas]);
    save.inventory.add('prism_scale', 1, { deferSave: true });

    const milotic = PokemonDB.getInstance().getById('milotic');
    assert.ok(milotic, 'Milotic exists in the data');
    assert.equal(FeatureAccessSystem.getInstance().getSnapshot().regions.includes(milotic.region), false,
      'Hoenn is locked in this fixture');

    assert.equal(itemUse.useOnPokemon('prism_scale', feebas.uid).result, ItemUseResults.TARGET_INELIGIBLE);
    assert.equal(save.inventory.count('prism_scale'), 1);
    assert.equal(feebas.hasEvolvedInto('milotic'), false, 'nothing was produced nor recorded');
  });

  test('the produced targets survive a save round trip and block a replay', () => {
    const save = fixture('Evo persistence');
    const bulbasaur = PokemonFactory.create('bulbasaur', 16);
    setRoster(save, [bulbasaur]);
    evolution.applyLevelEvolutions(bulbasaur);

    const raw = JSON.parse(JSON.stringify(save.serialize()));
    const restored = save.constructor.deserialize ? new save.constructor(raw) : null;
    const entry = (raw.collection ?? []).find((pokemon) => pokemon.uid === bulbasaur.uid);
    assert.deepEqual(entry.evolvedTargets, ['ivysaur'], 'the produced species is persisted');

    const reloaded = PokemonFactory.create('bulbasaur', 16);
    reloaded.deserialize({ ...entry, uid: 'probe' });
    assert.deepEqual(evolution.applyLevelEvolutions(reloaded).targets, [], 'a reloaded Pokémon does not replay its evolution');
  });

  test('the information sheet flags the already produced evolutions', () => {
    const save = fixture('Evo sheet');
    const charmander = PokemonFactory.create('charmander', 16);
    setRoster(save, [charmander]);
    evolution.applyLevelEvolutions(charmander);

    const rows = charmander.getPendingLevelEvolutions();
    assert.deepEqual(rows, [], 'nothing is pending anymore');
    assert.ok(charmander.hasEvolvedInto('charmeleon'), 'the sheet can flag the row');
  });
});
