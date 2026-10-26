/**
 * @file Release1154.test.js
 * @brief Tests for release 1.15.4: Endgame held items up to tier 25, Mega-Stones, Z-Crystals,
 * Simple & Moody battle talents, and Cinnabar Island fossil laboratory revival.
 */

import { describe, assert } from './TestRunner.js';
import { heldPowerLevel } from '../src/systems/battle/HeldItemPower.js';
import { DamageCalculator } from '../src/systems/battle/DamageCalculator.js';
import { BattleCombatant } from '../src/systems/battle/BattleCombatant.js';
import { BattleField } from '../src/systems/battle/BattleField.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { Random } from '../src/core/Random.js';
import { StatChangeRules } from '../src/systems/battle/StatChangeRules.js';
import { TurnEndRules } from '../src/systems/battle/TurnEndRules.js';
import { BattleLog } from '../src/systems/battle/BattleLog.js';
import { FossilSystem } from '../src/systems/FossilSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';

describe('Release 1.15.4 Specifications', (test) => {
  test('held item power levels scale smoothly from tier 1 up to tier 25', () => {
    assert.equal(heldPowerLevel(0), 1);
    assert.equal(heldPowerLevel(4), 1);
    assert.equal(heldPowerLevel(5), 2);
    assert.equal(heldPowerLevel(10), 3);
    assert.equal(heldPowerLevel(15), 4);
    assert.equal(heldPowerLevel(20), 5);
    assert.equal(heldPowerLevel(25), 6);
    assert.equal(heldPowerLevel(50), 11);
    assert.equal(heldPowerLevel(100), 21);
    assert.equal(heldPowerLevel(120), 25);
    assert.equal(heldPowerLevel(200), 25);
  });

  test('mega stone and z-crystal amplify move damage according to held item power', () => {
    const charizard = PokemonFactory.create('charizard', 50);
    const snorlax = PokemonFactory.create('snorlax', 50);
    const moves = MoveDB.getInstance();
    const flamethrower = moves.getById('flamethrower');
    const field = new BattleField();

    // Baseline hit with no item
    const attackerPlain = new BattleCombatant(charizard, { teamSide: true });
    const defender = new BattleCombatant(snorlax, { teamSide: false });

    const plainHit = DamageCalculator.compute({
      attacker: attackerPlain,
      defender,
      move: flamethrower,
      field,
      random: Random.sequence([1.0])
    });

    // Holding Firium Z: matching fire move gets 1.4x Z-move boost
    charizard.heldItem = 'firium_z';
    const attackerZ = new BattleCombatant(charizard, { teamSide: true });
    const zHit = DamageCalculator.compute({
      attacker: attackerZ,
      defender,
      move: flamethrower,
      field,
      random: Random.sequence([1.0])
    });

    assert.ok(zHit.damage > plainHit.damage * 1.35, 'Z-Crystal should amplify matching move damage by 1.4x');

    // Holding Mega Stone Charizardite Y
    charizard.heldItem = 'charizardite_y';
    const attackerMega = new BattleCombatant(charizard, { teamSide: true, heldQuantity: 25 });
    const megaHit = DamageCalculator.compute({
      attacker: attackerMega,
      defender,
      move: flamethrower,
      field,
      random: Random.sequence([1.0])
    });

    assert.ok(megaHit.damage > plainHit.damage, 'Mega stone should boost attack power according to held tier');
  });

  test('simple talent doubles stat stages for both boosts and penalties', () => {
    const bidoof = PokemonFactory.create('pikachu', 50);
    bidoof.talent = 'simple';
    const combatant = new BattleCombatant(bidoof, { teamSide: true });
    const log = new BattleLog();

    // Normal boost factor 1.5 (+50%) becomes 2.0 (+100%)
    StatChangeRules.apply(combatant, 'atk', 1.5, log);
    assert.equal(combatant.statMods.atk, 2.0, 'Simple talent should double stat boost factor (1.5 -> 2.0)');

    // Normal drop factor 0.67 (-33%) becomes doubled drop ~0.34
    StatChangeRules.apply(combatant, 'def', 0.67, log);
    assert.ok(combatant.statMods.def < 0.4, 'Simple talent should double stat drop severity');
  });

  test('moody talent applies end-of-turn +2 boost and -1 penalty', () => {
    const smeargle = PokemonFactory.create('smeargle', 50);
    smeargle.talent = 'moody';
    const combatant = new BattleCombatant(smeargle, { teamSide: true });
    const log = new BattleLog();

    // Baseline neutral stats
    for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
      assert.equal(combatant.statMods[stat], 1.0);
    }

    TurnEndRules.apply(combatant, log);

    // One stat must be boosted to 2.0, and one lowered to ~0.67
    const boosted = Object.values(combatant.statMods).filter((m) => m > 1.5);
    const lowered = Object.values(combatant.statMods).filter((m) => m < 0.8);

    assert.equal(boosted.length, 1, 'Moody should boost exactly one stat by 2.0x');
    assert.equal(lowered.length, 1, 'Moody should lower exactly one stat by 0.67x');
  });

  test('fossil laboratory revival is permitted at both Pewter and Cinnabar Island', () => {
    const save = SaveSystem.getInstance().createNewSave('FossilLabTest', 'charmander');
    save.quests.setMainStep('kanto', 30); // Unlocked story step
    save.inventory.add('dome_fossil', 1);

    const fossils = FossilSystem.getInstance();

    // At Route 1: wrong location
    save.player.location = 'route1';
    assert.equal(fossils.canUseHere(), false);
    assert.equal(fossils.availability('dome_fossil').result, 'wrong-location');

    // At Pewter Museum: valid
    save.player.location = 'pewter';
    assert.equal(fossils.canUseHere(), true);
    assert.equal(fossils.availability('dome_fossil').result, 'ready');

    // At Cinnabar Island Lab: valid
    save.player.location = 'cinnabar';
    assert.equal(fossils.canUseHere(), true);
    assert.equal(fossils.availability('dome_fossil').result, 'ready');
  });
});
