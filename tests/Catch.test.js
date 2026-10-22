/**
 * @file Catch.test.js
 * @brief Poké Ball filters, ball choice, catch rates, filter commands, save migration v3 → v4
 * and the full catch flow (team, box, duplicates, shiny unlock, tokens).
 */

import { describe, assert } from './TestRunner.js';
import { Random } from '../src/core/Random.js';
import { EventBus } from '../src/core/EventBus.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { BallFilterData } from '../src/data/save/BallFilterData.js';
import { BallFiltersData } from '../src/data/save/BallFiltersData.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveMigrator } from '../src/data/save/migrations/SaveMigrator.js';
import { BallFilterPresets } from '../src/data/catch/BallFilterPresets.js';
import { EncounterKinds } from '../src/data/catch/EncounterKinds.js';
import { BallFilterOptions } from '../src/data/catch/BallFilterOptions.js';
import { BallRules } from '../src/config/BallRules.js';
import { CaptureRules } from '../src/config/CaptureRules.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { LocationKinds } from '../src/data/world/LocationKinds.js';
import { CatchEncounter } from '../src/systems/catch/CatchEncounter.js';
import { BallFilterMatcher } from '../src/systems/catch/BallFilterMatcher.js';
import { BallSelector } from '../src/systems/catch/BallSelector.js';
import { BallRateRules } from '../src/systems/catch/BallRateRules.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveStorage } from '../src/systems/SaveStorage.js';
import { PokeballSystem } from '../src/systems/PokeballSystem.js';
import { CatchSystem } from '../src/systems/CatchSystem.js';
import { BallFiltersChangedEvent } from '../src/core/events/BallFiltersChangedEvent.js';
import { PokemonCaughtEvent } from '../src/core/events/PokemonCaughtEvent.js';
import { PokedexChangedEvent } from '../src/core/events/PokedexChangedEvent.js';
import { InventoryChangedEvent } from '../src/core/events/InventoryChangedEvent.js';
import { CaptureAttemptResolvedEvent } from '../src/core/events/CaptureAttemptResolvedEvent.js';
import { storedOnly } from './RosterFixtures.js';

/** Encounter of a fresh wild Pokémon. */
function encounterOf(species, { level = 5, shiny = false, owned = false, shinyOwned = false, locationKind = LocationKinds.ROUTE, ...rest } = {}) {
  const pokemon = PokemonFactory.create(species, level, { shiny });
  return new CatchEncounter({ pokemon, owned, shinyOwned, locationKind, ...rest });
}

/** Minimal battle session as CatchSystem reads it. */
function sessionWith(foe) {
  const lines = [];
  return {
    foe: { pokemon: foe },
    field: { weather: null },
    foeTurns: 0,
    playerAttacks: 0,
    log: { add: (key, params) => lines.push({ key, params }) },
    lines
  };
}

function custom(options, ball = 'pokeball', extra = {}) {
  return new BallFilterData({ id: 'custom_test', name: 'Test', options, ball, enabled: true, ...extra });
}

