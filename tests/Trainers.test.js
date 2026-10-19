/**
 * @file Trainers.test.js
 * @brief Trainer data (TrainerDB / LeagueDB / content merge), team selection, challenge states and
 * full trainer battles (gym first win, rematch, league in a row, quest trainer).
 */

import { describe, assert } from './TestRunner.js';
import { Random } from '../src/core/Random.js';
import { EventBus } from '../src/core/EventBus.js';
import { TrainerDB } from '../src/data/trainers/TrainerDB.js';
import { LeagueDB } from '../src/data/trainers/LeagueDB.js';
import { withContent, withContentList } from '../src/data/core/ContentTables.js';
import { TrainerTeamRules } from '../src/systems/trainers/TrainerTeamRules.js';
import { TrainerTeamFactory } from '../src/systems/trainers/TrainerTeamFactory.js';
import { TrainerRewardRules } from '../src/systems/trainers/TrainerRewardRules.js';
import { ChallengeStates } from '../src/systems/trainers/ChallengeStates.js';
import { BadgeRules } from '../src/systems/trainers/BadgeRules.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TrainerSystem } from '../src/systems/TrainerSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { TrainerDefeatedEvent } from '../src/core/events/TrainerDefeatedEvent.js';
import { BadgesChangedEvent } from '../src/core/events/BadgesChangedEvent.js';

/** Runs the current battle to its end. */
function runBattle(battle) {
  for (let i = 0; i < 40000 && battle.isActive(); i++) battle.update(0.1);
}

/** Save with an over-levelled team that wins every battle. */
function strongSave(starter = 'charmander') {
  const save = SaveSystem.getInstance().createNewSave('Arbitre', starter);
  save.team[0].setLevel(100);
  for (let i = 0; i < 5; i++) save.team.push(PokemonFactory.create('mewtwo', 100));
  return save;
}

describe('Trainer data', (test) => {
  test('every generated trainer and league is valid', () => {
    assert.deepEqual(TrainerDB.getInstance().validate(), []);
    assert.deepEqual(LeagueDB.getInstance().validate(), []);
    assert.equal(TrainerDB.getInstance().getGyms('kanto').length, 8);
    assert.deepEqual(LeagueDB.getInstance().getById('elite4').trainers, ['lorelei', 'bruno', 'agatha', 'lance', 'blue']);
  });

  test('content tables replace or extend the generated ones', () => {
    assert.deepEqual(withContent({ a: 1, b: 2 }, { b: 3, c: 4 }), { a: 1, b: 3, c: 4 });
    const list = withContentList([{ id: 1, v: 'a' }, { id: 2, v: 'b' }], [{ id: 2, v: 'B' }, { id: 3, v: 'c' }], (entry) => entry.id);
    assert.deepEqual(list.map((entry) => entry.v), ['a', 'B', 'c']);
  });

  test('a rematch uses the rematch team when there is one, else the first team', () => {
    const trainer = TrainerDB.getInstance().getById('brock');
    assert.equal(TrainerTeamRules.select(trainer, { rematch: true }), trainer.teams.default);
    const withRematch = { ...trainer, teams: { ...trainer.teams, rematch: [{ species: 'golem', level: 60, moves: [], ivs: {}, evs: {} }] } };
    assert.equal(TrainerTeamRules.select(withRematch, { rematch: true })[0].species, 'golem');
    assert.equal(TrainerTeamRules.select(withRematch, { rematch: false }), trainer.teams.default);
  });

  test('starter variants follow the starter in the team, then the caught one', () => {
    const rival = TrainerDB.getInstance().getById('johto_rival_cherrygrove');
    assert.equal(TrainerTeamRules.select(rival, { inTeam: (s) => s === 'totodile' })[0].species, 'chikorita');
    assert.equal(TrainerTeamRules.select(rival, { caught: (s) => s === 'cyndaquil' })[0].species, 'totodile');
    assert.equal(TrainerTeamRules.select(rival)[0].species, 'cyndaquil');
  });

  test('built Pokémon keep the scripted moves, item and spreads (IVs capped)', () => {
    const [geodude, onix] = TrainerTeamFactory.build(TrainerDB.getInstance().getById('brock').teams.default);
    assert.equal(geodude.species, 'geodude');
    assert.equal(geodude.level, 12);
    assert.deepEqual(geodude.moves, ['tackle', 'rock_throw', 'mud_slap']);
    assert.equal(onix.heldItem, 'hard_stone');
    assert.equal(onix.ivs.def, PokemonRules.IV_MAX, 'the original 12 is capped');
    assert.equal(onix.evs.def, 18);
    assert.equal(onix.hp, onix.getMaxHp());
  });

  test('experience share and quest points follow the original formulas', () => {
    const team = TrainerTeamFactory.build(TrainerDB.getInstance().getById('brock').teams.default);
    const total = team.reduce((sum, foe) => sum + foe.getSpecies().xpYield * foe.level, 0);
    assert.equal(TrainerRewardRules.expShare(team, 2), Math.floor(total / 2 / 2));
    assert.equal(TrainerRewardRules.questPoints(1000), 100);
    assert.equal(TrainerRewardRules.questPoints(10000), 250);
    assert.equal(TrainerRewardRules.questPoints(30000), 2500);
  });
});

