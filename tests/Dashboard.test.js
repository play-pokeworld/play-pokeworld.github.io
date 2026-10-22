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
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { ContentAccessChangedEvent } from '../src/core/events/ContentAccessChangedEvent.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { DungeonRunData } from '../src/data/save/DungeonRunData.js';
import { DungeonSystem } from '../src/systems/DungeonSystem.js';
import { DungeonBattleResolvedEvent } from '../src/core/events/DungeonBattleResolvedEvent.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { BoxChangedEvent } from '../src/core/events/BoxChangedEvent.js';
import { DashboardView } from '../src/ui/dashboard/DashboardView.js';
import { MobileDashboardNav } from '../src/ui/dashboard/MobileDashboardNav.js';
import { StoryPanel } from '../src/panels/StoryPanel.js';
import { ActiveTeamPanel } from '../src/panels/ActiveTeamPanel.js';
import { MapPanel } from '../src/panels/MapPanel.js';
import { BattlePanel } from '../src/panels/BattlePanel.js';
import { DungeonExpeditionPanel } from '../src/panels/components/DungeonExpeditionPanel.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { CurrenciesPanel } from '../src/panels/CurrenciesPanel.js';
import { HeaderPanel } from '../src/panels/HeaderPanel.js';
import { BadgesPanel } from '../src/panels/fullscreen/BadgesPanel.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { HatcheryPanel } from '../src/panels/HatcheryPanel.js';
import { MinePanel } from '../src/panels/MinePanel.js';
import { TrainingCenterPanel } from '../src/panels/TrainingCenterPanel.js';
import { SecretBasePanel } from '../src/panels/SecretBasePanel.js';
import { SecretBaseAccessSystem } from '../src/systems/SecretBaseAccessSystem.js';
import { QuestClaimedEvent } from '../src/core/events/QuestClaimedEvent.js';
import { TeamModal } from '../src/panels/TeamModal.js';
import { SettingsModal } from '../src/panels/settings/SettingsModal.js';
import { StarterModal } from '../src/panels/StarterModal.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { WindowReorderedEvent } from '../src/core/events/WindowReorderedEvent.js';
import { DashboardWindowFocusRequestedEvent } from '../src/core/events/DashboardWindowFocusRequestedEvent.js';
import { TeamChangedEvent } from '../src/core/events/TeamChangedEvent.js';
import { TrainerDefeatedEvent } from '../src/core/events/TrainerDefeatedEvent.js';
import { fakeEvent } from './FakeDom.js';
import { PokemonInfoModal } from '../src/panels/PokemonInfoModal.js';

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

  test('progression-gated facility panels and mobile tabs stay hidden until unlocked', () => {
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
    const nav = new MobileDashboardNav(view);

    for (const panel of [hatchery, mine, training]) {
      assert.ok(panel.getDomElement().classList.contains('pw-progression-hidden'), `${panel.getName()} is absent before its gate`);
      for (const className of ['.pw-hatchery-locked', '.pw-mine-locked', '.pw-training-locked']) {
        assert.equal(panel.getDomElement().querySelector(className), null, 'a hidden panel does not render a locked-state card');
      }
    }
    assert.ok(!map.getDomElement().classList.contains('pw-progression-hidden'), 'the map remains available');
    assert.equal(nav._availableManageViews().length, 0, 'mobile management tabs are absent before unlocks');

    save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
    access.refresh('hatchery-unlocked', { force: true, persist: false });
    save.access.unlockFeature(CONTENT_FEATURES.MINE);
    save.access.unlockFeature(CONTENT_FEATURES.TRAINING);
    access.refresh('other-features-unlocked', { force: true, persist: false });
    for (const panel of [hatchery, mine, training]) {
      assert.ok(!panel.getDomElement().classList.contains('pw-progression-hidden'), 'the panel appears after its prerequisite');
    }
    assert.deepEqual(nav._availableManageViews().map((item) => item.id), ['hatchery', 'training', 'mine']);

    view.setVisibleWindows([WindowIds.HATCHERY]);
    assert.ok(hatchery.getDomElement().classList.contains('mobile-visible'), 'selected mobile tab is shown');
    assert.ok(mine.getDomElement().classList.contains('is-hidden'), 'mobile focus still hides other tabs');
    nav.destroy();
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

  test('secret base panel and mobile sub-tab appear only after the Hoenn milestone', () => {
    const save = SaveSystem.getInstance().createNewSave('Secret base gate', 'charmander');
    save.player.region = 'hoenn';
    save.player.location = 'route111';
    const access = SecretBaseAccessSystem.getInstance();
    save.quests.setMainStep('hoenn', access.getUnlockStep() - 1);
    const panel = new SecretBasePanel(CENTER);
    const view = new DashboardView(DashboardLayoutSystem.getInstance());
    view.addWindows([panel]);
    const nav = new MobileDashboardNav(view);
    const baseLabel = LocalizationManager.getInstance().t('base_tab');
    const baseLabels = () => nav._subBar.getChildren().map((button) => button.text?.getText());

    assert.ok(panel.getDomElement().classList.contains('pw-secret-base-gated'));
    assert.ok(!baseLabels().includes(baseLabel));
    save.quests.setMainStep('hoenn', access.getUnlockStep());
    EventBus.getInstance().dispatch(new QuestClaimedEvent('main.216'));
    assert.ok(!panel.getDomElement().classList.contains('pw-secret-base-gated'));
    assert.ok(panel.getDomElement().querySelector('.pw-secret-base-empty-card'));
    assert.ok(!panel.getDomElement().querySelector('.pw-secret-base-status'));
    assert.ok(baseLabels().includes(baseLabel));

    nav.destroy();
    view.destroy();
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

  test('battle summary merges the active dungeon expedition without double-counting a settled fight', () => {
    const save = SaveSystem.getInstance().createNewSave('Dungeon summary', 'charmander');
    const startedAt = Date.now() - 5000;
    save.dungeons.setRun(new DungeonRunData({
      active: true,
      locationId: 'ceruleancave',
      totalWins: 4,
      startedAt,
      bag: { tokens: 32, money: 90 },
      loot: {
        catches: [{ species: 'zubat', name: 'Zubat', shiny: false }],
        items: { oran_berry: 2 },
        money: 120,
        tokens: 0
      }
    }));
    const modal = new BattleSummaryModal();
    const active = modal._mergeDungeonRun({
      state: 'active',
      run: {
        locationId: 'ceruleancave',
        wins: 1,
        moneyGained: 30,
        tokensGained: 3,
        playerKOs: 1,
        catches: [{ species: 'geodude', name: 'Geodude', shiny: false }],
        items: [{ itemId: 'pokeball', quantity: 1 }],
        damageByPokemon: []
      }
    }).run;
    assert.equal(active.wins, 4);
    assert.equal(active.startedAt, startedAt);
    assert.equal(active.isDungeonRun, true);
    assert.equal(active.catches.length, 2);
    assert.equal(active.items.find((entry) => entry.itemId === 'oran_berry').quantity, 2);
    assert.equal(active.items.find((entry) => entry.itemId === 'pokeball').quantity, 1);
    assert.equal(active.moneyGained, 150);
    assert.equal(active.tokensGained, 32);

    const settled = modal._mergeDungeonRun({
      state: 'ended',
      run: { locationId: 'ceruleancave', catches: [], items: [], moneyGained: 30, tokensGained: 3 }
    }).run;
    assert.equal(settled.catches.length, 1, 'the settled fight is already in expedition loot');
    assert.equal(settled.items.length, 1);
    assert.equal(settled.moneyGained, 120, 'combat money is not counted twice');
    assert.equal(settled.tokensGained, 32, 'the expedition bag is the token total');
    modal.destroy();
  });

  test('battle summary retains terminal boss/wipe expedition data only for the settling battle', () => {
    const dungeons = DungeonSystem.getInstance();
    dungeons.init();
    const modal = new BattleSummaryModal();
    const cases = [
      { name: 'Boss clear', runId: 'battle-clear-test', victory: true, outcome: 'cleared' },
      { name: 'Dungeon wipe', runId: 'battle-wipe-test', victory: false, outcome: 'wipe' }
    ];
    try {
      for (const scenario of cases) {
        const save = SaveSystem.getInstance().createNewSave(scenario.name, 'charmander');
        const startedAt = Date.now() - 60000;
        save.dungeons.setRun(new DungeonRunData({
          active: true,
          locationId: 'ceruleancave',
          badgeReq: 1,
          toll: 10,
          depth: 1,
          floor: 1,
          totalWins: 4,
          wins: 1,
          bag: { tokens: 40, money: 100 },
          startedAt,
          pendingNode: 'c0r0',
          pos: 'c0r0',
          bossTile: 'c0r0',
          map: {
            grid: true,
            cols: 1,
            rows: 1,
            tiles: { c0r0: { id: 'c0r0', col: 0, row: 0, type: 'boss', revealed: true, done: false } }
          },
          loot: {
            catches: [{ species: 'zubat', name: 'Zubat', shiny: false }],
            items: { oran_berry: 1 },
            money: 70,
            tokens: 0
          }
        }));
        EventBus.getInstance().dispatch(new DungeonBattleResolvedEvent(
          'ceruleancave',
          'c0r0',
          scenario.victory,
          'onix',
          {
            runId: scenario.runId,
            startedAt: Date.now() - 1000,
            battles: 1,
            wins: scenario.victory ? 1 : 0,
            expGained: 30,
            moneyGained: 30,
            tokensGained: 3,
            playerKOs: 1,
            catches: [{ species: 'pikachu', name: 'Pikachu', shiny: false }],
            items: [{ itemId: 'oran_berry', quantity: 2 }],
            damageByPokemon: []
          }
        ));

        const settled = modal._mergeDungeonRun({
          state: 'ended',
          run: { runId: scenario.runId, locationId: 'ceruleancave', catches: [], items: [], damageByPokemon: [] }
        }).run;
        assert.equal(save.dungeons.lastRun.outcome, scenario.outcome);
        assert.equal(settled.isDungeonRun, true);
        assert.equal(settled.dungeonSettled, true);
        assert.equal(settled.dungeonOutcome, scenario.outcome);
        assert.equal(settled.catches.length, 2);
        assert.equal(settled.items.find((entry) => entry.itemId === 'oran_berry').quantity, 3);
        assert.equal(settled.moneyGained, 100, 'all expedition loot is aggregated once');
        assert.equal(settled.battles, 5, 'the wipe includes the final lost battle');
        assert.equal(settled.tokensGained, save.dungeons.lastRun.banked.tokens);
        if (scenario.outcome === 'wipe') {
          assert.equal(settled.dungeonLost.money, 50);
          assert.equal(settled.dungeonLost.tokens, 20);
          assert.equal(settled.dungeonTollRefunded, 10);
        }
        const unrelated = modal._mergeDungeonRun({
          state: 'ended',
          run: { runId: `${scenario.runId}-unrelated`, locationId: 'route1', catches: [], items: [] }
        }).run;
        assert.ok(!unrelated.isDungeonRun, 'a later battle cannot inherit the previous lastRun');
      }
    } finally {
      modal.destroy();
    }
  });

  test('dungeon map resumes after a saved encounter, settles a win, and re-enables the next tile', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const save = SaveSystem.getInstance().createNewSave('Dungeon resume', 'charmander');
    save.player.region = 'kanto';
    save.player.location = 'viridianforest';
    save.dungeons.setRun(new DungeonRunData({
      active: true,
      locationId: 'viridianforest',
      depth: 1,
      floor: 1,
      pos: 'c1r0',
      pendingNode: 'c1r0',
      map: {
        grid: true,
        cols: 3,
        rows: 1,
        tiles: {
          c0r0: { id: 'c0r0', col: 0, row: 0, type: 'empty', revealed: true, done: false },
          c1r0: { id: 'c1r0', col: 1, row: 0, type: 'combat', revealed: true, done: false },
          c2r0: { id: 'c2r0', col: 2, row: 0, type: 'combat', revealed: true, done: false }
        }
      }
    }));
    const dungeons = DungeonSystem.getInstance();
    dungeons.init();
    battle.init();
    const panel = new DungeonExpeditionPanel();
    const getCell = (nodeId) => {
      const grid = panel.getDomElement().querySelector('.pw-dgn-grid');
      return grid?.children.find((cell) => cell.getAttribute('data-node') === nodeId) ?? null;
    };

    try {
      const resume = panel.getDomElement().querySelector('.pw-dungeon-actions')?.querySelector('button');
      assert.ok(resume, 'a saved pending encounter exposes its resume action');
      resume.click();
      assert.ok(battle.isActive(), 'the pending dungeon encounter resumes');
      assert.equal(getCell('c2r0')?.hasAttribute('disabled'), true, 'the map is blocked while the encounter is active');

      EventBus.getInstance().dispatch(new DungeonBattleResolvedEvent(
        'viridianforest', 'c1r0', true, battle.getCurrentFoe()?.species || 'pidgey'
      ));
      assert.equal(dungeons.getRun().pendingNode, null, 'the resolved node is cleared');
      assert.equal(dungeons.getRun().map.tiles.c1r0.done, true, 'the win is persisted on its tile');
      assert.ok(battle.isActive(), 'the settlement event precedes BattleEndedEvent');
      assert.equal(getCell('c2r0')?.hasAttribute('disabled'), true, 'the map stays blocked until the battle actually ends');

      battle.endBattle(true);
      assert.ok(!battle.isActive());
      assert.equal(getCell('c2r0')?.hasAttribute('disabled'), false, 'BattleEndedEvent refreshes the resumed map');
      assert.ok(dungeons.moveTo('c2r0'), 'the player can continue to the next encounter');
      assert.ok(battle.isActive(), 'the next dungeon battle starts normally');
      assert.equal(dungeons.getRun().pendingNode, 'c2r0');
    } finally {
      if (dungeons.isActive()) dungeons.abandon();
      if (battle.isActive()) battle.endBattle(false);
      panel.destroy();
    }
  });

  test('PC panel is storage-only and opens Pokémon details from the shared Dex tile', () => {
    const save = SaveSystem.getInstance().createNewSave('PC storage-only view', 'charmander');
    const box = BoxSystem.getInstance();
    const stored = new PokemonData({ species: 'rattata', level: 7, favorite: true });
    box.addPokemon(stored);
    const panel = new BoxPanel();
    const teamPanel = new ActiveTeamPanel(LEFT);
    teamPanel.getDomElement().querySelector('.pc-box-open-btn').click();
    assert.ok(panel.isOpen(), 'the PC opens from the active-team toolbar');
    assert.ok(panel.getDomElement().querySelector('.pw-box-roster--storage.pw-pokemon-grid'), 'the PC renders its storage grid');
    assert.equal(panel.getDomElement().querySelector('.pw-box-selection-footer'), null, 'the dedicated selection footer is absent in normal storage mode');
    assert.equal(panel.getDomElement().querySelector('.pw-box-roster--team'), null, 'the PC panel does not render team rows');
    assert.equal(panel.getDomElement().querySelector('.pw-box-summary'), null, 'the PC panel does not display team size or capacity');

    const originalSaveCurrent = SaveSystem.getInstance().saveCurrent;
    let writes = 0;
    SaveSystem.getInstance().saveCurrent = function (...args) {
      writes++;
      return originalSaveCurrent.apply(this, args);
    };
    const infoRequests = [];
    const onInfoRequest = (event) => infoRequests.push(event);
    EventBus.getInstance().subscribe(ModalOpenRequestedEvent, onInfoRequest);
    try {
      const entry = [...panel.getDomElement().querySelectorAll('.pw-box-grid-entry')]
        .find((row) => row.dataset.pokemonUid === stored.uid);
      const tile = entry.querySelector('.pw-box-pokemon-tile');
      const dexWidget = tile.querySelector('.pw-pokemon-grid-sprite');
      assert.ok(tile.classList.contains('dex-entry'), 'PC uses the Pokédex circular tile');
      assert.ok(dexWidget?.classList.contains('pw-pokedex-sprite'), 'PC uses the shared sprite widget');
      assert.ok(entry.querySelector('.box-level') && entry.querySelector('.box-name'), 'level and name sit around the tile');
      assert.ok(entry.querySelector('.pw-box-tag--favorite'), 'PC collection flags remain visible');
      assert.equal(entry.querySelector('.pw-box-rank'), null, 'rank is not displayed on a stored Pokémon');
      tile.click();
      assert.equal(infoRequests[0]?.modalId, ModalIds.POKEMON_INFO, 'the tile still opens the Pokémon information sheet');
      assert.equal(infoRequests[0]?.params.pokemonUid, stored.uid);
      assert.equal(infoRequests[0]?.params.location, 'box');
      assert.equal(save.box.length, 1, 'opening details does not move the Pokémon');
      assert.equal(save.team.length, 1, 'the team is not read or changed by the PC panel');
      assert.equal(writes, 0, 'opening details does not persist a save');
    } finally {
      SaveSystem.getInstance().saveCurrent = originalSaveCurrent;
      EventBus.getInstance().unsubscribe(ModalOpenRequestedEvent, onInfoRequest);
      panel.close();
      panel.destroy();
      teamPanel.destroy();
    }
  });

  test('generic PC selection transfers a Pokémon through the team-box system', () => {
    const saves = SaveSystem.getInstance();
    const save = saves.createNewSave('Generic PC selection', 'charmander');
    const team = TeamSystem.getInstance();
    const box = BoxSystem.getInstance();
    const incoming = new PokemonData({ species: 'pidgey', level: 8, favorite: true, locked: true });
    box.addPokemon(incoming);

    const panel = new BoxPanel();
    const teamPanel = new ActiveTeamPanel(LEFT);
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) {
      writes++;
      return originalSaveCurrent.apply(this, args);
    };
    try {
      teamPanel._openBoxSelector();
      assert.ok(panel.isOpen());
      assert.ok(panel._selectionRequestId, 'the box receives an opaque selection request, not a team mode');
      assert.equal(panel.getDomElement().querySelector('.pw-box-selection-footer'), null, 'adding into an empty team slot has no replacement footer');
      const entry = [...panel.getDomElement().querySelectorAll('.pw-box-grid-entry')]
        .find((row) => row.dataset.pokemonUid === incoming.uid);
      const tile = entry.querySelector('.pw-box-pokemon-tile');
      assert.ok(tile.classList.contains('pw-pokemon-grid-entry') && tile.classList.contains('dex-entry'), 'selector tiles use the same full Pokédex entry widget');
      assert.ok(tile.querySelector('.pw-pokemon-grid-sprite'), 'selector tiles contain the shared Pokémon grid sprite');
      assert.ok(entry.querySelector('.box-level') && entry.querySelector('.box-name'));
      assert.ok(!panel.getDomElement().querySelector('.pw-box-roster--team'), 'the selection view contains no team data');
      tile.click();
      const added = team.getTeam().find((pokemon) => pokemon.uid === incoming.uid);
      assert.ok(added, 'the coordinator withdraws the selected Pokémon');
      assert.equal(added.favorite, true);
      assert.equal(added.locked, true);
      assert.equal(box.getBox().some((pokemon) => pokemon.uid === incoming.uid), false);
      assert.equal(writes, 1, 'team and PC are persisted once by the coordinator');
      assert.equal(panel.isOpen(), false, 'the generic selector closes after a choice');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      if (panel.isOpen()) panel.close();
      panel.destroy();
      teamPanel.destroy();
    }
  });

  test('team member can be stored from the team panel without PC team controls', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Store from team', 'charmander');
    const stored = new PokemonData({ species: 'pidgey', level: 8 });
    save.team.push(stored);
    saves.setCurrentSave(save);
    const panel = new ActiveTeamPanel(LEFT);
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return originalSaveCurrent.apply(this, args); };
    try {
      const card = panel._cards.get(stored.uid);
      const storeButton = card.getDomElement().querySelector('.pw-team-store-btn');
      assert.ok(storeButton, 'store action belongs to the team card');
      storeButton.focus();
      storeButton.click();
      assert.equal(document.activeElement, panel._cards.get(save.team[0].uid).getDragHandle().getDomElement(), 'focus moves to the nearest surviving team card');
      assert.equal(save.team.some((pokemon) => pokemon.uid === stored.uid), false);
      assert.ok(save.box.some((pokemon) => pokemon.uid === stored.uid));
      assert.equal(writes, 1, 'store operation is persisted once');
      const lastMemberStore = panel._cards.get(save.team[0].uid).getDomElement().querySelector('.pw-team-store-btn');
      assert.equal(lastMemberStore.getAttribute('disabled'), 'disabled', 'the last active Pokémon cannot be stored away');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      panel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('a full six-member Team hides the add-a-Pokémon slot', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Full team slot', 'charmander');
    for (const species of ['pidgey', 'rattata', 'bulbasaur', 'squirtle', 'pikachu']) {
      save.team.push(new PokemonData({ species, level: 8 }));
    }
    saves.setCurrentSave(save);
    const panel = new ActiveTeamPanel(LEFT);
    try {
      assert.equal(save.team.length, PlayerDefaults.TEAM_SIZE, 'the fixture reaches the six-member team limit');
      assert.equal(panel._sortableList.getChildren().length, PlayerDefaults.TEAM_SIZE, 'all six team cards remain visible');
      assert.equal(panel._addSlot.isVisible(), false, 'the Add Pokémon slot is hidden at capacity');
      assert.equal(panel._addSlot.getDomElement().classList.contains('is-hidden'), true, 'the hidden state reaches the slot widget');
    } finally {
      panel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('active team rows reorder by native card drag, pointer handle and keyboard while retaining the card node', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Team reorder', 'charmander');
    saves.setCurrentSave(save);
    const team = TeamSystem.getInstance();
    team.addPokemon(new PokemonData({ species: 'pidgey', level: 8 }));
    team.addPokemon(new PokemonData({ species: 'rattata', level: 9 }));
    const panel = new ActiveTeamPanel(LEFT);
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return originalSaveCurrent.apply(this, args); };
    try {
      const initialUids = save.team.map((pokemon) => pokemon.uid);
      const firstCard = panel._cards.get(initialUids[0]);
      const firstRow = firstCard.getDomElement();
      const firstHandle = firstCard.getDragHandle().getDomElement();
      firstHandle.focus();
      assert.equal(firstRow.getAttribute('draggable'), null, 'cards do not start a browser drag on an ordinary click');

      const originalSetTimeout = globalThis.setTimeout;
      const originalClearTimeout = globalThis.clearTimeout;
      let armLongPress = null;
      globalThis.setTimeout = (callback, delay) => {
        assert.equal(delay, 400, 'whole-card dragging follows the 400 ms reference hold');
        armLongPress = callback;
        return 1;
      };
      globalThis.clearTimeout = () => {};
      try {
        firstRow.dispatchEvent(fakeEvent('mousedown', { bubbles: true, button: 0 }));
        assert.equal(firstRow.getAttribute('draggable'), null, 'the card waits for the long press');
        assert.equal(typeof armLongPress, 'function');
        armLongPress();
        assert.equal(firstRow.getAttribute('draggable'), 'true', 'the card becomes draggable after the hold');

        const storedTransfer = {};
        const dataTransfer = {
          effectAllowed: '',
          dropEffect: '',
          clearData: () => {},
          setData: (type, value) => { storedTransfer[type] = value; }
        };
        const dispatchDrag = (type, row) => {
          const event = fakeEvent(type, { bubbles: true });
          event.dataTransfer = dataTransfer;
          row.dispatchEvent(event);
        };
        dispatchDrag('dragstart', firstRow);
        assert.equal(firstRow.classList.contains('is-dragging'), true, 'the source card receives drag feedback');
        const thirdCard = panel._cards.get(initialUids[2]);
        dispatchDrag('dragover', thirdCard.getDomElement());
        assert.equal(thirdCard.getDomElement().classList.contains('is-drop-target'), true, 'the target card receives drop feedback');
        dispatchDrag('drop', thirdCard.getDomElement());
        dispatchDrag('dragend', firstRow);

        assert.deepEqual(save.team.map((pokemon) => pokemon.uid), [initialUids[2], initialUids[1], initialUids[0]], 'dropping the whole card swaps the two Pokémon');
        assert.equal(storedTransfer['text/plain'], initialUids[0], 'the native drag payload uses the stable Pokémon uid');
        assert.equal(firstRow.getAttribute('draggable'), null, 'the native drag state is cleared after the drop');
        assert.equal(panel._sortableList.getChildren()[2], firstCard, 'the same card widget follows its Pokémon');
        assert.equal(document.activeElement, firstHandle, 'focus stays on the same drag handle after the card moves');
        assert.equal(writes, 1, 'one native card drag writes the save once');
      } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
      }

      panel._sortableList.getChildren().forEach((row, index) => {
        row.getDomElement().getBoundingClientRect = () => ({
          top: index * 100,
          bottom: index * 100 + 80,
          left: 0,
          right: 300,
          width: 300,
          height: 80
        });
      });
      firstHandle.dispatchEvent(fakeEvent('pointerdown', { bubbles: true }));
      firstHandle.dispatchEvent(fakeEvent('pointermove', { bubbles: true, clientY: 120 }));
      firstHandle.dispatchEvent(fakeEvent('pointerup', { bubbles: true }));

      assert.deepEqual(save.team.map((pokemon) => pokemon.uid), [initialUids[2], initialUids[0], initialUids[1]], 'the touch/handle path still swaps the adjacent Pokémon');
      assert.equal(panel._cards.get(initialUids[0]), firstCard, 'the same card widget is moved rather than rebuilt');
      assert.equal(panel._sortableList.getChildren()[1], firstCard, 'the DOM list follows the new team order');
      assert.equal(document.activeElement, firstHandle, 'focus stays on the same drag handle after reordering');
      assert.equal(writes, 2, 'one pointer-handle drag writes the save once');

      firstHandle.dispatchEvent(fakeEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
      assert.deepEqual(save.team.map((pokemon) => pokemon.uid), [initialUids[0], initialUids[2], initialUids[1]], 'the keyboard arrow swaps with the adjacent member');
      assert.equal(writes, 3, 'keyboard reorder also writes exactly once');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      panel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('team replacement uses generic PC selection and the coordinator swaps atomically', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Team PC replacement', 'charmander');
    const outgoing = save.team[0];
    const incoming = new PokemonData({ species: 'pidgey', level: 14, favorite: true, locked: true });
    save.box.push(incoming);
    saves.setCurrentSave(save);
    const panel = new ActiveTeamPanel(LEFT);
    const boxPanel = new BoxPanel();
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return originalSaveCurrent.apply(this, args); };
    try {
      const managerButtons = panel.getDomElement().querySelectorAll('.team-presets-open-btn');
      assert.equal(managerButtons.length, 1, 'the active team exposes one team-manager button');
      assert.ok(!panel.getDomElement().textContent.includes(t('presets_label')));
      assert.ok(!panel.getDomElement().textContent.includes(t('preset_adventure')));

      panel._cards.get(outgoing.uid).getDomElement().click();
      assert.ok(boxPanel.isOpen());
      assert.ok(boxPanel._selectionRequestId, 'replacement is represented as a generic selection request');
      const selectionFooter = boxPanel.getDomElement().querySelector('.pw-box-selection-footer');
      assert.ok(selectionFooter, 'replacement mode has its dedicated fixed footer');
      assert.ok(selectionFooter.textContent.includes(t('selected_pokemon', { name: outgoing.getDisplayName(), level: outgoing.level })), 'the footer identifies the Pokémon being replaced');
      assert.ok(selectionFooter.querySelector('.pw-box-selection-cancel'), 'the footer offers cancellation');
      assert.equal(selectionFooter.querySelector('.pw-box-selection-remove')?.getAttribute('disabled'), 'disabled', 'the only team Pokémon cannot be removed');
      assert.equal(boxPanel.getDomElement().querySelector('.pw-box-instruction')?.textContent, t('box_select_pokemon_instruction'), 'BoxPanel renders one generic prompt for any selection request');
      const incomingEntry = [...boxPanel.getDomElement().querySelectorAll('.pw-box-grid-entry')]
        .find((entry) => entry.dataset.pokemonUid === incoming.uid);
      const incomingTile = incomingEntry.querySelector('.pw-box-pokemon-tile');
      const incomingSprite = incomingTile.querySelector('.pw-pokemon-grid-sprite');
      assert.ok(incomingTile.classList.contains('dex-entry'), 'replacement uses the shared Pokédex entry widget');
      assert.ok(incomingSprite.classList.contains('pw-pokedex-sprite'), 'the sprite itself is the same shared grid widget');
      assert.equal(incomingEntry.querySelector('.box-level')?.textContent, t('level_short_value', { level: incoming.level }));
      assert.equal(incomingEntry.querySelector('.box-name')?.textContent, incoming.getDisplayName());
      assert.ok(incomingEntry.querySelector('.pw-box-tag--favorite') && incomingEntry.querySelector('.pw-box-tag--locked'), 'favorite and lock indicators stay visible');
      assert.equal(incomingEntry.querySelector('.pw-box-rank'), null, 'replacement choices do not show rank badges');
      assert.equal(incomingEntry.querySelector('.box-actions'), null, 'PC storage does not render team actions');
      incomingTile.click();
      assert.equal(save.team[0].uid, incoming.uid, 'the coordinator replaces the selected slot');
      assert.ok(save.team[0].favorite && save.team[0].locked, 'collection flags travel with the Pokémon');
      assert.ok(save.box.some((pokemon) => pokemon.uid === outgoing.uid), 'the replaced Pokémon returns to the PC');
      assert.equal(writes, 1, 'the team/PC exchange persists atomically once');
      assert.ok(!boxPanel.isOpen(), 'the generic selection closes after success');
      assert.equal(boxPanel.getDomElement().querySelector('.pw-box-selection-footer'), null, 'the selection footer is removed when selection ends');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      if (boxPanel.isOpen()) boxPanel.close();
      panel.destroy();
      boxPanel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('replacement footer cancels cleanly or stores the selected Pokémon in the PC', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Team PC footer', 'charmander');
    const outgoing = save.team[0];
    const reserve = new PokemonData({ species: 'pidgey', level: 8 });
    const incoming = new PokemonData({ species: 'rattata', level: 9 });
    save.team.push(reserve);
    save.box.push(incoming);
    saves.setCurrentSave(save);
    const teamPanel = new ActiveTeamPanel(LEFT);
    const boxPanel = new BoxPanel();
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return originalSaveCurrent.apply(this, args); };
    try {
      teamPanel._cards.get(outgoing.uid).getDomElement().click();
      let footer = boxPanel.getDomElement().querySelector('.pw-box-selection-footer');
      assert.ok(footer, 'the footer appears only after starting a replacement choice');
      footer.querySelector('.pw-box-selection-cancel').click();
      assert.ok(!boxPanel.isOpen(), 'cancel closes the PC choice');
      assert.ok(save.team.some((pokemon) => pokemon.uid === outgoing.uid), 'cancel keeps the active Pokémon');
      assert.ok(save.box.some((pokemon) => pokemon.uid === incoming.uid), 'cancel leaves the PC unchanged');
      assert.equal(writes, 0, 'cancel does not save a roster mutation');

      teamPanel._cards.get(outgoing.uid).getDomElement().click();
      footer = boxPanel.getDomElement().querySelector('.pw-box-selection-footer');
      const remove = footer.querySelector('.pw-box-selection-remove');
      assert.ok(remove && !remove.getAttribute('disabled'), 'remove is enabled while another team member remains');
      remove.click();
      assert.ok(!boxPanel.isOpen(), 'remove closes the PC choice');
      assert.ok(!save.team.some((pokemon) => pokemon.uid === outgoing.uid), 'the selected team Pokémon leaves the active team');
      assert.ok(save.box.some((pokemon) => pokemon.uid === outgoing.uid), 'the selected Pokémon is transferred to the PC');
      assert.ok(save.box.some((pokemon) => pokemon.uid === incoming.uid), 'the untouched PC choice remains stored');
      assert.equal(save.team.length, 1, 'the remaining team member is preserved');
      assert.equal(writes, 1, 'removal is one atomic save operation');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      if (boxPanel.isOpen()) boxPanel.close();
      teamPanel.destroy();
      boxPanel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('Pokémon info exposes separate Stats/IV/EV tabs and keeps focus and scroll on tab changes', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Info tabs', 'charmander');
    saves.setCurrentSave(save);
    const pokemon = save.team[0];
    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemonUid: pokemon.uid, location: 'team' });
      const dom = modal.getDomElement();
      assert.equal(dom.querySelectorAll('[role="tab"]').length, 3, 'three accessible data tabs are rendered');
      assert.ok(dom.querySelector('#pokemon-info-stat-panel-stats'), 'the Stats panel starts selected');

      modal._dom.scrollTop = 183;
      const ivTab = dom.querySelector('[data-focus-key="pokemon-info-tab-ivs"]');
      ivTab.focus();
      ivTab.click();
      assert.equal(dom.querySelector('#pokemon-info-stat-panel-ivs')?.getAttribute('aria-labelledby'), 'pokemon-info-tab-ivs');
      assert.equal(document.activeElement, dom.querySelector('[data-focus-key="pokemon-info-tab-ivs"]'), 'focus stays on the selected tab');
      assert.equal(modal._dom.scrollTop, 183, 'the modal scroll position is preserved');
      assert.ok(dom.querySelector('#pokemon-info-stat-panel-ivs').textContent.includes('/ 6'), 'IV values use the configured IV cap');

      document.activeElement.dispatchEvent(fakeEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      assert.ok(dom.querySelector('#pokemon-info-stat-panel-evs'), 'the right arrow activates the EV tab');
      assert.equal(document.activeElement, dom.querySelector('[data-focus-key="pokemon-info-tab-evs"]'));
      assert.ok(dom.querySelector('#pokemon-info-stat-panel-evs').textContent.includes('/ 18'), 'EV rows use the configured per-stat cap');
      assert.ok(dom.querySelector('#pokemon-info-stat-panel-evs').textContent.includes('/ 36'), 'the EV total uses the configured total cap');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
      saves.setCurrentSave(previous);
    }
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