describe('Poké Ball filters', (test) => {
  test('the five base filters come in the original priority order, without a ball', () => {
    const filters = new BallFiltersData().getAll();
    assert.deepEqual(filters.map((filter) => filter.id), ['roaming', 'new_shiny', 'caught_shiny', 'new', 'caught']);
    assert.ok(filters.every((filter) => filter.isLocked() && !filter.hasBall() && filter.enabled));
    assert.deepEqual(BallFilterPresets.ids(), filters.map((filter) => filter.id));
  });

  test('matching uses ownership, shininess, type and encounter kind only', () => {
    const fresh = encounterOf('rattata');
    const owned = encounterOf('rattata', { owned: true });
    assert.ok(BallFilterMatcher.matches(BallFilterData.fromPreset('new'), fresh));
    assert.ok(!BallFilterMatcher.matches(BallFilterData.fromPreset('new'), owned));
    assert.ok(BallFilterMatcher.matches(BallFilterData.fromPreset('caught'), owned));
    assert.ok(!BallFilterMatcher.matches(BallFilterData.fromPreset('new_shiny'), fresh));
    assert.ok(BallFilterMatcher.matches(BallFilterData.fromPreset('new_shiny'), encounterOf('rattata', { shiny: true })));
    assert.ok(BallFilterMatcher.matches(custom({ type: 'normal' }), fresh));
    assert.ok(!BallFilterMatcher.matches(custom({ type: 'fire' }), fresh));
    assert.equal(encounterOf('rattata', { locationKind: LocationKinds.DUNGEON }).encounterKind, EncounterKinds.DUNGEON);
    const roaming = encounterOf('raikou', { level: 40 });
    assert.equal(roaming.encounterKind, EncounterKinds.ROAMING);
    assert.ok(BallFilterMatcher.matches(BallFilterData.fromPreset('roaming'), roaming));
  });

  test('the first enabled matching filter chooses the ball; no ball set on a base filter falls through', () => {
    const fresh = encounterOf('rattata');
    const stock = (counts) => (id) => counts[id] ?? 0;
    const presets = () => new BallFiltersData().getAll();
    assert.equal(BallSelector.ballFor(presets(), fresh, stock({ pokeball: 5 })), null, 'nothing is set on a new save');

    const filters = presets();
    filters.find((filter) => filter.id === 'new').ball = 'greatball';
    assert.equal(BallSelector.ballFor(filters, fresh, stock({ greatball: 1 })), 'greatball');
    assert.equal(BallSelector.ballFor(filters, fresh, stock({ pokeball: 9 })), null, 'a ball set but not owned stops');
    filters.find((filter) => filter.id === 'roaming').ball = 'ultraball';
    assert.equal(BallSelector.ballFor(filters, fresh, stock({ greatball: 1, ultraball: 1 })), 'greatball', 'roaming does not match');

    const withCustom = [custom({ caught: false }, 'pokeball'), ...filters];
    assert.equal(BallSelector.ballFor(withCustom, fresh, stock({ pokeball: 1, greatball: 1 })), 'pokeball');
    withCustom[0].enabled = false;
    assert.equal(BallSelector.ballFor(withCustom, fresh, stock({ pokeball: 1, greatball: 1 })), 'greatball', 'disabled filters are skipped');
    const blocking = [custom({ caught: false }, BallRules.NO_BALL), ...filters];
    assert.equal(BallSelector.ballFor(blocking, fresh, stock({ greatball: 1 })), null, '"None" on a custom filter means no throw');
  });
});

describe('Catch rates', (test) => {
  test('IVs are capped at 6 per stat', () => {
    assert.equal(PokemonRules.IV_MAX, 6);
    const pokemon = PokemonFactory.create('rattata', 5);
    for (let i = 0; i < 10; i++) pokemon.addIv('atk');
    assert.equal(pokemon.ivs.atk, 6);
  });


  test('base rates, Master Ball and the cap', () => {
    const encounter = encounterOf('rattata', { level: 50 });
    assert.equal(BallRateRules.effectiveRate('pokeball', encounter), 10);
    assert.equal(BallRateRules.effectiveRate('greatball', encounter), 20);
    assert.equal(BallRateRules.effectiveRate('ultraball', encounter), 30);
    assert.equal(BallRateRules.effectiveRate('masterball', encounter), 100);
    assert.ok(ItemDB.getInstance().getBalls().every((ball) => BallRateRules.effectiveRate(ball.id, encounter) <= 100));
  });

  test('special balls: condition bonus only, the number of copies owned never counts', () => {
    const high = encounterOf('rattata', { level: 50 });
    const low = encounterOf('rattata', { level: 10 });
    assert.equal(BallRateRules.effectiveRate('nestball', high), 10);
    assert.equal(BallRateRules.effectiveRate('nestball', low), 35);
    assert.equal(BallRateRules.effectiveRate('repeatball', encounterOf('rattata', { owned: true })), 35);
    assert.equal(BallRateRules.effectiveRate('lureball', encounterOf('magikarp')), 35, 'Lure Ball: water type');
    assert.equal(BallRateRules.effectiveRate('diveball', encounterOf('magikarp')), 10);
    assert.equal(BallRateRules.effectiveRate('diveball', encounterOf('rattata', { weather: 'rain' })), 35, 'Dive Ball: rain');
  });

  test('Timer Ball grows with the foe turns, Quick Ball shrinks with the player attacks', () => {
    const timer = (foeTurns) => BallRateRules.effectiveRate('timerball', encounterOf('rattata', { foeTurns }));
    const quick = (playerAttacks) => BallRateRules.effectiveRate('quickball', encounterOf('rattata', { playerAttacks }));
    assert.equal(timer(0), 10);
    assert.equal(timer(5), 20);
    assert.equal(timer(40), 35);
    assert.deepEqual([1, 2, 3, 5, 8, 9].map(quick), [40, 35, 30, 25, 20, 15]);
  });
});

