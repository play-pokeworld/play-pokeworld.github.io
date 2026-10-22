/**
 * @file Roaming.test.js
 * @brief UTC roaming assignment and ordinary encounter selection.
 */
import { describe, assert } from './TestRunner.js';
import { Random } from '../src/core/Random.js';
import { RoamingRules } from '../src/config/RoamingRules.js';
import { BattleConfig } from '../src/config/BattleConfig.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { RoamingSystem } from '../src/systems/RoamingSystem.js';
import { EncounterRules } from '../src/systems/battle/EncounterRules.js';

describe('Roaming Pokémon', (test) => {
  test('configured regional route pools use valid locations and species', () => {
    const locations = LocationDB.getInstance();
    const species = PokemonDB.getInstance();
    for (const pool of Object.values(RoamingRules.REGIONS)) {
      assert.ok(pool.routes.every((id) => locations.has(id)), 'all rotating route ids exist');
      assert.ok(pool.species.every((id) => species.has(id)), 'all rotating species ids exist');
      assert.equal(pool.routes.length > Math.max(...pool.offsets), true);
    }
  });

  test('the shared UTC window deterministically assigns main-reference roamers', () => {
    const windowMs = RoamingRules.ROTATION_MS;
    assert.equal(RoamingSystem.getSpeciesAt('route1', 0), 'articuno');
    assert.equal(RoamingSystem.getSpeciesAt('route5', 0), 'zapdos');
    assert.equal(RoamingSystem.getSpeciesAt('route7', 0), 'moltres');
    assert.equal(RoamingSystem.getSpeciesAt('route13', 0), 'mew');
    assert.equal(RoamingSystem.getSpeciesAt('route22', windowMs), 'articuno');

    assert.equal(RoamingSystem.getSpeciesAt('jroute34', 0), 'raikou');
    assert.equal(RoamingSystem.getSpeciesAt('jroute43', 0), 'entei');
    assert.equal(RoamingSystem.getSpeciesAt('jroute31', 0), 'celebi');
    assert.equal(RoamingSystem.getSpeciesAt('nationalpark', 0), null, 'Rework dungeon locations never host roamers');
    assert.equal(RoamingSystem.getSpeciesAt('jroute44', 8 * windowMs), null, 'dungeon exclusion applies even when the rotation selects that id');

    assert.equal(RoamingSystem.getSpeciesAt('route117', 0), 'latias');
    assert.equal(RoamingSystem.getSpeciesAt('route121', 0), 'latios');
    assert.equal(RoamingSystem.getSpeciesAt('route103', 0), 'jirachi');
    assert.equal(RoamingSystem.getSpeciesAt('route112', 0), 'deoxys');
    assert.equal(RoamingSystem.getSpeciesAt('route19', 21 * windowMs), 'articuno', 'Kanto sea routes are included');
    assert.equal(RoamingSystem.getSpeciesAt('viridian', 0), null, 'towns are excluded');
  });

  test('the 12-hour clock reports a UTC-boundary countdown', () => {
    const windowMs = RoamingRules.ROTATION_MS;
    assert.equal(RoamingSystem.getRotationWindow(windowMs - 1), 0);
    assert.equal(RoamingSystem.getRotationWindow(windowMs), 1);
    assert.equal(RoamingSystem.getTimeUntilRotation(0), windowMs);
    assert.equal(RoamingSystem.getTimeUntilRotation(windowMs - 1000), 1000);
    assert.equal(RoamingSystem.formatCountdown(0), '12:00:00');
    assert.equal(RoamingSystem.formatCountdown(windowMs - 1000), '00:00:01');
  });

  test('ordinary wild draws preserve the original Rework rarity-weighted entry selection', () => {
    const table = [
      { species: 'pidgey', minLevel: 3, maxLevel: 3, rarity: 'common' },
      { species: 'rattata', minLevel: 4, maxLevel: 4, rarity: 'common' },
      { species: 'weedle', minLevel: 5, maxLevel: 5, rarity: 'uncommon' },
      { species: 'spearow', minLevel: 6, maxLevel: 6, rarity: 'rare' }
    ];
    assert.deepEqual(BattleConfig.RARITY_WEIGHTS, { common: 60, uncommon: 30, rare: 10, very_rare: 3 });

    const common = EncounterRules.drawWildEncounter(table, [], Random.sequence([0.5, 0.59, 0.5, 0.5]));
    const uncommon = EncounterRules.drawWildEncounter(table, [], Random.sequence([0.5, 0.8, 0.5, 0.5]));
    const rare = EncounterRules.drawWildEncounter(table, [], Random.sequence([0.5, 0.95, 0.5, 0.5]));
    assert.equal(common.bucket, 'common');
    assert.equal(common.pokemon.species, 'rattata', 'the two common entries keep their original weight');
    assert.equal(uncommon.bucket, 'uncommon');
    assert.equal(uncommon.pokemon.species, 'weedle');
    assert.equal(rare.bucket, 'rare');
    assert.equal(rare.pokemon.species, 'spearow');
  });

  test('a roaming roll has a 1% threshold, fixed level 75, and no dungeon override', () => {
    const table = [{ species: 'pidgey', minLevel: 3, maxLevel: 3, rarity: 'common' }];
    const roaming = EncounterRules.drawWildEncounter(
      table,
      [],
      Random.sequence([0.009, 0.5, 0.5, 0.5]),
      { roamingSpecies: 'articuno' }
    );
    assert.equal(roaming.isRoaming, true);
    assert.equal(roaming.pokemon.species, 'articuno');
    assert.equal(roaming.pokemon.level, RoamingRules.ENCOUNTER_LEVEL);

    const threshold = EncounterRules.drawWildEncounter(
      table,
      [],
      Random.sequence([0.01, 0.5, 0, 0, 0.5]),
      { roamingSpecies: 'articuno' }
    );
    assert.equal(threshold.isRoaming, false, '1.00% is not below the strict 1% roll');
    assert.equal(threshold.pokemon.species, 'pidgey');

    const forcedDungeon = EncounterRules.drawWildEncounter(
      table,
      [],
      Random.sequence([0, 0, 0.5]),
      { bucketHint: 'common', roamingSpecies: 'articuno' }
    );
    assert.equal(forcedDungeon.isRoaming, false);
    assert.equal(forcedDungeon.pokemon.species, 'pidgey');
  });
});
