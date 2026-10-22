/**
 * @file RegionalProgression.test.js
 * @brief End-to-end region unlock, map travel, starter choice, and team/PC placement.
 */
import { describe, assert } from './TestRunner.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { RegionalStarterSystem } from '../src/systems/RegionalStarterSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { Random } from '../src/core/Random.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { MapPanel } from '../src/panels/MapPanel.js';
import { RegionalStarterModal } from '../src/panels/RegionalStarterModal.js';
import { RegionalStarterRequiredEvent } from '../src/core/events/RegionalStarterRequiredEvent.js';
import { EventBus } from '../src/core/EventBus.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { fakeEvent } from './FakeDom.js';
import { TrainerSystem } from '../src/systems/TrainerSystem.js';
import { ChallengeStates } from '../src/systems/trainers/ChallengeStates.js';

describe('Regional progression', (test) => {
  test('Johto map gates follow main while National Park keeps its dedicated encounter content', () => {
    const locations = LocationDB.getInstance();
    const route = locations.getById('jroute29');
    const nationalPark = locations.getById('nationalpark');
    assert.equal(route.winsToClear, 10, 'main requires ten local wins before opening the next town');
    assert.equal(nationalPark.kind, 'dungeon');
    assert.equal(nationalPark.badgesRequired, 0, 'map access follows main rather than the dedicated table gate');
    assert.equal(nationalPark.winsToClear, 0);
    assert.ok(nationalPark.encounters.length > 0, 'the dedicated Johto encounter pool remains available');
  });

  test('an original save restores route, Gym, feature, League and region-change progress', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const access = FeatureAccessSystem.getInstance();
    const locations = LocationSystem.getInstance();
    const originalSaveCurrent = saves.saveCurrent;
    const kantoDex = Object.fromEntries(Array.from({ length: 151 }, (_, index) => [index + 1, { caught: true }]));
    const save = SaveData.fromJson({
      G: {
        trainerName: 'Legacy explorer',
        region: 'kanto',
        location: 'pallet',
        badges: ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'],
        team: [{ id: 1, level: 5, xp: 0, currentHP: 20, maxHP: 20, moves: [] }],
        collection: {},
        pokedex: kantoDex,
        regionLeagueWon: { kanto: true },
        unlockedLocs: { route6: true, route21: false },
        visitedMaps: { route22: true, diglettscave: true },
        hatcheryUnlocked: false,
        mineUnlocked: false,
        trainingUnlocked: false
      }
    });
    saves.saveCurrent = () => true;
    saves.setCurrentSave(save);
    try {
      access.refresh('legacy-main-save-test', { force: true, persist: false });
      assert.equal(save.player.hasBadge('brock'), true, 'Gym identity remains the stable trainer id');
      assert.equal(TrainerSystem.getInstance().getChallenge('brock').state, ChallengeStates.REMATCH);
      assert.equal(access.isLocationUnlocked('route3'), true, 'a saved badge backfill passes the current route badge gate');
      assert.equal(access.isLocationUnlocked('route6'), true, 'the explicit legacy map flag and Surge progress survive');
      assert.equal(save.access.hasLocation('route22'), true, 'visitedMaps is restored');
      assert.equal(access.getSnapshot().features.hatchery, true, 'Misty-era Route 5 progress restores the hatchery');
      assert.equal(access.getSnapshot().features.training, true, 'the Surge badge restores training');
      assert.equal(access.getSnapshot().features.mine, true, 'a recorded cave visit restores the mine');
      assert.equal(save.statistics.hasWonLeague('kanto'), true);
      assert.equal(access.getRegionAccessStatus('johto').unlocked, true, 'the prior League and complete regional dex restore region access');
      assert.equal(locations.travelToRegion('johto'), true, 'the migrated save can change into Johto');
      assert.equal(save.player.region, 'johto');
      assert.equal(save.player.location, 'newbark');
      assert.equal(locations.travelToRegion('kanto'), true, 'the migrated save can return to Kanto');
      assert.equal(save.player.region, 'kanto');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      saves.setCurrentSave(previousSave);
      access.refresh('legacy-main-save-test-restore', { force: true, persist: false });
    }
  });

  test('unlocked Johto travel offers its starter, starts its quest, and preserves Route 29 progression gates', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Johto progression audit', 'charmander');
    save.player.region = 'kanto';
    save.player.location = 'pallet';
    const kantoDex = Object.fromEntries(PokemonDB.getInstance().getByRegion('kanto').map((species) => [
      species.id,
      { seen: true, caught: true, shiny: false }
    ]));
    save.pokedex.deserialize(kantoDex);
    save.statistics.recordLeague('kanto');
    saves.setCurrentSave(save);

    const access = FeatureAccessSystem.getInstance();
    const location = LocationSystem.getInstance();
    const starters = RegionalStarterSystem.getInstance();
    const quests = QuestSystem.getInstance();
    access.refresh('johto-progression-audit', { force: true, persist: false });
    starters.init();
    quests.init();

    const modal = new RegionalStarterModal();
    const map = new MapPanel(DashboardColumns.CENTER);
    const requiredEvents = [];
    const onRequired = (event) => requiredEvents.push(event);
    EventBus.getInstance().subscribe(RegionalStarterRequiredEvent, onRequired);
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) {
      writes++;
      return originalSaveCurrent.apply(this, args);
    };

    try {
      assert.deepEqual(access.getSnapshot().regions, ['kanto', 'johto']);
      assert.equal(location.travelToRegion('hoenn'), false, 'Hoenn still requires the Johto League and Pokédex');
      const regionSelect = map.getDomElement().querySelector('#map-region-select');
      assert.ok(regionSelect, 'map region selector should exist');
      regionSelect.value = 'johto';
      regionSelect.dispatchEvent(fakeEvent('change'));

      assert.equal(save.player.region, 'johto');
      assert.equal(save.player.location, 'newbark');
      assert.equal(writes, 1, 'region travel and story synchronization persist as one operation');
      assert.equal(requiredEvents.length, 1);
      assert.equal(modal.isOpen(), true, 'the first Johto entry requires a starter choice');
      assert.equal(modal.getDomElement().querySelectorAll('.starter-card').length, 3);
      assert.equal(modal.getDomElement().querySelector('.starter-name-field'), null, 'the regional choice does not ask for a second trainer name');
      assert.ok(quests.getStatus(QuestDB.getInstance().getMainQuest('johto', 0).key), 'the Johto story chain activates on region travel');

      writes = 0;
      const cyndaquil = [...modal.getDomElement().querySelectorAll('.starter-card')]
        .find((card) => card.getAttribute('data-starter-id') === 'cyndaquil');
      assert.ok(cyndaquil, 'Cyndaquil should be selectable from the regional starter cards');
      cyndaquil.click();
      assert.equal(modal.isOpen(), false);
      assert.equal(save.team.some((pokemon) => pokemon.species === 'cyndaquil' && pokemon.level === 5), true);
      assert.equal(save.access.hasRegionStarter('johto'), true);
      assert.equal(location.isLocked('jroute29'), false);
      assert.equal(writes, 1, 'starter, Pokédex and sticky access state persist once');

      writes = 0;
      assert.equal(location.travelTo('jroute29'), true);
      assert.equal(save.player.location, 'jroute29');
      assert.equal(writes, 1, 'route travel persists once even though region quest state is observed');
      assert.equal(location.isLocked('cherrygrove'), true, 'the next town requires ten local wild wins in main');
      for (let win = 1; win <= 10; win++) {
        save.statistics.recordWildWin('jroute29');
        if (win < 10) assert.equal(location.isLocked('cherrygrove'), true);
      }
      assert.equal(location.isLocked('cherrygrove'), false, 'ten Route 29 wins open the next Johto town');
      assert.equal(location.travelTo('cherrygrove'), true);
      assert.equal(save.player.location, 'cherrygrove');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      EventBus.getInstance().unsubscribe(RegionalStarterRequiredEvent, onRequired);
      map.destroy();
      modal.destroy();
      starters.onDestroy();
      saves.setCurrentSave(previousSave);
      access.refresh('regional-progression-audit-restore', { force: true, persist: false });
    }
  });

  test('an ordinary wild win unlocks the next town with one encounter save', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const access = FeatureAccessSystem.getInstance();
    const accessWasInitialized = access._subscriptions.length > 0;
    access.init();
    const locations = LocationSystem.getInstance();
    const starters = RegionalStarterSystem.getInstance();
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    battle.setRandom(Random.sequence([0.5]));

    let originalSaveCurrent = null;
    let saveCurrentWrapped = false;
    let writes = 0;
    const defeated = [];
    const onDefeated = (event) => {
      if (event.locationId === 'jroute29') defeated.push(event);
    };
    try {
      const save = saves.createNewSave('Battle persistence audit', 'charmander');
      save.team[0].setLevel(100);
      save.pokedex.deserialize(Object.fromEntries(PokemonDB.getInstance().getByRegion('kanto').map((species) => [
        species.id,
        { seen: true, caught: true, shiny: false }
      ])));
      save.statistics.recordLeague('kanto');
      access.refresh('battle-persistence-prerequisites', { force: true, persist: false });
      assert.ok(access.getSnapshot().regions.includes('johto'));
      assert.ok(locations.travelToRegion('johto'));
      assert.equal(starters.chooseStarter('johto', 'cyndaquil').success, true);

      for (let win = 0; win < 9; win++) save.statistics.recordWildWin('jroute29');
      access.refresh('battle-persistence-route-state', { force: true, persist: false });
      assert.equal(locations.isLocked('cherrygrove'), true);
      assert.ok(locations.travelTo('jroute29'));

      EventBus.getInstance().subscribe(PokemonDefeatedEvent, onDefeated);
      originalSaveCurrent = saves.saveCurrent;
      saves.saveCurrent = function (...args) {
        writes++;
        return originalSaveCurrent.apply(this, args);
      };
      saveCurrentWrapped = true;

      assert.ok(battle.startBattle('jroute29'));
      for (let frame = 0; frame < 10000 && save.statistics.wildWinsInGroup('jroute29') < 10; frame++) {
        battle.update(0.1);
      }
      assert.equal(save.statistics.wildWinsInGroup('jroute29'), 10, 'one browser-equivalent wild encounter is settled');
      assert.equal(locations.isLocked('cherrygrove'), false, 'the battle win refreshes map access immediately');
      assert.equal(defeated.length, 1);
      assert.equal(defeated[0].deferSave, true, 'quest and access listeners defer to the battle transaction');
      assert.equal(writes, 1, 'the win and its access unlock are persisted by one encounter write');

      battle.endBattle(false);
      assert.equal(writes, 2, 'leaving the continued wild chain is its own save operation');
    } finally {
      if (battle.isActive()) battle.endBattle(false);
      if (saveCurrentWrapped) saves.saveCurrent = originalSaveCurrent;
      EventBus.getInstance().unsubscribe(PokemonDefeatedEvent, onDefeated);
      battle.setRandom(Random.default);
      saves.setCurrentSave(previousSave);
      if (!accessWasInitialized) access.onDestroy();
      access.refresh('battle-persistence-restore', { force: true, persist: false });
    }
  });

  test('a full team receives the Hoenn regional starter in the PC using one save', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Hoenn PC starter audit', 'charmander');
    save.player.region = 'hoenn';
    save.player.location = 'littleroot';
    const dex = Object.fromEntries([
      ...PokemonDB.getInstance().getByRegion('kanto'),
      ...PokemonDB.getInstance().getByRegion('johto')
    ].map((species) => [species.id, { seen: true, caught: true, shiny: false }]));
    save.pokedex.deserialize(dex);
    save.statistics.recordLeague('kanto');
    save.statistics.recordLeague('johto');
    saves.setCurrentSave(save);

    const access = FeatureAccessSystem.getInstance();
    const starters = RegionalStarterSystem.getInstance();
    access.refresh('hoenn-pc-starter-audit', { force: true, persist: false });
    try {
      for (const speciesId of ['pidgey', 'rattata', 'geodude', 'oddish', 'meowth']) {
        assert.ok(TeamSystem.getInstance().addPokemon(PokemonFactory.create(speciesId, 10), {
          notify: false,
          deferSave: true
        }));
      }
      assert.equal(save.team.length, 6);
      const originalSaveCurrent = saves.saveCurrent;
      let writes = 0;
      saves.saveCurrent = function (...args) {
        writes++;
        return originalSaveCurrent.apply(this, args);
      };
      try {
        const result = starters.chooseStarter('hoenn', 'mudkip');
        assert.equal(result.success, true);
        assert.equal(result.storedIn, 'box');
        assert.equal(save.team.length, 6);
        assert.equal(save.box.some((pokemon) => pokemon.species === 'mudkip' && pokemon.level === 5), true);
        assert.equal(save.access.hasRegionStarter('hoenn'), true);
        assert.equal(writes, 1);
        const location = LocationSystem.getInstance();
        assert.equal(location.isLocked('route101'), false, 'the regional starter opens Route 101');
        assert.equal(location.isLocked('oldale'), true, 'Route 101 must be cleared before the next town');
        for (let win = 1; win <= 10; win++) {
          save.statistics.recordWildWin('route101');
          if (win < 10) assert.equal(location.isLocked('oldale'), true);
        }
        assert.equal(location.isLocked('oldale'), false, 'ten Route 101 wins open Oldale');
      } finally {
        saves.saveCurrent = originalSaveCurrent;
      }
    } finally {
      saves.setCurrentSave(previousSave);
      access.refresh('hoenn-pc-starter-audit-restore', { force: true, persist: false });
    }
  });
});