describe('PokeballSystem commands', (test) => {
  test('a successful filter edit is saved before its change event is published', () => {
    const saveSystem = SaveSystem.getInstance();
    const save = saveSystem.createNewSave('Filtre persistant', 'bulbasaur');
    const balls = PokeballSystem.getInstance();
    const originalSaveCurrent = saveSystem.saveCurrent;
    const order = [];
    let publishedFilterId = null;
    let persistedBall = null;
    const onChange = (event) => {
      order.push('event');
      publishedFilterId = event.filterId;
      persistedBall = SaveStorage.read(save.id)?.ballFilters.getById(event.filterId)?.ball ?? null;
    };

    saveSystem.saveCurrent = function () {
      order.push('save-start');
      const result = originalSaveCurrent.call(this);
      order.push('save-finished');
      return result;
    };
    EventBus.getInstance().subscribe(BallFiltersChangedEvent, onChange);
    try {
      assert.equal(balls.setBall('new', 'greatball'), true);
    } finally {
      EventBus.getInstance().unsubscribe(BallFiltersChangedEvent, onChange);
      saveSystem.saveCurrent = originalSaveCurrent;
    }

    assert.deepEqual(order, ['save-start', 'save-finished', 'event']);
    assert.equal(publishedFilterId, 'new');
    assert.equal(persistedBall, 'greatball', 'listeners observe the saved filter state');
  });

  test('base filters: ball, switch and order only', () => {
    SaveSystem.getInstance().createNewSave('Filtres', 'bulbasaur');
    const balls = PokeballSystem.getInstance();
    const events = [];
    const onChange = (event) => events.push(event);
    EventBus.getInstance().subscribe(BallFiltersChangedEvent, onChange);
    assert.ok(balls.setBall('new', 'greatball'));
    assert.equal(balls.getFilter('new').ball, 'greatball');
    assert.ok(!balls.setBall('new', 'potion'), 'only balls');
    assert.ok(balls.toggleEnabled('caught'));
    assert.equal(balls.getFilter('caught').enabled, false);
    assert.ok(balls.reorder('caught', 'roaming'));
    assert.equal(balls.getFilters()[0].id, 'caught');
    assert.ok(!balls.rename('new', 'X'));
    assert.ok(!balls.remove('new'));
    assert.ok(!balls.setToggle('new', BallFilterOptions.SHINY, true));
    assert.ok(!balls.setValue('new', BallFilterOptions.TYPE, 'fire'));
    EventBus.getInstance().unsubscribe(BallFiltersChangedEvent, onChange);
    assert.equal(events.length, 3);
  });

  test('custom filters: create on top, edit, remove; reset restores the presets', () => {
    SaveSystem.getInstance().createNewSave('Filtres', 'bulbasaur');
    const balls = PokeballSystem.getInstance();
    const id = balls.create();
    const filter = balls.getFilter(id);
    assert.equal(balls.getFilters()[0].id, id);
    assert.equal(filter.ball, BallRules.CUSTOM_FILTER_BALL);
    assert.ok(balls.isToggleOn(filter, BallFilterOptions.NEW));
    assert.ok(balls.rename(id, '  Feu  '));
    assert.equal(balls.getLabel(filter), 'Feu');
    assert.ok(balls.addValue(id, BallFilterOptions.TYPE));
    assert.equal(filter.options.type, BallRules.DEFAULT_TYPE_OPTION);
    assert.ok(balls.setValue(id, BallFilterOptions.TYPE, 'fire'));
    assert.ok(!balls.setValue(id, BallFilterOptions.TYPE, 'plasma'));
    assert.ok(balls.setToggle(id, BallFilterOptions.CAUGHT_SHINY, true));
    assert.ok(filter.options.caughtShiny && filter.options.caught, 'caught shiny implies caught');
    assert.ok(balls.setValue(id, BallFilterOptions.TYPE, null));
    assert.ok(!('type' in filter.options));
    const reloaded = SaveData.fromJson(JSON.parse(JSON.stringify(SaveSystem.getInstance().getCurrentSave().serialize())));
    assert.equal(reloaded.ballFilters.getById(id).name, 'Feu', 'filters are saved');
    assert.ok(balls.remove(id));
    assert.equal(balls.getFilter(id), null);
    balls.setBall('new', 'greatball');
    assert.ok(balls.reset());
    assert.deepEqual(balls.getFilters().map((entry) => entry.ball), Array(5).fill(BallRules.NO_BALL));
  });
});

