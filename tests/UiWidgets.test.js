import { SeededRandom } from '../src/core/SeededRandom.js';
/**
 * @file UiWidgets.test.js
 * @brief UI widgets and panels rendered against the fake DOM (tests/FakeDom.js).
 */

import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { fakeEvent } from './FakeDom.js';
import { UIButton } from '../src/ui/UIButton.js';
import { UIText } from '../src/ui/UIText.js';
import { UIContainer } from '../src/ui/UIContainer.js';
import { UIProgressBar } from '../src/ui/UIProgressBar.js';
import { TutorialCard } from '../src/panels/components/TutorialCard.js';
import { QuestCard } from '../src/panels/components/QuestCard.js';
import { UISwitch } from '../src/ui/UISwitch.js';
import { UIDropdown } from '../src/ui/UIDropdown.js';
import { UIImage } from '../src/ui/UIImage.js';
import { UIPanel } from '../src/ui/UIPanel.js';
import { SaveCard } from '../src/ui/SaveCard.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { DashboardColumns, WindowIds } from '../src/config/DashboardLayout.js';
import { LanguageSection } from '../src/panels/settings/LanguageSection.js';
import { BagItemRow } from '../src/panels/components/BagItemRow.js';
import { FilterBar } from '../src/panels/components/FilterBar.js';
import { UIFullscreenPanel } from '../src/ui/UIFullscreenPanel.js';
import { GuidePanel } from '../src/panels/fullscreen/GuidePanel.js';
import { PokedexPanel } from '../src/panels/fullscreen/PokedexPanel.js';
import { DraggablePanel } from '../src/ui/DraggablePanel.js';
import { GuideSectionIds } from '../src/config/GuideSections.js';
import { IconRegistry } from '../src/ui/icons/IconRegistry.js';
import { SHORTCUTS, ShortcutIds } from '../src/config/Shortcuts.js';
import { ShortcutsPanel } from '../src/panels/ShortcutsPanel.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { AchievementsPanel } from '../src/panels/AchievementsPanel.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { CaptureAnimationView } from '../src/ui/CaptureAnimationView.js';
import { PokemonBackgroundView } from '../src/ui/PokemonBackgroundView.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { CaptureAttemptResolvedEvent } from '../src/core/events/CaptureAttemptResolvedEvent.js';
import { AnimationPreferences } from '../src/config/AnimationPreferences.js';
import { PreferencesSystem } from '../src/systems/PreferencesSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { Random } from '../src/core/Random.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { RoamingRotationTickEvent } from '../src/core/events/RoamingRotationTickEvent.js';
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';

