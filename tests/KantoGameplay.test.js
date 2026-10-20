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
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { FossilSystem, FossilAvailability } from '../src/systems/FossilSystem.js';
import { HatcherySystem, HatcheryResults } from '../src/systems/HatcherySystem.js';
import { MineSystem, MineResults } from '../src/systems/MineSystem.js';
import { SaleSystem, SaleResults } from '../src/systems/SaleSystem.js';
import { TrainingSystem, TrainingResults } from '../src/systems/TrainingSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { ObjectiveRegistry } from '../src/data/quests/objectives/ObjectiveRegistry.js';
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
    assert.ok([...save.team, ...save.box].some((pokemon) => pokemon.species === 'omanyte'));
  });

  test('hatchery operations require a persisted access fact outside the unlocked story area', () => {
    const save = newKantoSave('Locked hatchery', 'pallet');
    const hatchery = HatcherySystem.getInstance();

    assert.equal(hatchery.isUnlocked(), false);
    assert.equal(hatchery.upgradeSlot().result, HatcheryResults.FEATURE_LOCKED);
    save.access.unlockFeature(CONTENT_FEATURES.HATCHERY);
    assert.equal(hatchery.isUnlocked(), true, 'a migrated sticky unlock survives outside the original area');
    assert.equal(hatchery.upgradeSlot().result, HatcheryResults.WRONG_LOCATION);
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
      for (let index = 0; index < HatcheryRules.DAYCARE_KOS_PER_LEVEL; index++) {
        EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent('rattata', 5, 'route5', { deferSave: true }));
      }
      assert.equal(save.hatchery.slots[0].pokemon.level, 11);
      assert.equal(save.hatchery.slots[0].knockouts, 0);

      const withdrawn = hatchery.withdrawPokemon(0);
      assert.equal(withdrawn.result, HatcheryResults.READY);
      assert.equal(withdrawn.stored, 'team');
      assert.ok(save.team.some((pokemon) => pokemon.uid === reserve.uid));
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
      assert.ok([...save.team, ...save.box].some((pokemon) => pokemon.species === 'omanyte'));
    } finally {
      hatchery.onDestroy();
    }
  });

  test('mine actions require prior feature access and the correct location', () => {
    const save = newKantoSave('Locked mine', 'pallet');
    const mine = MineSystem.getInstance();

    assert.equal(mine.isUnlocked(), false);
    assert.equal(mine.ensureLayer().result, MineResults.FEATURE_LOCKED);
    save.access.unlockFeature(CONTENT_FEATURES.MINE);
    assert.equal(mine.isUnlocked(), true);
    assert.equal(mine.ensureLayer().result, MineResults.WRONG_LOCATION);
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

      training._session.outcome = BattleOutcomes.VICTORY;
      training._finishSession(training._session);
      assert.equal(training.isActive(), false);
      assert.equal(quests.getStatus('main.22')?.complete, true);
      assert.equal(quests.getStatus('main.22')?.progress, 1);
    } finally {
      training.onDestroy();
      quests.onDestroy();
    }
  });
});