describe('Save migration v3 → v4', (test) => {
  test('ball counts join the inventory, filters keep their settings', () => {
    const raw = {
      version: 3,
      inventory: { pokeball: 2 },
      pokeballs: {
        counts: { pokeball: 3, greatball: 4 },
        filters: [
          { id: 'custom_1', customName: 'Eau', options: { type: 'water' }, ball: 'diveball', enabled: true },
          { id: 'new', options: { caught: false }, ball: 'greatball', enabled: false }
        ]
      }
    };
    const migrated = SaveMigrator.migrate(raw);
    assert.equal(migrated.version, SaveSchema.VERSION);
    assert.ok(!('pokeballs' in migrated));
    assert.deepEqual(migrated.collection, []);
    const save = SaveData.fromJson(migrated);
    assert.equal(save.inventory.count('pokeball'), 5);
    assert.equal(save.inventory.count('greatball'), 4);
    const water = save.ballFilters.getById('custom_1');
    assert.equal(water.name, 'Eau');
    assert.equal(water.options.type, 'water');
    assert.equal(water.ball, 'diveball');
    assert.equal(save.ballFilters.getById('new').enabled, false);
    assert.equal(save.ballFilters.getAll().length, 6, 'missing base filters are added back');
  });

  test('a v3 save without any ball gets the starting balls', () => {
    const migrated = SaveMigrator.migrate({ version: 3, inventory: {} });
    assert.deepEqual(migrated.inventory, { ...BallRules.STARTING_BALLS });
  });
});

