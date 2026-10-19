/**
 * @file DataLayer.test.js
 * @brief Generated tables, save migrations, quest objectives and QuestSystem.
 */
import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/core/Random.js';
import { DataValidator } from '../src/data/core/DataValidator.js';
import { SaveMigrator } from '../src/data/save/migrations/SaveMigrator.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { ObjectiveRegistry } from '../src/data/quests/objectives/ObjectiveRegistry.js';
import { ObjectiveTypes } from '../src/data/quests/ObjectiveTypes.js';
import { ItemStacking } from '../src/data/items/ItemStacking.js';
import { InventoryRules } from '../src/config/InventoryRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { ExperienceCurve } from '../src/data/pokemon/ExperienceCurve.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { PokemonCaughtEvent } from '../src/core/events/PokemonCaughtEvent.js';
import { QuestCompletedEvent } from '../src/core/events/QuestCompletedEvent.js';
import { QuestClaimedEvent } from '../src/core/events/QuestClaimedEvent.js';

/** Subscribes to an event class and returns the list of received events. */
function capture(EventClass) {
  const received = [];
  const callback = (event) => received.push(event);
  EventBus.getInstance().subscribe(EventClass, callback);
  received.stop = () => EventBus.getInstance().unsubscribe(EventClass, callback);
  return received;
}

describe('Generated data', (test) => {
  test('every repository passes DataValidator', () => {
    assert.deepEqual(DataValidator.validateAll(), []);
  });

  test('every quest objective type has a class and a localizable key', () => {
    for (const quest of QuestDB.getInstance().getAll()) {
      assert.ok(ObjectiveRegistry.has(quest.objective.type), `${quest.key} ${quest.objective.type}`);
    }
    assert.ok(Object.values(ObjectiveTypes).every((type) => ObjectiveRegistry.has(type)));
  });

  test('main chains: 64 Kanto, 41 Johto, 89 Hoenn quests, rewards are quest points', () => {
    const quests = QuestDB.getInstance();
    assert.equal(quests.getMainChain('kanto').length, 64);
    assert.equal(quests.getMainChain('johto').length, 41);
    assert.equal(quests.getMainChain('hoenn').length, 89);
    assert.ok(quests.getAll().every((quest) => !('money' in quest.rewards)), 'no money reward');
  });

  test('item stacking follows the original limits and payout', () => {
    assert.equal(ItemStacking.split('not_an_item', 0, 3).added, 0, 'unknown items grant nothing');
    const berry = ItemStacking.split('oran_berry', InventoryRules.LIMITED_STACK - 1, 3);
    assert.equal(berry.added, 1);
    assert.ok(berry.money >= 0);
    assert.equal(ItemStacking.split('pokeball', 0, 5).added, 5);
  });
});

describe('Save migrations', (test) => {
  test('an original game export (schema 0) reaches the current schema', () => {
    const data = SaveMigrator.migrate({
      G: {
        trainerName: 'Ancien',
        region: 'kanto',
        location: 'route1',
        money: 1234,
        badges: ['brock'],
        playTimeMs: 65000,
        wallet: { questPoints: 7, diamonds: 2 },
        team: [{ id: 25, level: 12, xp: 1500, currentHP: 10, maxHP: 40, moves: [{ id: 'thundershock' }], shiny: true }],
        pokedex: { 25: { caught: true, shiny: true }, 16: { caught: false } },
        inventory: { pokeball: 4 },
        wildWinsByLoc: { route1: 12 },
        mainStep: { kanto: 3 },
        completedQuests: { side_s1: true },
        activeQuests: [{ qid: 4, cat: 'main', progress: 6 }]
      }
    });
    assert.equal(data.version, SaveSchema.VERSION);
    const save = SaveData.fromJson(data);
    assert.equal(save.player.trainerName, 'Ancien');
    assert.equal(save.player.playTimeSeconds, 65);
    assert.ok(save.player.hasBadge('brock'));
    assert.equal(save.currencies.get('money'), 1234);
    assert.equal(save.currencies.get('questPoint'), 7);
    assert.equal(save.team[0].species, 'pikachu');
    assert.ok(save.team[0].shiny && save.team[0].talent, 'shiny kept, talent filled');
    assert.ok(save.team[0].hp > 0 && save.team[0].hp <= save.team[0].getMaxHp());
    assert.equal(save.pokedex.getCaughtStatus('pikachu'), 'shiny');
    assert.ok(save.pokedex.isSeen('pidgey') && !save.pokedex.isCaught('pidgey'));
    assert.equal(save.inventory.count('pokeball'), 4);
    assert.equal(save.statistics.wildWins.route1, 12);
    assert.equal(save.quests.getMainStep('kanto'), 3);
    assert.ok(save.quests.isCompleted('side.s1'));
    assert.equal(save.quests.getProgress('main.4'), 6);
  });

  test('schema 2 saves keep their experience ratio and drop derived fields', () => {
    const data = SaveMigrator.migrate({
      version: 2,
      id: 'PW-TEST-00002',
      player: { trainerName: 'V2', badges: 3 },
      currencies: { money: 50 },
      team: [{ species: 'bulbasaur', level: 10, exp: 50, maxExp: 100, hp: 15, maxHp: 30, types: ['grass'] }]
    });
    const pokemon = data.team[0];
    assert.ok(!('maxHp' in pokemon) && !('maxExp' in pokemon) && !('types' in pokemon));
    const span = ExperienceCurve.levelStart(11) - ExperienceCurve.levelStart(10);
    assert.equal(pokemon.exp, ExperienceCurve.levelStart(10) + Math.floor(span / 2));
    assert.deepEqual(data.player.badges, [], 'badge counts cannot name badges');
  });

  test('migrations are pure: the raw input is not mutated', () => {
    const raw = { version: 1, player: { trainerName: 'P', money: 10 }, team: [] };
    const copy = JSON.stringify(raw);
    SaveMigrator.migrate(raw);
    assert.equal(JSON.stringify(raw), copy);
  });

  test('a current save round-trips unchanged', () => {
    const save = SaveData.createNew('Round', 'charmander', 'forest');
    const json = save.serialize();
    assert.deepEqual(SaveData.fromJson(JSON.parse(JSON.stringify(json))).serialize(), json);
  });
});

