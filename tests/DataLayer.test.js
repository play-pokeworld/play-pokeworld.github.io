/**
 * @file DataLayer.test.js
 * @brief Generated tables, save migrations, quest objectives and QuestSystem.
 */
import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/core/Random.js';
import { DataValidator } from '../src/data/core/DataValidator.js';
import { SaveMigrator } from '../src/data/save/migrations/SaveMigrator.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveSchema } from '../src/config/SaveSchema.js';
import { QuestRules } from '../src/config/QuestRules.js';
import { TeamPresetsData } from '../src/data/save/TeamPresetsData.js';
import { TeamPresetRules } from '../src/config/TeamPresetRules.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { NpcQuestDirectory } from '../src/data/quests/NpcQuestDirectory.js';
import { ObjectiveRegistry } from '../src/data/quests/objectives/ObjectiveRegistry.js';
import { ObjectiveTypes } from '../src/data/quests/ObjectiveTypes.js';
import { ItemStacking } from '../src/data/items/ItemStacking.js';
import { InventoryRules } from '../src/config/InventoryRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { ExperienceCurve } from '../src/data/pokemon/ExperienceCurve.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { NpcDirectory } from '../src/data/world/NpcDirectory.js';
import { LocalizationManager } from '../src/localization/LocalizationManager.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { PokemonCaughtEvent } from '../src/core/events/PokemonCaughtEvent.js';
import { LocationChangedEvent } from '../src/core/events/LocationChangedEvent.js';
import { QuestCompletedEvent } from '../src/core/events/QuestCompletedEvent.js';
import { QuestClaimedEvent } from '../src/core/events/QuestClaimedEvent.js';
import { InventoryChangedEvent } from '../src/core/events/InventoryChangedEvent.js';
import { PokedexChangedEvent } from '../src/core/events/PokedexChangedEvent.js';

/** Subscribes to an event class and returns the list of received events. */
function capture(EventClass) {
  const received = [];
  const callback = (event) => received.push(event);
  EventBus.getInstance().subscribe(EventClass, callback);
  received.stop = () => EventBus.getInstance().unsubscribe(EventClass, callback);
  return received;
}

describe('Generated data', (test) => {
  test('every repository passes DataValidator', () => {
    assert.deepEqual(DataValidator.validateAll(), []);
  });

  test('every quest objective type has a class and a localizable key', () => {
    for (const quest of QuestDB.getInstance().getAll()) {
      assert.ok(ObjectiveRegistry.has(quest.objective.type), `${quest.key} ${quest.objective.type}`);
    }
    assert.ok(Object.values(ObjectiveTypes).every((type) => ObjectiveRegistry.has(type)));
  });

  test('NPC directory resolves the stable unlock identity in both languages', () => {
    const localization = LocalizationManager.getInstance();
    const originalLanguage = localization.currentLang;
    try {
      localization.setLanguage('fr');
      const frenchNpc = NpcDirectory.getById('cerulean', 'swimmer-ondee');
      assert.ok(frenchNpc);
      assert.equal(frenchNpc.name, 'Nageuse Ondée');
      assert.equal(frenchNpc.lines.length, 2);
      localization.setLanguage('en');
      const englishNpc = NpcDirectory.getById('cerulean', 'swimmer-ondee');
      assert.ok(englishNpc);
      assert.equal(englishNpc.name, 'Swimmer Ondée');
    } finally {
      localization.setLanguage(originalLanguage);
    }
  });

  test('repeatable contracts r30-r38 are explicitly Johto offers', () => {
    for (let id = 30; id <= 38; id++) {
      assert.equal(QuestDB.getInstance().getById(`repeatable.r${id}`)?.region, 'johto');
    }
  });

  test('main chains: 64 Kanto, 41 Johto, 89 Hoenn quests, rewards are quest points', () => {
    const quests = QuestDB.getInstance();
    assert.equal(quests.getMainChain('kanto').length, 64);
    assert.equal(quests.getMainChain('johto').length, 41);
    assert.equal(quests.getMainChain('hoenn').length, 89);
    assert.ok(quests.getAll().every((quest) => !('money' in quest.rewards)), 'no money reward');
  });

  test('item stacking follows the original limits and payout', () => {
    assert.equal(ItemStacking.split('not_an_item', 0, 3).added, 0, 'unknown items grant nothing');
    const berry = ItemStacking.split('oran_berry', InventoryRules.LIMITED_STACK - 1, 3);
    assert.equal(berry.added, 1);
    assert.ok(berry.money >= 0);
    assert.equal(ItemStacking.split('pokeball', 0, 5).added, 5);
  });
});

