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
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { DashboardView } from '../src/ui/dashboard/DashboardView.js';
import { StoryPanel } from '../src/panels/StoryPanel.js';
import { MapPanel } from '../src/panels/MapPanel.js';
import { BattlePanel } from '../src/panels/BattlePanel.js';
import { CurrenciesPanel } from '../src/panels/CurrenciesPanel.js';
import { TeamModal } from '../src/panels/TeamModal.js';
import { SettingsModal } from '../src/panels/settings/SettingsModal.js';
import { StarterModal } from '../src/panels/StarterModal.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { WindowReorderedEvent } from '../src/core/events/WindowReorderedEvent.js';
import { TeamChangedEvent } from '../src/core/events/TeamChangedEvent.js';

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
});

describe('Modals and team', (test) => {
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