describe('UI widgets', (test) => {
  test('UIButton renders its label and fires onClick unless disabled', () => {
    let clicks = 0;
    const button = new UIButton({ text: 'Go', onClick: () => clicks++ });
    const dom = button.getDomElement();
    assert.equal(dom.tagName, 'BUTTON');
    assert.ok(dom.textContent.includes('Go'));
    dom.click();
    button.setEnabled(false);
    dom.click();
    assert.equal(clicks, 1);
  });

  test('UIText renders rich text as nodes, never as markup', () => {
    const text = new UIText({ text: '' });
    text.setRichText('A <b>{n}</b>', { n: 7 });
    const dom = text.getDomElement();
    assert.equal(dom.textContent, 'A 7');
    assert.ok(!dom.textContent.includes('<b>'));
    assert.ok(dom.querySelectorAll('strong').length + dom.querySelectorAll('b').length + dom.querySelectorAll('.is-bold').length >= 1, 'bold node');
  });

  test('UIContainer manages children', () => {
    const child = new UIText({ text: 'x' });
    const container = new UIContainer({ className: 'box', children: [child] });
    assert.equal(container.getChildren().length, 1);
    container.removeChild(child);
    assert.equal(container.getDomElement().children.length, 0);
  });

  test('UIProgressBar exposes its percentage through a CSS variable only', () => {
    const bar = new UIProgressBar({ value: 25, max: 50 });
    bar.setValue(30, 60);
    assert.equal(bar.getPercent(), 50);
    const dom = bar.getDomElement();
    const vars = [dom, ...dom.querySelectorAll('div'), ...dom.querySelectorAll('span')].map((n) => n.style.getPropertyValue('--pw-progress'));
    assert.ok(vars.includes('50%'), '--pw-progress');
  });

  test('tutorial card separates its step heading, title, and desktop guidance', () => {
    const card = new TutorialCard(() => {}, () => {}, () => {});
    card.setStatus({
      index: 1,
      total: 10,
      title: 'First battles',
      description: 'Win five wild battles.',
      how: 'Go to Route 1.',
      action: 'route1',
      actionLabel: 'Go to Route 1',
      progressText: '0/5',
      progress: 0,
      target: 5,
      rewardData: { currencies: {}, items: {} }
    });
    const dom = card.getDomElement();
    const how = dom.querySelector('.pw-tutorial-how');
    assert.equal(dom.querySelector('.pw-tutorial-step-heading')?.textContent, t('tutorial_step_lbl', { idx: 1, total: 10 }));
    assert.equal(dom.querySelector('.pw-tutorial-title')?.textContent, 'First battles');
    assert.ok(how?.textContent.includes(t('tutorial_hint_map_pc')), 'route instructions include the desktop hint');
    assert.ok(!dom.querySelector('.pw-tutorial-progress-label'), 'the reference shows the progress value without a label');
    assert.ok(!dom.querySelector('.pw-tutorial-rewards'), 'tutorial rewards stay out of the reference card layout');
  });

  test('main quest cards show their chain number and actionable objective without duplicate progress UI', () => {
    const card = new QuestCard({ onClaim: () => {}, onChallenge: () => {} });
    const status = {
      quest: { key: 'main.1', category: 'main', id: '1', objective: { type: 'talk' }, rewards: {} },
      objective: { describe: () => ({ count: 1 }) },
      progress: 0,
      count: 1,
      complete: false
    };
    card.setStatus(status, false, 1);
    const dom = card.getDomElement();
    assert.equal(dom.querySelector('.pw-quest-card-title')?.textContent, t('quest_numbered_title', { index: 1, title: t('quests.main.1.title') }));
    assert.ok(dom.querySelector('.pw-quest-card-category')?.classList.contains('is-hidden'), 'the main-quest label is not repeated inside the numbered card');
    assert.equal(dom.querySelector('.pw-quest-objective-text')?.textContent, t('m.quest_ui.22'));
    assert.ok(dom.querySelector('.pw-progress-label')?.classList.contains('is-hidden'), 'talk objectives use the actionable prompt rather than a duplicate 0/1 row');
    assert.ok(dom.querySelector('.quest-progress-container')?.classList.contains('is-hidden'), 'text objectives do not show an empty progress bar');
    assert.ok([...dom.querySelectorAll('.pw-quest-info-line')].some((node) => node.textContent === t('m.quest_ui.20') && !node.classList.contains('is-hidden')), 'a non-challenge quest shows the informative in-progress line');
    assert.ok(dom.querySelector('.quest-claim-btn')?.classList.contains('is-hidden'), 'non-claimable quests do not show a dead disabled button');
    card.destroy();

    const bossCard = new QuestCard({ onClaim: () => {}, onChallenge: () => {} });
    bossCard.setStatus({
      quest: { key: 'main.5', category: 'main', id: '5', objective: { type: 'boss', trainer: 'kanto_rival_route22' }, rewards: {} },
      objective: { describe: () => ({ count: 1, trainer: 'kanto_rival_route22' }) },
      progress: 0,
      count: 1,
      complete: false
    }, true, 5);
    const bossDom = bossCard.getDomElement();
    assert.equal(bossDom.querySelector('.pw-quest-objective-text')?.textContent, t('trainer_battle_target', { trainer: t('trainer.kanto_rival_route22.name') }));
    assert.equal(bossDom.querySelector('.pw-quest-info-line')?.textContent, t('trainer_battle_hint'));
    assert.ok(bossDom.querySelector('.quest-claim-btn')?.classList.contains('is-challenge'));
    assert.ok(bossDom.querySelector('.pw-progress-label')?.classList.contains('is-hidden'));
    bossCard.destroy();
  });

  test('UISwitch toggles and reports its state', () => {
    let last = null;
    const toggle = new UISwitch({ checked: false, onLabel: 'ON', offLabel: 'OFF', onChange: (v) => { last = v; } });
    toggle.getDomElement().click();
    assert.ok(toggle.isChecked() && last === true);
    assert.ok(toggle.getDomElement().classList.contains('is-on'));
  });

  test('UIDropdown changes value', () => {
    const dropdown = new UIDropdown({ options: [{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }], value: 'fr' });
    assert.equal(dropdown.getValue(), 'fr');
    dropdown.setValue('en');
    assert.equal(dropdown.getValue(), 'en');
  });

  test('UIImage clears empty sources and recovers from an earlier load error', () => {
    const image = new UIImage({ src: 'missing.png' });
    const dom = image.getDomElement();
    dom.dispatchEvent(fakeEvent('error'));
    assert.ok(dom.classList.contains('is-broken'), 'failed images get the fallback visibility class');

    image.setSource('');
    assert.equal(dom.getAttribute('src'), null, 'empty source is removed instead of requesting the current document');
    assert.ok(!dom.classList.contains('is-broken'), 'clearing resets the broken state');

    image.setSource('assets/images/items/leftovers.png');
    assert.equal(dom.getAttribute('src'), 'assets/images/items/leftovers.png');
    assert.ok(!dom.classList.contains('is-broken'), 'a new held-item source is visible');
  });

  test('background collection scales from caught species and follows the active save', () => {
    const saveSystem = SaveSystem.getInstance();
    const previous = saveSystem.getCurrentSave();
    const save = SaveData.createNew('Background fixture', 'charmander');
    saveSystem.setCurrentSave(save);
    const view = new PokemonBackgroundView({ random: new SeededRandom(41376) });
    try {
      assert.equal(view.getChildren().length, 5, 'the first captured Pokémon shows the minimum walkers');
      const originalNodes=view.getChildren().map(w=>w.getDomElement());
      const flights=view._walkers.map(w=>w.flight).filter(Boolean);
      assert.ok(flights.length>0,'bounded flights are prepared from the injected random source');
      assert.ok(flights.every(f=>f.fromEdge!==f.toEdge),'entries are not four fixed diagonals');
      for (const species of ['bulbasaur', 'squirtle', 'pidgey', 'rattata', 'caterpie', 'weedle', 'pikachu', 'geodude', 'abra']) {
        save.pokedex.markCaught(species);
      }
      assert.equal(save.pokedex.getCaughtCount(), 10);
      assert.equal(view.getChildren().length, 6, 'each ten captures adds a walker');
      assert.ok(originalNodes.every((node,i)=>view.getChildren()[i].getDomElement()===node),'ordinary Dex updates retain active walker nodes');
      assert.equal(view.getDomElement().getAttribute('aria-hidden'), 'true');
    } finally {
      view.destroy();
      saveSystem.setCurrentSave(previous);
    }
  });

  test('capture verdict overlay stays visible, follows its preference, and clears its timers', () => {
    const preferences = PreferencesSystem.getInstance();
    preferences.setAnimationPreference(AnimationPreferences.CAPTURE, true);
    document.documentElement.clientWidth = 1600;
    document.documentElement.clientHeight = 900;
    document.getElementById('battle-center-panel')?.remove();
    const panel = document.createElement('div');
    panel.id = 'battle-center-panel';
    const row = document.createElement('div');
    row.id = 'battle-team-row';
    const card = document.createElement('div');
    card.className = 'pw-enemy-card';
    panel.appendChild(row);
    row.appendChild(card);
    document.body.appendChild(panel);
    panel.getBoundingClientRect = () => ({ left: 300, top: -550, right: 908, bottom: -250, width: 608, height: 300 });
    card.getBoundingClientRect = () => ({ left: 450, top: -500, right: 650, bottom: -400, width: 200, height: 100 });

    const view = new CaptureAnimationView();
    panel.appendChild(view.getDomElement());
    const result = {
      speciesId: 'rattata', form: '', name: 'Rattata', shiny: false,
      ballId: 'pokeball', rate: 10, caught: true, duplicate: false
    };
    EventBus.getInstance().dispatch(new CaptureAttemptResolvedEvent(result));
    assert.equal(view.isVisible(), true);
    assert.equal(view.getDomElement().dataset.phase, 'chance');
    assert.equal(view.getDomElement().getAttribute('aria-live'), 'polite');
    assert.ok(view.getDomElement().classList.contains('is-viewport-fixed'), 'capture verdict remains on screen when the battle column is scrolled away');
    assert.equal(view.getDomElement().style.getPropertyValue('--pw-capture-x'), '50%');
    assert.equal(view.getDomElement().style.getPropertyValue('--pw-capture-y'), '40%');

    panel.getBoundingClientRect = () => ({ left: 300, top: 65, right: 900, bottom: 465, width: 600, height: 400 });
    card.getBoundingClientRect = () => ({ left: 450, top: 120, right: 650, bottom: 220, width: 200, height: 100 });
    preferences.setAnimationPreference(AnimationPreferences.CAPTURE, false);
    EventBus.getInstance().dispatch(new CaptureAttemptResolvedEvent({ ...result, caught: false }));
    assert.equal(view.isVisible(), true, 'the result stays visible when motion is disabled');
    assert.equal(view.getDomElement().dataset.phase, 'result');
    assert.ok(view.getDomElement().classList.contains('is-motion-disabled'));
    assert.ok(!view.getDomElement().classList.contains('is-viewport-fixed'), 'a visible opponent uses its in-panel position');
    assert.equal(view.getDomElement().style.getPropertyValue('--pw-capture-x'), '250px');
    assert.equal(view.getDomElement().style.getPropertyValue('--pw-capture-y'), '105px');
    preferences.setAnimationPreference(AnimationPreferences.CAPTURE, true);
    view.destroy();
    panel.remove();
  });

  test('LanguageSection offers FR and EN buttons instead of a dropdown', () => {
    const section = new LanguageSection();
    section.refresh();
    const dom = section.getDomElement();
    assert.equal(dom.querySelectorAll('button').length, 2);
    assert.equal(dom.querySelectorAll('select').length, 0);
    assert.ok(dom.querySelectorAll('button').some((button) => button.getAttribute('aria-pressed') === 'true'));
  });

  test('BagItemRow ignores the second click of a double-click', () => {
    let selections = 0;
    const row = new BagItemRow({ itemId: 'potion', name: 'Potion', quantity: 1, holder: null }, false, () => selections++);
    row.getDomElement().dispatchEvent(fakeEvent('click', { bubbles: true, detail: 1 }));
    row.getDomElement().dispatchEvent(fakeEvent('click', { bubbles: true, detail: 2 }));
    assert.equal(selections, 1);
  });

  test('mobile Bag FilterBar toggles collapsed filters with localized accessible labels', () => {
    const bar = new FilterBar({
      className: 'inv-toolbar',
      mobileDrawer: true,
      chips: [{ text: 'Items', count: 2, active: true, onClick: () => {} }]
    });
    const toggle = bar.getDomElement().querySelector('.pw-drawer-toggle');
    assert.ok(toggle, 'mobile drawer toggle is rendered');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    const collapsedLabel = toggle.getAttribute('aria-label');
    assert.ok(collapsedLabel, 'toggle has a localized accessible name');
    toggle.click();
    assert.ok(bar.getDomElement().classList.contains('mobile-drawer-open'));
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.ok(toggle.getAttribute('aria-label') !== collapsedLabel, 'the accessible name describes the new action');
    toggle.click();
    assert.ok(!bar.getDomElement().classList.contains('mobile-drawer-open'));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    bar.destroy();
  });

  test('UIFullscreenPanel can preserve content scroll while rebuilding', () => {
    const panel = new UIFullscreenPanel({ id: 'test-fullscreen-panel', title: 'Test panel' });
    panel.setContent([new UIText({ text: 'before' })]);
    panel._body.getDomElement().scrollTop = 64;
    panel.setContent([new UIText({ text: 'after' })], { preserveScroll: true });
    assert.equal(panel._body.getDomElement().scrollTop, 64);
  });

  test('UIFullscreenPanel footer stays outside the scrollable body and hides when empty', () => {
    const panel = new UIFullscreenPanel({ id: 'test-fullscreen-footer', title: 'Test panel' });
    const container = panel.getChildren()[0];
    assert.equal(container.getChildren()[3], panel._footer, 'the fixed footer follows the body in the modal shell');
    assert.ok(panel._footer.getDomElement().classList.contains('is-hidden'), 'an empty footer takes no space');
    panel.setFooter([new UIButton({ text: 'Action' })]);
    assert.ok(!panel._footer.getDomElement().classList.contains('is-hidden'), 'footer appears when it has actions');
    assert.equal(panel._footer.getDomElement().textContent, 'Action');
    panel.setFooter([]);
    assert.ok(panel._footer.getDomElement().classList.contains('is-hidden'), 'clearing actions hides the footer');
    panel.destroy();
  });

  test('Guide opens from a dashboard help button and renders the translated type chart', () => {
    const guide = new GuidePanel();
    const mapPanel = new DraggablePanel({
      id: WindowIds.LOCATION,
      column: DashboardColumns.CENTER,
      title: 'Location'
    });
    const helpButton = mapPanel.getDomElement().querySelectorAll('button')
      .find((button) => button.classList.contains('pw-win-help-btn'));

    assert.ok(helpButton, 'dashboard help button');
    helpButton.click();
    assert.ok(guide.isOpen(), 'guide opened from help button');
    assert.equal(guide._sectionId, GuideSectionIds.MAP);
    assert.ok(guide.getDomElement().querySelector('.pw-guide-detail-head'), 'contextual section detail');

    guide.open({ section: GuideSectionIds.COMBAT });
    const grid = guide.getDomElement().querySelector('.pw-guide-type-grid');
    assert.ok(grid, 'combat type chart');
    assert.equal(grid.querySelectorAll('.pw-guide-type-cell').length, 18 * 18, 'complete type matchup matrix');
    const firstCell = grid.querySelector('.pw-guide-type-cell');
    assert.ok(firstCell && firstCell.getAttribute('title'), 'localized chart tooltip');

    guide.close();
    guide.destroy();
    mapPanel.destroy();
  });

  test('Pokédex uses reference-style progress, filters, silhouettes, and a read-only save view', () => {
    const saveSystem = SaveSystem.getInstance();
    const previous = saveSystem.getCurrentSave();
    const save = SaveData.createNew('Pokédex panel fixture', 'charmander');
    save.pokedex.markCaught('pidgey', true);
    save.pokedex.markSeen('rattata');
    saveSystem.setCurrentSave(save);
    const before = JSON.stringify(save.serialize());
    const panel = new PokedexPanel();
    try {
      panel.open();
      const dom = panel.getDomElement();
      assert.ok(dom.querySelector('.pw-pokedex-overview'), 'summary and regional completion are fixed above the grid');
      assert.equal(dom.querySelectorAll('.pw-pokedex-entry').length, 151, 'the fresh save sees only the accessible Kanto dex');
      assert.ok(dom.querySelector('.pw-pokedex-grid.pw-pokemon-grid'), 'Pokédex uses the shared Pokémon grid container');
      assert.equal(dom.querySelectorAll('.pw-pokemon-grid-sprite').length, 151, 'each Dex tile uses the shared sprite primitive');
      const unseenEntry = dom.querySelector('.pw-pokedex-entry.is-unseen');
      assert.ok(unseenEntry?.classList.contains('pw-pokemon-grid-entry') && unseenEntry.classList.contains('dex-entry') && unseenEntry.classList.contains('unknown'), 'the shared full tile widget keeps the reference circular tile state');
      assert.equal(unseenEntry?.querySelector('.dex-number')?.textContent, '#001', 'the Dex number sits on the circle as in the original');
      assert.ok(unseenEntry?.querySelector('.dex-sprite')?.querySelector('.pw-poke-circle-wrap'), 'the circle uses the shared 72px Pokémon sprite');
      assert.equal(dom.querySelector('.pw-pokedex-name'), null, 'species names are not added beneath the original Dex tile');
      const seenEntry = dom.querySelector('.pw-pokedex-entry.seen');
      assert.ok(seenEntry?.classList.contains('is-seen'), 'seen-but-not-caught entries use the reference silhouette state');
      assert.equal(dom.querySelectorAll('.pw-pokedex-entry.is-caught').length, 2, 'caught species use the full-color state');
      assert.equal(dom.querySelectorAll('.pw-pokedex-entry.is-shiny').length, 1, 'shiny entries have a dedicated state');
      const regionOptions = [...dom.querySelectorAll('select')[0].querySelectorAll('option')].map((option) => option.value);
      assert.deepEqual(regionOptions, ['all', 'kanto'], 'region options follow the accessible Pokédex');
      assert.equal(dom.querySelectorAll('select').length, 4, 'type, rank, and sort controls match the reference toolbar');

      const drawerToggle = dom.querySelector('.pw-drawer-toggle');
      assert.equal(drawerToggle.getAttribute('aria-label'), t('pokedex_filters_open'));
      drawerToggle.click();
      assert.equal(drawerToggle.getAttribute('aria-label'), t('pokedex_filters_close'));
      drawerToggle.click();

      const shinyChip = [...dom.querySelectorAll('.pw-chip')].find((button) => button.textContent.trim() === t('box_filter_shiny_only'));
      assert.ok(shinyChip, 'the shiny-only reference filter is visible');
      shinyChip.click();
      assert.equal(dom.querySelectorAll('.pw-pokedex-entry').length, 1, 'shiny filter narrows the grid');

      dom.querySelector('.pw-filter-reset').click();
      const search = dom.querySelector('.pw-filter-input');
      search.value = 'pidgey';
      search.dispatchEvent(fakeEvent('input', { bubbles: true }));
      assert.equal(dom.querySelectorAll('.pw-pokedex-entry').length, 1, 'search filters by the stable species id');
      assert.equal(JSON.stringify(save.serialize()), before, 'the view-only filters do not mutate or persist save data');
    } finally {
      panel.close();
      panel.destroy();
      saveSystem.setCurrentSave(previous);
    }
  });

  test('shortcut icons resolve and Market/Atoll appear only after their reference access gates', () => {
    assert.ok(SHORTCUTS.every((shortcut) => IconRegistry.has(shortcut.icon)), 'each configured shortcut has a registered icon');
    const marketShortcut = SHORTCUTS.find((shortcut) => shortcut.id === ShortcutIds.MARKET);
    const atollShortcut = SHORTCUTS.find((shortcut) => shortcut.id === ShortcutIds.ATOLL);
    assert.ok(marketShortcut && marketShortcut.modalId === ModalIds.MARKET && marketShortcut.requiresMarketGate, 'Market opens its real screen behind the unchanged reference gate');
    assert.ok(atollShortcut && atollShortcut.modalId === null && atollShortcut.requiresChampionTitle, 'Atoll never routes to a missing screen');

    const save = SaveSystem.getInstance().createNewSave('Shortcut fixture', 'bulbasaur');
    const access = FeatureAccessSystem.getInstance();
    access.refresh('shortcuts-before-league', { force: true, persist: false });
    const panel = new ShortcutsPanel(DashboardColumns.RIGHT);
    const findButton = (id) => panel.getDomElement().querySelectorAll('.shortcut-action-btn')
      .find((button) => button.dataset.panel === id);
    assert.equal(findButton(ShortcutIds.MARKET), undefined, 'Market is hidden before the first badge in Kanto');
    assert.equal(findButton(ShortcutIds.ATOLL), undefined, 'Atoll is hidden before its original league gate');

    save.player.earnBadge('brock');
    const marketButton = findButton(ShortcutIds.MARKET);
    assert.ok(marketButton, 'Market appears after the first Kanto badge');
    assert.ok(marketButton.querySelector('svg'), 'the shortcut renders its icon glyph');
    assert.ok(marketButton.classList.contains('pw-button--align-left'), 'shortcut labels align like the original action list');

    save.statistics.recordLeague('kanto');
    access.refresh('shortcuts-after-league', { force: true, persist: false });
    const atollButton = findButton(ShortcutIds.ATOLL);
    assert.ok(atollButton, 'Atoll appears once the league access fact changes');
    assert.ok(atollButton.querySelector('svg'), 'the shortcut renders its icon glyph');
    panel.destroy();
  });

  test('PC filter toolbar exposes favorites, locked states, and only the reference E–S rank options', () => {
    SaveSystem.getInstance().createNewSave('Box toolbar fixture', 'bulbasaur');
    const panel = new BoxPanel();
    panel.open();
    const dom = panel.getDomElement();
    const buttons = [...dom.querySelectorAll('button')].map((button) => button.textContent.trim());
    const toolbar = dom.querySelector('.pw-box-filterbar');
    assert.ok(toolbar, 'the PC filter and category controls share the fullscreen filter area');
    const sortChips = [...toolbar.querySelectorAll('.usm-sort-btn')];
    assert.equal(sortChips.length, 6, 'all sort categories live in the same toolbar as filters');
    assert.equal(sortChips[0].dataset.sort, 'id');
    assert.ok(sortChips[0].classList.contains('active'), 'the initial sort category is visibly selected');
    assert.equal(dom.querySelector('.pw-box-sort-row'), null, 'there is no second detached sort bar');
    sortChips.find((chip) => chip.dataset.sort === 'level').click();
    const sortedToolbar = dom.querySelector('.pw-box-filterbar');
    const activeSort = [...sortedToolbar.querySelectorAll('.usm-sort-btn')].find((chip) => chip.classList.contains('active'));
    assert.equal(activeSort?.dataset.sort, 'level', 'sorting updates the active category in the unified toolbar');
    assert.equal(activeSort?.dataset.dir, '▼', 'the active sort category exposes the descending direction marker');
    assert.ok(buttons.includes(t('box_filter_favorite_only')), 'favorites have a direct toolbar filter');
    assert.ok(buttons.includes(t('box_filter_locked_only')), 'locked Pokémon have a direct toolbar filter');
    const fieldLabels = [...dom.querySelectorAll('.pw-filter-label')].map((label) => label.textContent.trim());
    assert.ok(!fieldLabels.includes(t('box_filter_favorite')), 'favorites use the reference toggle instead of an extra inverse dropdown');
    assert.ok(!fieldLabels.includes(t('box_filter_locked')), 'locked state uses the reference toggle instead of an extra inverse dropdown');
    const rankSelect = [...dom.querySelectorAll('select')].find((selectElement) =>
      [...selectElement.querySelectorAll('option')].some((option) => option.value === 'S')
    );
    assert.ok(rankSelect, 'the rank filter exposes the main-reference ranks');
    assert.deepEqual([...rankSelect.querySelectorAll('option')].map((option) => option.value), ['all', 'E', 'D', 'C', 'B', 'A', 'S']);
    assert.equal(rankSelect.querySelector('option[value="SS"]'), null, 'the extra SS filter is not shown');
    rankSelect.value = 'S';
    rankSelect.dispatchEvent(fakeEvent('change', { bubbles: true }));
    assert.equal(SaveSystem.getInstance().getCurrentSave().boxFilters.get('rank'), 'S');
    panel.close();
    panel.destroy();
  });

  test('LocationPanel renders lore, unlock progress, encounters, Pokédex status and route drops', () => {
    const save = SaveSystem.getInstance().createNewSave('Location fixture', 'charmander');
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    const dom = panel.getDomElement();
    const palletNpcActions = [...dom.querySelectorAll('.pw-loc-action-btn')]
      .filter((button) => button.getAttribute('data-npc-id'));
    assert.equal(palletNpcActions.length, 2, 'the town exposes one action per local NPC instead of a generic talk tile');
    const professorAction = palletNpcActions.find((button) => button.getAttribute('data-npc-id') === 'kanto_pallet_npc_01');
    assert.ok(professorAction, 'the Professor retains a stable NPC identity');
    assert.equal(dom.querySelector('.pw-loc-overview-meta'), null, 'location metadata tags are removed from the overview');
    assert.equal(dom.querySelector('.pw-loc-meta-chip'), null, 'the overview only centers the large location name');
    let npcRequest = null;
    const onNpcRequest = (event) => { npcRequest = event; };
    const unsubscribeNpcRequest = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, onNpcRequest);
    try {
      professorAction.click();
    } finally {
      unsubscribeNpcRequest();
    }
    assert.equal(npcRequest?.modalId, ModalIds.NPC_TALK);
    assert.equal(npcRequest?.params.npcId, 'kanto_pallet_npc_01', 'the location action opens the selected NPC directly');
    assert.ok(LocationSystem.getInstance().travelTo('route1'), 'the starting route is reachable');
    assert.ok(dom.textContent.includes('Route 1'), 'location overview is refreshed after travel');
    assert.ok(dom.querySelectorAll('.pw-loc-wild-card').length > 0, 'encounter cards are rendered');
    assert.ok(dom.querySelectorAll('.pw-caught-ball').length > 0, 'each encounter shows its Pokédex state');
    assert.ok(dom.querySelectorAll('.pw-loc-drop-card').length > 0, 'location-specific drops render without missing widget imports');
    const overviewBeforeTick = dom.querySelector('.pw-loc-overview');
    EventBus.getInstance().dispatch(new RoamingRotationTickEvent(Date.now()));
    assert.equal(dom.querySelector('.pw-loc-overview'), overviewBeforeTick, 'a one-second roaming timer tick does not rebuild the whole location panel');

    const localization = LocalizationManager.getInstance();
    const previousLanguage = localization.currentLang;
    for (const language of ['fr', 'en']) {
      localization.setLanguage(language);
      const loreText = t('lore.route1.text');
      assert.ok(dom.querySelector('.pw-loc-lore-text')?.textContent.includes(loreText), `${language} lore updates with the UI language`);
    }
    localization.setLanguage(previousLanguage);

    for (let index = 0; index < 3; index++) save.statistics.recordWildWin('route1');
    EventBus.getInstance().dispatch(new PokemonDefeatedEvent('rattata', 3, 'route1', true));
    const progress = dom.querySelector('.pw-loc-unlock-tip');
    assert.ok(progress, 'the route shows progress while its next area is gated by wins');
    assert.equal(progress.getAttribute('data-current-wins'), '3');
    assert.equal(progress.getAttribute('data-required-wins'), '10');
    assert.equal(progress.querySelector('.pw-loc-unlock-fill').getAttribute('data-progress-percent'), '30');
    panel.destroy();
  });

  test('battle summary follows main single-column order and width preset', () => {
    SaveSystem.getInstance().createNewSave('Summary fixture', 'charmander');
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    assert.ok(battle.startBattle('route1'), 'summary fixture can start a route encounter');
    const modal = new BattleSummaryModal();
    assert.equal(modal.getSize(), 'md', 'the summary uses the medium modal preset with a reference-width override');
    modal.open();
    let dom = modal.getDomElement();
    const panel = dom.querySelector('#battle-summary-inner');
    assert.ok(panel?.classList.contains('pw-battle-summary-shell'), 'the summary panel has its dedicated width class');
    const layout = dom.querySelector('.pw-battle-summary-layout');
    assert.ok(layout, 'summary content is rendered in one ordered stack');
    assert.equal(layout.querySelector('.pw-battle-summary-column--combat'), null, 'combat is not split into a side column');
    assert.equal(layout.querySelector('.pw-battle-summary-column--loot'), null, 'loot is not split into a side column');
    assert.deepEqual(
      Array.from(layout.querySelectorAll('.battle-summary-section-title')).map((node) => node.textContent.trim()),
      [t('battle_team_damage_title'), t('captured_pokemon_title'), t('found_items_title')],
      'damage, captures and items follow the reference summary order without extra section headings'
    );

    battle.endBattle(false);
    dom = modal.getDomElement();
    assert.ok(dom.querySelector('.pw-battle-summary-layout'), 'the read-only modal refreshes from the ended-run snapshot');
    modal.close();
    modal.destroy();
  });

  test('UIPanel puts children in its body', () => {
    const panel = new UIPanel({ id: 'test-panel', title: 'T', bodyId: 'test-body' });
    panel.addChild(new UIText({ text: 'inside' }));
    const body = panel.getDomElement().querySelector('#test-body');
    assert.ok(body && body.textContent.includes('inside'));
  });

  test('AchievementsPanel tracks the next regional Pokédex tier', () => {
    const saveSystem = SaveSystem.getInstance();
    const previousSave = saveSystem.getCurrentSave();
    saveSystem.setCurrentSave(SaveData.createNew('Achievement tracker', 'charmander'));
    const panel = new AchievementsPanel(DashboardColumns.LEFT);
    try {
      const dom = panel.getDomElement();
      const stats = [...dom.querySelector('.pw-ach-stats-text').children].map((node) => node.textContent);
      assert.deepEqual(stats, [
        t('value_over_max', { value: 1, max: 25 }),
        t('percent_value', { value: 4 })
      ]);
      assert.equal(dom.querySelector('.pw-rank-chip')?.textContent, t('ach_rank_locked'));
      assert.ok(dom.querySelector('.pw-rank-chip')?.classList.contains('rank-none'));
      assert.equal(dom.querySelector('.pw-ach-pinned-dropdown')?.querySelector('.pw-dropdown-select')?.children.length, 4);
    } finally {
      panel.destroy();
      saveSystem.setCurrentSave(previousSave);
    }
  });

  test('SaveCard renders a save summary', () => {
    const save = SaveSystem.getInstance().createNewSave('Misty', 'squirtle');
    let clicked = false;
    const card = new SaveCard({ save, mode: 'menu', onClick: () => { clicked = true; } });
    assert.ok(card.getDomElement().textContent.includes('Misty'));
    card.getDomElement().dispatchEvent(fakeEvent('click', { bubbles: true }));
    assert.ok(clicked);
  });
});

describe('Panels', (test) => {
  const dir = path.resolve('src/panels');
  const skip = new Set();
  for (const file of fs.readdirSync(dir).filter((f) => (f.endsWith('Panel.js') || f.endsWith('Modal.js')) && !skip.has(f))) {
    test(`${file} builds without errors`, async () => {
      const module = await import(`../src/panels/${file}`);
      const PanelClass = module[file.replace('.js', '')];
      const panel = new PanelClass(DashboardColumns.CENTER);
      try {
        const dom = panel.getDomElement();
        const hasId = (node) => !!node.id || node.children.some(hasId);
        assert.ok(hasId(dom), 'panel exposes a stable id for CSS');
        assert.ok(panel.getDomElement().children.length > 0, 'panel has content');
      } finally { panel.destroy(); }
    });
  }
});
