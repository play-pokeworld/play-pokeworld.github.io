/**
 * @file Release1152.test.js
 * @brief Tests for release 1.15.2: Specific battle moves (weather_ball, stored_power, body_press)
 * and battle fatigue wear with Stamina talent mitigation.
 */

import { describe, assert } from './TestRunner.js';
import { DamageCalculator } from '../src/systems/battle/DamageCalculator.js';
import { BattleCombatant } from '../src/systems/battle/BattleCombatant.js';
import { BattleField } from '../src/systems/battle/BattleField.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { MoveTyping } from '../src/systems/battle/MoveTyping.js';
import { Weathers } from '../src/data/battle/BattleFields.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { Random } from '../src/core/Random.js';

describe('Release 1.15.2 Specifications', (test) => {
  test('weather_ball dynamically adapts move type and doubles damage multiplier under weather', () => {
    const moves = MoveDB.getInstance();
    const weatherBall = moves.getById('weather_ball');
    const user = PokemonFactory.create('castform', 50);
    const combatant = new BattleCombatant(user, { teamSide: true });

    // Clear weather
    const clearField = new BattleField();
    const clearResult = MoveTyping.resolve(combatant, weatherBall, clearField);
    assert.equal(clearResult.type, 'normal');
    assert.equal(clearResult.damageMult, 1);

    // Sun weather
    const sunField = new BattleField();
    sunField.setWeather(Weathers.SUN, 5);
    const sunResult = MoveTyping.resolve(combatant, weatherBall, sunField);
    assert.equal(sunResult.type, 'fire');
    assert.equal(sunResult.damageMult, 2);

    // Rain weather
    const rainField = new BattleField();
    rainField.setWeather(Weathers.RAIN, 5);
    const rainResult = MoveTyping.resolve(combatant, weatherBall, rainField);
    assert.equal(rainResult.type, 'water');
    assert.equal(rainResult.damageMult, 2);

    // Sand weather
    const sandField = new BattleField();
    sandField.setWeather(Weathers.SAND, 5);
    const sandResult = MoveTyping.resolve(combatant, weatherBall, sandField);
    assert.equal(sandResult.type, 'rock');
    assert.equal(sandResult.damageMult, 2);

    // Hail weather
    const hailField = new BattleField();
    hailField.setWeather(Weathers.HAIL, 5);
    const hailResult = MoveTyping.resolve(combatant, weatherBall, hailField);
    assert.equal(hailResult.type, 'ice');
    assert.equal(hailResult.damageMult, 2);
  });

  test('stored_power scales power with positive stat stages (+30 per boost)', () => {
    const moves = MoveDB.getInstance();
    const storedPower = moves.getById('stored_power');
    const field = new BattleField();

    const user = PokemonFactory.create('espeon', 50);
    const foe = PokemonFactory.create('snorlax', 50);

    const attacker = new BattleCombatant(user, { teamSide: true });
    const defender = new BattleCombatant(foe, { teamSide: false });

    // Base damage with neutral stat modifiers
    attacker.statMods = { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 };
    const baseHit = DamageCalculator.compute({
      attacker,
      defender,
      move: storedPower,
      field,
      random: Random.sequence([1.0])
    });

    // Attacker gets +2 Atk (2.0) and +1 Spe (1.5) (+3 positive stages -> +90 BP)
    // We boost Atk and Spe so SpA modifier remains 1.0 to isolate the BP increase
    attacker.statMods = { atk: 2.0, def: 1.0, spa: 1.0, spd: 0.5, spe: 1.5 };
    const boostedHit = DamageCalculator.compute({
      attacker,
      defender,
      move: storedPower,
      field,
      random: Random.sequence([1.0])
    });

    assert.ok(boostedHit.damage > baseHit.damage * 2, 'Stored Power damage should more than double with 3 positive boosts');
  });

  test('body_press damage scales on user Defense instead of Attack', () => {
    const moves = MoveDB.getInstance();
    const bodyPress = moves.getById('body_press');
    const field = new BattleField();

    const steelix = PokemonFactory.create('steelix', 50);
    const foe = PokemonFactory.create('snorlax', 50);

    const attacker = new BattleCombatant(steelix, { teamSide: true });
    const defender = new BattleCombatant(foe, { teamSide: false });

    // Baseline hit at neutral modifiers
    attacker.statMods = { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 };
    const neutralHit = DamageCalculator.compute({
      attacker,
      defender,
      move: bodyPress,
      field,
      random: Random.sequence([1.0])
    });

    // Boosting Defense by +2 stages (2.0) should dramatically increase damage
    attacker.statMods = { atk: 1.0, def: 2.0, spa: 1.0, spd: 1.0, spe: 1.0 };
    const defBoostHit = DamageCalculator.compute({
      attacker,
      defender,
      move: bodyPress,
      field,
      random: Random.sequence([1.0])
    });

    // Boosting Attack by +2 stages (2.0) should NOT affect Body Press damage
    attacker.statMods = { atk: 2.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 };
    const atkBoostHit = DamageCalculator.compute({
      attacker,
      defender,
      move: bodyPress,
      field,
      random: Random.sequence([1.0])
    });

    assert.ok(defBoostHit.damage > neutralHit.damage, 'Body Press should scale up when Defense is boosted');
    assert.equal(atkBoostHit.damage, neutralHit.damage, 'Body Press should not change when Attack is boosted');
  });

  test('AFK consecutive battles (> 50 KOs) trigger team fatigue wear with Stamina halving wear', () => {
    const save = SaveSystem.getInstance().createNewSave('FatigueWearTest', 'charmander');
    const regularPokemon = save.team[0];
    regularPokemon.level = 50;

    const staminaPokemon = PokemonFactory.create('machop', 50);
    staminaPokemon.talent = 'stamina';
    TeamSystem.getInstance().addPokemon(staminaPokemon);

    regularPokemon.hp = regularPokemon.getMaxHp();
    staminaPokemon.hp = staminaPokemon.getMaxHp();

    const maxHpReg = regularPokemon.getMaxHp();
    const maxHpStam = staminaPokemon.getMaxHp();

    SaveSystem.getInstance().setCurrentSave(save);
    const battle = BattleSystem.getInstance();

    const mockFoe = PokemonFactory.create('rattata', 5);

    const mockSession = {
      playerKOs: 60,
      log: { add: () => {} },
      pauseForCapture: () => {},
      foe: { pokemon: mockFoe },
      field: new BattleField()
    };

    battle._session = mockSession;
    battle._locationId = 'route1';
    battle._activeRun = { playerKOs: 0, moneyGained: 0, catches: [], items: [], damageByPokemon: {}, battles: 0, wins: 0, expGained: 0 };

    const mockEncounter = {
      pokemon: mockFoe,
      money: 10,
      baseExp: 20
    };

    battle._settleWildEncounter(save, mockSession, mockEncounter);

    assert.ok(regularPokemon.hp < maxHpReg, 'Regular Pokémon should suffer fatigue wear damage after 60 KOs');
    assert.ok(staminaPokemon.hp <= maxHpStam, 'Stamina Pokémon should suffer wear');

    const regWearRatio = (maxHpReg - regularPokemon.hp) / maxHpReg;
    const stamWearRatio = (maxHpStam - staminaPokemon.hp) / maxHpStam;
    assert.ok(regWearRatio > stamWearRatio, 'Stamina talent should cut fatigue wear ratio in half');
  });
});
