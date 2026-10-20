/**
 * @file Dashboard.test.js
 * @brief Dashboard columns, layout persistence, modal requests, team order and starter modal.
 */

import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { LocalStore } from '../src/core/LocalStore.js';
import { StorageKeys } from '../src/config/StorageKeys.js';
import { DashboardColumns, WindowIds } from '../src/config/DashboardLayout.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { DashboardLayoutSystem } from '../src/systems/DashboardLayoutSystem.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { CONTENT_FEATURES } from '../src/config/ContentAccessRules.js';
import { PlayerDefaults } from '../src/config/PlayerDefaults.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { ContentAccessChangedEvent } from '../src/core/events/ContentAccessChangedEvent.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { DashboardView } from '../src/ui/dashboard/DashboardView.js';
import { MobileDashboardNav } from '../src/ui/dashboard/MobileDashboardNav.js';
import { StoryPanel } from '../src/panels/StoryPanel.js';
import { MapPanel } from '../src/panels/MapPanel.js';
import { BattlePanel } from '../src/panels/BattlePanel.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { CurrenciesPanel } from '../src/panels/CurrenciesPanel.js';
import { HeaderPanel } from '../src/panels/HeaderPanel.js';
import { BadgesPanel } from '../src/panels/fullscreen/BadgesPanel.js';
import { HatcheryPanel } from '../src/panels/HatcheryPanel.js';
import { MinePanel } from '../src/panels/MinePanel.js';
import { TrainingCenterPanel } from '../src/panels/TrainingCenterPanel.js';
import { TeamModal } from '../src/panels/TeamModal.js';
import { SettingsModal } from '../src/panels/settings/SettingsModal.js';
import { StarterModal } from '../src/panels/StarterModal.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { WindowReorderedEvent } from '../src/core/events/WindowReorderedEvent.js';
import { DashboardWindowFocusRequestedEvent } from '../src/core/events/DashboardWindowFocusRequestedEvent.js';
import { TeamChangedEvent } from '../src/core/events/TeamChangedEvent.js';
import { TrainerDefeatedEvent } from '../src/core/events/TrainerDefeatedEvent.js';

const { LEFT, CENTER, RIGHT } = DashboardColumns;
const DEFAULTS = Object.freeze({ [LEFT]: ['a', 'b'], [CENTER]: ['c'], [RIGHT]: ['d'] });

/** Ids of the windows of each column, read from the DOM. */
function domLayout(view) {
  const result = {};
  for (const column of [LEFT, CENTER, RIGHT]) {
    result[column] = view.getColumn(column).getChildren().map((child) => child.getWindowId());
  }
  return result;
}

describe('Dashboard layout', (test) => {
  test('sanitize keeps known ids once and appends missing windows to their default column', () => {
    const layout = DashboardLayoutSystem.sanitize({ [LEFT]: ['b', 'zzz', 'b'], [RIGHT]: ['a'] }, DEFAULTS);
    assert.deepEqual(layout, { [LEFT]: ['b'], [CENTER]: ['c'], [RIGHT]: ['a', 'd'] });
  });

  test('legacy numeric column keys are migrated to column ids', () => {
    const layout = DashboardLayoutSystem.sanitize({ 1: ['d'], 2: ['a', 'b'], 3: ['c'] }, DEFAULTS);
    assert.deepEqual(layout, { [LEFT]: ['d'], [CENTER]: ['a', 'b'], [RIGHT]: ['c'] });
  });

  test('the saved layout is restored on top of the defaults, moves persist and emit', () => {
    LocalStore.setJson(StorageKeys.DASHBOARD_COLUMNS, { [RIGHT]: ['a'] });
    const system = DashboardLayoutSystem.getInstance();
    assert.deepEqual(system.setDefaultLayout(DEFAULTS), { [LEFT]: ['b'], [CENTER]: ['c'], [RIGHT]: ['a', 'd'] });

    const moves = [];
    const unsubscribe = EventBus.getInstance().subscribe(WindowReorderedEvent, (event) => moves.push(event));
    system.moveWindow('d', CENTER, 0);
    unsubscribe();
    assert.deepEqual(system.findWindow('d'), { column: CENTER, index: 0 });
    assert.equal(moves.at(-1).targetColumn, CENTER);
    assert.deepEqual(LocalStore.getJson(StorageKeys.DASHBOARD_COLUMNS, null)[CENTER], ['d', 'c']);

    assert.deepEqual(system.resetLayout(), { [LEFT]: ['a', 'b'], [CENTER]: ['c'], [RIGHT]: ['d'] });
  });
});

