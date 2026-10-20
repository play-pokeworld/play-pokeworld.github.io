/**
 * @file BattleEngine.test.js
 * @brief Battle engine (systems/battle): effect coverage of the data vocabularies, rule files
 * with a scripted Random, full sessions and the BattleSystem integration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, assert } from './TestRunner.js';
import { listJsFiles, stripComments } from './SourceScanner.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/core/Random.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { TalentDB } from '../src/data/pokemon/TalentDB.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { MoveEffectKinds } from '../src/data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../src/data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../src/data/items/HeldEffectKinds.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { BattleSides } from '../src/config/BattleSides.js';
import { BattleRules } from '../src/config/BattleRules.js';
import { BattleConfig } from '../src/config/BattleConfig.js';
import {
  CoverageStates, MOVE_EFFECT_COVERAGE, TALENT_EFFECT_COVERAGE, HELD_EFFECT_COVERAGE
} from '../src/systems/battle/BattleEffectCoverage.js';
import { EffectConditions } from '../src/systems/battle/EffectConditions.js';
import { BattleCombatant } from '../src/systems/battle/BattleCombatant.js';
import { BattleField } from '../src/systems/battle/BattleField.js';
import { DamageCalculator } from '../src/systems/battle/DamageCalculator.js';
import { StatusRules } from '../src/systems/battle/StatusRules.js';
import { CooldownRules } from '../src/systems/battle/CooldownRules.js';
import { RewardRules } from '../src/systems/battle/RewardRules.js';
import { CatchRules } from '../src/systems/catch/CatchRules.js';
import { QuestCatchKinds } from '../src/data/catch/QuestCatchKinds.js';
import { PokeballSystem } from '../src/systems/PokeballSystem.js';
import { EncounterRules } from '../src/systems/battle/EncounterRules.js';
import { DungeonBattleRules } from '../src/systems/battle/DungeonBattleRules.js';
import { StatChangeRules } from '../src/systems/battle/StatChangeRules.js';
import { BattleSession, BattleOutcomes } from '../src/systems/battle/BattleSession.js';
import { BattleLogFormatter } from '../src/systems/battle/BattleLogFormatter.js';
import { battleLog as enBattleLog } from '../src/localization/en/battle-log.js';
import { battleLog as frBattleLog } from '../src/localization/fr/battle-log.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { BattleAttackEvent } from '../src/core/events/BattleAttackEvent.js';
import { BattleStateChangedEvent } from '../src/core/events/BattleStateChangedEvent.js';
import { PokemonCaughtEvent } from '../src/core/events/PokemonCaughtEvent.js';
import { QuestEncounterRequestedEvent } from '../src/core/events/QuestEncounterRequestedEvent.js';

const SYSTEMS = path.resolve('src/systems');
const SYSTEM_CODE = listJsFiles(SYSTEMS)
  .filter((file) => !file.endsWith('BattleEffectCoverage.js'))
  .map((file) => stripComments(fs.readFileSync(path.join(SYSTEMS, file), 'utf8')))
  .join('\n');

/** Constant name of a kind value in a frozen kinds object. */
const constantOf = (kinds, value) => Object.keys(kinds).find((key) => kinds[key] === value);