describe('Save migrations', (test) => {
  test('an original game export (schema 0) reaches the current schema', () => {
    const data = SaveMigrator.migrate({
      G: {
        trainerName: 'Ancien',
        region: 'kanto',
        location: 'route1',
        money: 1234,
        badges: ['brock'],
        unlockedLocs: { route4: true, route6: false },
        visitedMaps: { route22: true },
        playTimeMs: 65000,
        wallet: { questPoints: 7, diamonds: 2 },
        team: [{ id: 25, level: 12, xp: 1500, currentHP: 10, maxHP: 40, moves: [{ id: 'thundershock' }], shiny: true, favorite: true, locked: true }],
        collection: { stored_squirtle: { id: 7, level: 5, currentHP: 20, maxHP: 20, favorite: true, locked: false } },
        boxFilters: { favorite: 'favorite', rank: 'S' },
        pokedex: { 25: { caught: true, shiny: true }, 16: { caught: false } },
        inventory: { pokeball: 4 },
        wildWinsByLoc: { route1: 12 },
        mainStep: { kanto: 3 },
        completedQuests: { side_s1: true },
        activeQuests: [{ qid: 4, cat: 'main', progress: 6 }],
        regionLeagueWon: { johto: true },
        defeatedChamps: { elite4: 1, hoenn_elite4: true }
      }
    });
    assert.equal(data.version, SaveSchema.VERSION);
    const save = SaveData.fromJson(data);
    assert.equal(save.player.trainerName, 'Ancien');
    assert.equal(save.player.playTimeSeconds, 65);
    assert.ok(save.player.hasBadge('brock'));
    assert.equal(save.currencies.get('money'), 1234);
    assert.equal(save.currencies.get('questPoint'), 7);
    assert.equal(save.team[0].species, 'pikachu');
    assert.ok(save.team[0].shiny && save.team[0].talent, 'shiny kept, talent filled');
    assert.equal(save.team[0].favorite, true);
    assert.equal(save.team[0].locked, true);
    assert.equal(save.box[0].favorite, true);
    assert.equal(save.box[0].locked, false);
    assert.equal(save.boxFilters.get('favorite'), 'favorite');
    assert.equal(save.boxFilters.get('rank'), 'S');
    assert.ok(save.team[0].hp > 0 && save.team[0].hp <= save.team[0].getMaxHp());
    assert.equal(save.pokedex.getCaughtStatus('pikachu'), 'shiny');
    assert.ok(save.pokedex.isSeen('pidgey') && !save.pokedex.isCaught('pidgey'));
    assert.equal(save.inventory.count('pokeball'), 4);
    assert.equal(save.statistics.wildWins.route1, 12);
    assert.ok(['kanto', 'johto', 'hoenn'].every((region) => save.statistics.leaguesWon.includes(region)));
    assert.equal(save.access.championTitle, true);
    assert.equal(save.quests.getMainStep('kanto'), 3);
    assert.equal(save.quests.isRepeatableUnlocked(), true, 'the original badge backfill unlock is preserved');
    assert.ok(save.access.hasLocation('route1'), 'the current legacy map is retained');
    assert.ok(save.access.hasLocation('route3'), 'the original first-badge route backfill is restored');
    assert.ok(save.access.hasLocation('route4'), 'an explicit legacy unlock is retained');
    assert.ok(save.access.hasLocation('route22'), 'a visited map is restored');
    assert.equal(save.access.hasLocation('route6'), false, 'a false legacy unlock flag is ignored');
    assert.ok(save.quests.isCompleted('side.s1'));
    assert.equal(save.quests.getProgress('main.4'), 6);
  });

  test('original badge map backfill preserves routes and route-derived features without unlocking the mine on Surge alone', () => {
    const migrated = SaveMigrator.migrate({
      G: {
        region: 'kanto',
        location: 'pallet',
        badges: ['brock', 'misty', 'surge', 'koga'],
        team: [],
        collection: {},
        pokedex: {}
      }
    });
    const access = new Set(migrated.access.unlockedLocations);
    for (const id of [
      'pallet', 'route1', 'viridian', 'route2', 'viridianforest', 'pewter', 'route3', 'route22',
      'mtmoon', 'route4', 'cerulean', 'route5', 'route6', 'vermilion', 'fuchsia'
    ]) assert.ok(access.has(id), `${id} is restored from the original badge backfill`);
    assert.equal(migrated.access.unlockedFeatures.hatchery, true, 'the restored Route 5 unlock preserves the hatchery');
    assert.equal(migrated.access.unlockedFeatures.training, true, 'Surge preserves training access');
    assert.equal(migrated.access.unlockedFeatures.mine, false, 'Surge alone does not claim a Diglett Cave visit');

    const visitedMine = SaveMigrator.migrate({
      G: { region: 'kanto', badges: ['surge'], visitedMaps: { diglettscave: true } }
    });
    assert.equal(visitedMine.access.unlockedFeatures.mine, true, 'a recorded cave visit preserves the mine');
  });

  test('early Rework schemas merge top-level visited maps and unlock facts into sticky access', () => {
    const v9 = SaveMigrator.migrate({
      version: 9,
      player: { trainerName: 'Older Rework', region: 'kanto', location: 'pallet', badges: [] },
      visitedMaps: { route22: true },
      unlockedLocs: { route4: true, route6: false },
      statistics: {}
    });
    assert.ok(v9.access.unlockedLocations.includes('route22'));
    assert.ok(v9.access.unlockedLocations.includes('route4'));
    assert.ok(!v9.access.unlockedLocations.includes('route6'));
    assert.ok(v9.access.unlockedLocations.includes('pallet'));

    const v11 = SaveMigrator.migrate({
      version: 11,
      player: { trainerName: 'Older Rework', region: 'kanto', location: 'pallet', badges: [] },
      visitedMaps: { diglettscave: true },
      access: { unlockedLocations: [], unlockedFeatures: {} },
      statistics: {}
    });
    assert.ok(v11.access.unlockedLocations.includes('diglettscave'));
    assert.equal(v11.access.unlockedFeatures.mine, true, 'an explicit old cave visit repairs the mine feature');
  });

  test('legacy secret-base access imports the Hoenn main.216 milestone only when proven', () => {
    const unlockStep = QuestDB.getInstance().getMainChain('hoenn')
      .findIndex((quest) => quest.key === 'main.216') + 1;
    const unlocked = SaveMigrator.migrate({
      G: {
        region: 'hoenn',
        location: 'route111',
        mainStep: { hoenn: 0 },
        unlockedSecretBaseHoenn: true
      }
    });
    assert.equal(unlocked.quests.mainStep.hoenn, unlockStep, 'legacy flag maps to completion of main.216');

    const completedQuest = SaveMigrator.migrate({
      G: { region: 'hoenn', mainStep: { hoenn: 0 }, completedQuests: { 216: true } }
    });
    assert.equal(completedQuest.quests.mainStep.hoenn, unlockStep, 'the recorded original milestone is retained');

    const oldProgress = SaveMigrator.migrate({
      G: { region: 'hoenn', mainStep: { hoenn: 16 } }
    });
    assert.equal(oldProgress.quests.mainStep.hoenn, unlockStep, 'the original story-step backfill preserves the milestone');

    const locked = SaveMigrator.migrate({
      G: { region: 'hoenn', mainStep: { hoenn: 0 } }
    });
    assert.equal(locked.quests.mainStep.hoenn, 0, 'a save without milestone evidence remains locked');
  });

  test('accepted repeatable quests migrate with their progress and remain serializable', () => {
    const raw = {
      G: {
        region: 'kanto',
        mainStep: { kanto: 2 },
        repeatablesCompleted: '4',
        repeatableQuestsUnlocked: false,
        repeatableLastRollAt: 1700000000000,
        repeatableSlotUpgrades: 2,
        wildWinsByLoc: { viridianforest: 18, route2: 7, route1: 9, rocktunnel: 3 },
        repeatableChoices: ['r1', 'r2'],
        repeatables: [
          { qid: 'r_r3', tplId: 'r3', cat: 'repeatable', progress: 7, done: false },
          { qid: 'r_r7', cat: 'repeatable', def: { id: 'r7', type: 'defeat_wild', loc: 'viridianforest' }, baseline: 10, progress: 3, done: false },
          { qid: 'r_r10', cat: 'repeatable', progress: 2, done: true },
          { qid: 'r_missing', cat: 'repeatable', progress: 99, done: false },
          null
        ]
      }
    };
    const original = JSON.stringify(raw);
    const migrated = SaveMigrator.migrate(raw);
    assert.equal(JSON.stringify(raw), original, 'migration does not mutate the original save');

    const save = SaveData.fromJson(migrated);
    assert.ok(save.quests.isActive('repeatable.r3'));
    assert.equal(save.quests.getProgress('repeatable.r3'), 7, 'the stored event progress is retained');
    assert.ok(save.quests.isActive('repeatable.r7'));
    assert.equal(save.quests.getProgress('repeatable.r7'), 8, 'location progress includes wins since the saved baseline');
    assert.ok(save.quests.isActive('repeatable.r10'));
    assert.equal(save.quests.getProgress('repeatable.r10'), 55, 'a legacy completed quest stays claimable');
    assert.equal(save.quests.isActive('repeatable.r_missing'), false, 'unknown templates are ignored');
    assert.equal(save.quests.repeatablesCompleted, 4);
    assert.equal(save.quests.isRepeatableUnlocked(), true, 'active legacy repeats override a false stale unlock flag');
    assert.deepEqual(save.quests.getRepeatableChoices(), ['r1', 'r2']);
    assert.equal(save.quests.getRepeatableLastRollAt(), 1700000000000);
    assert.equal(save.quests.getRepeatableSlotUpgrades(), 2);
    assert.equal(save.quests.getRepeatableSlotCount(), 3);

    const previousSave = SaveSystem.getInstance().getCurrentSave();
    SaveSystem.getInstance().setCurrentSave(save);
    try {
      const statuses = QuestSystem.getInstance().getActiveQuests();
      assert.ok(statuses.some((status) => status.quest.key === 'repeatable.r3' && status.progress === 7));
      assert.ok(statuses.some((status) => status.quest.key === 'repeatable.r10' && status.complete));
    } finally {
      SaveSystem.getInstance().setCurrentSave(previousSave);
    }

    const roundTrip = SaveData.fromJson(JSON.parse(JSON.stringify(save.serialize())));
    assert.deepEqual(roundTrip.quests.serialize(), save.quests.serialize());
  });

  test('schema 10 migration adds repeatable board state without reopening a fresh board', () => {
    const migrated = SaveMigrator.migrate({
      version: 10,
      player: { region: 'kanto', badges: [] },
      quests: {
        active: { 'repeatable.r3': { progress: 2 } },
        repeatablesCompleted: 0,
        repeatableChoices: ['r1', 'repeatable.r2', 'r1', 'missing'],
        repeatableLastRollAt: -1,
        repeatableSlotUpgrades: 99
      }
    });
    assert.equal(migrated.version, SaveSchema.VERSION);
    assert.equal(migrated.quests.repeatableUnlocked, true, 'an active repeatable proves prior access');
    assert.deepEqual(migrated.quests.repeatableChoices, ['r1', 'r2']);
    assert.equal(migrated.quests.repeatableLastRollAt, 0);
    assert.equal(migrated.quests.repeatableSlotUpgrades, QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS.length);

    const untouched = SaveMigrator.migrate({
      version: 10,
      player: { region: 'kanto', badges: [] },
      quests: { mainStep: {}, active: {}, completed: [], repeatablesCompleted: 0 }
    });
    assert.equal(untouched.quests.repeatableUnlocked, false, 'an unused old board remains locked');
  });

  test('original team presets and the active slot migrate into the current save schema', () => {
    const data = SaveMigrator.migrate({
      G: {
        trainerName: 'Presetter',
        team: [{ id: 25, uid: 'party-pika', level: 12, xp: 1500, currentHP: 40, maxHP: 40, moves: [] }],
        collection: { box1: { id: 1, uid: 'box-bulba', level: 8, xp: 500, currentHP: 25, maxHP: 25, moves: [] } },
        teamPresets: {
          preset1: { name: 'Aventure', uids: ['party-pika', 'box-bulba', 'box-bulba', ''] },
          preset20: { name: 'Finale', uids: ['box-bulba'] }
        },
        activePresetId: 'preset20'
      }
    });
    assert.equal(data.version, SaveSchema.VERSION);
    assert.equal(data.teamPresets.slots.length, TeamPresetRules.COUNT);
    assert.equal(data.teamPresets.activeId, 'preset20');
    assert.deepEqual(data.teamPresets.slots[0].members, ['party-pika', 'box-bulba']);
    assert.equal(data.teamPresets.slots[0].name, 'Aventure');
    assert.equal(data.teamPresets.slots[19].name, 'Finale');
    assert.ok(!('activePresetId' in data));
    const save = SaveData.fromJson(data);
    assert.equal(save.teamPresets.activeId, 'preset20');
    assert.equal(save.teamPresets.getAll().length, 20);
  });

  test('schema 9 migration preserves acquired features and leaves unused panels locked', () => {
    const migrated = SaveMigrator.migrate({
      version: 9,
      id: 'PW-LEGACY-ACCESS',
      player: { trainerName: 'Legacy', region: 'kanto', location: 'pallet', badges: [] },
      team: [],
      box: [],
      statistics: { trainingSessions: 1 },
      hatchery: { maxSlots: 2, slots: [null, { kind: 'daycare', knockouts: 4 }] },
      mine: { completedCount: 1, grid: [], items: [] },
      access: { unlockedLocations: ['route5'] }
    });
    assert.equal(migrated.version, SaveSchema.VERSION);
    const restored = SaveData.fromJson(migrated);
    assert.ok(restored.access.hasFeature('hatchery'), 'saved hatchery location and slots preserve the unlock');
    assert.ok(restored.access.hasFeature('mine'), 'mine progress preserves the unlock');
    assert.ok(restored.access.hasFeature('training'), 'completed sessions preserve the unlock');

    const untouched = SaveMigrator.migrate({
      version: 9,
      id: 'PW-LEGACY-LOCKED',
      player: { trainerName: 'New', region: 'kanto', location: 'pallet', badges: [] },
      team: [],
      box: [],
      statistics: {},
      hatchery: { maxSlots: 1, slots: [null] },
      mine: { completedCount: 0, grid: [], items: [] }
    });
    const locked = SaveData.fromJson(untouched);
    assert.equal(locked.access.hasFeature('hatchery'), false);
    assert.equal(locked.access.hasFeature('mine'), false);
    assert.equal(locked.access.hasFeature('training'), false);
  });

  test('legacy regional league wins and champion flags survive migration to schema 12', () => {
    const migrated = SaveMigrator.migrate({
      version: 9,
      id: 'PW-LEGACY-LEAGUE',
      player: { trainerName: 'Champion', region: 'johto', location: 'newbark', badges: [] },
      statistics: {},
      regionLeagueWon: { johto: true },
      defeatedChamps: { elite4: true, hoenn_elite4: true }
    });
    const restored = SaveData.fromJson(migrated);
    assert.ok(['kanto', 'johto', 'hoenn'].every((region) => restored.statistics.hasWonLeague(region)));
    assert.equal(restored.access.championTitle, true);
  });

  test('schema 11 migration separates league titles and preserves only durable facility access', () => {
    const migrated = SaveMigrator.migrate({
      version: 11,
      id: 'PW-V11-LEAGUE-ACCESS',
      player: {
        trainerName: 'Legacy champion',
        region: 'kanto',
        location: 'pallet',
        badges: ['brock', 'misty', 'surge', 'elite4', 'johto_elite4']
      },
      statistics: {
        leaguesWon: ['hoenn'],
        trainerWins: { elite4: 1, johto_elite4: 1 }
      },
      access: {
        unlockedLocations: ['diglettscave'],
        unlockedFeatures: { hatchery: false, mine: false, training: false },
        championTitle: false
      },
      hatchery: { maxSlots: 1, slots: [null] },
      mine: { completedCount: 0, grid: [], items: [] }
    });
    assert.equal(migrated.version, SaveSchema.VERSION);
    assert.deepEqual(migrated.player.badges, ['brock', 'misty', 'surge']);
    assert.deepEqual(new Set(migrated.statistics.leaguesWon), new Set(['kanto', 'johto', 'hoenn']));

    const restored = SaveData.fromJson(migrated);
    assert.equal(restored.player.getBadgeCount(), 3, 'old league IDs no longer inflate Gym badge count');
    assert.ok(['kanto', 'johto', 'hoenn'].every((region) => restored.statistics.hasWonLeague(region)));
    assert.equal(restored.access.hasFeature('hatchery'), false, 'badges alone do not prove Route 5 access');
    assert.equal(restored.access.hasFeature('mine'), true, 'a previously unlocked mine location remains available');
    assert.equal(restored.access.hasFeature('training'), true, 'Lt. Surge badge preserves training access');
    assert.equal(restored.access.championTitle, true, 'a migrated league win preserves the champion milestone');

    const badgesOnly = SaveData.fromJson(SaveMigrator.migrate({
      version: 11,
      player: { trainerName: 'Progressed', region: 'kanto', location: 'pallet', badges: ['brock', 'misty', 'surge'] },
      statistics: {},
      access: { unlockedFeatures: { hatchery: false, mine: false, training: false } }
    }));
    assert.equal(badgesOnly.access.hasFeature('hatchery'), false, 'two Gym badges alone do not prove Route 5 access');
    assert.equal(badgesOnly.access.hasFeature('mine'), false, 'three Gym badges alone do not prove cave access');
    assert.equal(badgesOnly.access.hasFeature('training'), true, 'the Surge badge is the training prerequisite');

    const championFlagOnly = SaveData.fromJson(SaveMigrator.migrate({
      version: 11,
      player: { trainerName: 'Champion', region: 'kanto', location: 'indigo', badges: [] },
      statistics: {},
      access: { championTitle: true }
    }));
    assert.ok(championFlagOnly.statistics.hasWonLeague('kanto'), 'a legacy champion milestone recovers the Kanto League title');
  });

  test('schema 12 migration moves TM unlocks from the team and PC without changing active moves', () => {
    const raw = {
      version: 12,
      team: [{ species: 'pikachu', moves: ['thundershock'], trainingUnlockedMoves: ['thunderbolt', 'thunderbolt', 'missing_move'] }],
      box: [{ species: 'squirtle', moves: ['tackle'], trainingUnlockedMoves: ['surf'] }]
    };
    const original = JSON.stringify(raw);
    const migrated = SaveMigrator.migrate(raw);
    assert.equal(migrated.version, SaveSchema.VERSION);
    assert.deepEqual(migrated.team[0].moves, ['thundershock']);
    assert.deepEqual(migrated.team[0].unlockedMoves, ['thunderbolt', 'missing_move']);
    assert.deepEqual(migrated.box[0].moves, ['tackle']);
    assert.deepEqual(migrated.box[0].unlockedMoves, ['surf']);
    assert.ok(!('trainingUnlockedMoves' in migrated.team[0]));
    assert.equal(JSON.stringify(raw), original, 'migration does not mutate input');
  });

  test('schema 13 persists PC filters and Pokémon favorite/lock flags through team, box, and hatchery', () => {
    const raw = {
      version: 13,
      team: [{ species: 'pikachu', favorite: true, locked: true }],
      box: [{ species: 'squirtle', favorite: false, locked: true, fav: true }],
      boxFilters: { favorite: 'favorite', locked: 'unlocked', rank: 'S', search: 'squirtle' },
      hatchery: { maxSlots: 1, slots: [{ kind: 'daycare', pokemon: { species: 'eevee', favorite: true, locked: true }, knockouts: 2 }] }
    };
    const original = JSON.stringify(raw);
    const migrated = SaveMigrator.migrate(raw);
    assert.equal(migrated.version, SaveSchema.VERSION);
    assert.equal(migrated.team[0].favorite, true);
    assert.equal(migrated.team[0].locked, true);
    assert.equal(migrated.box[0].favorite, true, 'legacy fav alias is retained as favorite');
    assert.equal(migrated.box[0].locked, true);
    assert.equal(migrated.hatchery.slots[0].pokemon.favorite, true);
    assert.equal(migrated.hatchery.slots[0].pokemon.locked, true);
    assert.equal(JSON.stringify(raw), original, 'migration does not mutate input');

    const restored = SaveData.fromJson(migrated);
    assert.equal(restored.team[0].favorite, true);
    assert.equal(restored.team[0].locked, true);
    assert.equal(restored.box[0].favorite, true);
    assert.equal(restored.box[0].locked, true);
    assert.equal(restored.boxFilters.get('favorite'), 'favorite');
    assert.equal(restored.boxFilters.get('locked'), 'unlocked');
    assert.equal(restored.boxFilters.get('rank'), 'S');
    assert.equal(restored.boxFilters.get('search'), 'squirtle');
    assert.equal(SaveData.fromJson(restored.serialize()).boxFilters.get('favorite'), 'favorite');
  });

  test('schema 14 saves gain an empty secret-base domain without changing progression', () => {
    const raw = {
      version: 14,
      id: 'PW-TEST-00015',
      player: { trainerName: 'No base', region: 'hoenn', location: 'littleroot', badges: [] },
      quests: { mainStep: { hoenn: 0 } },
      access: { unlockedFeatures: {} }
    };
    const original = JSON.stringify(raw);
    const migrated = SaveMigrator.migrate(raw);
    assert.equal(migrated.version, SaveSchema.VERSION);
    assert.deepEqual(migrated.secretBase, {});
    assert.equal(JSON.stringify(raw), original, 'the schema migration does not mutate input');

    const save = SaveData.fromJson(migrated);
    assert.equal(save.secretBase.isEstablished(), false);
    assert.equal(save.secretBase.getFlagRankId(), 'normal');
    assert.equal(save.quests.getMainStep('hoenn'), 0, 'migration does not unlock the feature');
    assert.deepEqual(save.serialize().secretBase.decorations, []);
  });

  test('original save migration preserves the established secret base and flag progress', () => {
    const raw = {
      G: {
        region: 'hoenn',
        location: 'route111',
        base: {
          layoutId: 'cave_1',
          routeId: 'route111',
          items: [{ uid: 7, s: 'small_desk', x: 2, y: 3, rot: 1 }],
          stock: { red_tent: 2 },
          npcs: [{
            id: 'n1', name: 'Élodie', sprite: 'trainer-54', x: 4, y: 5,
            team: [{ id: 25, level: 20, moves: [{ id: 'thundershock' }], talent: 'static', shiny: true, item: 'light_ball' }],
            msgs: { pre: 'Bonjour', win: 'Bravo', lose: 'Encore' }
          }],
          npcStock: [{ id: 'n2', name: 'Réserve', sprite: 'trainer-2', x: null, y: null, team: [] }],
          spawn: { x: 1, y: 2 },
          uidSeq: 8,
          record: { w: 3, l: 2, visits: 9 },
          pcMessage: 'Bienvenue'
        },
        secretBaseFlags: { count: 12, collectedIds: { route111: 1700000000000 }, lastRankNotified: 'bronze' }
      }
    };
    const original = JSON.stringify(raw);
    const migrated = SaveMigrator.migrate(raw);
    assert.equal(JSON.stringify(raw), original, 'legacy migration does not mutate input');
    assert.equal(migrated.version, SaveSchema.VERSION);

    const save = SaveData.fromJson(migrated);
    const base = save.secretBase;
    assert.equal(base.isEstablished(), true);
    assert.equal(base.layoutId, 'cave_1');
    assert.equal(base.locationId, 'route111');
    assert.deepEqual(base.decorations, [{ uid: 7, itemId: 'small_desk', x: 2, y: 3, rotation: 0 }], 'the current reference no longer supports rotation');
    assert.equal(base.stock.red_tent, 2);
    assert.equal(base.npcs[0].team[0].species, 'pikachu', 'legacy dex ids become stable species slugs');
    assert.deepEqual(base.npcs[0].team[0].moves, ['thundershock']);
    assert.deepEqual(base.npcs[0].messages, { pre: 'Bonjour', win: 'Bravo', lose: 'Encore' });
    assert.equal(base.npcStock[0].x, null, 'an unplaced legacy NPC stays unplaced');
    assert.deepEqual(base.spawn, { x: 1, y: 2 });
    assert.equal(base.nextUid, 8);
    assert.deepEqual(base.record, { wins: 3, losses: 2, visits: 9 });
    assert.equal(base.pcMessage, 'Bienvenue');
    assert.equal(base.flags.count, 12);
    assert.equal(base.flags.lastRankNotified, 'bronze');
    assert.deepEqual(base.flags.collectedIds, { route111: 1700000000000 });
    assert.equal(base.getUniqueBaseCount(), 1);
    assert.equal(base.getFlagRankId(), 'bronze');

    const roundTrip = SaveData.fromJson(JSON.parse(JSON.stringify(save.serialize())));
    assert.deepEqual(roundTrip.secretBase.serialize(), base.serialize());
  });

  test('schema 2 saves keep their experience ratio and drop derived fields', () => {
    const data = SaveMigrator.migrate({
      version: 2,
      id: 'PW-TEST-00002',
      player: { trainerName: 'V2', badges: 3 },
      currencies: { money: 50 },
      team: [{ species: 'bulbasaur', level: 10, exp: 50, maxExp: 100, hp: 15, maxHp: 30, types: ['grass'] }]
    });
    const pokemon = data.team[0];
    assert.ok(!('maxHp' in pokemon) && !('maxExp' in pokemon) && !('types' in pokemon));
    const span = ExperienceCurve.levelStart(11) - ExperienceCurve.levelStart(10);
    assert.equal(pokemon.exp, ExperienceCurve.levelStart(10) + Math.floor(span / 2));
    assert.deepEqual(data.player.badges, [], 'badge counts cannot name badges');
  });

  test('migrations are pure: the raw input is not mutated', () => {
    const raw = { version: 1, player: { trainerName: 'P', money: 10 }, team: [] };
    const copy = JSON.stringify(raw);
    SaveMigrator.migrate(raw);
    assert.equal(JSON.stringify(raw), copy);
  });

  test('a current save round-trips unchanged', () => {
    const save = SaveData.createNew('Round', 'charmander', 'forest');
    const json = save.serialize();
    assert.deepEqual(SaveData.fromJson(JSON.parse(JSON.stringify(json))).serialize(), json);
  });
});

