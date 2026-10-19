/**
 * @file Systems.test.js
 * @brief Behaviour of the DOM-free systems and data models.
 */

import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { LocalStore } from '../src/core/LocalStore.js';
import { TextFormatter } from '../src/core/TextFormatter.js';
import { StorageKeys } from '../src/config/StorageKeys.js';
import { BattleConfig } from '../src/config/BattleConfig.js';
import { NotificationChannels } from '../src/config/NotificationConfig.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { NotificationSystem } from '../src/systems/NotificationSystem.js';
import { PreferencesSystem } from '../src/systems/PreferencesSystem.js';
import { CurrenciesData } from '../src/data/CurrenciesData.js';
import { PokemonDB } from '../src/data/PokemonDB.js';
import { LocationDB } from '../src/data/LocationDB.js';
import { ItemDB } from '../src/data/ItemDB.js';
import { QuestDB } from '../src/data/QuestDB.js';
import { SaveThemes } from '../src/data/SaveThemes.js';
import { QuestEventTypes } from '../src/data/quests/QuestEventTypes.js';
import { DefeatWildQuest } from '../src/data/quests/DefeatWildQuest.js';
import { CatchQuest } from '../src/data/quests/CatchQuest.js';
import { SaveCreatedEvent } from '../src/core/events/SaveCreatedEvent.js';
import { LocationChangedEvent } from '../src/core/events/LocationChangedEvent.js';
import { BattleStartedEvent } from '../src/core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../src/core/events/BattleEndedEvent.js';
import { CurrencyChangedEvent } from '../src/core/events/CurrencyChangedEvent.js';
import { ThemeChangedEvent } from '../src/core/events/ThemeChangedEvent.js';
import { NotificationDispatchedEvent } from '../src/core/events/NotificationDispatchedEvent.js';

/** Subscribes to an event class and returns the list of received events. */
function capture(EventClass) {
  const received = [];
  EventBus.getInstance().subscribe(EventClass, (event) => received.push(event));
  return received;
}

const saves = SaveSystem.getInstance();

describe('Core', (test) => {
  test('EventBus delivers typed events and unsubscribes', () => {
    const bus = EventBus.getInstance();
    const received = [];
    const callback = (event) => received.push(event.themeId ?? event.theme ?? event);
    bus.subscribe(ThemeChangedEvent, callback);
    bus.dispatch(new ThemeChangedEvent('ocean'));
    bus.unsubscribe(ThemeChangedEvent, callback);
    bus.dispatch(new ThemeChangedEvent('fire'));
    assert.equal(received.length, 1);
  });

  test('LocalStore round-trips strings and JSON and survives bad JSON', () => {
    LocalStore.setString('pw_test_string', 'abc');
    LocalStore.setJson('pw_test_json', { a: 1 });
    assert.equal(LocalStore.getString('pw_test_string'), 'abc');
    assert.deepEqual(LocalStore.getJson('pw_test_json'), { a: 1 });
    localStorage.setItem('pw_test_bad', '{not json');
    assert.equal(LocalStore.getJson('pw_test_bad', 'fallback'), 'fallback');
  });

  test('legacy language key is migrated', () => {
    localStorage.setItem('pokeworld_lang', 'en');
    localStorage.removeItem(StorageKeys.LANGUAGE);
    LocalStore.migrateLegacyKeys();
    assert.equal(LocalStore.getString(StorageKeys.LANGUAGE), 'en');
  });

  test('TextFormatter parses bold/italic/br and parameters', () => {
    const segments = TextFormatter.parse('A <b>{n}</b><br><i>c</i>', { n: 5 });
    assert.deepEqual(segments.map((s) => s.type), ['text', 'text', 'break', 'text']);
    assert.ok(segments[1].bold && segments[1].text === '5');
    assert.ok(segments[3].italic);
    assert.equal(TextFormatter.toPlainText('<b>x</b> {n}', { n: 2 }), 'x 2');
  });
});

describe('Data', (test) => {
  test('PokemonDB resolves ids, names and slugs', () => {
    const db = PokemonDB.getInstance();
    const pikachu = db.getById(25);
    assert.ok(pikachu, 'pikachu');
    assert.equal(pikachu.getSlug(), 'pikachu');
    assert.equal(db.getBySlug('pikachu').id, 25);
  });

  test('LocationDB and ItemDB load the raw tables', () => {
    assert.ok(LocationDB.getInstance().getById('route1'));
    assert.ok(LocationDB.getInstance().getEncounters('route1').length > 0);
    assert.ok(ItemDB.getInstance().getById('pokeball'));
  });

  test('CurrenciesData clamps at zero, serializes and emits', () => {
    const events = capture(CurrencyChangedEvent);
    const wallet = new CurrenciesData({ money: 100 });
    wallet.add('money', 50);
    wallet.add('money', -1000);
    assert.equal(wallet.get('money'), 0);
    assert.equal(events.length, 2);
    assert.equal(new CurrenciesData(wallet.serialize()).get('money'), 0);
    assert.equal(new CurrenciesData({}).get('money'), 500);
  });

  test('SaveThemes normalizes unknown themes and picks random valid ones', () => {
    assert.equal(SaveThemes.normalize('does-not-exist'), SaveThemes.DEFAULT);
    const theme = SaveThemes.random();
    assert.equal(SaveThemes.normalize(theme), theme);
  });

  test('QuestDB builds typed quests', () => {
    const quests = QuestDB.getInstance();
    if (quests.init && !quests.getStoryQuests().length) quests.init();
    assert.ok(quests.getStoryQuests().length > 0, 'story quests');
  });

  test('quests react only to their event type and location', () => {
    const quest = new DefeatWildQuest({ id: 'q', target: 2, loc: 'route1' });
    quest.checkEvent(QuestEventTypes.WILD_DEFEATED, { loc: 'route2' });
    quest.checkEvent(QuestEventTypes.POKEMON_CAUGHT, { loc: 'route1' });
    assert.equal(quest.progress, 0);
    quest.checkEvent(QuestEventTypes.WILD_DEFEATED, { loc: 'route1' });
    quest.checkEvent(QuestEventTypes.WILD_DEFEATED, { loc: 'route1' });
    quest.checkEvent(QuestEventTypes.WILD_DEFEATED, { loc: 'route1' });
    assert.ok(quest.isCompleted() && quest.progress === 2);
    assert.ok(new CatchQuest({ id: 'c' }) instanceof CatchQuest);
  });
});

