/**
 * @file Release1153.test.js
 * @brief Tests for release 1.15.3: Epic Legendary Dungeon Boss scaling, 90s hard enrage wipe,
 * non-legendary regional dex gate for Johto transit, and progressive daycare fee tiers.
 */

import { describe, assert } from './TestRunner.js';
import { DungeonBattleRules } from '../src/systems/battle/DungeonBattleRules.js';
import { BattleSession } from '../src/systems/battle/BattleSession.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { HatcheryRules } from '../src/config/HatcheryRules.js';
import { Random } from '../src/core/Random.js';
import { FacilityRules } from '../src/config/FacilityRules.js';

describe('Release 1.15.3 Specifications', (test) => {
  test('epic legendary dungeon boss scales with x35 HP, level 70+ and legendaryBoss tag', () => {
    // Encounters list featuring Articuno
    const encounters = [
      { species: 'articuno', minLevel: 50, maxLevel: 50, rarity: 'rare' }
    ];
    const team = [PokemonFactory.create('pikachu', 50)];
    const random = Random.sequence([0.5]);

    const drawn = DungeonBattleRules.draw(encounters, team, random, {
      tileType: 'boss',
      floor: 5,
      depth: 5
    });

    assert.ok(drawn, 'boss should be drawn');
    assert.equal(drawn.pokemon.species, 'articuno');
    assert.ok(drawn.pokemon.level >= 70, `Legendary boss should be at least level 70 (got ${drawn.pokemon.level})`);
    assert.equal(drawn.foeOptions.hpMultiplier, 35, 'Legendary boss HP multiplier should be x35');
    assert.equal(drawn.foeOptions.legendaryBoss, true, 'Legendary boss should have legendaryBoss tag set');
    assert.equal(drawn.introKey, 'wild_legendary_appeared');
  });

  test('legendary boss hard enrage timer triggers lethal wipe after 90 seconds', () => {
    const playerPokemon = PokemonFactory.create('charizard', 100);
    const legendaryPokemon = PokemonFactory.create('mewtwo', 100);

    const session = new BattleSession({
      team: [playerPokemon],
      foe: legendaryPokemon,
      foeOptions: {
        npc: true,
        dungeonBoss: true,
        legendaryBoss: true,
        hpMultiplier: 35
      },
      random: Random.sequence([1.0])
    });

    // Simulate 80 seconds: player is alive, no wipe yet
    session.update(80);
    assert.ok(!session.active.isFainted(), 'Player Pokémon should survive before 90 seconds');
    assert.equal(session.legendaryElapsedMs, 80000);

    // Advance remaining 10 seconds to reach 90s hard enrage
    session.update(10);
    assert.ok(session.legendaryElapsedMs >= 90000);
    assert.ok(session.active.isFainted(), 'Player Pokémon should be wiped out by hard enrage at 90 seconds');
  });

  test('regional transit gate to Johto requires League victory + non-legendary Kanto Dex', () => {
    const save = SaveSystem.getInstance().createNewSave('TransitGateTest', 'charmander');
    save.statistics.recordLeague('kanto');

    // Register all non-legendary Kanto species
    const kantoSpecies = PokemonDB.getInstance().getByRegion('kanto');
    const nonLegendaryKanto = kantoSpecies.filter((sp) => !HatcheryRules.LEGENDARY_DEX.includes(sp.dex));

    // Initially missing 1 species
    for (let i = 0; i < nonLegendaryKanto.length - 1; i++) {
      save.pokedex.markCaught(nonLegendaryKanto[i].id);
    }

    const access = FeatureAccessSystem.getInstance();
    const statusMissing = access._regionAccessStatus('johto', save);
    assert.equal(statusMissing.unlocked, false, 'Johto should be locked if non-legendary dex is incomplete');
    assert.equal(statusMissing.reason, 'dex');

    // Catch the last non-legendary species (without catching Mewtwo or Articuno)
    save.pokedex.markCaught(nonLegendaryKanto[nonLegendaryKanto.length - 1].id);

    const statusComplete = access._regionAccessStatus('johto', save);
    assert.equal(statusComplete.unlocked, true, 'Johto should unlock once all non-legendaries are caught');
  });

  test('daycare progressive fee tiers charge base fee + per-level gained', () => {
    const save = SaveSystem.getInstance().createNewSave('DaycareFeeTest', 'charmander');
    save.team[0].setLevel(50);
    const reserve = PokemonFactory.create('rattata', 10);
    save.currencies.add(FacilityRules.MONEY_CURRENCY, 5000);
    save.access.unlockFeature('hatchery');
    save.access.unlockLocation('route5');

    const hatchery = HatcherySystem.getInstance();
    hatchery.init();

    try {
      // Deposit Rattata at level 10
      save.collection.add(reserve);
      save.teamMembers.setUids([save.team[0].uid]);
      const deposit = hatchery.depositPokemon(reserve.uid, 0);
      assert.equal(deposit.result, 'ready');

      // Zero levels gained: base fee 100 ₽
      assert.equal(hatchery.getDaycareWithdrawFee(0), 100);

      // Level up +3 levels (to level 13)
      reserve.setLevel(13);
      assert.equal(hatchery.getDaycareWithdrawFee(0), 400); // 100 + 3 * 100 = 400 ₽

      const initialMoney = save.currencies.get(FacilityRules.MONEY_CURRENCY);
      const withdraw = hatchery.withdrawPokemon(0);
      assert.equal(withdraw.result, 'ready');
      assert.equal(withdraw.feePaid, 400);
      assert.equal(save.currencies.get(FacilityRules.MONEY_CURRENCY), initialMoney - 400);
    } finally {
      hatchery.onDestroy();
    }
  });
});