describe('Team presets', (test) => {
  test('slots stay ordered, unique, bounded and encapsulated', () => {
    const presets = new TeamPresetsData({
      activeId: 'unknown',
      slots: [{ id: 'preset1', name: '  Main   Team  ', members: ['uid-a', 'uid-a', '', 4, 'uid-b', 'uid-c', 'uid-d', 'uid-e', 'uid-f', 'uid-g'] }]
    });
    assert.equal(presets.getAll().length, TeamPresetRules.COUNT);
    assert.equal(presets.activeId, TeamPresetRules.DEFAULT_ACTIVE_ID);
    const slot = presets.getById('preset1');
    assert.equal(slot.name, 'Main Team');
    assert.deepEqual(slot.members, ['uid-a', 'uid-b', 'uid-c', 'uid-d', 'uid-e', 'uid-f']);
    slot.members.push('outside-mutation');
    assert.equal(presets.getById('preset1').members.length, TeamPresetRules.MAX_MEMBERS);
    presets.setName('preset1', '');
    assert.equal(presets.getById('preset1').name, null);
    assert.equal(presets.setActiveId('preset20'), true);
    assert.equal(presets.setActiveId('preset21'), false);
  });
});

describe('Pokémon factory', (test) => {
  test('creation is deterministic with a seeded Random', () => {
    const a = PokemonFactory.create('eevee', 20, { random: Random.sequence([0.1, 0.5, 0.9]) });
    const b = PokemonFactory.create('eevee', 20, { random: Random.sequence([0.1, 0.5, 0.9]) });
    assert.deepEqual({ ...a.serialize(), uid: '' }, { ...b.serialize(), uid: '' });
    assert.equal(a.hp, a.getMaxHp());
    assert.equal(a.exp, ExperienceCurve.levelStart(20));
  });
});