describe('Trainer battles', (test) => {
  test('a gym is locked without the badges of its region', () => {
    strongSave();
    const trainers = TrainerSystem.getInstance();
    assert.equal(trainers.getChallenge('brock').state, ChallengeStates.CHALLENGE);
    assert.equal(trainers.getChallenge('misty').state, ChallengeStates.LOCKED);
    assert.equal(trainers.getChallenge('elite4').state, ChallengeStates.LOCKED);
    assert.equal(trainers.getChallenge('nobody'), null);
    assert.ok(!trainers.challenge('misty'));
    assert.ok(!BattleSystem.getInstance().isActive());
  });

  test('first gym win: badge, money, experience, events; then a rematch without money', () => {
    const save = strongSave();
    LocationSystem.getInstance().travelTo('pewter');
    const events = [];
    const onDefeated = (event) => events.push(event);
    const onBadges = (event) => events.push(event);
    EventBus.getInstance().subscribe(TrainerDefeatedEvent, onDefeated);
    EventBus.getInstance().subscribe(BadgesChangedEvent, onBadges);
    const battle = BattleSystem.getInstance();
    battle.setRandom(Random.sequence([0.3, 0.7, 0.5]));
    const money = save.currencies.get('money');
    const exp = save.team[0].exp;
    assert.ok(TrainerSystem.getInstance().challenge('brock'));
    assert.ok(battle.isTrainerBattle());
    runBattle(battle);
    assert.ok(!battle.isActive());
    assert.ok(save.player.hasBadge('brock'));
    assert.equal(save.currencies.get('money'), money + TrainerDB.getInstance().getById('brock').reward);
    assert.ok(save.team[0].exp >= exp);
    assert.equal(save.statistics.trainerWins.brock, 1);
    assert.ok(events.some((event) => event instanceof TrainerDefeatedEvent && event.trainerId === 'brock'));
    assert.ok(events.some((event) => event instanceof BadgesChangedEvent));
    assert.ok(save.pokedex.isSeen('onix'), 'the second foe was sent and seen');
    assert.equal(BadgeRules.regionCount(save.player, 'kanto'), 1);
    assert.ok(battle.getLog().every((line) => !line.includes('battle_log.') && !line.includes('trainer.')));

    assert.equal(TrainerSystem.getInstance().getChallenge('brock').state, ChallengeStates.REMATCH);
    const afterFirst = save.currencies.get('money');
    assert.ok(TrainerSystem.getInstance().challenge('brock'));
    runBattle(battle);
    battle.setRandom(Random.default);
    EventBus.getInstance().unsubscribe(TrainerDefeatedEvent, onDefeated);
    EventBus.getInstance().unsubscribe(BadgesChangedEvent, onBadges);
    assert.equal(save.currencies.get('money'), afterFirst, 'no money on a rematch');
    assert.equal(save.statistics.trainerWins.brock, 2);
  });

  test('a league is fought in a row and grants the title', () => {
    const save = strongSave();
    for (const gym of TrainerDB.getInstance().getGyms('kanto')) save.player.earnBadge(gym.id);
    assert.equal(TrainerSystem.getInstance().getChallenge('elite4').state, ChallengeStates.CHALLENGE);
    const battle = BattleSystem.getInstance();
    battle.setRandom(Random.sequence([0.3, 0.7, 0.5]));
    assert.ok(TrainerSystem.getInstance().challenge('elite4', { locationId: 'indigo' }));
    runBattle(battle);
    battle.setRandom(Random.default);
    assert.ok(save.player.hasBadge('elite4'));
    assert.ok(save.statistics.leaguesWon.includes('kanto'));
    for (const id of ['lorelei', 'bruno', 'agatha', 'lance', 'blue']) assert.equal(save.statistics.trainerWins[id], 1, id);
    assert.equal(BadgeRules.regionCount(save.player, 'kanto'), 8, 'the title is not a gym badge');
  });

  test('a quest trainer pays quest points and counts for its boss objective', () => {
    const save = strongSave();
    const battle = BattleSystem.getInstance();
    const points = save.currencies.get('questPoint');
    battle.setRandom(Random.sequence([0.3, 0.7, 0.5]));
    assert.ok(TrainerSystem.getInstance().challenge('kanto_rival_route22'));
    runBattle(battle);
    battle.setRandom(Random.default);
    assert.equal(save.statistics.trainerWins.kanto_rival_route22, 1);
    assert.equal(save.currencies.get('questPoint'), points + 100);
    const quest = QuestDB.getInstance().getAll().find((entry) => entry.objective.trainer === 'kanto_rival_route22');
    assert.equal(TrainerSystem.getInstance().getQuestOpponent(quest.key), 'kanto_rival_route22');
    const gymQuest = QuestDB.getInstance().getAll().find((entry) => entry.objective.badge === 'brock');
    assert.equal(TrainerSystem.getInstance().getQuestOpponent(gymQuest.key), 'brock');
  });

  test('a quest challenge first closes the running battle, then starts on the next click', () => {
    strongSave();
    const battle = BattleSystem.getInstance();
    battle.init();
    const quest = QuestDB.getInstance().getAll().find((entry) => entry.objective.trainer === 'kanto_rival_route22');
    battle.startBattle('route1');
    assert.equal(battle.isActive(), true);
    assert.equal(TrainerSystem.getInstance().challengeQuest(quest.key), false);
    assert.equal(battle.isActive(), false);
    assert.equal(TrainerSystem.getInstance().challengeQuest(quest.key), true);
    assert.equal(battle.isTrainerBattle(), true);
    battle.endBattle();
  });
});
