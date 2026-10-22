/**
 * @file Systems.test.js
 * @brief Behaviour of the DOM-free systems and data models.
 */

import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { LocalStore } from '../src/core/LocalStore.js';
import { TextFormatter } from '../src/core/TextFormatter.js';
import { StorageKeys } from '../src/config/StorageKeys.js';
import { AnimationPreferences } from '../src/config/AnimationPreferences.js';
import { BattleConfig } from '../src/config/BattleConfig.js';
import { NotificationChannels } from '../src/config/NotificationConfig.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { TeamPresetSystem } from '../src/systems/TeamPresetSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { NotificationSystem } from '../src/systems/NotificationSystem.js';
import { PreferencesSystem } from '../src/systems/PreferencesSystem.js';
import { DiagnosticsSystem, DIAGNOSTIC_LIMITS } from '../src/systems/DiagnosticsSystem.js';
import { BrowserDiagnostics } from '../src/ui/BrowserDiagnostics.js';
import { DiagnosticsChangedEvent } from '../src/core/events/DiagnosticsChangedEvent.js';
import { AnimationPreferencesChangedEvent } from '../src/core/events/AnimationPreferencesChangedEvent.js';
import { questRewardEntries } from '../src/panels/components/QuestRewardsView.js';
import { CurrenciesData } from '../src/data/save/CurrenciesData.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { SaveThemes } from '../src/data/save/SaveThemes.js';
import { SaveCreatedEvent } from '../src/core/events/SaveCreatedEvent.js';
import { LocationChangedEvent } from '../src/core/events/LocationChangedEvent.js';
import { BattleStartedEvent } from '../src/core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../src/core/events/BattleEndedEvent.js';
import { TeamChangedEvent } from '../src/core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../src/core/events/BoxChangedEvent.js';
import { CurrencyChangedEvent } from '../src/core/events/CurrencyChangedEvent.js';
import { ThemeChangedEvent } from '../src/core/events/ThemeChangedEvent.js';
import { NotificationDispatchedEvent } from '../src/core/events/NotificationDispatchedEvent.js';
import { storedOnly } from './RosterFixtures.js';

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

  test('quest reward entries are derived from current currency, item and Pokémon data', () => {
    const entries = questRewardEntries({
      currencies: { money: 42, questPoint: 12 },
      items: { rarecandy: 2 },
      pokemon: { species: 'pikachu', level: 8 }
    });
    assert.deepEqual(entries.map(({ kind, id, quantity }) => ({ kind, id, quantity })), [
      { kind: 'currency', id: 'money', quantity: 42 },
      { kind: 'currency', id: 'questPoint', quantity: 12 },
      { kind: 'item', id: 'rarecandy', quantity: 2 },
      { kind: 'pokemon', id: 'pikachu', quantity: 1 }
    ]);
    assert.ok(entries[1].icon.endsWith('/questPoint.svg'));
  });
});