describe('Pokémon factory', (test) => {
  test('creation is deterministic with a seeded Random', () => {
    const a = PokemonFactory.create('eevee', 20, { random: Random.sequence([0.1, 0.5, 0.9]) });
    const b = PokemonFactory.create('eevee', 20, { random: Random.sequence([0.1, 0.5, 0.9]) });
    assert.deepEqual({ ...a.serialize(), uid: '' }, { ...b.serialize(), uid: '' });
    assert.equal(a.hp, a.getMaxHp());
    assert.equal(a.exp, ExperienceCurve.levelStart(20));
  });
});

describe('Quest system', (test) => {
  const quests = QuestSystem.getInstance();
  quests.init();

  test('a new save starts the first main quest of its region', () => {
    const save = SaveSystem.getInstance().createNewSave('Questeur', 'charmander');
    assert.ok(save.quests.isActive('main.1'));
    assert.equal(quests.getMainQuest().quest.key, 'main.1');
  });

  test('talk objectives complete and auto-claim at their location', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    const claimed = capture(QuestClaimedEvent);
    const points = save.currencies.get('questPoint');
    LocationSystem.getInstance().talkToNpc();
    claimed.stop();
    assert.equal(claimed.length, 1);
    assert.equal(save.quests.getMainStep('kanto'), 1);
    assert.equal(save.currencies.get('questPoint'), points + 100);
    assert.ok(save.inventory.count('babiri_berry') >= 1, 'reward item granted');
    assert.ok(save.quests.isActive('main.2'), 'next main quest active');
  });

  test('kill objectives count wild wins of their location only', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    const bus = EventBus.getInstance();
    const completed = capture(QuestCompletedEvent);
    bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route2', true));
    bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', false));
    bus.dispatch(new PokemonCaughtEvent('pidgey', 'route1', false));
    assert.equal(save.quests.getProgress('main.2'), 0);
    for (let i = 0; i < 12; i++) bus.dispatch(new PokemonDefeatedEvent('rattata', 3, 'route1', true));
    completed.stop();
    assert.equal(save.quests.getProgress('main.2'), 10, 'capped at the objective count');
    assert.equal(completed.length, 1);
    assert.equal(save.quests.getMainStep('kanto'), 1, 'kill quests wait for the claim');
    assert.ok(quests.claim('main.2'));
    assert.equal(save.quests.getMainStep('kanto'), 2);
    assert.equal(quests.claim('main.2'), false, 'cannot claim twice');
  });

  test('side quests need to be accepted and are completed once', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    assert.ok(quests.isAvailable('side.s1'));
    assert.ok(quests.accept('side.s1'));
    assert.equal(quests.accept('side.s1'), false, 'already active');
    for (let i = 0; i < 10; i++) EventBus.getInstance().dispatch(new PokemonDefeatedEvent('rattata', 3, 'route1', true));
    assert.ok(quests.claim('side.s1'));
    assert.ok(save.quests.isCompleted('side.s1'));
    assert.equal(quests.isAvailable('side.s1'), false);
  });

  test('state objectives read the save (badge already owned)', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    save.player.earnBadge('brock');
    save.quests.setMainStep('kanto', 5);
    quests.syncMainQuest();
    const status = quests.getMainQuest();
    assert.equal(status.quest.objective.type, ObjectiveTypes.BADGE);
    assert.ok(status.complete, 'badge quest complete on activation');
  });
});
