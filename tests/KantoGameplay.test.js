/**
 * @file KantoGameplay.test.js
 * @brief Story-gated fossil revivals and the connected mine, sale, daycare and training flows.
 */
import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { PokemonUsageSystem } from '../src/systems/PokemonUsageSystem.js';
import { PokemonUsageIds, PokemonActionIds } from '../src/config/PokemonUsageRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { FossilSystem, FossilAvailability } from '../src/systems/FossilSystem.js';
import { HatcherySystem, HatcheryResults } from '../src/systems/HatcherySystem.js';
import { MineSystem, MineResults } from '../src/systems/MineSystem.js';
import { SaleSystem, SaleResults } from '../src/systems/SaleSystem.js';
import { TrainingSystem, TrainingResults } from '../src/systems/TrainingSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { PuzzleDB } from '../src/data/quests/PuzzleDB.js';
import { ObjectiveRegistry } from '../src/data/quests/objectives/ObjectiveRegistry.js';
import { PuzzleSystem, PuzzleOutcomes } from '../src/systems/PuzzleSystem.js';
import { SecretBaseAccessSystem } from '../src/systems/SecretBaseAccessSystem.js';
import { PuzzleSolvedEvent } from '../src/core/events/PuzzleSolvedEvent.js';
import { BattleFoeKnockedOutEvent } from '../src/core/events/BattleFoeKnockedOutEvent.js';
import { MineItemSoldEvent } from '../src/core/events/MineItemSoldEvent.js';
import { FossilRules } from '../src/config/FossilRules.js';
import { HatcheryRules } from '../src/config/HatcheryRules.js';
import { MineRules } from '../src/config/MineRules.js';
import { TrainingRules } from '../src/config/TrainingRules.js';
import { CONTENT_FEATURES } from '../src/config/ContentAccessRules.js';
import { BattleOutcomes } from '../src/systems/battle/BattleSession.js';

const saves = SaveSystem.getInstance();

/** @param {string} name @param {string} location */
function newKantoSave(name, location) {
  const save = saves.createNewSave(name, 'charmander');
  save.player.region = 'kanto';
  save.player.location = location;
  return save;
}

