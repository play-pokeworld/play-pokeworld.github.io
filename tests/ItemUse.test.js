/**
 * @file ItemUse.test.js
 * @brief Supported Kanto item actions, atomic persistence, evolution identity and move learning.
 */
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { ItemUseSystem } from '../src/systems/ItemUseSystem.js';
import { MoveLearningSystem } from '../src/systems/MoveLearningSystem.js';
import { ItemUseActions, ItemUseResults, MoveLearningResults } from '../src/config/ItemUseRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { Random } from '../src/core/Random.js';
import { L_en_items } from '../src/localization/en/items.js';
import { L_fr_items } from '../src/localization/fr/items.js';
import { setRoster, addOwned } from './RosterFixtures.js';

const saves = SaveSystem.getInstance();
const itemUse = ItemUseSystem.getInstance();

describe('Item use and move learning', (test) => {
  test('supported Kanto vitamins have descriptions in both languages', () => {
    for (const itemId of ['hp_up', 'protein', 'iron', 'calcium', 'zinc', 'carbos']) {
      assert.ok(L_en_items[itemId]?.desc, `${itemId} has an English description`);
      assert.ok(L_fr_items[itemId]?.desc, `${itemId} has a French description`);
    }
  });

  test('TM/HM use unlocks a move on the selected team or PC Pokémon, then the sheet equips it', () => {
    const save = saves.createNewSave('Item moves', 'pikachu');
    save.player.region = 'kanto';
    const pikachu = PokemonFactory.create('pikachu', 20);
    const squirtle = PokemonFactory.create('squirtle', 15);
    setRoster(save, [pikachu], [squirtle]);
    save.inventory.add('ct24_thunderbolt', 1, { deferSave: true });
    save.inventory.add('cs03_surf', 1, { deferSave: true });

    const originalRandom = itemUse._random;
    try {
      const eligibleThunderbolt = itemUse.getEligibleTargets('ct24_thunderbolt');
      assert.deepEqual(eligibleThunderbolt.map(({ uid, location }) => ({ uid, location })), [
        { uid: pikachu.uid, location: 'team' }
      ]);
      const activeBefore = [...pikachu.moves];
      let writes = 0;
      const original = saves.saveCurrent;
      saves.saveCurrent = function (...args) { writes++; return original.apply(this, args); };
      try {
        const result = itemUse.useOnPokemon('ct24_thunderbolt', pikachu.uid);
        assert.equal(result.result, ItemUseResults.SUCCESS);
        assert.equal(result.action, ItemUseActions.UNLOCK_MOVE);
        assert.ok(pikachu.unlockedMoves.includes('thunderbolt'));
        assert.deepEqual(pikachu.moves, activeBefore, 'the TM unlock does not immediately equip the move');
        assert.equal(save.inventory.count('ct24_thunderbolt'), 0);
        assert.equal(writes, 1, 'unlock and item consumption persist once');

        writes = 0;
        const learned = MoveLearningSystem.getInstance().learnMove(pikachu.uid, 'thunderbolt');
        assert.equal(learned.result, MoveLearningResults.SUCCESS);
        assert.ok(pikachu.moves.includes('thunderbolt'), 'the information-sheet action equips the unlocked move');
        assert.equal(writes, 1, 'move-slot update persists once');
      } finally {
        saves.saveCurrent = original;
      }

      const eligibleSurf = itemUse.getEligibleTargets('cs03_surf');
      assert.deepEqual(eligibleSurf.map(({ uid, location }) => ({ uid, location })), [
        { uid: squirtle.uid, location: 'box' }
      ]);
      const boxedMoves = [...squirtle.moves];
      const boxed = itemUse.useOnPokemon('cs03_surf', squirtle.uid);
      assert.equal(boxed.result, ItemUseResults.SUCCESS);
      assert.ok(squirtle.unlockedMoves.includes('surf'));
      assert.deepEqual(squirtle.moves, boxedMoves);
      assert.equal(save.inventory.count('cs03_surf'), 0);
      assert.equal(MoveLearningSystem.getInstance().learnMove(squirtle.uid, 'surf').result, MoveLearningResults.SUCCESS);
      assert.ok(squirtle.moves.includes('surf'));
    } finally {
      itemUse.setRandom(originalRandom);
    }
  });

  test('Rare Candy and vitamins respect caps and each save exactly once', () => {
    const save = saves.createNewSave('Item consumables', 'charmander');
    save.player.region = 'kanto';
    setRoster(save, [PokemonFactory.create('charmander', 10)]);
    const pokemon = save.team[0];
    save.inventory.add('rarecandy', 1, { deferSave: true });
    save.inventory.add('hp_up', 1, { deferSave: true });
    const originalRandom = itemUse._random;
    const original = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return original.apply(this, args); };
    itemUse.setRandom(Random.sequence([0]));
    try {
      assert.equal(itemUse.useOnPokemon('rarecandy', pokemon.uid).result, ItemUseResults.SUCCESS);
      assert.equal(pokemon.level, 11);
      assert.equal(save.inventory.count('rarecandy'), 0);
      assert.equal(writes, 1);

      writes = 0;
      assert.equal(itemUse.useOnPokemon('hp_up', pokemon.uid).result, ItemUseResults.SUCCESS);
      assert.equal(pokemon.evs.hp, 1, 'the seeded vitamin adds one EV to the first eligible stat');
      assert.equal(save.inventory.count('hp_up'), 0);
      assert.equal(writes, 1);

      pokemon.evs = { hp: 18, atk: 18, def: 0, spa: 0, spd: 0, spe: 0 };
      save.inventory.add('protein', 1, { deferSave: true });
      writes = 0;
      const noRoom = itemUse.useOnPokemon('protein', pokemon.uid);
      assert.equal(noRoom.result, ItemUseResults.TARGET_INELIGIBLE);
      assert.equal(save.inventory.count('protein'), 1, 'a capped target does not consume the vitamin');
      assert.equal(writes, 0);
    } finally {
      saves.saveCurrent = original;
      itemUse.setRandom(originalRandom);
    }
  });

  test('an evolution stone keeps the chosen Pokémon and adds the evolved species at level 1', () => {
    const save = saves.createNewSave('Stone evo', 'vulpix');
    save.player.region = 'kanto';
    const vulpix = PokemonFactory.create('vulpix', 25, { nickname: 'Braise' });
    setRoster(save, [vulpix]);
    save.inventory.add('firestone', 1, { deferSave: true });
    const uid = vulpix.uid;
    const level = vulpix.level;
    const exp = vulpix.exp;
    const original = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return original.apply(this, args); };
    try {
      const result = itemUse.useOnPokemon('firestone', uid);
      assert.equal(result.result, ItemUseResults.SUCCESS);
      assert.equal(result.action, ItemUseActions.EVOLVE);
      assert.equal(result.targetSpecies, 'ninetales');
      assert.equal(vulpix.species, 'vulpix', 'the source Pokémon is never transformed');
      assert.equal(vulpix.uid, uid, 'the source keeps its identity');
      assert.equal(vulpix.nickname, 'Braise');
      assert.equal(vulpix.level, level);
      assert.equal(vulpix.exp, exp);
      assert.ok(vulpix.hasEvolvedInto('ninetales'), 'the source records the produced species');
      const evolved = save.collection.getAll().find((entry) => entry.species === 'ninetales');
      assert.ok(evolved, 'the evolved species joins the collection');
      assert.equal(evolved.level, 1, 'the evolved species starts at level 1');
      assert.notEqual(evolved.uid, uid, 'the evolved species is a new Pokémon');
      assert.equal(save.team.length, 1, 'the party is unchanged');
      assert.equal(save.inventory.count('firestone'), 0);
      assert.ok(save.pokedex.isCaught('ninetales'));
      assert.equal(writes, 1);

      const underlevelled = PokemonFactory.create('vulpix', 24);
      addOwned(save, underlevelled);
      save.inventory.add('firestone', 1, { deferSave: true });
      writes = 0;
      assert.equal(itemUse.getEligibleTargets('firestone').some((entry) => entry.uid === underlevelled.uid), false);
      const blocked = itemUse.useOnPokemon('firestone', underlevelled.uid);
      assert.equal(blocked.result, ItemUseResults.TARGET_INELIGIBLE);
      assert.equal(underlevelled.species, 'vulpix');
      assert.equal(save.inventory.count('firestone'), 1);
      assert.equal(writes, 0);
    } finally {
      saves.saveCurrent = original;
    }
  });

  test('active battles block item use without consuming inventory', () => {
    const save = saves.createNewSave('Item battle lock', 'pikachu');
    save.player.region = 'kanto';
    save.player.location = 'route1';
    setRoster(save, [PokemonFactory.create('pikachu', 5)]);
    const pokemon = save.team[0];
    save.inventory.add('rarecandy', 1, { deferSave: true });
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    try {
      assert.ok(battle.startBattle('route1', { chain: false }), 'wild battle starts for the lock check');
      const result = itemUse.useOnPokemon('rarecandy', pokemon.uid);
      assert.equal(result.result, ItemUseResults.BATTLE_ACTIVE);
      assert.equal(save.inventory.count('rarecandy'), 1);
      assert.equal(pokemon.level, 5);
    } finally {
      if (battle.isActive()) battle.endBattle(false);
    }
  });
});
