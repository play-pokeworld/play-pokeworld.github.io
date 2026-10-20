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
import { UIFullscreenPanel } from '../src/ui/UIFullscreenPanel.js';
import { GuidePanel } from '../src/panels/fullscreen/GuidePanel.js';
import { DraggablePanel } from '../src/ui/DraggablePanel.js';
import { GuideSectionIds } from '../src/config/GuideSections.js';
import { IconRegistry } from '../src/ui/icons/IconRegistry.js';
import { SHORTCUTS, ShortcutIds } from '../src/config/Shortcuts.js';
import { ShortcutsPanel } from '../src/panels/ShortcutsPanel.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { BattleSummaryModal } from '../src/panels/BattleSummaryModal.js';
import { CaptureAnimationView } from '../src/ui/CaptureAnimationView.js';
import { PokemonBackgroundView } from '../src/ui/PokemonBackgroundView.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { CaptureAttemptResolvedEvent } from '../src/core/events/CaptureAttemptResolvedEvent.js';
import { AnimationPreferences } from '../src/config/AnimationPreferences.js';
import { PreferencesSystem } from '../src/systems/PreferencesSystem.js';
import { EventBus } from '../src/core/EventBus.js';

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
    const view = new PokemonBackgroundView();
    try {
      assert.equal(view.getChildren().length, 5, 'the first captured Pokémon shows the minimum walkers');
      for (const species of ['bulbasaur', 'squirtle', 'pidgey', 'rattata', 'caterpie', 'weedle', 'pikachu', 'geodude', 'abra']) {
        save.pokedex.markCaught(species);
      }
      assert.equal(save.pokedex.getCaughtCount(), 10);
      assert.equal(view.getChildren().length, 6, 'each ten captures adds a walker');
      assert.equal(view.getDomElement().getAttribute('aria-hidden'), 'true');
    } finally {
      view.destroy();
      saveSystem.setCurrentSave(previous);
    }
  });

  test('capture verdict overlay follows its preference and clears its timers on destroy', () => {
    const preferences = PreferencesSystem.getInstance();
    preferences.setAnimationPreference(AnimationPreferences.CAPTURE, true);
    const view = new CaptureAnimationView();
    document.body.appendChild(view.getDomElement());
    const result = {
      speciesId: 'rattata', form: '', name: 'Rattata', shiny: false,
      ballId: 'pokeball', rate: 10, caught: true, duplicate: false
    };
    EventBus.getInstance().dispatch(new CaptureAttemptResolvedEvent(result));
    assert.equal(view.isVisible(), true);
    assert.equal(view.getDomElement().dataset.phase, 'chance');
    assert.equal(view.getDomElement().getAttribute('aria-live'), 'polite');

    preferences.setAnimationPreference(AnimationPreferences.CAPTURE, false);
    EventBus.getInstance().dispatch(new CaptureAttemptResolvedEvent({ ...result, caught: false }));
    assert.equal(view.isVisible(), true, 'the result stays visible when motion is disabled');
    assert.equal(view.getDomElement().dataset.phase, 'result');
    assert.ok(view.getDomElement().classList.contains('is-motion-disabled'));
    preferences.setAnimationPreference(AnimationPreferences.CAPTURE, true);
    view.destroy();
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

  test('UIFullscreenPanel can preserve content scroll while rebuilding', () => {
    const panel = new UIFullscreenPanel({ id: 'test-fullscreen-panel', title: 'Test panel' });
    panel.setContent([new UIText({ text: 'before' })]);
    panel._body.getDomElement().scrollTop = 64;
    panel.setContent([new UIText({ text: 'after' })], { preserveScroll: true });
    assert.equal(panel._body.getDomElement().scrollTop, 64);
  });

  test('Guide opens from a dashboard help button and renders the translated type chart', () => {
    const guide = new GuidePanel();
    const mapPanel = new DraggablePanel({
      id: WindowIds.MAP,
      column: DashboardColumns.CENTER,
      title: 'Map'
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

  test('shortcut icons resolve and Atoll appears only after its access gate', () => {
    assert.ok(SHORTCUTS.every((shortcut) => IconRegistry.has(shortcut.icon)), 'each configured shortcut has a registered icon');
    const atollShortcut = SHORTCUTS.find((shortcut) => shortcut.id === ShortcutIds.ATOLL);
    assert.ok(atollShortcut && atollShortcut.modalId === null && atollShortcut.requiresChampionTitle, 'Atoll never routes to a missing screen');

    const save = SaveSystem.getInstance().createNewSave('Shortcut fixture', 'bulbasaur');
    const access = FeatureAccessSystem.getInstance();
    access.refresh('shortcuts-before-league', { force: true, persist: false });
    const panel = new ShortcutsPanel(DashboardColumns.RIGHT);
    const findAtollButton = () => panel.getDomElement().querySelectorAll('.shortcut-action-btn')
      .find((button) => button.dataset.panel === ShortcutIds.ATOLL);
    assert.equal(findAtollButton(), undefined, 'Atoll is hidden before its original league gate');

    save.statistics.recordLeague('kanto');
    access.refresh('shortcuts-after-league', { force: true, persist: false });
    const atollButton = findAtollButton();
    assert.ok(atollButton, 'Atoll appears once the league access fact changes');
    assert.ok(atollButton.querySelector('svg'), 'the shortcut renders its icon glyph');
    panel.destroy();
  });

  test('LocationPanel renders regional encounters, Pokédex status and route drops', () => {
    SaveSystem.getInstance().createNewSave('Location fixture', 'charmander');
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    assert.ok(LocationSystem.getInstance().travelTo('route1'), 'the starting route is reachable');
    const dom = panel.getDomElement();
    assert.ok(dom.textContent.includes('Route 1'), 'location overview is refreshed after travel');
    assert.ok(dom.querySelectorAll('.pw-loc-wild-card').length > 0, 'encounter cards are rendered');
    assert.ok(dom.querySelectorAll('.pw-caught-ball').length > 0, 'each encounter shows its Pokédex state');
    assert.ok(dom.querySelectorAll('.pw-loc-drop-card').length > 0, 'location-specific drops render without missing widget imports');
    panel.destroy();
  });

  test('battle summary groups combat and loot into separate compact columns', () => {
    SaveSystem.getInstance().createNewSave('Summary fixture', 'charmander');
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    assert.ok(battle.startBattle('route1'), 'summary fixture can start a route encounter');
    const modal = new BattleSummaryModal();
    modal.open();
    let dom = modal.getDomElement();
    const layout = dom.querySelector('.pw-battle-summary-layout');
    assert.ok(layout, 'summary uses its two-column presentation');
    assert.ok(layout.querySelector('.pw-battle-summary-column--combat'), 'combat metrics stay in their own column');
    const loot = layout.querySelector('.pw-battle-summary-column--loot');
    assert.ok(loot, 'capture and item results have a separate loot column');
    assert.equal(loot.querySelectorAll('.battle-summary-section-title').length, 2, 'captures and items keep distinct section headings');

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
      const dom = panel.getDomElement();
      const hasId = (node) => !!node.id || node.children.some(hasId);
      assert.ok(hasId(dom), 'panel exposes a stable id for CSS');
      assert.ok(panel.getDomElement().children.length > 0, 'panel has content');
    });
  }
});