describe('Dashboard view', (test) => {
  test('panels start in the column given to their constructor, in creation order', () => {
    LocalStore.remove(StorageKeys.DASHBOARD_COLUMNS);
    const view = new DashboardView(DashboardLayoutSystem.getInstance());
    view.addWindows([
      new MapPanel(CENTER),
      new StoryPanel(LEFT),
      new BattlePanel(CENTER),
      new CurrenciesPanel(RIGHT)
    ]);
    const expected = { [LEFT]: [WindowIds.STORY], [CENTER]: [WindowIds.MAP, WindowIds.BATTLE], [RIGHT]: [WindowIds.CURRENCY] };
    assert.deepEqual(view.getDefaultLayout(), expected);
    assert.deepEqual(domLayout(view), expected);
  });

  test('progression-locked facility panels stay visible and explain their gates', () => {
    const save = SaveSystem.getInstance().createNewSave('Access fixture', 'charmander');
    save.player.region = 'kanto';
    save.player.location = 'pallet';
    const access = FeatureAccessSystem.getInstance();
    access.refresh('dashboard-fixture', { force: true, persist: false });

    const view = new DashboardView(DashboardLayoutSystem.getInstance());
    const hatchery = new HatcheryPanel(LEFT);
    const mine = new MinePanel(LEFT);
    const training = new TrainingCenterPanel(RIGHT);
    const map = new MapPanel(CENTER);
    view.addWindows([hatchery, mine, training, map]);

    for (const panel of [hatchery, mine, training, map]) {
      assert.ok(!panel.getDomElement().classList.contains('is-hidden'), `${panel.getName()} remains visible`);
    }
    assert.ok(hatchery.getDomElement().querySelector('.pw-hatchery-locked'), 'hatchery explains its story gate');
    assert.ok(mine.getDomElement().querySelector('.pw-mine-locked'), 'mine explains its location gate');
    assert.ok(training.getDomElement().querySelector('.pw-training-locked'), 'training explains its badge gate');

    save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
    access.refresh('hatchery-unlocked', { force: true, persist: false });
    save.access.unlockFeature(CONTENT_FEATURES.MINE);
    save.access.unlockFeature(CONTENT_FEATURES.TRAINING);
    access.refresh('other-features-unlocked', { force: true, persist: false });
    for (const panel of [hatchery, mine, training]) {
      assert.ok(!panel.getDomElement().classList.contains('is-hidden'), 'access changes never hide the panel');
    }

    view.setVisibleWindows([WindowIds.HATCHERY]);
    assert.ok(hatchery.getDomElement().classList.contains('mobile-visible'), 'selected mobile tab is shown');
    assert.ok(mine.getDomElement().classList.contains('is-hidden'), 'mobile focus still hides other tabs');
    view.destroy();
  });

  test('badge denominator follows original league and regional Pokédex gates', () => {
    const save = SaveSystem.getInstance().createNewSave('Badge count fixture', 'charmander');
    const access = FeatureAccessSystem.getInstance();
    const header = new HeaderPanel();
    const displayedTotal = header.getDomElement().querySelector('#h-badges-total');
    const changes = [];
    const unsubscribe = EventBus.getInstance().subscribe(ContentAccessChangedEvent, (event) => changes.push(event));

    let snapshot = access.refresh('badge-count-kanto', { force: true, persist: false });
    assert.deepEqual(snapshot.regions, ['kanto'], 'Kanto is the only region available at the start');
    assert.equal(snapshot.regions.length * PlayerDefaults.TOTAL_BADGES, 8);
    assert.equal(displayedTotal.textContent, '8', 'header uses the Kanto-only denominator');

    const pokedex = save.pokedex.serialize();
    for (const species of PokemonDB.getInstance().getByRegion('kanto')) {
      pokedex[species.id] = { seen: true, caught: true, shiny: false };
    }
    save.pokedex.deserialize(pokedex);
    save.statistics.recordLeague('kanto');
    snapshot = access.refresh('badge-count-johto', { force: true, persist: false });
    assert.deepEqual(snapshot.regions, ['kanto', 'johto'], 'Johto waits for the Kanto league and complete Kanto Dex');
    assert.equal(snapshot.regions.length * PlayerDefaults.TOTAL_BADGES, 16);
    assert.equal(displayedTotal.textContent, '16', 'header grows when Johto becomes accessible');
    assert.ok(changes.at(-1).changedRegions.includes('johto'), 'the newly accessible region is published');

    const johtoDex = save.pokedex.serialize();
    for (const species of PokemonDB.getInstance().getByRegion('johto')) {
      johtoDex[species.id] = { seen: true, caught: true, shiny: false };
    }
    save.pokedex.deserialize(johtoDex);
    save.statistics.recordLeague('johto');
    snapshot = access.refresh('badge-count-hoenn', { force: true, persist: false });
    assert.deepEqual(snapshot.regions, ['kanto', 'johto', 'hoenn'], 'Hoenn waits for the Johto league and complete Johto Dex');
    assert.equal(snapshot.regions.length * PlayerDefaults.TOTAL_BADGES, 24);
    assert.equal(displayedTotal.textContent, '24', 'header grows when Hoenn becomes accessible');

    unsubscribe();
    header.destroy();
  });

  test('league cards use the regional title statistic, not a Gym badge id', () => {
    const save = SaveSystem.getInstance().createNewSave('League card fixture', 'charmander');
    const panel = new BadgesPanel();
    panel.open();
    const leagueCard = () => panel.getDomElement().querySelector('.pw-league-card');
    assert.ok(leagueCard()?.classList.contains('locked'), 'a new save has no League title');

    save.statistics.recordLeague('kanto');
    EventBus.getInstance().dispatch(new TrainerDefeatedEvent('elite4', 'indigo'));
    assert.ok(leagueCard()?.classList.contains('obtained'), 'the League title is reflected after its victory event');
    assert.ok(!leagueCard()?.classList.contains('locked'));
    panel.destroy();
  });

  test('a saved layout overrides the creation order', () => {
    LocalStore.setJson(StorageKeys.DASHBOARD_COLUMNS, { [LEFT]: [WindowIds.BATTLE, WindowIds.STORY] });
    const view = new DashboardView(DashboardLayoutSystem.getInstance());
    view.addWindows([new StoryPanel(LEFT), new BattlePanel(CENTER)]);
    assert.deepEqual(domLayout(view)[LEFT], [WindowIds.BATTLE, WindowIds.STORY]);
    LocalStore.remove(StorageKeys.DASHBOARD_COLUMNS);
  });

  test('an unknown column falls back to the left column', () => {
    assert.equal(new StoryPanel('nowhere').getDefaultColumn(), LEFT);
    assert.equal(new StoryPanel(RIGHT).getDefaultColumn(), RIGHT);
  });

  test('mobile navigation routes dashboard focus requests to the requested window', () => {
    const dashboard = new DashboardView(DashboardLayoutSystem.getInstance());
    dashboard.addWindows([new StoryPanel(LEFT)]);
    let focused = null;
    dashboard.focusWindow = (windowId) => { focused = windowId; return true; };
    const nav = new MobileDashboardNav(dashboard);

    EventBus.getInstance().dispatch(new DashboardWindowFocusRequestedEvent(WindowIds.STORY));
    assert.equal(focused, WindowIds.STORY);

    nav.destroy();
    dashboard.destroy();
  });
});