describe('SaveSystem', (test) => {
  test('creates, lists and reloads a save', () => {
    const created = capture(SaveCreatedEvent);
    const save = saves.createNewSave(1, 'Red', 'charmander', 'forest');
    assert.equal(created.length, 1);
    assert.equal(save.team[0].species, 'charmander');
    const list = saves.listExistingSaves();
    assert.ok(list.some((entry) => entry.id === save.id));
    assert.equal(saves.loadSlot(save.id).player.trainerName, 'Red');
  });

  test('renames, duplicates, exports, imports and deletes', () => {
    const save = saves.createNewSave(2, 'Blue', 'squirtle');
    assert.equal(saves.renameSlot(save.id, 'Green').player.trainerName, 'Green');
    const copy = saves.duplicateSlot(save.id);
    assert.ok(copy && copy.id !== save.id, 'duplicate');
    const json = saves.exportSlotAsJson(save.id);
    assert.ok(JSON.parse(json).player, 'export');
    const imported = saves.importFromJson(json);
    assert.ok(imported, 'import');
    assert.equal(saves.importFromJson('{broken'), null);
    const before = saves.listExistingSaves().length;
    saves.deleteSlot(copy.id);
    assert.equal(saves.listExistingSaves().length, before - 1);
  });
});

describe('Gameplay systems', (test) => {
  test('LocationSystem travels to adjacent places and refuses locked ones', () => {
    saves.createNewSave(3, 'Ash', 'bulbasaur');
    const moves = capture(LocationChangedEvent);
    const locations = LocationSystem.getInstance();
    assert.ok(locations.travelTo('route1'));
    assert.equal(locations.getCurrentLocationId(), 'route1');
    assert.equal(moves.at(-1).locationId, 'route1');
    assert.ok(locations.isLocked('route3'));
    assert.equal(locations.travelTo('route3'), false);
    assert.equal(locations.travelTo('nowhere'), false);
  });

  test('BattleSystem plays rounds through update(dt) until the battle ends', () => {
    const started = capture(BattleStartedEvent);
    const ended = capture(BattleEndedEvent);
    const battle = BattleSystem.getInstance();
    assert.ok(battle.startBattle('route1'), 'battle starts');
    assert.equal(started.length, 1);
    assert.equal(battle.startBattle('route1'), false, 'no second battle');
    for (let i = 0; i < 5000 && battle.isActive(); i++) battle.update(0.1);
    assert.ok(!battle.isActive(), 'battle finished');
    assert.equal(ended.length, 1);
    assert.ok(battle.getLog().length > 1, 'log filled');
  });

  test('attack cooldowns follow the original speed formula', () => {
    const battle = BattleSystem.getInstance();
    assert.ok(battle.startBattle('route1'));
    let attacks = 0;
    const before = battle.getLog().length;
    for (let i = 0; i < 10 && battle.isActive(); i++) battle.update(0.1);
    attacks = battle.getLog().length - before;
    assert.equal(attacks, 0, 'nobody attacks during the first second');
    battle.endBattle(false);
    assert.ok(BattleConfig.ATTACK_COOLDOWN_MIN_MS <= BattleConfig.ATTACK_COOLDOWN_BASE_MS);
  });

  test('BattleSystem refuses to start where there are no wild Pokémon', () => {
    assert.equal(BattleSystem.getInstance().startBattle('pallet'), false);
  });

  test('NotificationSystem dispatches, mutes channels and dismisses', () => {
    const notifications = NotificationSystem.getInstance();
    const dispatched = capture(NotificationDispatchedEvent);
    const id = notifications.notify('hello', { channel: NotificationChannels.SYSTEM });
    assert.ok(id && notifications.getRecord(id));
    assert.equal(dispatched.length, 1);
    notifications.setChannelEnabled(NotificationChannels.ECONOMY, false);
    assert.equal(notifications.notify('muted', { channel: NotificationChannels.ECONOMY }), null);
    notifications.setChannelEnabled(NotificationChannels.ECONOMY, true);
    notifications.dismiss(id);
    assert.equal(notifications.getRecord(id), null);
  });

  test('PreferencesSystem persists theme, debug mode and audio', () => {
    const prefs = PreferencesSystem.getInstance();
    prefs.setTheme('ocean');
    assert.equal(prefs.getTheme(), 'ocean');
    prefs.setTheme('not-a-theme');
    assert.equal(prefs.getTheme(), 'dark');
    prefs.setDebugMode(true);
    assert.ok(prefs.isDebugMode());
    prefs.setAudioBus('music', { volume: 40 });
    assert.equal(prefs.getAudioBus('music').volume, 40);
  });
});
