/**
 * @file Release1167.test.js
 * @brief 1.16.7 — the roaming feature is switched off, and nothing in the live game may still show it.
 *
 * Reported: the map still painted the purple roaming state on routes even though the system is
 * disconnected. The switch existed (RoamingRules.ROAMING_ENABLED) but each consumer had to remember
 * it: LocationPanel and BattleSystem did, the map colour did not, and the legend / Pokédex source list
 * advertised the feature to the player. The switch is now enforced inside RoamingSystem only.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { RoamingRules } from '../src/config/RoamingRules.js';
import { RoamingSystem } from '../src/systems/RoamingSystem.js';
import { LocationSystem, LocationMapStatuses } from '../src/systems/LocationSystem.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { MapHelpModal } from '../src/panels/MapHelpModal.js';
import { SpeciesSourceCatalog } from '../src/data/pokemon/SpeciesSourceCatalog.js';
import { LocationActivityRules } from '../src/data/world/LocationActivityRules.js';
import { EventBus } from '../src/core/EventBus.js';
import { RoamingRotationTickEvent } from '../src/core/events/RoamingRotationTickEvent.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const WINDOW_START = 0;

/** Every outdoor place the rotation can use, with the window in which it would host a roamer. */
function rotationSites() {
  const sites = [];
  for (const [region, pool] of Object.entries(RoamingRules.REGIONS)) {
    for (let window = 0; window < 4; window++) {
      for (const routeId of pool.routes) {
        if (RoamingSystem.getAssignedSpecies(routeId, window * RoamingRules.ROTATION_MS)) {
          sites.push({ region, routeId, now: window * RoamingRules.ROTATION_MS });
        }
      }
    }
  }
  return sites;
}

describe('1.16.7 — the switched-off roaming feature', (test) => {
  test('the switch is enforced by RoamingSystem, once', () => {
    assert.equal(RoamingRules.ROAMING_ENABLED, false);
    assert.equal(RoamingSystem.isEnabled(), false);
    assert.ok(rotationSites().length >= 6, 'the rotation still knows where roamers would stand');
    assert.equal(RoamingSystem.getSpeciesAt('route1', WINDOW_START), null);
    assert.equal(RoamingSystem.getRouteForSpecies('articuno', WINDOW_START), null);
  });

  test('no map node can ever take the purple roaming colour', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = SaveData.createNew('Roaming colour regression', 'charmander');
    save.player.location = 'pallet';
    save.player.region = 'kanto';
    saves.setCurrentSave(save);
    const locations = LocationSystem.getInstance();
    try {
      const sites = rotationSites();
      assert.ok(sites.length > 0, 'there is at least one window with a roamer');
      for (const site of sites) {
        const status = locations.getMapColorStatus(site.routeId, site.now);
        assert.equal(status === LocationMapStatuses.ROAMING, false,
          `${site.routeId} at window ${site.now} must not be purple`);
        assert.ok(
          [LocationMapStatuses.CATCH, LocationMapStatuses.SHINY, LocationMapStatuses.COMPLETE,
            LocationMapStatuses.QUEST, LocationMapStatuses.LOCKED].includes(status),
          `${site.routeId} keeps a real state (${status})`
        );
      }
    } finally {
      saves.setCurrentSave(previous);
    }
  });

  test('the map legend no longer advertises the roaming colour', () => {
    const states = MapHelpModal.legendRows().map((row) => row.status);
    assert.equal(states.includes('roaming'), false, JSON.stringify(states));
    for (const status of ['quest', 'catch', 'shiny', 'locked', 'complete']) assert.ok(states.includes(status), status);
  });

  test('no Pokémon lists roaming as an obtainment source while the feature is off', () => {
    for (const speciesId of ['articuno', 'zapdos', 'moltres', 'mew', 'raikou', 'entei', 'suicune', 'latias', 'jirachi']) {
      const kinds = SpeciesSourceCatalog.getSources(speciesId, WINDOW_START).map((source) => source.kind);
      assert.equal(kinds.includes('roaming'), false, `${speciesId}: ${kinds.join(',')}`);
    }
  });

  test('a location is never "active" because of a roaming encounter', () => {
    const location = LocationDB.getInstance().getById('route1');
    const encounters = LocationDB.getInstance().getEncounters('route1').length;
    assert.equal(!!RoamingSystem.getSpeciesAt('route1', WINDOW_START), false);
    assert.equal(
      LocationActivityRules.forLocation(location, encounters, !!RoamingSystem.getSpeciesAt('route1', WINDOW_START)),
      LocationActivityRules.forLocation(location, encounters, false)
    );
  });

  test('the roaming view clock is silent while the feature is off', () => {
    let ticks = 0;
    const unsubscribe = EventBus.getInstance().subscribe(RoamingRotationTickEvent, () => { ticks++; });
    try {
      const roaming = RoamingSystem.getInstance();
      roaming._lastTickSecond = null;
      for (let index = 0; index < 3; index++) roaming.update(0.1);
    } finally {
      unsubscribe();
    }
    assert.equal(ticks, 0, 'no rotation tick is broadcast');
  });

  test('no caller re-tests the switch: it lives in the rules and in the system only', () => {
    const roots = ['src'];
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(`${PROJECT_ROOT}${dir}`, { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.js') && !['src/config/RoamingRules.js', 'src/systems/RoamingSystem.js'].includes(path)) {
          if (fs.readFileSync(`${PROJECT_ROOT}${path}`, 'utf8').includes('ROAMING_ENABLED')) offenders.push(path);
        }
      }
    };
    for (const root of roots) walk(root);
    assert.deepEqual(offenders, [], `the switch is duplicated in ${offenders.join(', ')}`);
  });
});