describe('Modals and team', (test) => {
  test('the active battle card paints the next move charge from the session state', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    SaveSystem.getInstance().createNewSave('Charge test', 'charmander');
    assert.ok(battle.startBattle('route1'));
    const panel = new BattlePanel(CENTER);
    battle.update(0.1);
    panel.onUpdate(0.1);
    const activeCard = panel.getDomElement().querySelectorAll('.battle-team-member').find((card) => card.classList.contains('active'));
    const move = activeCard?.querySelector('.poke-move');
    assert.ok(move, 'active party card shows moves');
    assert.ok(move.classList.contains('charging'), 'the upcoming move is marked as charging');
    assert.ok(Number.parseFloat(move.style.getPropertyValue('--charge-pct')) > 0, 'charge progress is exposed as a CSS variable');
    battle.endBattle(false);
    panel.destroy();
  });

  test('the battle loot button opens the read-only battle summary', () => {
    const panel = new BattlePanel(CENTER);
    const modal = new BattleSummaryModal();
    assert.equal(modal.getId(), ModalIds.BATTLE_SUMMARY, 'the modal keeps the configured stable id');
    const button = panel.getDomElement().querySelector('#loot-open-btn');
    assert.ok(button, 'summary button exists');
    button.click();
    assert.ok(modal.isOpen(), 'summary modal opens from the battle panel');
    assert.ok(
      modal.getDomElement().querySelector('.battle-session-summary-grid') || modal.getDomElement().querySelector('.battle-summary-empty'),
      'the modal renders either the current/last battle or its empty state'
    );
    modal.close();
    modal.destroy();
    panel.destroy();
  });

  test('a modal open request opens only the modal with that id', () => {
    const team = new TeamModal();
    const settings = new SettingsModal();
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS));
    assert.ok(settings.isOpen(), 'settings opened');
    assert.ok(!team.isOpen(), 'team untouched');
    settings.close();
    team.destroy();
    settings.destroy();
  });

  test('the starter modal opens on request and its back button cancels', () => {
    const chosen = [];
    const modal = new StarterModal({ onStarterChosen: (...args) => chosen.push(args) });
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.STARTER));
    assert.ok(modal.isOpen(), 'opened by request');
    const back = modal.getDomElement().querySelector('.starter-back-btn');
    assert.ok(back, 'back button exists');
    back.click();
    assert.ok(!modal.isOpen(), 'closed by the back button');
    assert.equal(chosen.length, 0, 'no save created');
    modal.destroy();
  });

  test('TeamSystem.setLead swaps the lead, saves and emits', () => {
    const save = SaveSystem.getInstance().createNewSave('Brock', 'charmander');
    save.team.push(new PokemonData({ species: 'onix', level: 12 }));
    const events = [];
    const unsubscribe = EventBus.getInstance().subscribe(TeamChangedEvent, (event) => events.push(event));
    const teams = TeamSystem.getInstance();
    assert.ok(teams.setLead(1));
    assert.equal(teams.getTeam()[0].species, 'onix');
    assert.equal(teams.setLead(0), false, 'lead cannot be set to itself');
    assert.equal(teams.setLead(5), false, 'out of range');
    unsubscribe();
    assert.equal(events.length, 1);
  });
});