describe('Data', (test) => {
  test('PokemonDB resolves species ids and national dex numbers', () => {
    const db = PokemonDB.getInstance();
    const pikachu = db.getById('pikachu');
    assert.ok(pikachu, 'pikachu');
    assert.equal(pikachu.dex, 25);
    assert.equal(db.getByDex(25).id, 'pikachu');
    assert.deepEqual([...pikachu.getTypes()], ['electric']);
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

  test('QuestDB exposes the three main chains', () => {
    const quests = QuestDB.getInstance();
    assert.ok(quests.getMainChain('kanto').length > 0, 'kanto');
    assert.ok(quests.getMainChain('johto').length > 0, 'johto');
    assert.ok(quests.getMainChain('hoenn').length > 0, 'hoenn');
    assert.equal(quests.getMainQuest('kanto', 0).key, quests.getMainChain('kanto')[0].key);
  });
});

describe('SaveSystem', (test) => {
  test('creates, lists and reloads a save', () => {
    const created = capture(SaveCreatedEvent);
    const save = saves.createNewSave('Red', 'charmander', 'forest');
    assert.equal(created.length, 1);
    assert.equal(save.team[0].species, 'charmander');
    const list = saves.listExistingSaves();
    assert.ok(list.some((entry) => entry.id === save.id));
    assert.equal(saves.loadSlot(save.id).player.trainerName, 'Red');
  });

  test('renames, duplicates, exports, imports and deletes', () => {
    const save = saves.createNewSave('Blue', 'squirtle');
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
    saves.createNewSave('Ash', 'bulbasaur');
    const moves = capture(LocationChangedEvent);
    const locations = LocationSystem.getInstance();
    assert.ok(locations.travelTo('route1'));
    assert.equal(locations.getCurrentLocationId(), 'route1');
    assert.equal(moves.at(-1).locationId, 'route1');
    assert.ok(locations.isLocked('route3'));
    assert.equal(locations.travelTo('route3'), false);
    assert.equal(locations.travelTo('nowhere'), false);
  });

  test('a cleared route unlocks the next map destination and allows travel', () => {
    const save = saves.createNewSave('Map progression', 'bulbasaur');
    const locations = LocationSystem.getInstance();
    const access = FeatureAccessSystem.getInstance();
    assert.ok(locations.travelTo('route1'), 'the starter route is reachable');
    const blocked = access.getLocationAccessStatus('viridian');
    assert.equal(blocked.reason, 'wins', 'the next town explains the route-clear prerequisite');
    assert.equal(blocked.remainingWins, 10);

    for (let index = 0; index < 10; index++) save.statistics.recordWildWin('route1');
    access.refresh('route-clear-test', { force: true, persist: false });
    assert.equal(access.getLocationAccessStatus('viridian').unlocked, true);
    assert.ok(locations.travelTo('viridian'), 'the map destination becomes traversable after the route clears');
    assert.equal(locations.getCurrentLocationId(), 'viridian');
  });

  test('team presets save, edit, load from the box and move the old party into the box', () => {
    const save = saves.createNewSave('Presetter', 'charmander');
    const teamSystem = TeamSystem.getInstance();
    const boxSystem = BoxSystem.getInstance();
    const active = teamSystem.getTeam()[0];
    const reserve = PokemonFactory.create('squirtle', 12);
    const boxed = PokemonFactory.create('eevee', 10);
    assert.ok(teamSystem.addPokemon(reserve));
    assert.ok(boxSystem.addPokemon(boxed));
    saves.saveCurrent();

    const presets = TeamPresetSystem.getInstance();
    assert.equal(presets.getAll().length, 20);
    assert.ok(presets.rename('preset1', 'Water team'));
    assert.ok(presets.setMembers('preset1', [boxed.uid, active.uid]));
    assert.ok(presets.saveCurrentToPreset('preset2'));
    assert.deepEqual(presets.getPreset('preset2').members, [active.uid, reserve.uid]);

    const teamEvents = capture(TeamChangedEvent);
    const boxEvents = capture(BoxChangedEvent);
    const result = presets.load('preset1');
    assert.deepEqual({ ok: result.ok, count: result.count, missingCount: result.missingCount }, { ok: true, count: 2, missingCount: 0 });
    assert.deepEqual(teamSystem.getTeam().map((pokemon) => pokemon.uid), [boxed.uid, active.uid]);
    assert.deepEqual(storedOnly(save).map((pokemon) => pokemon.uid), [reserve.uid]);
    assert.equal(boxSystem.getAll().length, 3, 'the PC box still shows every owned Pokémon');
    assert.equal(save.teamPresets.activeId, 'preset1');
    assert.equal(teamEvents.length, 1);
    assert.equal(boxEvents.length, 1);
  });

  test('wild BattleSystem settles each foe and automatically chains the next encounter', () => {
    const started = capture(BattleStartedEvent);
    const ended = capture(BattleEndedEvent);
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const save = saves.createNewSave('Battle chain', 'charmander');
    assert.ok(TeamSystem.getInstance().addPokemon(PokemonFactory.create('mewtwo', 100)));
    assert.ok(TeamSystem.getInstance().setLead(1));
    assert.ok(battle.startBattle('route1'), 'battle starts');
    assert.equal(started.length, 1);
    const initialFoe = battle.getCurrentFoe();
    const combatState = battle.getCombatState();
    assert.ok(combatState && combatState.player && combatState.foe && combatState.field, 'combat presentation snapshot');
    const activeSummary = battle.getBattleSummary();
    assert.equal(activeSummary.state, 'active');
    assert.ok(activeSummary.foeName, 'summary identifies the current foe');
    assert.equal(activeSummary.run.locationId, 'route1');
    assert.equal(battle.startBattle('route1'), false, 'no second battle');

    for (let i = 0; i < 10000 && (battle.getBattleSummary().run?.battles ?? 0) < 2; i++) battle.update(0.1);
    const chainedSummary = battle.getBattleSummary();
    assert.ok(battle.isActive(), 'wild battle stays active after an individual foe is defeated');
    assert.ok(chainedSummary.run.battles >= 2, 'at least two encounters were settled');
    assert.ok(battle.getCurrentFoe() !== initialFoe, 'the next wild foe was sent automatically');
    assert.equal(started.length, 1, 'the chain remains one battle session');
    assert.ok(chainedSummary.run.moneyGained > 0, 'wild money is paid per defeated foe');
    assert.ok(save.statistics.wildWins.route1 >= 2, 'every defeated wild foe updates location statistics');
    battle.endBattle(false);
    assert.equal(ended.length, 1);
    assert.ok(battle.getLog().length > 1, 'log filled');
    const summary = battle.getBattleSummary();
    assert.equal(summary.state, 'ended');
    assert.equal(summary.victory, ended[0].victory);
    assert.equal(summary.run.battles, chainedSummary.run.battles, 'loot summary preserves the full chain');
    assert.ok(summary.session.battles >= summary.run.battles, 'session counters include chained foes');
    assert.ok(summary.session.wins <= summary.session.battles, 'session totals are internally consistent');
    assert.deepEqual(summary.log, battle.getLog());
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

  test('PreferencesSystem persists theme, debug mode, audio and animation choices', () => {
    const prefs = PreferencesSystem.getInstance();
    prefs.setTheme('ocean');
    assert.equal(prefs.getTheme(), 'ocean');
    prefs.setTheme('not-a-theme');
    assert.equal(prefs.getTheme(), 'dark');
    prefs.setDebugMode(true);
    assert.ok(prefs.isDebugMode());
    prefs.setAudioBus('music', { volume: 40 });
    assert.equal(prefs.getAudioBus('music').volume, 40);

    const changes = [];
    const onAnimationChanged = (event) => changes.push(event);
    EventBus.getInstance().subscribe(AnimationPreferencesChangedEvent, onAnimationChanged);
    prefs.setAnimationPreference(AnimationPreferences.CAPTURE, false);
    assert.equal(prefs.getAnimationPreference(AnimationPreferences.CAPTURE), false);
    assert.equal(prefs.setAnimationPreference(AnimationPreferences.CAPTURE, false), false, 'unchanged values are not re-emitted');
    assert.equal(changes.length, 1);
    assert.equal(changes[0].preferenceId, AnimationPreferences.CAPTURE);
    assert.equal(changes[0].enabled, false);
    prefs.setAnimationPreference(AnimationPreferences.CAPTURE, true);
    EventBus.getInstance().unsubscribe(AnimationPreferencesChangedEvent, onAnimationChanged);
  });

  test('DiagnosticsSystem bounds, persists, deduplicates and clears browser errors', () => {
    const diagnostics = DiagnosticsSystem.getInstance();
    diagnostics.clearErrors();
    const events = [];
    const onChanged = (event) => events.push(event);
    EventBus.getInstance().subscribe(DiagnosticsChangedEvent, onChanged);
    const repeated = new Error('repeated browser failure');
    assert.ok(diagnostics.recordError(repeated, { source: 'test' }));
    assert.equal(diagnostics.recordError(repeated, { source: 'test' }), null, 'the same error object is stored once');
    for (let index = 0; index < DIAGNOSTIC_LIMITS.ERRORS + 5; index++) {
      diagnostics.recordError(new Error(`browser failure ${index}`), 'test');
    }
    const stored = LocalStore.getJson(StorageKeys.DIAGNOSTIC_ERRORS, []);
    assert.equal(diagnostics.getErrorCount(), DIAGNOSTIC_LIMITS.ERRORS);
    assert.equal(stored.length, DIAGNOSTIC_LIMITS.ERRORS);
    assert.ok(stored.every((entry) => entry.stack.length <= DIAGNOSTIC_LIMITS.STACK_LENGTH));
    assert.ok(events.length > 1 && events.every((event) => event.max === DIAGNOSTIC_LIMITS.ERRORS));
    assert.equal(diagnostics.clearErrors(), true);
    assert.equal(diagnostics.getErrorCount(), 0);
    assert.deepEqual(LocalStore.getJson(StorageKeys.DIAGNOSTIC_ERRORS, null), []);

    const listeners = new Map();
    const target = { addEventListener: (type, listener) => listeners.set(type, listener) };
    assert.equal(BrowserDiagnostics.install(target), true);
    assert.equal(BrowserDiagnostics.install(target), false, 'global hooks install once per target');
    listeners.get('error')({ error: new Error('uncaught browser error') });
    listeners.get('unhandledrejection')({ reason: 'rejected request' });
    assert.equal(diagnostics.getErrorCount(), 2);
    const report = JSON.parse(BrowserDiagnostics.buildErrorReport());
    assert.equal(report.errors.length, 2);
    assert.ok(!JSON.stringify(report).includes('Testeur'), 'the support report does not include the save display name');
    diagnostics.clearErrors();
    EventBus.getInstance().unsubscribe(DiagnosticsChangedEvent, onChanged);
  });
});