describe('Quest system', (test) => {
  const quests = QuestSystem.getInstance();
  quests.init();

  test('a new save starts the first main quest of its region', () => {
    const save = SaveSystem.getInstance().createNewSave('Questeur', 'charmander');
    assert.ok(save.quests.isActive('main.1'));
    assert.equal(quests.getMainQuest().quest.key, 'main.1');
  });

  test('talk objectives complete and auto-claim at their location', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    const claimed = capture(QuestClaimedEvent);
    const points = save.currencies.get('questPoint');
    LocationSystem.getInstance().talkToNpc('kanto_pallet_npc_02');
    assert.equal(save.quests.getProgress('main.1'), 0, 'talking to a different person does not advance the quest');
    LocationSystem.getInstance().talkToNpc(NpcQuestDirectory.getNpcIdForQuest('main.1'));
    claimed.stop();
    assert.equal(claimed.length, 1);
    assert.equal(save.quests.getMainStep('kanto'), 1);
    assert.equal(save.currencies.get('questPoint'), points + 100);
    assert.ok(save.inventory.count('babiri_berry') >= 1, 'reward item granted');
    assert.ok(save.quests.isActive('main.2'), 'next main quest active');
  });

  test('kill objectives count wild wins of their location only', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    const bus = EventBus.getInstance();
    const completed = capture(QuestCompletedEvent);
    bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route2', true));
    bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', false));
    bus.dispatch(new PokemonCaughtEvent('pidgey', 'route1', false));
    assert.equal(save.quests.getProgress('main.2'), 0);
    for (let i = 0; i < 12; i++) bus.dispatch(new PokemonDefeatedEvent('rattata', 3, 'route1', true));
    completed.stop();
    assert.equal(save.quests.getProgress('main.2'), 10, 'capped at the objective count');
    assert.equal(completed.length, 1);
    assert.equal(save.quests.getMainStep('kanto'), 1, 'kill quests wait for the claim');
    assert.ok(quests.claim('main.2'));
    assert.equal(save.quests.getMainStep('kanto'), 2);
    assert.equal(quests.claim('main.2'), false, 'cannot claim twice');
  });

  test('side quests need to be accepted and are completed once', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    assert.ok(quests.isAvailable('side.s1'));
    assert.ok(quests.accept('side.s1'));
    assert.equal(quests.accept('side.s1'), false, 'already active');
    for (let i = 0; i < 10; i++) EventBus.getInstance().dispatch(new PokemonDefeatedEvent('rattata', 3, 'route1', true));
    assert.ok(quests.claim('side.s1'));
    assert.ok(save.quests.isCompleted('side.s1'));
    assert.equal(quests.isAvailable('side.s1'), false);
  });

  test('repeatable board unlocks only through its NPC, filters regions, persists offers, rerolls, and upgrades slots', () => {
    const saveSystem = SaveSystem.getInstance();
    const previousSave = saveSystem.getCurrentSave();
    const originalNow = Date.now;
    const save = SaveData.createNew('Contractor', 'charmander');
    save.player.region = 'kanto';
    save.player.location = 'cerulean';
    const now = 1700000000000;
    Date.now = () => now;
    saveSystem.setCurrentSave(save);
    quests.setRandom(Random.sequence([0.01, 0.23, 0.47, 0.69, 0.91]));
    try {
      assert.equal(quests.isRepeatableUnlocked(), false);
      save.player.earnBadge('brock');
      assert.equal(quests.isRepeatableUnlocked(), false, 'a new save badge does not bypass the NPC requirement');
      assert.equal(LocationSystem.getInstance().talkToNpc(), true);
      assert.equal(quests.isRepeatableUnlocked(), false, 'a location-wide talk cannot unlock the board');
      const otherNpc = NpcDirectory.getByLocation('cerulean')[1];
      assert.equal(LocationSystem.getInstance().talkToNpc(otherNpc.id), true);
      assert.equal(quests.isRepeatableUnlocked(), false, 'another Cerulean NPC cannot unlock the board');
      assert.equal(LocationSystem.getInstance().talkToNpc('missing-npc'), false, 'unknown NPC ids are rejected');

      save.player.region = 'johto';
      save.player.location = 'newbark';
      EventBus.getInstance().dispatch(new LocationChangedEvent('johto', 'newbark'));
      assert.equal(quests.isRepeatableUnlocked(), false, 'a new Johto save is not opened by region alone');
      save.player.region = 'kanto';
      save.player.location = 'cerulean';
      EventBus.getInstance().dispatch(new LocationChangedEvent('kanto', 'cerulean'));
      assert.equal(LocationSystem.getInstance().talkToNpc('swimmer-ondee'), true);
      assert.equal(quests.isRepeatableUnlocked(), true, 'the stable Ondée identity unlocks the board');

      const initialOffers = quests.ensureRepeatableChoices();
      assert.equal(initialOffers.length, QuestRules.REPEATABLE_OFFER_COUNT);
      assert.equal(new Set(save.quests.getRepeatableChoices()).size, initialOffers.length);
      assert.ok(initialOffers.every((quest) => !(Number(quest.id.slice(1)) >= 30 && Number(quest.id.slice(1)) <= 38)),
        'Johto repeatables are absent from the Kanto pool');
      assert.equal(new Set(initialOffers.map((quest) => quest.id)).size, QuestRules.REPEATABLE_OFFER_COUNT);
      assert.equal(save.quests.getRepeatableLastRollAt(), now, 'the first board roll starts the cooldown');
      assert.ok(quests.getRepeatableRerollRemainingMs() > 0);

      const savedChoices = save.quests.getRepeatableChoices();
      save.quests.setRepeatableChoices(['r33']);
      assert.equal(quests.isAvailable('repeatable.r33'), false, 'Johto contracts cannot be accepted in Kanto');
      save.player.region = 'johto';
      assert.equal(quests.isAvailable('repeatable.r33'), true, 'the same contract is available in Johto');
      save.player.region = 'kanto';
      save.quests.setRepeatableChoices(savedChoices);

      const firstKey = `repeatable.${initialOffers[0].id}`;
      assert.equal(quests.isAvailable(firstKey), true);
      assert.equal(quests.accept(firstKey), true);
      assert.equal(save.quests.isActive(firstKey), true);
      assert.equal(quests.getRepeatableBoardState().activeCount, 1);
      assert.equal(quests.rerollRepeatableChoices(), false, 'reroll remains blocked during cooldown');

      const stillOffered = quests.getRepeatableBoardState().offers.find((offer) => !offer.active);
      assert.ok(stillOffered);
      assert.equal(quests.isAvailable(stillOffered.quest.key), false, 'the base slot cap blocks another contract');
      save.quests.setRepeatableLastRollAt(now - QuestRules.REPEATABLE_REROLL_MS - 1);
      assert.equal(quests.rerollRepeatableChoices(), true, 'reroll becomes available after ten minutes');
      assert.equal(save.quests.getRepeatableLastRollAt(), now);

      const upgradeCost = QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS[0];
      const moneyBefore = save.currencies.get('money');
      save.currencies.add('money', Math.max(0, upgradeCost - moneyBefore));
      const moneyBeforePurchase = save.currencies.get('money');
      assert.equal(quests.upgradeRepeatableSlots(), true);
      assert.equal(save.currencies.get('money'), moneyBeforePurchase - upgradeCost, 'cost is charged by the system, not supplied by the UI');
      assert.equal(save.quests.getRepeatableSlotCount(), 2);
      const secondOffer = quests.getRepeatableBoardState().offers.find((offer) => !offer.active);
      assert.ok(secondOffer && quests.isAvailable(secondOffer.quest.key));
    } finally {
      Date.now = originalNow;
      quests.setRandom(Random.default);
      saveSystem.setCurrentSave(previousSave);
    }
  });

  test('state objectives read the save (badge already owned)', () => {
    const save = SaveSystem.getInstance().getCurrentSave();
    save.player.earnBadge('brock');
    save.quests.setMainStep('kanto', 5);
    quests.syncMainQuest();
    const status = quests.getMainQuest();
    assert.equal(status.quest.objective.type, ObjectiveTypes.BADGE);
    assert.ok(status.complete, 'badge quest complete on activation');
  });

  test('claim pays every reward with one save and defers nested change events', () => {
    const saves = SaveSystem.getInstance();
    const save = saves.createNewSave('Quest claim transaction', 'charmander');
    const key = 'side.currency_fixture';
    const quest = {
      key,
      category: 'side',
      rewards: {
        currencies: { money: 23, dungeonToken: 4 },
        questPoints: 0,
        items: { rarecandy: 1 },
        pokemon: { species: 'pikachu', level: 5 }
      }
    };
    const originalGetStatus = quests.getStatus;
    const originalSaveCurrent = saves.saveCurrent;
    const beforeMoney = save.currencies.get('money');
    const beforeTokens = save.currencies.get('dungeonToken');
    const beforeTeam = save.team.length;
    const claimed = capture(QuestClaimedEvent);
    const inventory = capture(InventoryChangedEvent);
    const dex = capture(PokedexChangedEvent);
    let writes = 0;
    saves.saveCurrent = function (...args) { writes++; return originalSaveCurrent.apply(this, args); };
    quests.getStatus = (requestedKey) => requestedKey === key
      ? { complete: true, quest }
      : originalGetStatus.call(quests, requestedKey);
    try {
      assert.ok(quests.claim(key));
    } finally {
      quests.getStatus = originalGetStatus;
      saves.saveCurrent = originalSaveCurrent;
      claimed.stop();
      inventory.stop();
      dex.stop();
    }
    assert.equal(save.currencies.get('money'), beforeMoney + 23);
    assert.equal(save.currencies.get('dungeonToken'), beforeTokens + 4);
    assert.equal(save.inventory.count('rarecandy'), 1);
    assert.equal(save.team.length, beforeTeam + 1);
    assert.equal(writes, 1, 'nested inventory, Pokédex and access updates are saved as one claim');
    assert.equal(claimed[0]?.deferSave, true);
    assert.ok(inventory.length > 0 && inventory.every((event) => event.deferSave));
    assert.ok(dex.length > 0 && dex.every((event) => event.deferSave));
  });
});
