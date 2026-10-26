/**
 * @file DaycareRegionalCap.test.js
 * @brief Tests regional daycare level cap: Pokémon deposited in daycare cannot exceed the level
 * of the player's best owned Pokémon originating from the same native region.
 */
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { HatcheryRules } from '../src/config/HatcheryRules.js';
import { EventBus } from '../src/core/EventBus.js';
import { BattleFoeKnockedOutEvent } from '../src/core/events/BattleFoeKnockedOutEvent.js';
import { CONTENT_FEATURES } from '../src/config/ContentAccessRules.js';

describe('Regional Daycare Level Cap', (test) => {
  test('daycare level cap is bounded by the highest level Pokémon of the same native region', () => {
    const save = SaveSystem.getInstance().createNewSave('RegionalDaycareTest', 'charmander');
    save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
    const hatchery = HatcherySystem.getInstance();
    hatchery.init();

    // User Scenario:
    // Rattata: Level 100 (Kanto)
    // Totodile: Level 30 (Johto)
    // Hoothoot: Level 5 (Johto)
    const rattata = PokemonFactory.create('rattata', 100);
    const totodile = PokemonFactory.create('totodile', 30);
    const hoothoot = PokemonFactory.create('hoothoot', 5);

    BoxSystem.getInstance().addPokemon(rattata, { deferSave: true });
    BoxSystem.getInstance().addPokemon(totodile, { deferSave: true });
    BoxSystem.getInstance().addPokemon(hoothoot, { deferSave: true });

    // Verify regional cap calculations
    // For Hoothoot (Johto), the best Johto Pokémon is Totodile (Lv 30)
    const capJohto = hatchery.getRegionalDaycareCap(save, 'hoothoot', hoothoot.uid);
    assert.equal(capJohto, 30, 'Hoothoot cap should be bounded by Totodile (Lv 30), not Rattata (Lv 100)');

    // For a Kanto Pokémon (e.g. Charmander Lv 5), the best Kanto Pokémon is Rattata (Lv 100)
    const capKanto = hatchery.getRegionalDaycareCap(save, 'charmander', save.team[0].uid);
    assert.equal(capKanto, 100, 'Kanto Pokémon cap should be bounded by Rattata (Lv 100)');

    // Deposit Hoothoot into daycare slot 0
    const depositResult = hatchery.depositPokemon(hoothoot.uid, 0);
    assert.equal(depositResult.result, 'ready');

    // Simulate enough knockouts to level Hoothoot to Lv 30 and beyond
    // From Lv 5 to Lv 30 requires 25 levels * 5 KOs = 125 KOs.
    // We send 300 KOs (enough for 60 levels).
    for (let i = 0; i < 300; i++) {
      EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent('rattata', 5, 'route1', { deferSave: true }));
    }

    // Hoothoot must be capped at Level 30!
    assert.equal(hoothoot.level, 30, 'Hoothoot must stop leveling at Level 30 due to Johto regional cap');

    // Now, train Totodile in active play to Level 35
    totodile.setLevel(35);

    // Verify new cap for Hoothoot is 35
    const updatedCap = hatchery.getRegionalDaycareCap(save, 'hoothoot', hoothoot.uid);
    assert.equal(updatedCap, 35);

    // Send more knockouts (e.g. 50 KOs)
    for (let i = 0; i < 50; i++) {
      EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent('rattata', 5, 'route1', { deferSave: true }));
    }

    // Hoothoot can now reach Level 35!
    assert.equal(hoothoot.level, 35, 'Hoothoot can level up to 35 after player trains Totodile to 35');
  });

  test('candidates filtering respects regional cap', () => {
    const save = SaveSystem.getInstance().createNewSave('CandidateCapTest', 'charmander');
    save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
    const hatchery = HatcherySystem.getInstance();
    hatchery.init();

    const totodile = PokemonFactory.create('totodile', 25);
    const hoothootMaxed = PokemonFactory.create('hoothoot', 25);
    const sentretLow = PokemonFactory.create('sentret', 10);

    BoxSystem.getInstance().addPokemon(totodile, { deferSave: true });
    BoxSystem.getInstance().addPokemon(hoothootMaxed, { deferSave: true });
    BoxSystem.getInstance().addPokemon(sentretLow, { deferSave: true });

    const candidates = hatchery.getCandidates(0);
    const candidateUids = candidates.map((c) => c.uid);

    assert.ok(candidateUids.includes(sentretLow.uid), 'Sentret Lv 10 is eligible (< cap 25)');
    assert.ok(!candidateUids.includes(hoothootMaxed.uid), 'Hoothoot Lv 25 is ineligible (>= cap 25)');
  });
});
