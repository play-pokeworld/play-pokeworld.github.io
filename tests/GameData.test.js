/**
 * @file GameData.test.js
 * @brief Static game data (types, moves, learnsets) and per-save progress (Pokédex, save schema).
 */

import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { TypeChart, TYPE_IDS, EffectivenessTiers } from '../src/data/core/TypeChart.js';
import { MoveDB, MoveCategories } from '../src/data/battle/MoveDB.js';
import { MoveLearnset } from '../src/data/pokemon/MoveLearnset.js';
import { PokedexData, CaughtStatus } from '../src/data/save/PokedexData.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { MoveConfig } from '../src/config/MoveConfig.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { PokedexChangedEvent } from '../src/core/events/PokedexChangedEvent.js';
import { BattleAttackEvent } from '../src/core/events/BattleAttackEvent.js';
import { L_move_names_fr } from '../src/localization/fr/move-names.js';
import { L_move_names_en } from '../src/localization/en/move-names.js';
import { L_fr_move_descs } from '../src/localization/fr/move-descs.js';
import { L_en_move_descs } from '../src/localization/en/move-descs.js';
import { L_fr_types } from '../src/localization/fr/types.js';

/** Subscribes to an event class; returns the received events and the unsubscribe function. */
function capture(EventClass) {
  const received = [];
  const callback = (event) => received.push(event);
  EventBus.getInstance().subscribe(EventClass, callback);
  received.stop = () => EventBus.getInstance().unsubscribe(EventClass, callback);
  return received;
}

describe('Type chart', (test) => {
  test('single and dual type multipliers', () => {
    assert.equal(TypeChart.effectiveness('fire', ['grass']), 2);
    assert.equal(TypeChart.effectiveness('water', ['fire']), 2);
    assert.equal(TypeChart.effectiveness('fire', ['water']), 0.5);
    assert.equal(TypeChart.effectiveness('ice', ['dragon', 'flying']), 4);
    assert.equal(TypeChart.effectiveness('fire', ['water', 'rock']), 0.25);
    assert.equal(TypeChart.effectiveness('normal', ['ghost']), 0);
    assert.equal(TypeChart.effectiveness('electric', ['water', 'ground']), 0);
    assert.equal(TypeChart.effectiveness('dragon', ['fairy']), 0);
    assert.equal(TypeChart.effectiveness('normal', ['normal']), 1);
  });

  test('input casing, duplicates and unknown types are tolerated', () => {
    assert.equal(TypeChart.effectiveness('Fire', ['Grass', 'Bug']), 4);
    assert.equal(TypeChart.effectiveness('fire', ['grass', 'grass']), 2, 'a duplicated type counts once');
    assert.equal(TypeChart.effectiveness('unknown', ['grass']), 1);
    assert.equal(TypeChart.effectiveness('fire', ['', null]), 1);
    assert.equal(TypeChart.normalize('PSYCHIC'), 'psychic');
    assert.equal(TypeChart.normalize('???'), null);
  });

  test('tiers', () => {
    assert.equal(TypeChart.tierOf(0), EffectivenessTiers.IMMUNE);
    assert.equal(TypeChart.tierOf(0.25), EffectivenessTiers.QUARTER);
    assert.equal(TypeChart.tierOf(0.5), EffectivenessTiers.HALF);
    assert.equal(TypeChart.tierOf(1), EffectivenessTiers.NEUTRAL);
    assert.equal(TypeChart.tierOf(2), EffectivenessTiers.DOUBLE);
    assert.equal(TypeChart.tierOf(4), EffectivenessTiers.QUADRUPLE);
  });

  test('every type id has a localized name', () => {
    for (const id of TYPE_IDS) assert.ok(L_fr_types[id], `type.${id}`);
  });
});

describe('Moves', (test) => {
  const db = MoveDB.getInstance();

  test('the move table is loaded and frozen', () => {
    assert.equal(db.count, 419);
    const tackle = db.getById('tackle');
    assert.equal(tackle.type, 'normal');
    assert.equal(tackle.category, MoveCategories.PHYSICAL);
    assert.equal(tackle.power, 40);
    assert.ok(Object.isFrozen(tackle));
    assert.equal(db.getById('nope'), null);
    assert.deepEqual(db.getById('arm_thrust').hits, [2, 5]);
  });

  test('every move has a valid type, a category and localized texts', () => {
    const categories = Object.values(MoveCategories);
    for (const move of db.getAll()) {
      assert.ok(TYPE_IDS.includes(move.type), `${move.id} type`);
      assert.ok(categories.includes(move.category), `${move.id} category`);
      assert.ok(move.category !== MoveCategories.STATUS || move.power === 0, `${move.id} status moves deal no damage`);
      assert.ok(L_move_names_fr[move.id] && L_move_names_en[move.id], `move.${move.id}`);
      assert.ok(L_fr_move_descs[move.id] && L_en_move_descs[move.id], `move_desc.${move.id}`);
    }
  });

  test('level-up pools follow the original order and sizes', () => {
    const firePool = MoveLearnset.poolFor(['Fire']);
    assert.equal(firePool.length, MoveConfig.POOL_SIZE);
    assert.equal(firePool[0], 'ember');
    assert.equal(db.getById(firePool[0]).type, 'fire', 'same-type damaging moves first');
    assert.ok(MoveLearnset.poolFor(['fire']) === firePool, 'pools are cached by type set');
    assert.equal(MoveLearnset.knownCountAt(1), 1);
    assert.equal(MoveLearnset.knownCountAt(7), 1);
    assert.equal(MoveLearnset.knownCountAt(8), 2);
    assert.equal(MoveLearnset.knownCountAt(99), 15);
    assert.deepEqual(MoveLearnset.movesForLevel(['fire'], 5), ['ember']);
    assert.equal(MoveLearnset.movesForLevel(['grass', 'poison'], 50).length, MoveConfig.ACTIVE_SLOTS);
    assert.deepEqual(MoveLearnset.poolFor([]).length > 0, true, 'never empty');
  });

  test('active moves: stored moves first, species pool otherwise', () => {
    const stored = new PokemonData({ species: 'charmander', level: 30, moves: ['tackle', 'ember', 'not_a_move'] });
    assert.deepEqual(MoveLearnset.activeMovesOf(stored), ['tackle', 'ember']);
    const legacy = new PokemonData({ species: 'bulbasaur', level: 5 });
    assert.deepEqual(MoveLearnset.typesOf(legacy), ['grass', 'poison']);
    assert.equal(MoveLearnset.activeMovesOf(legacy).length, 1);
  });
});

