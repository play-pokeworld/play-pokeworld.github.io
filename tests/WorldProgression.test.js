/**
 * @file WorldProgression.test.js
 * @brief Headless end-to-end progression through real wild battles and route travel.
 */
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { Random } from '../src/core/Random.js';

describe('World progression flow', (test) => {
  test('ordinary Route 1 victories unlock Viridian and allow the next travel', () => {
    const saveSystem = SaveSystem.getInstance();
    const location = LocationSystem.getInstance();
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const previousSave = saveSystem.getCurrentSave();
    const save = saveSystem.createNewSave('Route progression audit', 'charmander');
    battle.setRandom(Random.sequence([0.5]));
    save.team[0].setLevel(100);

    try {
      assert.equal(location.getCurrentLocationId(), 'pallet');
      assert.equal(location.isLocked('viridian'), true);
      assert.equal(location.travelTo('route1'), true);

      for (let win = 1; win <= 10; win++) {
        assert.equal(battle.startBattle('route1', { chain: false }), true, `wild battle ${win} starts`);
        for (let tick = 0; tick < 5000 && battle.isActive(); tick++) battle.update(0.1);
        assert.equal(battle.isActive(), false, `wild battle ${win} settles`);
        assert.equal(save.statistics.wildWinsInGroup('route1'), win);
        if (win < 10) assert.equal(location.isLocked('viridian'), true);
      }

      assert.equal(location.isLocked('viridian'), false);
      assert.equal(location.travelTo('viridian'), true);
      assert.equal(location.getCurrentLocationId(), 'viridian');
    } finally {
      if (battle.isActive()) battle.endBattle(false);
      battle.setRandom(Random.default);
      saveSystem.setCurrentSave(previousSave);
      saveSystem.deleteSlot(save.id);
    }
  });
});
