/**
 * @file TutorialHighlight.test.js
 * @brief The guided tutorial always points at a real control, follows the player's place, and only
 *        ever *shows* the step (it never plays it).
 */
import { describe, assert } from './TestRunner.js';
import { TutorialRules } from '../src/config/TutorialRules.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { PokeballsPanel } from '../src/panels/PokeballsPanel.js';
import { t } from '../src/localization/LocalizationManager.js';
import {
  TUTORIAL_TARGET_CLASS,
  tutorialReveal,
  tutorialTargetSelectors,
  resolveTutorialTargets,
  applyTutorialHighlight,
  revealTutorialStep,
  clearTutorialHighlight
} from '../src/ui/TutorialHighlight.js';

/** @param {string} id @param {string} [tagName] @returns {Object} a detached-then-attached node */
function mount(id, tagName = 'div') {
  const node = document.createElement(tagName);
  node.id = id;
  document.body.appendChild(node);
  return node;
}

/** @param {string} locationId */
function standOn(locationId) {
  const save = SaveSystem.getInstance().getCurrentSave() ?? SaveData.createNew('Tutorial targets', 'charmander');
  save.player.location = locationId;
  save.player.region = 'kanto';
  SaveSystem.getInstance().setCurrentSave(save);
  return save;
}

describe('Tutorial highlight', (test) => {
  test('every tutorial step declares a reveal that resolves to at least one control', () => {
    standOn('pallet');
    for (const step of TutorialRules.STEPS) {
      const selectors = tutorialTargetSelectors(step.id);
      assert.ok(selectors.length > 0, `step ${step.id} has no highlight target`);
      assert.equal(selectors[selectors.length - 1].startsWith('#'), true, `step ${step.id} falls back on a window`);
      assert.ok(tutorialReveal(step.id).label.length > 0, `step ${step.id} has an action label`);
    }
    assert.equal(tutorialTargetSelectors('unknown_step').length, 0, 'unknown steps highlight nothing');
  });

  test('a travel step points at the map first, then at the action tile of the place itself', () => {
    standOn('pallet');
    const away = tutorialReveal('route1_battles');
    assert.ok(away.selectors[0].includes('.loc-node[data-node-id="route1"]'), `map node first (${away.selectors[0]})`);
    assert.equal(away.label, t('tutorial_show_place', { place: t('location.route1') }), 'the button names the place');

    standOn('route1');
    const here = tutorialReveal('route1_battles');
    assert.ok(here.selectors[0].includes('[data-tutorial="battle"]'), `the Explore tile first (${here.selectors[0]})`);
    assert.equal(here.label, t('tutorial_show_action', { action: t('explore_btn') }), 'the button names the tile');
  });

  test('the ball step points at the ball cell, never at the filter settings', () => {
    standOn('pallet');
    const reveal = tutorialReveal('set_pokeball_filter');
    assert.ok(reveal.selectors[0].includes('[data-filter="new"]'), `the "new" row (${reveal.selectors[0]})`);
    assert.ok(reveal.selectors[0].includes('[data-tutorial="ball-slot"]'), 'the ball cell');
    assert.ok(!reveal.selectors.some((selector) => selector.includes('ball-filters')), 'the gear is never targeted');

    clearTutorialHighlight();
    const window = mount('win-pokeballs');
    const gear = document.createElement('button');
    gear.dataset.tutorial = 'ball-filters';
    window.appendChild(gear);
    const row = document.createElement('div');
    row.dataset.filter = 'new';
    const ballCell = document.createElement('div');
    ballCell.dataset.tutorial = 'ball-slot';
    row.appendChild(ballCell);
    window.appendChild(row);

    const targets = resolveTutorialTargets('set_pokeball_filter');
    assert.ok(targets[0] === ballCell, 'the grey ball of the "new" row is the target');
    assert.ok(!targets.includes(gear), 'the gear that edits the filter rules is never highlighted');
    document.body.removeChild(window);
    clearTutorialHighlight();
  });

  test('the halo falls back to the window when the precise control is not mounted', () => {
    standOn('pallet');
    clearTutorialHighlight();
    const window = mount('win-pokeballs');
    const fallback = resolveTutorialTargets('set_pokeball_filter');
    assert.equal(fallback.length, 1, 'one fallback target');
    assert.ok(fallback[0] === window, 'the window itself is highlighted');
    document.body.removeChild(window);
    assert.equal(resolveTutorialTargets('set_pokeball_filter').length, 0, 'nothing mounted, no target');
    clearTutorialHighlight();
  });

  test('the sheet step points at the team card, whose info button is hidden on desktop', () => {
    standOn('pallet');
    clearTutorialHighlight();
    const team = mount('win-team');
    const card = document.createElement('div');
    card.className = 'pw-poke-card';
    card.dataset.index = '0';
    team.appendChild(card);

    const targets = resolveTutorialTargets('open_poke_sheet');
    assert.ok(targets[0] === card, 'the card is the target on every device');
    document.body.removeChild(team);
    clearTutorialHighlight();
  });

  test('applying a step moves the halo and never leaves two steps lit at once', () => {
    standOn('pallet');
    clearTutorialHighlight();
    const team = mount('win-team');
    const currency = mount('win-currency');

    assert.equal(applyTutorialHighlight({ id: 'open_poke_sheet' }), 1);
    assert.ok(team.classList.contains(TUTORIAL_TARGET_CLASS), 'team window highlighted for the sheet step');

    assert.equal(applyTutorialHighlight({ id: 'dungeon_intro' }), 1);
    assert.ok(currency.classList.contains(TUTORIAL_TARGET_CLASS), 'currency window highlighted for tokens');
    assert.ok(!team.classList.contains(TUTORIAL_TARGET_CLASS), 'previous step is cleared');

    assert.equal(applyTutorialHighlight(null), 0, 'a finished tutorial highlights nothing');
    assert.ok(!currency.classList.contains(TUTORIAL_TARGET_CLASS), 'everything is cleared');

    document.body.removeChild(team);
    document.body.removeChild(currency);
  });

  test('re-applying the same step is idempotent (the pulse does not restart)', () => {
    standOn('pallet');
    clearTutorialHighlight();
    const team = mount('win-team');
    assert.equal(applyTutorialHighlight({ id: 'open_poke_sheet' }), 1);
    const before = team.classList.value;
    assert.equal(applyTutorialHighlight({ id: 'open_poke_sheet' }), 1);
    assert.equal(team.classList.value, before, 'class list unchanged');
    document.body.removeChild(team);
    clearTutorialHighlight();
  });

  test('the action button shows the control and never plays the step for the player', () => {
    standOn('pallet');
    clearTutorialHighlight();
    const shortcuts = mount('win-shortcuts');
    const bagButton = document.createElement('button');
    bagButton.className = 'shortcut-action-btn';
    bagButton.dataset.panel = 'inventory';
    shortcuts.appendChild(bagButton);

    const scrolled = [];
    bagButton.scrollIntoView = () => scrolled.push('bag');

    assert.equal(revealTutorialStep('open_bag'), true, 'the step has something to show');
    assert.deepEqual(scrolled, ['bag'], 'the control is brought into view');
    assert.ok(bagButton.classList.contains(TUTORIAL_TARGET_CLASS), 'and highlighted');

    // Nothing to show (window closed and nothing mounted): the call is a harmless no-op.
    document.body.removeChild(shortcuts);
    clearTutorialHighlight();
    assert.equal(revealTutorialStep('open_bag'), false);
  });

  test('the real Poké Balls window carries the hooks the ball step points at', () => {
    clearTutorialHighlight();
    SaveSystem.getInstance().setCurrentSave(SaveData.createNew('Tutorial highlight hooks', 'charmander'));
    const panel = new PokeballsPanel(DashboardColumns.RIGHT);
    document.body.appendChild(panel.getDomElement());
    try {
      const targets = resolveTutorialTargets('set_pokeball_filter');
      assert.ok(targets.length > 0, 'the step resolves inside the real window');
      assert.equal(targets[0].dataset.tutorial, 'ball-slot', 'the halo is on the ball cell, not on the gear');
      assert.equal(targets[0].closest('.pw-ball-row').dataset.filter, 'new', 'and on the "new" row');
    } finally {
      panel.destroy?.();
    }
  });
});