/** Every flattened key of a nested translation module. */
function flatKeys(source, prefix = '') {
  return Object.entries(source).flatMap(([key, value]) =>
    (typeof value === 'object' ? flatKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`]));
}

const fighter = (species, level, side = BattleSides.PLAYER, options = {}) =>
  new BattleCombatant(PokemonFactory.create(species, level), side, options);

/** Plays a session to its end (seconds of simulated time at most). */
function play(session, maxSeconds = 600) {
  session.start();
  for (let time = 0; time < maxSeconds && !session.isOver(); time += 0.1) session.update(0.1);
  return session;
}

describe('Battle effect coverage', (test) => {
  test('every kind of the three vocabularies has a coverage state', () => {
    const states = new Set(Object.values(CoverageStates));
    for (const [kinds, coverage] of [[MoveEffectKinds, MOVE_EFFECT_COVERAGE], [TalentEffectKinds, TALENT_EFFECT_COVERAGE], [HeldEffectKinds, HELD_EFFECT_COVERAGE]]) {
      for (const kind of Object.values(kinds)) assert.ok(states.has(coverage[kind]), `no coverage for ${kind}`);
      assert.equal(Object.keys(coverage).length, Object.values(kinds).length);
    }
  });

  test('every ported kind is read by the systems', () => {
    const missing = [];
    for (const [name, kinds, coverage] of [
      ['MoveEffectKinds', MoveEffectKinds, MOVE_EFFECT_COVERAGE],
      ['TalentEffectKinds', TalentEffectKinds, TALENT_EFFECT_COVERAGE],
      ['HeldEffectKinds', HeldEffectKinds, HELD_EFFECT_COVERAGE]
    ]) {
      for (const [kind, state] of Object.entries(coverage)) {
        if (state !== CoverageStates.PORTED) continue;
        const pattern = new RegExp(`\\b${name}\\.${constantOf(kinds, kind)}\\b`);
        if (!pattern.test(SYSTEM_CODE)) missing.push(`${name}.${constantOf(kinds, kind)}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test('every effect condition used by the data is supported', () => {
    const supported = new Set(EffectConditions.keys());
    const effects = [
      ...MoveDB.getInstance().getAll().flatMap((move) => move.effects),
      ...TalentDB.getInstance().getAll().flatMap((talent) => talent.effects)
    ];
    const unknown = new Set(effects.flatMap((effect) => Object.keys(effect.when ?? {})).filter((key) => !supported.has(key)));
    assert.deepEqual([...unknown], []);
  });

  test('every battle log key exists in English and French', () => {
    const en = new Set(flatKeys(enBattleLog));
    const fr = new Set(flatKeys(frBattleLog));
    assert.deepEqual([...en].filter((key) => !fr.has(key)), [], 'fr parity');
    assert.deepEqual([...fr].filter((key) => !en.has(key)), [], 'en parity');
    const used = new Set([...SYSTEM_CODE.matchAll(/'battle_log\.([a-z_]+)'/g)].map((m) => m[1]));
    assert.ok(used.size > 30);
    assert.deepEqual([...used].filter((key) => !en.has(key)), []);
  });
});

describe('Battle rules', (test) => {
  test('damage: type immunity, super effectiveness and the random factor', () => {
    const field = new BattleField();
    const move = (id) => MoveDB.getInstance().getById(id);
    const immune = DamageCalculator.compute({ attacker: fighter('rattata', 20), defender: fighter('gastly', 20, BattleSides.FOE), move: move('tackle'), field, random: Random.sequence([0.5]) });
    assert.ok(immune.immune, 'Grounded immunity remains absolute');
    assert.equal(immune.damage, 0);
    const charmander = fighter('charmander', 20);
    const bulbasaur = fighter('bulbasaur', 20, BattleSides.FOE);
    const squirtle = fighter('squirtle', 20, BattleSides.FOE);
    const hit = (defender, value) => DamageCalculator.compute({ attacker: charmander, defender, move: move('ember'), field, random: Random.sequence([value]) });
    const high = hit(bulbasaur, 0.99);
    const low = hit(bulbasaur, 0);
    assert.equal(high.effectiveness, 2);
    assert.ok(high.damage > low.damage, `high random roll exceeds low roll (${high.damage} > ${low.damage})`);
    const resisted = hit(squirtle, 0.99);
    assert.equal(resisted.effectiveness, 0.5);
    assert.ok(resisted.damage < high.damage, `resisted damage is lower (${resisted.damage} < ${high.damage})`);
  });

  test('status: type immunities and inflict / cure', () => {
    const field = new BattleField();
    const random = Random.sequence([0.5]);
    assert.ok(StatusRules.isImmune(fighter('charmander', 10), 'burn', field, random));
    assert.ok(StatusRules.isImmune(fighter('pikachu', 10), 'para', field, random));
    const target = fighter('rattata', 10, BattleSides.FOE);
    assert.equal(StatusRules.isImmune(target, 'burn', field, random), false);
    StatusRules.inflict(target, 'burn', { field, random, log: { add() {} } });
    assert.equal(target.status, 'burn');
    StatusRules.cure(target, { add() {} });
    assert.equal(target.status, null);
  });

  test('cooldown follows the original speed formula', () => {
    assert.equal(CooldownRules.baseCooldown(0), 1900);
    assert.equal(CooldownRules.baseCooldown(180), Math.round(1900 * 100 / 280));
    assert.equal(CooldownRules.baseCooldown(999), CooldownRules.baseCooldown(180), 'speed cap');
  });

  test('experience and money rewards', () => {
    assert.equal(RewardRules.scaledExp(20, 10, 100), 0);
    assert.equal(RewardRules.scaledExp(15, 10, 100), 50);
    assert.equal(RewardRules.scaledExp(10, 15, 100), 175);
    assert.equal(RewardRules.memberExp(100, 10, 10, true), Math.floor(100 * BattleRules.LUCKY_EGG_MULT));
    assert.equal(RewardRules.baseShare({ xpYield: 70 }, 10), Math.floor(Math.floor(700 / 7) * 0.7));
    assert.equal(RewardRules.wildMoney({ region: 'kanto', badgesRequired: 0 }), 10);
    const rank = 2 * 9 + 8 + 1;
    assert.equal(RewardRules.wildMoney({ region: 'hoenn', badgesRequired: 12 }), Math.round(3 * rank + 5 * Math.pow(rank, 1.15)));
  });

  test('catch: guaranteed rates, first catch and quest multipliers', () => {
    const never = Random.sequence([0.99]);
    assert.ok(CatchRules.roll(100, false, never));
    assert.ok(CatchRules.roll(10, true, never), 'first catch');
    assert.equal(CatchRules.roll(10, false, never), false);
    assert.ok(CatchRules.roll(10, false, Random.sequence([0.05])));
    assert.equal(CatchRules.finalRate(30, QuestCatchKinds.NONE), 30);
    assert.equal(CatchRules.finalRate(30, QuestCatchKinds.LEGENDARY), 60);
    assert.equal(CatchRules.finalRate(70, QuestCatchKinds.LEGENDARY), 100);
    assert.equal(CatchRules.finalRate(10, QuestCatchKinds.GIFT), 100);
  });

  test('wild draw: level range and shiny rate with team talents', () => {
    const encounters = [{ species: 'pidgey', minLevel: 3, maxLevel: 5, rarity: 'common' }];
    for (const value of [0, 0.5, 0.99]) {
      const wild = EncounterRules.drawWild(encounters, [], Random.sequence([value]));
      assert.equal(wild.species, 'pidgey');
      assert.ok(wild.level >= 3 && wild.level <= 5);
    }
    const lucky = PokemonFactory.create('pikachu', 5);
    lucky.talent = 'superluck';
    assert.ok(Math.abs(EncounterRules.shinyRate([lucky]) - BattleRules.SHINY_BASE_RATE * 1.15) < 1e-12);
  });

  test('dungeon tile rarity, level and HP scaling match the grid encounter type', () => {
    const encounters = [
      { species: 'pidgey', minLevel: 5, maxLevel: 5, rarity: 'common' },
      { species: 'rattata', minLevel: 5, maxLevel: 5, rarity: 'uncommon' },
      { species: 'spearow', minLevel: 5, maxLevel: 5, rarity: 'rare' }
    ];
    const common = DungeonBattleRules.draw(encounters, [], Random.sequence([0.5]), { tileType: 'combat', floor: 1, depth: 3 });
    const elite = DungeonBattleRules.draw(encounters, [], Random.sequence([0.5]), { tileType: 'elite', floor: 2, depth: 3 });
    const miniBoss = DungeonBattleRules.draw(encounters, [], Random.sequence([0.5]), { tileType: 'boss', floor: 1, depth: 3 });
    const finalBoss = DungeonBattleRules.draw(encounters, [], Random.sequence([0.5]), { tileType: 'boss', floor: 3, depth: 3 });

    assert.equal(common.pokemon.species, 'pidgey');
    assert.equal(common.foeOptions.hpMultiplier, 1);
    assert.equal(elite.pokemon.species, 'rattata');
    assert.equal(elite.pokemon.level, 10, 'floor scaling + elite level bonus');
    assert.equal(elite.foeOptions.hpMultiplier, 1.15 * 1.25);
    assert.equal(miniBoss.pokemon.species, 'spearow');
    assert.equal(miniBoss.pokemon.level, 8);
    assert.equal(miniBoss.foeOptions.hpMultiplier, 2);
    assert.equal(finalBoss.pokemon.species, 'spearow');
    assert.equal(finalBoss.pokemon.level, 19);
    assert.deepEqual(finalBoss.foeOptions.statMultipliers, { atk: 1.5, def: 1.35 });
    const boss = new BattleCombatant(finalBoss.pokemon, BattleSides.FOE, { npc: true, ...finalBoss.foeOptions });
    assert.equal(boss.dungeonBoss, true);
    assert.equal(boss.hp, boss.maxHp);
    assert.equal(boss.maxHp, Math.round(finalBoss.pokemon.getMaxHp() * 4.5));
  });
});

describe('Battle session', (test) => {
  test('a strong team wins and the foe faints; HP stay on the Pokémon data', () => {
    const team = [PokemonFactory.create('charizard', 60)];
    const foe = PokemonFactory.create('pidgey', 3);
    const session = play(new BattleSession({ team, foe, random: Random.sequence([0.3, 0.7, 0.1, 0.9, 0.5]) }));
    assert.equal(session.outcome, BattleOutcomes.VICTORY);
    assert.ok(foe.isFainted());
    const lines = session.log.drain().map((entry) => BattleLogFormatter.format(entry));
    assert.ok(lines.length > 1);
    assert.ok(lines.every((line) => !line.includes('battle_log.') && !line.includes('{')), lines.join('\n'));
  });

  test('a capture verdict holds the wild chain until its transition completes', () => {
    const realNow = Date.now;
    let now = 10000;
    Date.now = () => now;
    try {
      const player = PokemonFactory.create('charizard', 60);
      player.moves = ['tackle'];
      const first = PokemonFactory.create('pidgey', 3);
      const next = PokemonFactory.create('rattata', 3);
      const session = new BattleSession({
        team: [player],
        foe: first,
        reserves: [{ pokemon: next }],
        random: Random.sequence([0.5])
      });
      session.start();
      session.playerCooldownMs = 0;
      session.foeCooldownMs = 100000;
      assert.equal(session.pauseForCapture(700), true);
      session.update(0.1);

      assert.ok(first.isFainted());
      assert.equal(session.foe.pokemon, first, 'the next foe stays queued while the capture verdict is visible');
      now = 10699;
      session.update(0.1);
      assert.equal(session.foe.pokemon, first, 'the pause lasts until its wall-clock deadline');
      now = 10700;
      session.update(0.1);
      assert.equal(session.foe.pokemon, next);
    } finally {
      Date.now = realNow;
    }
  });

  test('a dungeon guardian enters one-time fury below half HP and keeps its base modifiers', () => {
    const player = PokemonFactory.create('rattata', 10);
    player.moves = ['tackle'];
    const foe = PokemonFactory.create('pidgey', 10);
    const session = new BattleSession({
      team: [player],
      foe,
      foeOptions: { hpMultiplier: 4.5, statMultipliers: { atk: 1.5, def: 1.35 }, dungeonBoss: true },
      random: Random.sequence([0.5])
    });
    session.start();
    session.foe.pokemon.hp = Math.ceil(session.foe.maxHp * 0.5);
    session.playerCooldownMs = 0;
    session.foeCooldownMs = 100000;
    session.update(0.1);

    assert.equal(session.foe.dungeonEnraged, true);
    assert.ok(Math.abs(session.foe.statMods.atk - 2.1) < 1e-12);
    assert.equal(session.foe.statMods.spe, 1.6);
    assert.ok(session.foeCooldownMs < 99900, 'the pending foe cooldown is accelerated');
    assert.equal(session.log.drain().filter((entry) => entry.key === 'dungeon_boss_enrage').length, 1);

    session.foe.statMods.atk = 0.5;
    session.foe.statModTurns.atk = 1;
    StatChangeRules.tick(session.foe);
    assert.ok(Math.abs(session.foe.statMods.atk - 2.1) < 1e-12, 'timed changes return to the guardian baseline');
    session._checkDungeonBossEnrage(session.foe);
    assert.equal(session.log.drain().filter((entry) => entry.key === 'dungeon_boss_enrage').length, 0, 'fury triggers only once');
  });

  test('manual switch resets volatile state and applies Natural Cure', () => {
    const current = PokemonFactory.create('charmander', 20);
    current.talent = 'naturalcure';
    const next = PokemonFactory.create('squirtle', 20);
    const fainted = PokemonFactory.create('weedle', 10);
    fainted.takeDamage(fainted.hp);
    const session = new BattleSession({ team: [current, next, fainted], foe: PokemonFactory.create('pidgey', 10), random: Random.sequence([0.5]) });
    session.start();
    session.active.status = 'burn';
    session.active.statMods.atk = 0.5;
    session.team[1].statMods.def = 0.5;

    assert.equal(session.switchPlayerPokemon(1), true);
    assert.equal(session.active.pokemon, next);
    assert.equal(session.team[0].status, null);
    assert.equal(session.team[0].statMods.atk, 1);
    assert.equal(session.active.statMods.def, 1);
    assert.equal(session.switchPlayerPokemon(1), false, 'cannot switch to the active Pokémon');
    assert.equal(session.switchPlayerPokemon(2), false, 'cannot select a fainted Pokémon');
    assert.equal(session.switchPlayerPokemon(99), false, 'invalid team index');
  });

  test('the next trainer foe is sent automatically after a knockout', () => {
    const player = PokemonFactory.create('charizard', 60);
    player.moves = ['tackle'];
    const first = PokemonFactory.create('pidgey', 3);
    first.hp = 1;
    const next = PokemonFactory.create('rattata', 3);
    const session = new BattleSession({
      team: [player],
      foe: first,
      reserves: [{ pokemon: next }],
      random: Random.sequence([0.5])
    });
    session.start();
    session.update(5);
    assert.ok(first.isFainted());
    assert.equal(session.foe.pokemon, next);
    assert.equal(session.sentFoes.length, 2);
    assert.equal(session.reserveCount, 0);
    assert.ok(session.foeCooldownMs >= BattleConfig.FOE_SWITCH_DELAY_S * 1000);
  });

  test('a fainted member is replaced by the next one; no member left is a defeat', () => {
    const team = [PokemonFactory.create('caterpie', 2), PokemonFactory.create('weedle', 2)];
    const foe = PokemonFactory.create('mewtwo', 70);
    const session = play(new BattleSession({ team, foe, random: Random.sequence([0.4, 0.6]) }));
    assert.equal(session.outcome, BattleOutcomes.DEFEAT);
    assert.ok(team.every((pokemon) => pokemon.isFainted()));
    assert.ok(session.log.drain().some((entry) => entry.key === 'battle_log.switch'));
  });

  test('hits are reported once with side, move and effectiveness', () => {
    const session = new BattleSession({ team: [PokemonFactory.create('charmander', 30)], foe: PokemonFactory.create('bulbasaur', 5), random: Random.sequence([0.5]) });
    play(session);
    const hits = session.drainHits();
    assert.ok(hits.length > 0);
    assert.ok(hits.every((hit) => Object.values(BattleSides).includes(hit.side) && typeof hit.moveId === 'string' && Number.isFinite(hit.damage)));
    assert.equal(session.drainHits().length, 0);
  });

  test('random battles never throw nor produce NaN', () => {
    const species = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'geodude', 'gastly', 'abra', 'onix', 'eevee', 'zubat'];
    const random = new Random(mulberry(7));
    for (let i = 0; i < 40; i++) {
      const team = [0, 1].map(() => PokemonFactory.create(random.pick(species), random.int(5, 40), { random }));
      const foe = PokemonFactory.create(random.pick(species), random.int(5, 40), { random });
      const session = play(new BattleSession({ team, foe, random, weather: random.pick([null, 'rain', 'sun', 'sand', 'hail']) }), 300);
      for (const pokemon of [...team, foe]) assert.ok(Number.isFinite(pokemon.hp), `${pokemon.species} hp`);
      session.drainHits();
    }
  });
});