describe('Pokédex', (test) => {
  test('seen / caught / shiny and derived counts', () => {
    const changes = capture(PokedexChangedEvent);
    const dex = new PokedexData();
    dex.markSeen('pidgey');
    dex.markSeen('pidgey');
    dex.markCaught('rattata');
    dex.markCaught('rattata');
    dex.markCaught('rattata', true);
    changes.stop();
    assert.equal(changes.length, 3, 'only real changes are announced');
    assert.ok(dex.isSeen('pidgey') && !dex.isCaught('pidgey'));
    assert.equal(dex.getCaughtStatus('pidgey'), CaughtStatus.NOT_CAUGHT);
    assert.equal(dex.getCaughtStatus('rattata'), CaughtStatus.SHINY);
    assert.equal(dex.getCaughtCount(), 1);
    assert.equal(dex.getSeenCount(), 2);
  });

  test('serializes and sanitizes', () => {
    const dex = new PokedexData({ a: { caught: true }, b: { seen: true, shiny: true }, c: 'junk' });
    assert.deepEqual(dex.serialize(), {
      a: { seen: true, caught: true, shiny: false },
      b: { seen: true, caught: false, shiny: false }
    });
  });
});

describe('Save schema', (test) => {
  test('a new save is versioned, has its starter caught and its starter moves', () => {
    const save = SaveData.createNew('Red', 'charmander');
    const data = save.serialize();
    assert.equal(data.version, SaveSchema.VERSION);
    assert.equal(save.pokedex.getCaughtStatus('charmander'), CaughtStatus.CAUGHT);
    assert.deepEqual(save.team[0].moves, ['ember']);
    assert.ok(!('caughtCount' in data.player), 'counts are derived, not stored');
  });

  test('schema 1 saves get a Pokédex built from their team, without events', () => {
    const changes = capture(PokedexChangedEvent);
    const save = new SaveData();
    save.deserialize({
      id: 'PW-OLD-00001',
      player: { trainerName: 'Old', caughtCount: 9 },
      team: [{ species: 'squirtle', level: 7 }, { species: 'pidgey', level: 3, shiny: true }]
    });
    changes.stop();
    assert.equal(changes.length, 0);
    assert.equal(save.pokedex.getCaughtCount(), 2);
    assert.equal(save.pokedex.getCaughtStatus('pidgey'), CaughtStatus.SHINY);
  });

  test('original game saves keep their Pokédex', () => {
    const save = new SaveData();
    save.deserialize({ G: { trainer: 'Legacy', team: [], pokedex: { 4: { caught: true }, 25: { caught: true, shiny: true } } } });
    assert.equal(save.pokedex.getCaughtCount(), 2);
    assert.equal(save.pokedex.getCaughtStatus('pikachu'), CaughtStatus.SHINY);
  });
});

describe('Battle and data', (test) => {
  test('attacks report their move and effectiveness; wild Pokémon are marked seen', () => {
    const created = SaveSystem.getInstance().createNewSave('Tester', 'bulbasaur');
    const save = SaveSystem.getInstance().loadSlot(created.id);
    const attacks = capture(BattleAttackEvent);
    const battle = BattleSystem.getInstance();
    assert.ok(battle.startBattle('route1'));
    const foe = battle.getCurrentFoe();
    assert.ok(save.pokedex.isSeen(foe.species), 'wild species seen');
    assert.ok(foe.moves.length > 0, 'wild Pokémon have moves');
    for (let i = 0; i < 5000 && battle.isActive(); i++) battle.update(0.1);
    attacks.stop();
    assert.ok(attacks.length > 0);
    for (const attack of attacks) {
      assert.ok(MoveDB.getInstance().getById(attack.moveId), attack.moveId);
      assert.equal(attack.moveType, MoveDB.getInstance().getById(attack.moveId).type);
      assert.ok(attack.effectiveness === 0 ? attack.damage === 0 : attack.damage >= 1, 'damage follows effectiveness');
    }
  });
});
