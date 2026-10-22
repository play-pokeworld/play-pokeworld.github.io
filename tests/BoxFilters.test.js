/**
 * @file BoxFilters.test.js
 * @brief PC filter parity, reference rank thresholds, and missing-evolution semantics.
 */
import { describe, assert } from './TestRunner.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { BoxFiltersData } from '../src/data/save/BoxFiltersData.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { BoxFilterRules } from '../src/systems/box/BoxFilterRules.js';
import { PokemonRankRules } from '../src/systems/box/PokemonRankRules.js';

describe('PC filters and ranks', (test) => {
  test('region, type, shiny, flags, IV, EV, forms, rank, and search compose as expected', () => {
    const save = SaveData.createNew('PC filters', 'bulbasaur');
    const pokemon = PokemonFactory.create('charmander', 12, { shiny: true, nickname: 'Flamme' });
    pokemon.favorite = true;
    pokemon.locked = true;
    for (const stat of PokemonRules.STAT_KEYS) {
      pokemon.ivs[stat] = PokemonRules.IV_MAX;
      pokemon.evs[stat] = 6;
    }
    const matches = (overrides = {}, target = pokemon) => BoxFilterRules.matches(
      target,
      { region: 'all', type: 'all', shiny: 'all', evo: 'all', favorite: 'all', locked: 'all',
        iv: 'all', ev: 'all', rank: 'all', forms: 'all', search: '', ...overrides },
      save,
      { nameOf: (entry) => `${entry.nickname} ${entry.species}` }
    );

    assert.ok(matches({ region: 'kanto', type: 'fire', shiny: 'shiny', favorite: 'favorite', locked: 'locked',
      iv: 'complete', ev: 'complete', rank: 'D', search: 'flamme' }));
    assert.ok(!matches({ region: 'johto' }));
    assert.ok(!matches({ type: 'water' }));
    assert.ok(!matches({ shiny: 'normal' }));
    assert.ok(!matches({ favorite: 'not_favorite' }));
    assert.ok(!matches({ locked: 'unlocked' }));
    assert.ok(!matches({ iv: 'incomplete' }));
    assert.ok(!matches({ ev: 'incomplete' }));
    assert.ok(!matches({ search: 'missing-name' }));

    const castform = PokemonFactory.create('castform', 10, { form: 'sunny' });
    assert.ok(matches({ forms: 'forms' }, castform), 'the alternate form is included');
    assert.ok(!matches({ forms: 'forms' }, PokemonFactory.create('castform', 10)), 'the base form is excluded');
  });

  test('missing evolution follows the reference PC target table, not every Rework branch', () => {
    const save = SaveData.createNew('PC evolutions', 'bulbasaur');
    const missing = (species) => BoxFilterRules.matches(
      PokemonFactory.create(species, 20),
      { evo: 'missing' },
      save
    );
    const caught = (...species) => species.forEach((id) => save.pokedex.markCaught(id));

    assert.ok(missing('charmander'), 'Charmander has an unowned reference evolution');
    caught('charmeleon');
    assert.ok(!missing('charmander'), 'a caught target satisfies the filter');

    caught('flareon', 'vaporeon', 'jolteon');
    assert.ok(!missing('eevee'), 'the reference PC counts Eevee’s three established stone targets');
    caught('hitmonlee');
    assert.ok(!missing('tyrogue'), 'the reference PC counts its established Tyrogue target');
    caught('silcoon');
    assert.ok(!missing('wurmple'), 'the alternate Wurmple branch is not added to the PC filter');
    caught('ninjask');
    assert.ok(!missing('nincada'), 'the alternate Nincada branch is not added to the PC filter');

    for (const species of ['golbat', 'kadabra', 'machoke', 'haunter', 'chansey']) {
      assert.ok(!missing(species), `${species} has no target in the reference PC evolution filter`);
    }
  });

  test('rank overrides and base-stat thresholds match the reference', () => {
    assert.deepEqual(PokemonRankRules.order, ['E', 'D', 'C', 'B', 'A', 'S', 'SS']);
    assert.equal(PokemonRankRules.getRank('caterpie'), 'E');
    assert.equal(PokemonRankRules.getRank('pikachu'), 'C');
    assert.equal(PokemonRankRules.getRank('mewtwo'), 'S');
    assert.equal(PokemonRankRules.getRank('magikarp'), 'E');
    assert.equal(PokemonRankRules.getRank('bulbasaur'), 'D');
    assert.equal(PokemonRankRules.getRank('poliwhirl'), 'C');
    assert.equal(PokemonRankRules.getRank('lapras'), 'A');
    assert.equal(PokemonRankRules.rankValue('SS') > PokemonRankRules.rankValue('S'), true);
  });

  test('the PC rank filter accepts the reference E–S values and rejects an unlisted SS value', () => {
    const filters = new BoxFiltersData();
    assert.equal(filters.set('rank', 'SS'), false, 'SS is not one of the reference PC filter options');
    assert.equal(filters.get('rank'), 'all');
    assert.ok(filters.set('rank', 'S'));
    assert.equal(new BoxFiltersData(filters.serialize()).get('rank'), 'S', 'a reference rank survives a save round trip');
  });
});