describe('Catch flow', (test) => {
  const catcher = CatchSystem.getInstance();

  function attempt(save, foe, random = Random.sequence([0])) {
    const session = sessionWith(foe);
    catcher.setRandom(random);
    const result = catcher.attempt({ save, session, locationId: 'route1' });
    catcher.setRandom(Random.default);
    return { result, keys: session.lines.map((line) => line.key) };
  }

  test('no matching ball: nothing is thrown', () => {
    const save = SaveSystem.getInstance().createNewSave('Capture', 'charmander');
    const before = save.inventory.count('pokeball');
    const { result, keys } = attempt(save, PokemonFactory.create('rattata', 3));
    assert.equal(result, false);
    assert.deepEqual(keys, ['battle_log.ball_no_target']);
    assert.equal(save.inventory.count('pokeball'), before);
  });

  test('first catch: guaranteed, joins the team, pays tokens, dispatches PokemonCaughtEvent', () => {
    const save = SaveSystem.getInstance().createNewSave('Capture', 'charmander');
    PokeballSystem.getInstance().setBall('new', 'pokeball');
    const caught = [];
    const captureResults = [];
    const onCaught = (event) => caught.push(event);
    const onCaptureResolved = (event) => captureResults.push(event);
    EventBus.getInstance().subscribe(PokemonCaughtEvent, onCaught);
    EventBus.getInstance().subscribe(CaptureAttemptResolvedEvent, onCaptureResolved);
    const { result, keys } = attempt(save, PokemonFactory.create('rattata', 3), Random.sequence([0.99]));
    EventBus.getInstance().unsubscribe(PokemonCaughtEvent, onCaught);
    EventBus.getInstance().unsubscribe(CaptureAttemptResolvedEvent, onCaptureResolved);
    assert.ok(result, 'a 10 % roll of 99 still succeeds on the first catch');
    assert.equal(save.team.length, 2);
    assert.equal(save.team[1].level, CaptureRules.CAUGHT_LEVEL);
    assert.equal(save.statistics.caughtTotal, 1);
    assert.ok(save.pokedex.isCaught('rattata'));
    assert.ok(save.currencies.get('dungeonToken') >= 1);
    assert.ok(keys.includes('battle_log.catch_success') && keys.includes('battle_log.catch_team'));
    assert.deepEqual(caught.map((event) => event.speciesId), ['rattata']);
    assert.deepEqual(captureResults.map((event) => ({ speciesId: event.speciesId, ballId: event.ballId, caught: event.caught })), [
      { speciesId: 'rattata', ballId: 'pokeball', caught: true }
    ]);
  });

  test('a battle-owned capture defers every save-triggering event to its caller', () => {
    const saves = SaveSystem.getInstance();
    const save = saves.createNewSave('Capture transaction', 'charmander');
    PokeballSystem.getInstance().setBall('new', 'pokeball');
    const originalSaveCurrent = saves.saveCurrent;
    const received = { caught: [], dex: [], inventory: [] };
    const listeners = [
      [PokemonCaughtEvent, (event) => received.caught.push(event)],
      [PokedexChangedEvent, (event) => received.dex.push(event)],
      [InventoryChangedEvent, (event) => received.inventory.push(event)]
    ];
    for (const [EventClass, listener] of listeners) EventBus.getInstance().subscribe(EventClass, listener);
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return originalSaveCurrent.apply(this, args); };
    const session = sessionWith(PokemonFactory.create('rattata', 3));
    catcher.setRandom(Random.sequence([0.99]));
    let result;
    try {
      result = catcher.attemptDetailed({ save, session, locationId: 'route1', deferSave: true });
    } finally {
      catcher.setRandom(Random.default);
      saves.saveCurrent = originalSaveCurrent;
      for (const [EventClass, listener] of listeners) EventBus.getInstance().unsubscribe(EventClass, listener);
    }

    assert.equal(result.caught, true);
    assert.equal(writes, 0, 'the enclosing battle owns the only persistence write');
    assert.equal(received.caught[0]?.deferSave, true);
    assert.ok(received.dex.length > 0 && received.dex.every((event) => event.deferSave));
    assert.ok(received.inventory.length > 0 && received.inventory.every((event) => event.deferSave));
  });

  test('later catches roll the rate; a duplicate is not kept but may raise an IV', () => {
    const save = SaveSystem.getInstance().createNewSave('Capture', 'charmander');
    const balls = PokeballSystem.getInstance();
    balls.setBall('new', 'pokeball');
    balls.setBall('caught', 'pokeball');
    attempt(save, PokemonFactory.create('rattata', 3));
    const captureResults = [];
    const onCaptureResolved = (event) => captureResults.push(event);
    EventBus.getInstance().subscribe(CaptureAttemptResolvedEvent, onCaptureResolved);
    const failed = attempt(save, PokemonFactory.create('pidgey', 3), Random.sequence([0.99]));
    EventBus.getInstance().unsubscribe(CaptureAttemptResolvedEvent, onCaptureResolved);
    assert.equal(failed.result, false);
    assert.ok(failed.keys.includes('battle_log.catch_fail'));
    assert.deepEqual(captureResults.map((event) => ({ speciesId: event.speciesId, ballId: event.ballId, caught: event.caught })), [
      { speciesId: 'pidgey', ballId: 'pokeball', caught: false }
    ]);
    const owned = save.team[1];
    const ivTotal = Object.values(owned.ivs).reduce((sum, iv) => sum + iv, 0);
    const duplicate = attempt(save, PokemonFactory.create('rattata', 3), Random.sequence([0]));
    assert.ok(duplicate.result);
    assert.equal(save.team.length, 2, 'duplicates are not stored');
    assert.equal(save.statistics.duplicateCatches.rattata, 1);
    assert.ok(duplicate.keys.includes('battle_log.catch_duplicate'));
    const ivAfter = Object.values(owned.ivs).reduce((sum, iv) => sum + iv, 0);
    assert.ok(ivAfter === ivTotal + 1 || ivTotal === 6 * PokemonRules.IV_MAX);
  });

  test('a shiny duplicate makes the owned Pokémon shiny; a full team sends catches to the box', () => {
    const save = SaveSystem.getInstance().createNewSave('Capture', 'charmander');
    const balls = PokeballSystem.getInstance();
    for (const id of ['new', 'caught', 'new_shiny', 'caught_shiny']) balls.setBall(id, 'pokeball');
    save.inventory.add('pokeball', 50);
    attempt(save, PokemonFactory.create('rattata', 3));
    attempt(save, PokemonFactory.create('rattata', 3, { shiny: true }));
    assert.ok(save.team[1].shiny);
    for (const species of ['pidgey', 'caterpie', 'weedle', 'spearow']) attempt(save, PokemonFactory.create(species, 3));
    assert.equal(save.team.length, 6);
    const boxed = attempt(save, PokemonFactory.create('ekans', 3));
    assert.ok(boxed.keys.includes('battle_log.catch_box'));
    assert.equal(storedOnly(save).length, 1);
  });

  test('a Luxury Ball catch starts at level 5', () => {
    const save = SaveSystem.getInstance().createNewSave('Capture', 'charmander');
    PokeballSystem.getInstance().setBall('new', 'luxuryball');
    save.inventory.add('luxuryball', 1);
    attempt(save, PokemonFactory.create('rattata', 3));
    assert.equal(save.team[1].level, 5);
    assert.equal(CaptureRules.LUXURY_CAUGHT_LEVEL, 5);
  });
});