describe('Kanto gameplay', (test) => {
  test('all 64 Kanto main quests are ordered and use registered objectives', () => {
    const chain = QuestDB.getInstance().getMainChain('kanto');
    assert.equal(chain.length, 64);
    assert.equal(chain[0].key, 'main.1');
    assert.equal(chain.at(-1).key, 'main.64');
    assert.ok(chain.every((quest) => quest.region === 'kanto' && ObjectiveRegistry.has(quest.objective.type)));
  });

  test('all 31 localized puzzle definitions validate across three regions', () => {
    const puzzles = PuzzleDB.getInstance();
    assert.equal(puzzles.count, 31);
    assert.equal(puzzles.getByLocation('ceruleancave').length, 2);
    assert.equal(puzzles.getByLocation('seafoamislands').length, 2);
    assert.equal(puzzles.getByLocation('mtmoon').length, 2);
    assert.equal(puzzles.getByLocation('ruinsofalph').length, 2);
    assert.equal(puzzles.getByLocation('sealed_chamber').length, 3);
    assert.equal(puzzles.getByLocation('desert_ruins').length, 3);
    assert.deepEqual(puzzles.validate(), []);
  });

  test('puzzle system checks location and prerequisites before solving', () => {
    const save = newKantoSave('Puzzle locks', 'ceruleancave');
    const puzzles = PuzzleSystem.getInstance();
    assert.equal(puzzles.getStatus('cerulean_sigil_b'), PuzzleOutcomes.LOCKED);
    assert.equal(puzzles.solveSequence('cerulean_sigil_b', ['shade', 'bolt', 'lake', 'rock']).result, PuzzleOutcomes.LOCKED);
    assert.equal(puzzles.solveSequence('mtmoon_fossils_a', ['helix', 'dome', 'amber', 'tools']).result, PuzzleOutcomes.WRONG_LOCATION);
    assert.deepEqual(save.statistics.solvedPuzzles, []);
  });

  test('puzzles grant the first reward once, notify puzzle quests, replay for money, and save atomically', () => {
    const save = newKantoSave('Puzzle rewards', 'ceruleancave');
    const quests = QuestSystem.getInstance();
    const puzzles = PuzzleSystem.getInstance();
    assert.ok(quests.accept('side.s86'));
    const moneyBefore = save.currencies.get('money');
    const itemBefore = save.inventory.count('twisted_spoon');
    const solved = [];
    const onSolved = (event) => solved.push(event);
    EventBus.getInstance().subscribe(PuzzleSolvedEvent, onSolved);
    const originalSaveCurrent = saves.saveCurrent;
    let writes = 0;
    saves.saveCurrent = function (...args) {
      writes++;
      return originalSaveCurrent.apply(this, args);
    };
    try {
      const first = puzzles.solveSequence('cerulean_sigil_a', ['rock', 'lake', 'bolt', 'shade']);
      assert.equal(first.result, PuzzleOutcomes.SOLVED_FIRST);
      assert.equal(puzzles.getStatus('cerulean_sigil_a'), PuzzleOutcomes.SOLVED);
      assert.equal(save.currencies.get('money'), moneyBefore + 6000);
      assert.equal(save.inventory.count('twisted_spoon'), itemBefore + 1);
      assert.equal(save.quests.getProgress('side.s86'), 1, 'the active matching puzzle objective progresses');
      assert.equal(solved.length, 1);
      assert.equal(solved[0].puzzleId, 'cerulean_sigil_a');
      assert.equal(solved[0].firstTime, true);
      assert.equal(solved[0].deferSave, true);
      assert.equal(writes, 1, 'the whole solve is persisted with one write');

      writes = 0;
      const again = puzzles.solveSequence('cerulean_sigil_a', ['rock', 'lake', 'bolt', 'shade']);
      assert.equal(again.result, PuzzleOutcomes.SOLVED_AGAIN);
      assert.equal(save.currencies.get('money'), moneyBefore + 6600);
      assert.equal(save.inventory.count('twisted_spoon'), itemBefore + 1, 'replays do not grant the item again');
      assert.equal(solved.length, 2);
      assert.equal(solved[1].firstTime, false);
      assert.equal(writes, 1, 'a replay also has one save write');
    } finally {
      saves.saveCurrent = originalSaveCurrent;
      EventBus.getInstance().unsubscribe(PuzzleSolvedEvent, onSolved);
    }
  });

  test('code puzzle answers normalize accents and case', () => {
    const save = newKantoSave('Puzzle code', 'mtmoon');
    save.statistics.recordPuzzle('mtmoon_fossils_a');
    const result = PuzzleSystem.getInstance().solveCode('mtmoon_lunar_code', 'LúNe');
    assert.equal(result.result, PuzzleOutcomes.SOLVED_FIRST);
    assert.equal(result.firstTime, true);
    assert.equal(save.inventory.count('moonstone'), 1);
  });

  test('secret base stays hidden until the Hoenn main.216 milestone is completed', () => {
    const save = newKantoSave('Base milestone', 'route111');
    save.player.region = 'hoenn';
    const access = SecretBaseAccessSystem.getInstance();
    const unlockStep = access.getUnlockStep();
    save.quests.setMainStep('hoenn', unlockStep - 1);
    assert.equal(access.isUnlocked(), false);
    save.quests.setMainStep('hoenn', unlockStep);
    assert.equal(access.isUnlocked(), true);
  });

  test('fossil revival is locked until main quest Kanto 25 is active', () => {
    const save = newKantoSave('Fossil lock', FossilRules.LAB_LOCATION_ID);
    save.inventory.add('helix_fossil', 1);
    const fossils = FossilSystem.getInstance();

    assert.equal(save.quests.getMainStep('kanto'), 0);
    assert.equal(fossils.isRevivalUnlocked(save), false);
    assert.empty(fossils.getCandidates());
    assert.equal(fossils.availability('helix_fossil').result, FossilAvailability.STORY_LOCKED);
    assert.equal(fossils.revive('helix_fossil').result, FossilAvailability.STORY_LOCKED);
    assert.equal(save.inventory.count('helix_fossil'), 1, 'locked revival does not consume the fossil');

    save.quests.setMainStep('kanto', FossilRules.UNLOCK_MAIN_STEP);
    assert.equal(fossils.isRevivalUnlocked(save), true);
    assert.equal(fossils.availability('helix_fossil').result, FossilAvailability.READY);
  });

  test('the Pewter laboratory revives an unlocked fossil and consumes exactly one', () => {
    const save = newKantoSave('Fossil revival', FossilRules.LAB_LOCATION_ID);
    save.quests.setMainStep('kanto', FossilRules.UNLOCK_MAIN_STEP);
    save.inventory.add('helix_fossil', 2);

    const result = FossilSystem.getInstance().revive('helix_fossil');
    assert.equal(result.result, FossilAvailability.READY);
    assert.equal(result.speciesId, 'omanyte');
    assert.equal(save.inventory.count('helix_fossil'), 1);
    assert.ok(save.collection.getAll().some((pokemon) => pokemon.species === 'omanyte'));
  });

  test('hatchery operations require a persisted access fact outside the unlocked story area', () => {
    const save = newKantoSave('Locked hatchery', 'pallet');
    const hatchery = HatcherySystem.getInstance();

    assert.equal(hatchery.isUnlocked(), false);
    assert.equal(hatchery.upgradeSlot().result, HatcheryResults.FEATURE_LOCKED);
    save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
    assert.equal(hatchery.isUnlocked(), true, 'a migrated sticky unlock survives outside the original area');
    assert.equal(hatchery.upgradeSlot().result, HatcheryResults.NEED_QUEST_POINTS);
    save.currencies.add('questPoint', HatcheryRules.SLOT_UPGRADE_COSTS[0]);
    assert.equal(hatchery.upgradeSlot().result, HatcheryResults.READY, 'unlocked upgrades work remotely');
  });

  test('hatchery upgrades and deposits use TeamSystem; daycare KOs level and return the Pokémon', () => {
    const hatchery = HatcherySystem.getInstance();
    hatchery.init();
    try {
      const save = newKantoSave('Daycare', HatcheryRules.LOCATION_ID);
      save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
      const reserve = PokemonFactory.create('pikachu', 10);
      assert.ok(TeamSystem.getInstance().addPokemon(reserve));
      save.currencies.add('questPoint', HatcheryRules.SLOT_UPGRADE_COSTS[0]);

      const upgrade = hatchery.upgradeSlot();
      assert.equal(upgrade.result, HatcheryResults.READY);
      assert.equal(save.hatchery.maxSlots, 2);
      assert.equal(save.currencies.get('questPoint'), 0);

      const deposited = hatchery.depositPokemon(reserve.uid);
      assert.equal(deposited.result, HatcheryResults.READY);
      assert.equal(save.team.length, 1, 'the starter remains in the team');
      assert.equal(save.hatchery.slots[0].kind, 'daycare');
      assert.equal(save.hatchery.slots[0].pokemonUid, reserve.uid, 'the daycare references the collection Pokémon');
      assert.equal(BoxSystem.getInstance().getPokemonByUid(reserve.uid), reserve, 'the housed Pokémon stays in the PC box');
      assert.equal(BoxSystem.getInstance().getAll().length, 2, 'no copy is created');
      const usage = PokemonUsageSystem.getInstance();
      assert.deepEqual(usage.getUsages(reserve.uid), [PokemonUsageIds.DAYCARE]);
      assert.equal(usage.canPerform(reserve.uid, PokemonActionIds.LEARN_MOVE), false);
      assert.equal(usage.canPerform(reserve.uid, PokemonActionIds.JOIN_TEAM), false);
      assert.equal(hatchery.getCandidates().some((entry) => entry.uid === reserve.uid), false, 'a housed Pokémon cannot be deposited twice');
      assert.equal(TeamSystem.getInstance().addMember(reserve.uid), false, 'a housed Pokémon cannot join the team');
      for (let index = 0; index < HatcheryRules.DAYCARE_KOS_PER_LEVEL; index++) {
        EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent('rattata', 5, 'route5', { deferSave: true }));
      }
      assert.equal(reserve.level, 11);
      assert.equal(hatchery.getSnapshot().slots[0].pokemon, reserve, 'the snapshot resolves the housed Pokémon');
      assert.equal(save.hatchery.slots[0].knockouts, 0);

      const withdrawn = hatchery.withdrawPokemon(0);
      assert.equal(withdrawn.result, HatcheryResults.READY);
      assert.equal(withdrawn.stored, 'box');
      assert.ok(!save.teamMembers.includes(reserve.uid), 'withdrawal releases a reservation without adding a team reference');
      assert.equal(save.collection.get(reserve.uid), reserve);
      assert.deepEqual(usage.getUsages(reserve.uid), []);
    } finally {
      hatchery.onDestroy();
    }
  });

  test('fossil incubation is story-gated, advances on KOs, then revives at the hatchery', () => {
    const hatchery = HatcherySystem.getInstance();
    hatchery.init();
    try {
      const save = newKantoSave('Fossil incubation', HatcheryRules.LOCATION_ID);
      save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
      save.inventory.add('helix_fossil', 1);
      assert.equal(hatchery.startFossilIncubation('helix_fossil').result, HatcheryResults.STORY_LOCKED);
      assert.equal(save.inventory.count('helix_fossil'), 1);

      save.hatchery.setSlot(0, {
        kind: 'fossil', itemId: 'helix_fossil', speciesId: 'omanyte',
        knockouts: 25, required: 25, ready: true
      });
      assert.equal(hatchery.collectFossil(0).result, HatcheryResults.STORY_LOCKED);
      assert.equal(save.hatchery.slots[0].kind, 'fossil', 'locked fossil remains in its slot');

      save.hatchery.setSlot(0, null);
      save.quests.setMainStep('kanto', FossilRules.UNLOCK_MAIN_STEP);
      const started = hatchery.startFossilIncubation('helix_fossil');
      assert.equal(started.result, HatcheryResults.READY);
      const required = save.hatchery.slots[started.slotIndex].required;
      for (let index = 0; index < required; index++) {
        EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent('rattata', 5, 'route5', { deferSave: true }));
      }
      assert.equal(save.hatchery.slots[started.slotIndex].ready, true);
      const collected = hatchery.collectFossil(started.slotIndex);
      assert.equal(collected.result, HatcheryResults.READY);
      assert.equal(save.inventory.count('helix_fossil'), 0);
      assert.ok(save.collection.getAll().some((pokemon) => pokemon.species === 'omanyte'));
    } finally {
      hatchery.onDestroy();
    }
  });

  test('mine actions require prior feature access but remain available remotely after unlock', () => {
    const save = newKantoSave('Locked mine', 'pallet');
    const mine = MineSystem.getInstance();

    assert.equal(mine.isUnlocked(), false);
    assert.equal(mine.ensureLayer().result, MineResults.FEATURE_LOCKED);
    save.access.unlockFeature(CONTENT_FEATURES.MINE);
    assert.equal(mine.isUnlocked(), true);
    assert.equal(mine.ensureLayer().result, MineResults.READY);
    assert.ok(save.mine.hasGrid(), 'the remote action really creates a layer');
  });

  test('mine creates a Kanto grid, charges energy only for rock, and blocks premature layers', () => {
    const save = newKantoSave('Mine grid', MineRules.LOCATION_ID);
    save.access.unlockFeature(CONTENT_FEATURES.MINE);
    const mine = MineSystem.getInstance();
    assert.equal(mine.ensureLayer().result, MineResults.READY);
    assert.equal(save.mine.grid.length, MineRules.HEIGHT);
    assert.equal(save.mine.grid[0].length, MineRules.WIDTH);
    assert.ok(save.mine.items.length > 0);
    assert.equal(mine.startNextLayer().result, MineResults.LAYER_ACTIVE);

    save.mine.energy = MineRules.MAX_ENERGY;
    save.mine.lastEnergyAt = Date.now() + 100000;
    const hit = mine.digAt(0, 0);
    assert.equal(hit.result, MineResults.READY);
    assert.equal(save.mine.energy, MineRules.MAX_ENERGY - MineRules.TOOLS.chisel.energyCost);

    save.mine.grid[0][0] = 0;
    const beforeNoRock = save.mine.energy;
    assert.equal(mine.digAt(0, 0).result, MineResults.NO_ROCK);
    assert.equal(save.mine.energy, beforeNoRock, 'an empty tile has no energy cost');
  });

  test('treasure sales quote the right currency and notify the mine-sale objective', () => {
    const save = newKantoSave('Treasure sale', MineRules.LOCATION_ID);
    save.inventory.add('nugget', 2);
    const saleEvents = [];
    const onSale = (event) => saleEvents.push(event);
    EventBus.getInstance().subscribe(MineItemSoldEvent, onSale);
    try {
      const quote = SaleSystem.getInstance().getQuote('nugget', 2);
      assert.deepEqual(quote, { count: 2, gain: 200, currencyId: 'diamond' });
      const before = save.currencies.get('diamond');
      const sold = SaleSystem.getInstance().sell('nugget', 2);
      assert.equal(sold.result, SaleResults.SOLD);
      assert.equal(sold.gain, 200);
      assert.equal(save.currencies.get('diamond'), before + 200);
      assert.equal(save.inventory.count('nugget'), 0);
      assert.equal(saleEvents.length, 1);
      assert.equal(saleEvents[0].count, 2);
      assert.equal(SaleSystem.getInstance().sell('helix_fossil', 1).result, SaleResults.NOT_SELLABLE);
    } finally {
      EventBus.getInstance().unsubscribe(MineItemSoldEvent, onSale);
    }
  });

  test('Vermilion training completion advances the active Kanto 22 objective', () => {
    const quests = QuestSystem.getInstance();
    const training = TrainingSystem.getInstance();
    quests.init();
    training.init();
    try {
      const battle = BattleSystem.getInstance();
      if (battle.isActive()) battle.endBattle(false);
      const save = newKantoSave('Vermilion training', TrainingRules.LOCATION_ID);
      save.player.earnBadge(TrainingRules.REQUIRED_BADGE_ID);
      save.quests.setMainStep('kanto', 21);
      quests.syncMainQuest();
      assert.equal(quests.getMainQuest()?.quest.key, 'main.22');
      const candidate = training.getCandidates()[0];
      assert.ok(candidate, 'the starter can take a move-training session');
      const started = training.startSession(candidate.uid);
      assert.equal(started.result, TrainingResults.READY);
      assert.equal(started.opponentCount, TrainingRules.OPPONENT_COUNT);
      const usage = PokemonUsageSystem.getInstance();
      assert.ok(usage.getUsages(candidate.uid).includes(PokemonUsageIds.TRAINING), 'the trainee is claimed by the training session');
      assert.equal(usage.canPerform(candidate.uid, PokemonActionIds.LEARN_MOVE), false);
      assert.ok(BoxSystem.getInstance().getPokemonByUid(candidate.uid), 'the trainee stays in the PC box');

      training._session.outcome = BattleOutcomes.VICTORY;
      training._finishSession(training._session);
      assert.equal(training.isActive(), false);
      assert.equal(usage.getUsages(candidate.uid).includes(PokemonUsageIds.TRAINING), true, 'assignment reserves until an explicit removal');
      assert.ok(training.clearSlot(0));
      assert.equal(usage.getUsages(candidate.uid).includes(PokemonUsageIds.TRAINING), false);
      assert.equal(quests.getStatus('main.22')?.complete, true);
      assert.equal(quests.getStatus('main.22')?.progress, 1);
    } finally {
      training.onDestroy();
      quests.onDestroy();
    }
  });
});
