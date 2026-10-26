/**
 * @file Release1155.test.js
 * @brief Tests for release 1.15.5: Good As Gold talent immunity, FastForward post-AFK simulation,
 * and comprehensive end-to-end fresh save journey validation.
 */

import { describe, assert } from './TestRunner.js';
import { StatusRules } from '../src/systems/battle/StatusRules.js';
import { StatChangeRules } from '../src/systems/battle/StatChangeRules.js';
import { BattleCombatant } from '../src/systems/battle/BattleCombatant.js';
import { BattleField } from '../src/systems/battle/BattleField.js';
import { BattleLog } from '../src/systems/battle/BattleLog.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { FastForwardSystem } from '../src/systems/FastForwardSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { Random } from '../src/core/Random.js';
import { BonusTypes } from '../src/config/BonusRules.js';
import { StatusConditions } from '../src/data/battle/StatusConditions.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';

describe('Release 1.15.5 Specifications', (test) => {
  test('Good As Gold talent grants total immunity to status conditions and stat drops', () => {
    const gholdengo = PokemonFactory.create('pikachu', 50);
    gholdengo.talent = 'goodasgold';

    const combatant = new BattleCombatant(gholdengo, { teamSide: true });
    const field = new BattleField();
    const log = new BattleLog();
    const random = Random.sequence([1.0]);

    // Attempt to inflict poison, paralysis, burn
    for (const status of [StatusConditions.POISON, StatusConditions.PARA, StatusConditions.BURN]) {
      const inflicted = StatusRules.inflict(combatant, status, { field, random, log });
      assert.equal(inflicted, false, `Good As Gold should block status ${status}`);
      assert.equal(combatant.status, null);
    }

    // Attempt to drop Attack and Defense
    const atkDrop = StatChangeRules.apply(combatant, 'atk', 0.67, log);
    const defDrop = StatChangeRules.apply(combatant, 'def', 0.5, log);
    assert.equal(atkDrop, false, 'Good As Gold should block attack drop');
    assert.equal(defDrop, false, 'Good As Gold should block defense drop');
    assert.equal(combatant.statMods.atk, 1.0);
    assert.equal(combatant.statMods.def, 1.0);
  });

  test('FastForwardSystem deterministically simulates offline progress and advances daycare', () => {
    const save = SaveSystem.getInstance().createNewSave('FastForwardTest', 'charmander');
    save.team[0].setLevel(50);
    const initialMoney = save.currencies.get(BonusTypes.MONEY);

    // Deposit reserve in daycare
    const reserve = PokemonFactory.create('rattata', 10);
    save.collection.add(reserve);
    save.access.unlockFeature('hatchery');
    save.access.unlockLocation('route5');

    const hatchery = HatcherySystem.getInstance();
    hatchery.init();

    try {
      hatchery.depositPokemon(reserve.uid, 0);

      const ff = FastForwardSystem.getInstance();
      // Simulate 120 seconds of offline time on Route 1
      const summary = ff.simulate({
        save,
        locationId: 'route1',
        elapsedSeconds: 120,
        random: Random.sequence([0.5]),
        deferSave: true
      });

      assert.ok(summary.battles > 0, 'Should simulate wild battles');
      assert.ok(summary.wins > 0, 'Should record wild wins');
      assert.ok(summary.moneyGained > 0, 'Should accumulate money');
      assert.ok(save.currencies.get(BonusTypes.MONEY) > initialMoney, 'Player balance should increase');

      // Daycare reserve should have advanced KOs / levels
      const slot = save.hatchery.slots[0];
      assert.ok(slot.knockouts > 0 || reserve.level > 10, 'Daycare Pokémon should accumulate progress from offline battles');
    } finally {
      hatchery.onDestroy();
    }
  });

  test('comprehensive end-to-end fresh save progression lifecycle', () => {
    // 1. Fresh save creation
    const save = SaveSystem.getInstance().createNewSave('FreshJourneyTest', 'charmander');
    assert.equal(save.player.trainerName, 'FreshJourneyTest');
    assert.equal(save.team.length, 1);
    assert.equal(save.team[0].species, 'charmander');
    assert.equal(save.team[0].level, 5);
    assert.equal(save.player.location, 'pallet');
    assert.equal(save.player.region, 'kanto');

    // 2. Daycare regional cap is properly bounded by starter level
    const daycareCap = HatcherySystem.getInstance().getRegionalDaycareCap(save, 'pidgey');
    assert.equal(daycareCap, 5, 'Daycare cap should strictly reflect highest native regional level (5)');

    // 3. Level up starter to level 30
    save.team[0].setLevel(30);
    const updatedCap = HatcherySystem.getInstance().getRegionalDaycareCap(save, 'pidgey');
    assert.equal(updatedCap, 30, 'Daycare cap dynamically advances as starter grows');

    // 4. Transit gate initially refuses Johto
    const access = FeatureAccessSystem.getInstance();
    const transitGate = access._regionAccessStatus('johto', save);
    assert.equal(transitGate.unlocked, false, 'Johto is locked for a new journey');
    assert.equal(transitGate.reason, 'league');
  });
});
