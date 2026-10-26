/**
 * @file TeamAmbush.test.js
 * @brief Tests enemy team ambushes on map nodes, combat trigger, and defeat retreat mechanics.
 */

import { describe, assert } from './TestRunner.js';
import { installFakeDom } from './FakeDom.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TeamAmbushSystem } from '../src/systems/TeamAmbushSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { EventBus } from '../src/core/EventBus.js';
import { BattleEndedEvent } from '../src/core/events/BattleEndedEvent.js';
import { UIMapView } from '../src/ui/UIMapView.js';

describe('Enemy Team Map Ambush & Retreat Mechanics', (test) => {
  test('ambushes appear according to regional badge progression and are filtered when beaten', () => {
    const save = SaveSystem.getInstance().createNewSave('AmbushProgressTest', 'charmander');
    const ambushSys = TeamAmbushSystem.getInstance();
    ambushSys.init();

    // At 0 badges in Kanto, mtmoon ambush requires 1 badge -> not active
    assert.equal(ambushSys.hasAmbush('mtmoon'), false);

    // Give 1 badge (Brock)
    save.player.earnBadge('brock');
    assert.equal(ambushSys.hasAmbush('mtmoon'), true);
    assert.equal(ambushSys.getAmbush('mtmoon').trainerId, 'kanto_rocket_mtmoon');

    // Celadon requires 3 badges
    assert.equal(ambushSys.hasAmbush('celadon'), false);
    save.player.earnBadge('misty');
    save.player.earnBadge('surge');
    assert.equal(ambushSys.hasAmbush('celadon'), true);

    // If Mt Moon rocket is beaten, ambush is cleared
    save.statistics.recordTrainerWin('kanto_rocket_mtmoon');
    assert.equal(ambushSys.hasAmbush('mtmoon'), false);
  });

  test('moving to ambushed node triggers combat; defeat retreats to previous location, victory advances', () => {
    const save = SaveSystem.getInstance().createNewSave('AmbushCombatTest', 'charmander');
    const locations = LocationSystem.getInstance();
    const battles = BattleSystem.getInstance();
    const ambushSys = TeamAmbushSystem.getInstance();
    ambushSys.init();

    // Set starting position at route3 with 1 badge and unlock mtmoon
    save.player.earnBadge('brock');
    save.access.unlockLocation('route3');
    save.access.unlockLocation('mtmoon');
    save.player.location = 'route3';
    assert.equal(locations.getCurrentLocationId(), 'route3');

    // Level up starter to fight
    save.team[0].setLevel(50);

    // Target is mtmoon which has an active ambush
    assert.equal(ambushSys.hasAmbush('mtmoon'), true);

    // Trigger ambush from route3 to mtmoon
    const started = ambushSys.triggerAmbush('mtmoon', 'route3');
    assert.ok(started, 'Ambush battle should start');
    assert.ok(battles.isActive(), 'Battle should be active');

    // Simulate Defeat (player loses or retreats)
    EventBus.getInstance().dispatch(new BattleEndedEvent(false));

    // Player must remain at previous location (route3)
    assert.equal(locations.getCurrentLocationId(), 'route3', 'Player must retreat to previous location on defeat');
    assert.equal(ambushSys.hasAmbush('mtmoon'), true, 'Ambush must remain uncleared after defeat');

    // Re-trigger ambush
    const reStarted = ambushSys.triggerAmbush('mtmoon', 'route3');
    assert.ok(reStarted);

    // Simulate Victory
    save.statistics.recordTrainerWin('kanto_rocket_mtmoon');
    EventBus.getInstance().dispatch(new BattleEndedEvent(true));

    // Player now advances to destination (mtmoon)
    assert.equal(locations.getCurrentLocationId(), 'mtmoon', 'Player advances to destination on victory');
    assert.equal(ambushSys.hasAmbush('mtmoon'), false, 'Ambush is now cleared');
  });

  test('UIMapView renders team ambush markers with styled SVG groups', () => {
    installFakeDom();

    const mapView = new UIMapView({
      width: 1000,
      height: 800
    });

    const ambushes = [
      {
        x: 200,
        y: 150,
        spriteUrl: 'assets/images/trainers/Team Rocket Grunt (male).png',
        tooltip: 'Team Rocket Ambush',
        locationId: 'mtmoon'
      }
    ];

    mapView.setAmbushMarkers(ambushes);

    const dom = mapView.getDomElement();
    const ambushElement = dom.querySelector('.pw-map-team-ambush');
    assert.ok(ambushElement, 'Ambush marker element should exist in DOM');
    assert.equal(ambushElement.getAttribute('data-node-id'), 'mtmoon');

    const ring = ambushElement.querySelector('.pw-map-ambush-ring');
    assert.ok(ring, 'Ambush ring should exist');

    const image = ambushElement.querySelector('image');
    assert.ok(image, 'Grunt sprite image should exist');

    // Clearing markers
    mapView.setAmbushMarkers([]);
    assert.equal(dom.querySelector('.pw-map-team-ambush'), null);
  });
});
