/**
 * @file Release1151.test.js
 * @brief Tests for release 1.15.1: Wild base form routes, adaptive training BST scaling,
 * Cross-STAB combo damage, and Black Market story unlocking.
 */

import { describe, assert } from './TestRunner.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { TrainingSystem, TrainingResults } from '../src/systems/TrainingSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { DamageCalculator } from '../src/systems/battle/DamageCalculator.js';
import { BattleCombatant } from '../src/systems/battle/BattleCombatant.js';
import { BattleField } from '../src/systems/battle/BattleField.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { Random } from '../src/core/Random.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { FeatureAccessSystem } from '../src/systems/FeatureAccessSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { CONTENT_FEATURES } from '../src/config/ContentAccessRules.js';
import { TrainingRules } from '../src/config/TrainingRules.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { PokemonRankRules } from '../src/systems/box/PokemonRankRules.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { TrainingOpponents } from '../src/systems/facilities/TrainingOpponents.js';

describe('Release 1.15.1 Specifications', (test) => {
  test('wild routes feature basic pre-evolutions only', () => {
    const locDb = LocationDB.getInstance();
    const route17 = locDb.getById('route17');
    const route18 = locDb.getById('route18');
    const route14 = locDb.getById('route14');
    const route23 = locDb.getById('route23');
    const route19 = locDb.getById('route19');

    // Route 17 & 18 must have rattata, not raticate
    assert.ok(route17.encounters.some((s) => s.species === 'rattata'), 'Route 17 has Rattata');
    assert.ok(!route17.encounters.some((s) => s.species === 'raticate'), 'Route 17 has no Raticate');
    assert.ok(route18.encounters.some((s) => s.species === 'rattata'), 'Route 18 has Rattata');
    assert.ok(!route18.encounters.some((s) => s.species === 'raticate'), 'Route 18 has no Raticate');

    // Route 14 must have oddish & bellsprout, not gloom & weepinbell
    assert.ok(route14.encounters.some((s) => s.species === 'oddish'));
    assert.ok(route14.encounters.some((s) => s.species === 'bellsprout'));
    assert.ok(!route14.encounters.some((s) => s.species === 'gloom'));
    assert.ok(!route14.encounters.some((s) => s.species === 'weepinbell'));

    // Route 23 must have spearow & ekans, not fearow & arbok
    assert.ok(route23.encounters.some((s) => s.species === 'spearow'));
    assert.ok(route23.encounters.some((s) => s.species === 'ekans'));
    assert.ok(!route23.encounters.some((s) => s.species === 'fearow'));
    assert.ok(!route23.encounters.some((s) => s.species === 'arbok'));

    // Sea routes must have tentacool, not tentacruel
    assert.ok(route19.encounters.some((s) => s.species === 'tentacool'));
    assert.ok(!route19.encounters.some((s) => s.species === 'tentacruel'));
  });

  test('training waves are drawn from the rank of the trainee, without duplicates or legendaries', () => {
    const save = SaveSystem.getInstance().createNewSave('TrainingRankTest', 'charmander');
    save.access.unlockFeature(CONTENT_FEATURES.TRAINING);
    const training = TrainingSystem.getInstance();
    training.init();

    // Caterpie: base stat total 195, rank E. Dragonite: 600, rank S.
    const caterpie = PokemonFactory.create('caterpie', 20);
    BoxSystem.getInstance().addPokemon(caterpie, { deferSave: true });
    const dragonite = PokemonFactory.create('dragonite', 20);
    BoxSystem.getInstance().addPokemon(dragonite, { deferSave: true });

    for (const [trainee, rank] of [[caterpie, 'E'], [dragonite, 'S']]) {
      const random = new SeededRandom(20261024);
      const waves = training._createOpponents(trainee, random, 'move');
      assert.equal(waves.length, TrainingRules.OPPONENT_COUNT, 'a session is 30 waves');
      assert.equal(PokemonRankRules.getRank(trainee), rank);
      const species = waves.map((wave) => wave.species);
      assert.equal(new Set(species).size, species.length, 'a species appears at most once');
      assert.ok(!species.includes(trainee.species), 'the trainee never fights itself');
      const order = PokemonRankRules.order;
      const distance = (speciesId) => Math.abs(order.indexOf(PokemonRankRules.getRank(speciesId)) - order.indexOf(rank));
      const distances = waves.map((wave) => distance(wave.species));
      for (const wave of waves) {
        assert.ok(!PokemonRules.LEGENDARY_DEX.includes(wave.getSpecies().dex), `${wave.species} is legendary`);
        assert.ok(distance(wave.species) <= 1, `${wave.species} is not of the rank of the trainee or its neighbour`);
      }
      // The rank of the trainee is used first and in full before any neighbour is drawn.
      const own = TrainingOpponents.speciesOfRank(rank).filter((id) => id !== trainee.species).length;
      assert.equal(distances.filter((value) => value === 0).length, Math.min(waves.length, own), 'own rank first');
      assert.deepEqual(distances, [...distances].sort((a, b) => a - b), 'the ladder never comes back to an easier rank');
      // Level curve: from 60 % to 120 % of the mode base level (move: -2), never under MIN_OPPONENT_LEVEL.
      const levels = waves.map((wave) => wave.level);
      const base = trainee.level + TrainingRules.MODE_LEVEL_OFFSETS.move;
      assert.ok(levels[0] <= Math.round(base * TrainingRules.WAVE_LEVEL_FACTOR_MIN) + 1, `first wave ${levels[0]}`);
      assert.ok(levels.at(-1) >= Math.round(base * TrainingRules.WAVE_LEVEL_FACTOR_MAX) - 1, `last wave ${levels.at(-1)}`);
      assert.ok(levels.every((level, index) => index === 0 || level >= levels[index - 1] - 2), 'the ladder never collapses');
    }
  });

  test('Cross-STAB combo grants +35% damage when alternating between dual STAB types', () => {
    // Charizard is Fire / Flying
    const charizard = PokemonFactory.create('charizard', 50);
    const foe = PokemonFactory.create('snorlax', 50);

    const attacker = new BattleCombatant(charizard, { teamSide: true });
    const defender = new BattleCombatant(foe, { teamSide: false });
    const field = new BattleField();
    const moves = MoveDB.getInstance();

    const flamethrower = moves.getById('flamethrower');
    const airSlash = moves.getById('air_shlash');

    // First attack: Air Slash (sets lastCrossType to 'flying')
    attacker.lastCrossType = null;
    const firstHit = DamageCalculator.compute({
      attacker,
      defender,
      move: airSlash,
      field,
      random: Random.sequence([1.0])
    });

    // Repeating the same type (Flying) gives no cross combo
    attacker.lastCrossType = 'flying';
    const sameTypeHit = DamageCalculator.compute({
      attacker,
      defender,
      move: airSlash,
      field,
      random: Random.sequence([1.0])
    });

    // Alternating to second STAB type (Fire - Flamethrower) triggers Cross-STAB (+35%)
    attacker.lastCrossType = 'flying';
    const crossStabHit = DamageCalculator.compute({
      attacker,
      defender,
      move: flamethrower,
      field,
      random: Random.sequence([1.0])
    });

    // Baseline Flamethrower without cross type
    attacker.lastCrossType = null;
    const baseFireHit = DamageCalculator.compute({
      attacker,
      defender,
      move: flamethrower,
      field,
      random: Random.sequence([1.0])
    });

    assert.ok(crossStabHit.damage > baseFireHit.damage, 'Cross-STAB hit should be stronger than base STAB hit');
    const ratio = crossStabHit.damage / baseFireHit.damage;
    assert.ok(ratio >= 1.30 && ratio <= 1.40, `Cross-STAB ratio should be ~1.35x, got ${ratio.toFixed(2)}x`);
  });

  test('Black Market access unlocks via Celadon Rocket Hideout quest completion', () => {
    const save = SaveSystem.getInstance().createNewSave('MarketQuestTest', 'charmander');
    const access = FeatureAccessSystem.getInstance();

    // 0 badges, not Johto, no quests completed
    assert.equal(access.isMarketUnlocked(), false);

    // Complete Celadon hideout quest main.33
    save.quests.completed = ['main.33'];
    assert.equal(access.isMarketUnlocked(), true, 'Black Market unlocks after completing main.33');
  });
});