describe('BattleSystem integration', (test) => {
  test('a wild win pays and catches before the next foe, then the chain can be stopped', () => {
    const saves = SaveSystem.getInstance();
    const save = saves.createNewSave('Arbitre', 'charmander');
    save.team[0].setLevel(60);
    PokeballSystem.getInstance().setBall('new', 'pokeball');
    const balls = save.inventory.count('pokeball');
    const caught = [];
    const onCaught = (event) => caught.push(event);
    EventBus.getInstance().subscribe(PokemonCaughtEvent, onCaught);
    LocationSystem.getInstance().travelTo('route1');
    const defeated = [];
    const attacks = [];
    const onDefeated = (event) => defeated.push(event);
    const onAttack = (event) => attacks.push(event);
    EventBus.getInstance().subscribe(PokemonDefeatedEvent, onDefeated);
    EventBus.getInstance().subscribe(BattleAttackEvent, onAttack);
    const battle = BattleSystem.getInstance();
    battle.setRandom(Random.sequence([0.2, 0.8, 0.5]));
    const money = save.currencies.get('money');
    assert.ok(battle.startBattle('route1'));
    for (let i = 0; i < 6000 && !caught.length; i++) battle.update(0.1);
    assert.ok(caught.length > 0, 'the first wild catch succeeds during the chain');
    assert.ok(battle.isActive(), 'the next foe is already in the same live session');
    assert.ok(defeated.length >= 1);
    assert.equal(defeated[0].locationId, 'route1');
    assert.ok(save.statistics.wildWins.route1 >= 1);
    assert.ok(save.currencies.get('money') > money);
    assert.ok(attacks.length > 0);
    assert.equal(save.inventory.count('pokeball'), balls - 1, 'the ball is consumed once for the first encounter');
    assert.equal(save.team.length, 2);
    assert.equal(save.statistics.caughtTotal, 1);
    assert.ok(save.pokedex.isCaught(caught[0].speciesId));
    assert.ok(battle.getLog().every((line) => !line.includes('battle_log.')));

    EventBus.getInstance().unsubscribe(PokemonDefeatedEvent, onDefeated);
    EventBus.getInstance().unsubscribe(BattleAttackEvent, onAttack);
    EventBus.getInstance().unsubscribe(PokemonCaughtEvent, onCaught);
    battle.endBattle(false);
    battle.setRandom(Random.default);
    assert.ok(!battle.isActive());
    assert.ok(save.team.every((pokemon) => pokemon.hp === pokemon.getMaxHp()));
  });

  test('BattleSystem publishes the automatically sent trainer reserve to the battle view', () => {
    const save = SaveSystem.getInstance().createNewSave('Remplaçant', 'charmander');
    save.team[0].setLevel(60);
    save.team[0].moves = ['tackle'];
    const first = PokemonFactory.create('pidgey', 3);
    first.hp = 1;
    const reserve = PokemonFactory.create('rattata', 3);
    const changes = [];
    const onStateChanged = (event) => changes.push(event);
    EventBus.getInstance().subscribe(BattleStateChangedEvent, onStateChanged);
    const battle = BattleSystem.getInstance();
    battle.setRandom(Random.sequence([0.5]));
    assert.ok(battle.startTrainerBattle({
      id: 'switch-test',
      foes: [{ pokemon: first }, { pokemon: reserve }],
      openingLines: [],
      onVictory: () => ({ expShare: 0, money: 0 })
    }, 'route1'));
    battle.update(5);
    EventBus.getInstance().unsubscribe(BattleStateChangedEvent, onStateChanged);
    battle.setRandom(Random.default);
    assert.equal(battle.getCurrentFoe(), reserve);
    assert.ok(changes.some((event) => event.foePokemon === reserve));
    battle.endBattle(false);
  });

  test('manual battle switch updates the player and notifies battle views', () => {
    const save = SaveSystem.getInstance().createNewSave('Switch', 'charmander');
    const reserve = PokemonFactory.create('squirtle', 12);
    assert.ok(TeamSystem.getInstance().addPokemon(reserve));
    const changes = [];
    const onStateChanged = (event) => changes.push(event);
    EventBus.getInstance().subscribe(BattleStateChangedEvent, onStateChanged);
    const battle = BattleSystem.getInstance();
    assert.ok(battle.startBattle('route1'));
    assert.equal(battle.switchPlayerPokemon(1), true);
    EventBus.getInstance().unsubscribe(BattleStateChangedEvent, onStateChanged);
    assert.equal(battle.getPlayerPokemon(), reserve);
    assert.ok(changes.some((event) => event.playerPokemon === reserve));
    assert.equal(battle.switchPlayerPokemon(1), false, 'active slot cannot be selected twice');
    battle.endBattle(false);
  });

  test('a quest encounter request starts a battle against the quest Pokémon', () => {
    const battle = BattleSystem.getInstance();
    battle.init();
    EventBus.getInstance().dispatch(new QuestEncounterRequestedEvent('side.test', { species: 'articuno', level: 50 }, 'route1'));
    assert.ok(battle.isActive());
    assert.equal(battle.getCurrentFoe().species, 'articuno');
    assert.equal(battle.getCurrentFoe().level, 50);
    battle.endBattle(false);
    assert.ok(!battle.isActive());
  });
});

/** Small deterministic generator for the random battles. */
function mulberry(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
