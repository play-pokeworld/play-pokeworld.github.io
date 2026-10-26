/**
 * @file MapLocationRepairs.test.js
 * @brief Regression coverage for map colors, the map legend, route groups, quest visibility and halos.
 */
import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem, LocationMapStatuses } from '../src/systems/LocationSystem.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { RoamingSystem } from '../src/systems/RoamingSystem.js';
import { RoamingRules } from '../src/config/RoamingRules.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { QuestCategories } from '../src/data/quests/QuestCategories.js';
import { MapPanel } from '../src/panels/MapPanel.js';
import { MapHelpModal } from '../src/panels/MapHelpModal.js';
import { GuidePanel } from '../src/panels/fullscreen/GuidePanel.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { StoryPanel } from '../src/panels/StoryPanel.js';
import { NpcTalkModal } from '../src/panels/NpcTalkModal.js';
import { LocationActions } from '../src/panels/components/LocationActions.js';
import { NpcDirectory } from '../src/data/world/NpcDirectory.js';
import { REPEATABLE_BOARD_HELP_LINES } from '../src/config/NpcDialogueRules.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';

describe('Map and location corrections', (test) => {
  test('map color status follows main priority and uses complete route-group capture state', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Map color regression', 'charmander');
    save.player.location = 'pallet';
    save.player.region = 'kanto';
    saves.setCurrentSave(save);

    const locations = LocationDB.getInstance();
    const locationSystem = LocationSystem.getInstance();
    const routeOneSpecies = [...new Set(locations.getEncountersForGroup('route1').map((entry) => entry.species))];
    const noRoamerAtRouteOne = RoamingRules.ROTATION_MS;

    try {
      assert.equal(RoamingSystem.getSpeciesAt('route1', noRoamerAtRouteOne), null, 'fixture avoids the roaming-color priority');
      assert.equal(locationSystem.getMapColorStatus('route1', noRoamerAtRouteOne), LocationMapStatuses.CATCH);
      assert.equal(locationSystem.getMapColorStatus('route2', noRoamerAtRouteOne), LocationMapStatuses.LOCKED);

      for (const speciesId of routeOneSpecies) save.pokedex.markCaught(speciesId, false, { deferSave: true });
      assert.equal(locationSystem.getMapColorStatus('route1', noRoamerAtRouteOne), LocationMapStatuses.SHINY);
      for (const speciesId of routeOneSpecies) save.pokedex.markCaught(speciesId, true, { deferSave: true });
      assert.equal(locationSystem.getMapColorStatus('route1', noRoamerAtRouteOne), LocationMapStatuses.COMPLETE);

      save.quests.activate('main.2');
      assert.equal(locationSystem.getMapColorStatus('route1', noRoamerAtRouteOne), LocationMapStatuses.QUEST);
      save.quests.deactivate('main.2');
      assert.equal(locationSystem.getMapColorStatus('route1', 0), LocationMapStatuses.ROAMING);
    } finally {
      saves.setCurrentSave(previous);
    }
  });

  test('MapPanel restores the localized question-mark legend in both languages', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Map legend regression', 'charmander');
    save.player.location = 'pallet';
    save.player.region = 'kanto';
    saves.setCurrentSave(save);
    const localization = LocalizationManager.getInstance();
    const previousLanguage = localization.currentLang;
    const modal = new MapHelpModal();
    const map = new MapPanel(DashboardColumns.CENTER);

    try {
      const helpButtons = map.getDomElement().querySelectorAll('.pw-win-help-btn');
      assert.equal(helpButtons.length, 1, 'the legend is the only help control of the map window');
      assert.equal(map.getDomElement().querySelector('.pw-map-help-button'), null, 'the old text "?" control is gone');
      const button = helpButtons[0];
      const actions = button.parentNode;
      assert.equal(actions.children[0], button, 'the legend takes the first header slot of the former Guide button');
      assert.ok(button.querySelector('.pw-icon'), 'the legend uses the help icon sprite of the former Guide button');
      assert.equal(button.getAttribute('aria-label'), t('map_legend_modal_title'));
      const guide = new GuidePanel();
      button.click();
      assert.ok(modal.isOpen(), 'the control opens the map legend modal');
      assert.equal(guide.isOpen(), false, 'the map window no longer opens the Guide');
      guide.destroy();
      const expectedStates = ['quest', 'roaming', 'catch', 'shiny', 'locked', 'complete'];
      assert.deepEqual(
        [...modal.getDomElement().querySelectorAll('.pw-map-help-row')]
          .map((row) => row.getAttribute('data-map-legend-state')),
        expectedStates
      );

      for (const language of ['fr', 'en']) {
        localization.setLanguage(language);
        const rows = [...modal.getDomElement().querySelectorAll('.pw-map-help-row')];
        assert.equal(rows.length, 6);
        assert.equal(rows[0].querySelector('.pw-map-help-description')?.textContent, t('map_help_green_desc'), `${language} legend text`);
        assert.ok(rows.every((row) => row.querySelector('.pw-map-help-swatch')), `${language} color swatches`);
      }

      const mapCss = fs.readFileSync(path.resolve('assets/css/ui-map-view.css'), 'utf8');
      for (const fill of [
        'rgba(31, 138, 59, 0.55)',
        'rgba(123, 31, 162, 0.55)',
        'rgba(21, 101, 194, 0.55)',
        'rgba(201, 160, 0, 0.60)',
        'rgba(58, 63, 68, 0.55)',
        'rgba(255, 255, 255, 0.10)'
      ]) assert.ok(mapCss.includes(fill), `map node fill matches main: ${fill}`);
      assert.ok(mapCss.includes('stroke: rgba(255, 255, 255, 0.25);'), 'completed map nodes use the reference outline opacity');
    } finally {
      localization.setLanguage(previousLanguage);
      modal.close();
      map.destroy();
      modal.destroy();
      saves.setCurrentSave(previousSave);
    }
  });

  test('split route nodes show one merged encounter/drop list and a large centered title', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Route group regression', 'charmander');
    save.player.location = 'route2_south';
    save.player.region = 'kanto';
    saves.setCurrentSave(save);

    const locations = LocationDB.getInstance();
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    try {
      assert.deepEqual(
        locations.getGroupLocations('route2_south').map((location) => location.id),
        ['route2', 'route2_south']
      );
      const groupedSlots = locations.getEncountersForGroup('route2_south');
      assert.equal(groupedSlots.length, 7, 'identical route slots are de-duplicated across split nodes');
      const dom = panel.getDomElement();
      const wildCards = [...dom.querySelectorAll('.pw-loc-wild-card')]
        .filter((card) => !card.classList.contains('pw-loc-drop-card'));
      assert.equal(wildCards.length, groupedSlots.length, 'the southern node displays the complete grouped route list');
      assert.equal(dom.querySelectorAll('.pw-loc-drop-card').length, 1, 'the primary node drop is shared with the split route');
      assert.equal(dom.querySelector('.pw-loc-overview-meta'), null, 'location tags are not rendered');
      assert.equal(dom.querySelector('.pw-loc-overview-title')?.textContent, t('location.route2_south'));

      const styles = fs.readFileSync(path.resolve('assets/css/panels.css'), 'utf8');
      assert.ok(styles.includes('font-size: clamp(20px, 3vw, 28px)'), 'place name uses a large responsive size');
      assert.ok(styles.includes('text-align: center;'), 'place name is centered in its card');
    } finally {
      panel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('repeatable quest content and locked-board dialogue stay hidden until unlock', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Repeatable visibility regression', 'charmander');
    save.player.location = 'cerulean';
    save.player.region = 'kanto';
    const repeatable = QuestDB.getInstance().getByCategory(QuestCategories.REPEATABLE)[0];
    save.quests.activate(repeatable.key);
    saves.setCurrentSave(save);

    const story = new StoryPanel(DashboardColumns.LEFT);
    const npcModal = new NpcTalkModal();
    try {
      const storyDom = story.getDomElement();
      assert.equal(storyDom.querySelector('.pw-story-quest-section--repeatable'), null, 'an active repeatable is not exposed while locked');
      assert.equal(storyDom.querySelector('.pw-story-repeatable-hint'), null, 'the pre-unlock hint is absent');
      assert.equal(npcModal._npcQuestActions('swimmer-ondee'), null, 'locked board text is not inserted into NPC dialogue');

      const cerulean = LocationDB.getInstance().getById('cerulean');
      const swimmer = NpcDirectory.getById('cerulean', 'swimmer-ondee');
      const actionTile = LocationActions._npcTile(cerulean, swimmer);
      assert.ok(!actionTile.getDomElement().getAttribute('title')?.includes(t('repeatable_unlock_hint')),
        'the locked board hint is not exposed in the NPC tile tooltip');

      const locations = LocationDB.getInstance();
      const gatedNpcs = Object.entries(REPEATABLE_BOARD_HELP_LINES).map(([npcId, lineIndexes]) => {
        const location = locations.getAll().find((candidate) => NpcDirectory.getById(candidate.id, npcId));
        const npc = location && NpcDirectory.getById(location.id, npcId);
        assert.ok(npc, `repeatable-help NPC exists in localized content: ${npcId}`);
        npcModal._locationId = location.id;
        npcModal._selectedNpcId = npcId;
        npcModal._render();
        const lockedDialogue = npcModal.getDomElement().textContent;
        for (const index of lineIndexes) {
          assert.ok(!lockedDialogue.includes(npc.lines[index]), `${npcId} repeatable-help line ${index} stays hidden while locked`);
        }
        for (const [index, line] of npc.lines.entries()) {
          if (!lineIndexes.includes(index)) assert.ok(lockedDialogue.includes(line), `${npcId} keeps its unrelated line ${index}`);
        }
        return { location, npc };
      });

      save.quests.setRepeatableUnlocked(true);
      story._render();
      assert.ok(storyDom.querySelector('.pw-story-quest-section--repeatable'), 'repeatable cards appear after unlock');
      const boardAction = storyDom.querySelector('.pw-story-repeatable-action');
      assert.ok(boardAction?.querySelector('button'), 'the board entry appears after unlock');
      assert.ok(npcModal._npcQuestActions('swimmer-ondee')?.getDomElement().querySelector('button'),
        'the NPC dialogue opens the board after unlock');
      for (const { location, npc } of gatedNpcs) {
        npcModal._locationId = location.id;
        npcModal._selectedNpcId = npc.id;
        npcModal._render();
        const unlockedDialogue = npcModal.getDomElement().textContent;
        for (const line of npc.lines) assert.ok(unlockedDialogue.includes(line), `${npc.id} repeatable-help dialogue returns after unlock`);
      }
    } finally {
      story.destroy();
      npcModal.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('MapPanel renders visual player marker at current location with ring and bobbing avatar', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Map player marker test', 'charmander');
    save.player.location = 'pallet';
    save.player.region = 'kanto';
    save.player.trainerSprite = 'trainer-42';
    saves.setCurrentSave(save);

    const map = new MapPanel(DashboardColumns.CENTER);
    try {
      const mapDom = map.getDomElement();
      const playerGroup = mapDom.querySelector('.pw-map-player');
      assert.ok(playerGroup, 'pw-map-player group is rendered on the map');

      const ring = playerGroup.querySelector('.pw-map-player-ring');
      assert.ok(ring, 'pw-map-player-ring is rendered');

      const bob = playerGroup.querySelector('.pw-map-player-bob');
      assert.ok(bob, 'pw-map-player-bob group is rendered');

      const image = bob.querySelector('image');
      assert.ok(image, 'player trainer sprite image is rendered');
      assert.ok(image.getAttribute('href')?.includes('trainer-42'), 'uses current player trainerSprite');

      const title = playerGroup.querySelector('title');
      assert.equal(title?.textContent, t('map_you_are_here'), 'localized you-are-here tooltip');

      // Traveling to another location in the same region moves the marker
      LocationSystem.getInstance().travelTo('route1');
      const updatedBob = map.getDomElement().querySelector('.pw-map-player-bob')?.querySelector('image');
      assert.ok(updatedBob, 'marker persists on route1');
      assert.notEqual(updatedBob.getAttribute('y'), image.getAttribute('y'), 'marker moved to route1 coordinates');
    } finally {
      map.destroy();
      saves.setCurrentSave(previousSave);
    }
  });

  test('location NPC and arena action rules explicitly suppress box-shadow halos', () => {
    const css = fs.readFileSync(path.resolve('assets/css/design-system.css'), 'utf8');
    const rules = [...css.matchAll(/([^{}]*(?:pw-loc-npc-btn|pw-loc-gym-btn)[^{}]*)\{([^{}]*)\}/g)];
    assert.ok(rules.length >= 8, 'normal and hover rules cover both classic buttons and widget tiles');
    for (const [, selector, declarations] of rules) {
      assert.ok(declarations.includes('box-shadow: none !important;'), `${selector.trim()} suppresses all shadows`);
    }
  });
});
