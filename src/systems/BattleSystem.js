/**
 * @file BattleSystem.js
 * @brief Automatic wild battles (C++ equivalent: class BattleSystem : public BaseSystem).
 * Bridges the save / event bus and the pure battle engine (systems/battle/BattleSession):
 *   - startBattle() draws a wild Pokémon from the location encounter table;
 *   - QuestEncounterRequestedEvent starts the final encounter of a quest;
 *   - LocalQuestBattleRequestedEvent starts a one-off local defeat-quest battle without auto-capture;
 *   - startTrainerBattle() runs a battle prepared by TrainerSystem (a trainer context: foe queue,
 *     opening lines, settlement in context.onVictory());
 *   - update(dt) advances the session, translates its log (BattleLogFormatter) and reports
 *     the hits (BattleAttackEvent) and states (BattleStateChangedEvent);
 *   - at the end: statistics, PokemonDefeatedEvent, experience and money (RewardRules), optional
 *     automatic catch (CatchSystem for ordinary wild battles), full team heal, one save write and
 *     BattleEndedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { BonusSystem } from './BonusSystem.js';
import { RoamingSystem } from './RoamingSystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { QuestSystem } from './QuestSystem.js';
import { CatchSystem } from './CatchSystem.js';
import { EventBus } from '../core/EventBus.js';
import { Random } from '../core/Random.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { PokemonData } from '../data/pokemon/PokemonData.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { QuestCategories } from '../data/quests/QuestCategories.js';
import { QuestCatchKinds } from '../data/catch/QuestCatchKinds.js';
import { HeldEffectKinds } from '../data/items/HeldEffectKinds.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { BattleSession, BattleOutcomes } from './battle/BattleSession.js';
import { BattleSides } from '../config/BattleSides.js';
import { BonusTypes } from '../config/BonusRules.js';
import { BattleLogFormatter } from './battle/BattleLogFormatter.js';
import { RewardRules } from './battle/RewardRules.js';
import { EncounterRules } from './battle/EncounterRules.js';
import { DungeonBattleRules } from './battle/DungeonBattleRules.js';
import { RouteDropRules } from './battle/RouteDropRules.js';
import { CaptureAnimationRules } from '../config/CaptureAnimationRules.js';
import { ModalNames } from '../config/ModalNames.js';
import { grantItem } from './inventory/ItemGrant.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleRunFinishedEvent } from '../core/events/BattleRunFinishedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { BattleAttackEvent } from '../core/events/BattleAttackEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { DungeonBattleResolvedEvent } from '../core/events/DungeonBattleResolvedEvent.js';
import { BattleFoeKnockedOutEvent } from '../core/events/BattleFoeKnockedOutEvent.js';
import { SecretBaseNpcBattleResolvedEvent } from '../core/events/SecretBaseNpcBattleResolvedEvent.js';
import { QuestEncounterRequestedEvent } from '../core/events/QuestEncounterRequestedEvent.js';
import { LocalQuestBattleRequestedEvent } from '../core/events/LocalQuestBattleRequestedEvent.js';
import { ModalToggledEvent } from '../core/events/ModalToggledEvent.js';
import {
  LOCAL_QUEST_BATTLE_TOWN_POOLS,
  LOCAL_QUEST_BATTLE_FALLBACK_POOL
} from '../data/content/LocalQuestBattleContent.js';
import { t } from '../localization/LocalizationManager.js';

/** Lines kept in the battle log. */
const LOG_MAX_LINES = 200;

/** @param {Object} npc @returns {Object} */
function copyNpc(npc) {
  return JSON.parse(JSON.stringify(npc));
}

export class BattleSystem extends BaseSystem {
  /** @private @type {BattleSystem|null} */
  static _instance = null;

  /** @returns {BattleSystem} */
  static getInstance() {
    if (!BattleSystem._instance) {
      BattleSystem._instance = new BattleSystem();
    }
    return BattleSystem._instance;
  }

  constructor() {
    super('BattleSystem', 'System');
    /** @private @type {BattleSession|null} */ this._session = null;
    /** @private @type {string|null} */ this._locationId = null;
    /** @private @type {string|null} Quest whose final encounter is running */ this._questKey = null;
    /** @private @type {string|null} Active local defeat quest (special battle, no auto-capture) */
    this._localQuestBattleKey = null;
    /** @private @type {boolean} */ this._battleSummaryOpen = false;
    /** @private @type {Object|null} TrainerBattleContext of the running trainer battle */ this._trainer = null;
    /** @private @type {{visitId:string,npc:Object,resolved:boolean}|null} */ this._secretBaseBattle = null;
    /** @private @type {Object|null} Last battle outcome, rewards and localized log */ this._lastResult = null;
    /** @private @type {{battles:number,wins:number,expGained:number,moneyGained:number,questPointsGained:number}} */
    this._sessionTotals = { battles: 0, wins: 0, expGained: 0, moneyGained: 0, questPointsGained: 0 };
    /** @private @type {Object|null} */ this._activeRun = null;
    /** @private @type {number} */ this._runSummarySequence = 0;
    /** @private @type {boolean} */ this._wildChain = false;
    /** @private @type {boolean} */ this._healOnEnd = true;
    /** @private @type {{nodeId:string|null}|null} */ this._dungeonContext = null;
    /** @private @type {string[]} */ this._log = [];
    /** @private @type {Random} */ this._random = Random.default;
    /** @private @type {Function|null} */ this._onEncounter = null;
    /** @private @type {Function|null} */ this._onLocalQuestBattleRequested = null;
    /** @private @type {Function|null} */ this._onModalToggled = null;
    /** @private @type {Function|null} */ this._onSaveContextChanged = null;
    /** @private @type {number} */ this._speedMultiplier = 1;
  }

  /** @override */
  init() {
    if (this._onEncounter) return;
    this._onEncounter = (event) => this._startQuestEncounter(event);
    this._onLocalQuestBattleRequested = (event) => this._startLocalQuestBattle(event);
    this._onModalToggled = (event) => {
      if (event.modalName === ModalNames.BATTLE_SUMMARY) this._battleSummaryOpen = event.isOpen === true;
    };
    this._onSaveContextChanged = () => this._resetSessionSummary();
    EventBus.getInstance().subscribe(QuestEncounterRequestedEvent, this._onEncounter);
    EventBus.getInstance().subscribe(LocalQuestBattleRequestedEvent, this._onLocalQuestBattleRequested);
    EventBus.getInstance().subscribe(ModalToggledEvent, this._onModalToggled);
    EventBus.getInstance().subscribe(SaveCreatedEvent, this._onSaveContextChanged);
    EventBus.getInstance().subscribe(SaveLoadedEvent, this._onSaveContextChanged);
  }

  /** @override */
  onDestroy() {
    if (this._onEncounter) EventBus.getInstance().unsubscribe(QuestEncounterRequestedEvent, this._onEncounter);
    if (this._onLocalQuestBattleRequested) {
      EventBus.getInstance().unsubscribe(LocalQuestBattleRequestedEvent, this._onLocalQuestBattleRequested);
    }
    if (this._onModalToggled) EventBus.getInstance().unsubscribe(ModalToggledEvent, this._onModalToggled);
    if (this._onSaveContextChanged) {
      EventBus.getInstance().unsubscribe(SaveCreatedEvent, this._onSaveContextChanged);
      EventBus.getInstance().unsubscribe(SaveLoadedEvent, this._onSaveContextChanged);
    }
    this._onEncounter = null;
    this._onLocalQuestBattleRequested = null;
    this._onModalToggled = null;
    this._onSaveContextChanged = null;
    super.onDestroy();
  }

  // --- Queries ---

  /** @private */
  _resetSessionSummary() {
    this._lastResult = null;
    this._sessionTotals = { battles: 0, wins: 0, expGained: 0, moneyGained: 0, questPointsGained: 0 };
    this._activeRun = null;
    this._wildChain = false;
    this._localQuestBattleKey = null;
    this._secretBaseBattle = null;
    this._battleSummaryOpen = false;
    this._healOnEnd = true;
    this._dungeonContext = null;
    this._log = [];
  }

  /** @private @param {string} locationId */
  _createRunSummary(locationId) {
    const startedAt = Date.now();
    this._activeRun = {
      runId: `battle-${startedAt}-${++this._runSummarySequence}`,
      locationId,
      startedAt,
      battles: 0,
      wins: 0,
      expGained: 0,
      moneyGained: 0,
      questPointsGained: 0,
      tokensGained: 0,
      playerKOs: 0,
      catches: [],
      items: [],
      damageByPokemon: {}
    };
  }

  /** @private @returns {Object|null} Defensive presentation snapshot */
  _snapshotRun() {
    if (!this._activeRun) return null;
    const run = this._activeRun;
    return {
      ...run,
      catches: run.catches.map((entry) => ({ ...entry })),
      items: run.items.map((entry) => ({ ...entry })),
      damageByPokemon: Object.values(run.damageByPokemon).map((entry) => ({ ...entry }))
    };
  }

  /** @private @param {Object|null} run */
  _copyRunSnapshot(run) {
    if (!run) return null;
    return {
      ...run,
      catches: (run.catches || []).map((entry) => ({ ...entry })),
      items: (run.items || []).map((entry) => ({ ...entry })),
      damageByPokemon: (run.damageByPokemon || []).map((entry) => ({ ...entry }))
    };
  }

  /** @returns {boolean} */
  isActive() {
    return !!this._session;
  }

  /** @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} */
  getCurrentFoe() {
    return this._session?.foe.pokemon ?? null;
  }

  /** @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} Active Pokémon of the player */
  getPlayerPokemon() {
    return this._session?.active.pokemon ?? null;
  }

  /**
   * Read-only view of the fighters (statuses, stat modifiers, field) for the battle views.
   * @returns {{player: import('./battle/BattleCombatant.js').BattleCombatant, foe: import('./battle/BattleCombatant.js').BattleCombatant, team: import('./battle/BattleCombatant.js').BattleCombatant[], field: import('./battle/BattleField.js').BattleField, playerCooldownMs:number, playerCooldownTotalMs:number, foeCooldownMs:number, foeCooldownTotalMs:number}|null}
   */
  getCombatState() {
    const session = this._session;
    return session ? {
      player: session.active,
      foe: session.foe,
      team: [...session.team],
      field: session.field,
      playerCooldownMs: session.playerCooldownMs,
      playerCooldownTotalMs: session.playerCooldownTotalMs,
      foeCooldownMs: session.foeCooldownMs,
      foeCooldownTotalMs: session.foeCooldownTotalMs
    } : null;
  }

  /**
   * Read-only trainer identity for the battle view (no DOM or localization work in the system).
   * @returns {{id:string, trainerId:string, role:string, sprite:string|null}|null}
   */
  getTrainerPresentation() {
    const baseBattle = this._secretBaseBattle;
    if (baseBattle) {
      return {
        id: baseBattle.npc.id,
        trainerId: baseBattle.npc.sprite || 'trainer-0',
        role: 'secret_base',
        sprite: baseBattle.npc.sprite || null,
        displayName: baseBattle.npc.name || t('edit.npc_default_name')
      };
    }
    const context = this._trainer;
    if (!context) return null;
    const currentFoe = this._session?.foe?.pokemon;
    const currentEntry = context.foes?.find((entry) => entry.pokemon === currentFoe);
    const trainerId = currentEntry?.trainerId;
    const trainer = context.trainers?.find((entry) => entry.id === trainerId) ?? context.trainers?.[0] ?? null;
    const league = context.league ?? null;
    return {
      id: league?.id ?? trainer?.id ?? context.id,
      trainerId: trainer?.id ?? context.id,
      role: league ? 'league' : (trainer?.kind ?? 'trainer'),
      sprite: trainer?.sprite ?? league?.sprite ?? null
    };
  }

  /** @returns {Object} Snapshot for the summary modal; no mutable engine state is exposed. */
  getBattleSummary() {
    const session = this._session;
    const totals = { ...this._sessionTotals };
    if (session) {
      const run = this._snapshotRun();
      return {
        state: 'active',
        foeName: session.foe.pokemon.getDisplayName(),
        victory: null,
        expGained: run?.expGained ?? 0,
        moneyGained: run?.moneyGained ?? 0,
        questPointsGained: run?.questPointsGained ?? 0,
        localQuestBattleKey: this._localQuestBattleKey,
        session: totals,
        run,
        log: this.getLog()
      };
    }
    return this._lastResult
      ? { ...this._lastResult, session: totals, run: this._copyRunSnapshot(this._lastResult.run), log: [...this._lastResult.log] }
      : { state: 'empty', foeName: '', victory: null, expGained: 0, moneyGained: 0, questPointsGained: 0, session: totals, run: null, log: [] };
  }

  /** @returns {string[]} Localized battle log lines */
  getLog() {
    return [...this._log];
  }

  // --- Commands ---

  /**
   * Manually changes the active player Pokémon using the session's standard switch-in rules.
   * @param {number} index - Index in the active save's team
   * @returns {boolean} false when no battle is active or the slot cannot be selected
   */
  switchPlayerPokemon(index) {
    const session = this._session;
    if (!session || !session.switchPlayerPokemon(index)) return false;
    this._flushLog();
    EventBus.getInstance().dispatch(new BattleStateChangedEvent(session.active.pokemon, session.foe.pokemon));
    return true;
  }

  /** @param {string} uid @returns {boolean} UI party order may change without reordering in-flight combatants. */
  switchPlayerPokemonByUid(uid){
    const index=this._session?.team.findIndex(combatant=>combatant.pokemon.uid===uid)??-1;
    return index>=0&&this.switchPlayerPokemon(index);
  }

  /**
   * Random source of the next battles (tests use Random.sequence).
   * @param {Random} random
   */
  setRandom(random) {
    this._random = random;
  }

  /**
   * Starts a wild encounter. Ordinary exploration chains automatically; dungeon encounters are
   * single fights with persistent team damage and a settlement hand-off to DungeonSystem.
   * @param {string} [locationId] - Defaults to the player position
   * @param {{chain?:boolean,healOnEnd?:boolean,dungeon?:{nodeId?:string|null,tileType?:string,floor?:number,depth?:number}}} [options]
   * @returns {boolean} False when no battle can start
   */
  startBattle(locationId = LocationSystem.getInstance().getCurrentLocationId(), options = {}) {
    if (this.isActive()) return false;
    const save = SaveSystem.getInstance().getCurrentSave();
    const team = save?.team ?? [];
    const encounters = LocationDB.getInstance().getEncounters(locationId);
    const dungeon = options.dungeon && typeof options.dungeon === 'object' ? options.dungeon : null;
    const wildEncounter = dungeon
      ? null
      : EncounterRules.drawWildEncounter(encounters, team, this._random, {
        roamingSpecies: RoamingSystem.getSpeciesAt(locationId)
      });
    const drawn = dungeon
      ? DungeonBattleRules.draw(encounters, team, this._random, {
        tileType: dungeon.tileType || 'combat',
        floor: dungeon.floor || 1,
        depth: dungeon.depth || 1
      })
      : wildEncounter
        ? {
          pokemon: wildEncounter.pokemon,
          foeOptions: {},
          introKey: wildEncounter.isRoaming ? 'roaming_legendary_appeared' : 'battle_log.wild_appeared'
        }
        : null;
    if (!drawn?.pokemon) {
      this._warn('battle_no_wild_here');
      return false;
    }
    this._trainer = null;
    this._secretBaseBattle = null;
    this._questKey = null;
    this._localQuestBattleKey = null;
    this._wildChain = options.chain !== false;
    this._healOnEnd = options.healOnEnd !== false;
    this._dungeonContext = dungeon
      ? { nodeId: dungeon.nodeId || null, tileType: dungeon.tileType || 'combat', floor: dungeon.floor || 1, depth: dungeon.depth || 1 }
      : null;
    this._createRunSummary(locationId);
    const started = this._begin(drawn.pokemon, locationId, null, drawn.introKey, [], drawn.foeOptions);
    if (!started) {
      this._wildChain = false;
      this._activeRun = null;
      this._healOnEnd = true;
      this._dungeonContext = null;
    }
    return started;
  }

  /**
   * Starts a trainer battle prepared by TrainerSystem.
   * @param {import('./trainers/TrainerBattleContext.js').TrainerBattleContext} context
   * @param {string} [locationId] - Defaults to the player position
   * @returns {boolean} False when no battle can start
   */
  startTrainerBattle(context, locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    if (this.isActive() || !context.foes.length) return false;
    this._wildChain = false;
    this._localQuestBattleKey = null;
    this._secretBaseBattle = null;
    this._activeRun = null;
    const [first, ...reserves] = context.foes;
    this._trainer = context;
    const started = this._begin(first.pokemon, locationId, null, context.openingLines, reserves);
    if (!started) this._trainer = null;
    return started;
  }

  /**
   * Starts a one-off duel against a saved secret-base NPC using the standard battle engine.
   * It deliberately has no wild chain, capture, rewards, route drops, or trainer settlement.
   * @param {Object} npc
   * @param {string} visitId
   * @param {string} [locationId]
   * @returns {boolean}
   */
  startSecretBaseNpcBattle(npc, visitId, locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    if (this.isActive() || !npc || !Array.isArray(npc.team) || !npc.team.length || !visitId) return false;
    const team = npc.team.slice(0, 6).map((entry) => this._createSecretBaseOpponent(entry)).filter(Boolean);
    if (!team.length) return false;
    const [first, ...reserves] = team.map((pokemon) => ({ pokemon }));
    this._wildChain = false;
    this._questKey = null;
    this._localQuestBattleKey = null;
    this._trainer = null;
    this._activeRun = null;
    this._healOnEnd = true;
    this._dungeonContext = null;
    this._secretBaseBattle = { visitId, npc: copyNpc(npc), resolved: false };
    const introKey = npc.messages?.pre ? 'edit.battle_intro_quote' : 'edit.battle_intro';
    const started = this._begin(first.pokemon, locationId, null, [{
      key: introKey,
      params: { name: npc.name || '', quote: npc.messages?.pre || '' }
    }], reserves);
    if (!started) {
      this._secretBaseBattle = null;
      return false;
    }
    return true;
  }

  /** @private @param {Object} entry @returns {PokemonData|null} */
  _createSecretBaseOpponent(entry) {
    if (!entry || typeof entry.species !== 'string' || !PokemonDB.getInstance().has(entry.species)) return null;
    const generated = PokemonFactory.create(entry.species, entry.level, { shiny: entry.shiny === true, random: this._random });
    if (!generated) return null;
    const snapshot = generated.serialize();
    if (Array.isArray(entry.moves) && entry.moves.length) snapshot.moves = entry.moves.slice(0, 4);
    if (typeof entry.talent === 'string' && entry.talent) snapshot.talent = entry.talent;
    snapshot.heldItem = typeof entry.heldItem === 'string' ? entry.heldItem : null;
    snapshot.hp = generated.getMaxHp();
    return new PokemonData(snapshot);
  }

  /** @returns {boolean} true while a trainer battle runs */
  isTrainerBattle() {
    return !!this._trainer;
  }

  /**
   * Stops the current battle (player leaves): no reward, the team is healed.
   * @param {boolean} [victory=false]
   * @param {number} [exp=0]
   * @param {number} [money=0]
   * @param {{questPoints?: number,natural?:boolean}} [details={}]
   */
  endBattle(victory = false, exp = 0, money = 0, details = {}) {
    if (!this.isActive()) return;
    const session = this._session;
    const locationId=this._locationId;
    const kind=this._dungeonContext?'dungeon':this._trainer?'trainer':this._questKey||this._localQuestBattleKey?'quest':this._secretBaseBattle?'base':this._wildChain?'wild':'encounter';
    const natural=details.natural===true;
    const localQuestBattleKey = this._localQuestBattleKey;
    const secretBaseBattle = this._secretBaseBattle;
    let endedAsVictory = !!victory;
    if (secretBaseBattle && !secretBaseBattle.resolved) {
      const quote = secretBaseBattle.npc.messages?.win || '';
      if (quote) session?.log.add('edit.battle_quote', { name: secretBaseBattle.npc.name || '', quote });
      this._flushLog();
      secretBaseBattle.resolved = true;
      endedAsVictory = false;
      exp = 0;
      money = 0;
      details = {};
      EventBus.getInstance().dispatch(new SecretBaseNpcBattleResolvedEvent(
        secretBaseBattle.visitId, secretBaseBattle.npc, false, true
      ));
    }
    if (this._activeRun) {
      this._activeRun.playerKOs = session?.playerKOs ?? this._activeRun.playerKOs;
      this._activeRun.endedAt = Date.now();
      this._activeRun.durationMs = Math.max(0, this._activeRun.endedAt - this._activeRun.startedAt);
    }
    const run = this._snapshotRun();
    this._lastResult = {
      state: 'ended',
      foeName: session?.foe?.pokemon?.getDisplayName?.() ?? '',
      victory: endedAsVictory,
      expGained: Math.max(0, Number(exp) || 0),
      moneyGained: Math.max(0, Number(money) || 0),
      questPointsGained: Math.max(0, Number(details.questPoints) || 0),
      localQuestBattleKey,
      run,
      log: this.getLog()
    };
    if (run) {
      this._sessionTotals.battles += Math.max(1, run.battles);
      this._sessionTotals.wins += run.wins;
      this._sessionTotals.expGained += run.expGained;
      this._sessionTotals.moneyGained += run.moneyGained;
      this._sessionTotals.questPointsGained += run.questPointsGained;
    } else {
      this._sessionTotals.battles++;
      if (this._lastResult.victory) this._sessionTotals.wins++;
      this._sessionTotals.expGained += this._lastResult.expGained;
      this._sessionTotals.moneyGained += this._lastResult.moneyGained;
      this._sessionTotals.questPointsGained += this._lastResult.questPointsGained;
    }
    if (this._healOnEnd) {
      for (const pokemon of SaveSystem.getInstance().getCurrentSave()?.team ?? []) pokemon.healFull();
    }
    this._session = null;
    this._questKey = null;
    this._localQuestBattleKey = null;
    this._trainer = null;
    this._secretBaseBattle = null;
    this._wildChain = false;
    this._activeRun = null;
    this._healOnEnd = true;
    this._dungeonContext = null;
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new BattleEndedEvent(endedAsVictory, exp, money));
    EventBus.getInstance().dispatch(new BattleRunFinishedEvent(locationId,kind,endedAsVictory?'victory':natural?'defeat':'stopped',natural));
  }

  /**
   * Sets the debug battle speed multiplier (e.g. 10 for x10 speed).
   * @param {number} multiplier
   */
  setSpeedMultiplier(multiplier) {
    this._speedMultiplier = Math.max(1, Number(multiplier) || 1);
  }

  /**
   * @returns {number} Current speed multiplier (1 by default).
   */
  getSpeedMultiplier() {
    return this._speedMultiplier || 1;
  }

  /**
   * Toggles between 1x and 10x battle speed.
   * @returns {number} New multiplier (1 or 10).
   */
  toggleSpeedMultiplierX10() {
    const next = this.getSpeedMultiplier() === 10 ? 1 : 10;
    this.setSpeedMultiplier(next);
    return next;
  }

  /**
   * @override
   * @param {number} dt - Seconds since the last frame
   */
  update(dt) {
    const session = this._session;
    if (!session) return;
    const timeScale = this._speedMultiplier > 1 ? this._speedMultiplier : 1;
    session.update(dt * timeScale);
    const hits = session.drainHits();
    if (this._activeRun) {
      this._activeRun.playerKOs = session.playerKOs;
      for (const hit of hits) {
        if (hit.side !== BattleSides.PLAYER || !(Number(hit.damage) > 0)) continue;
        const key = hit.pokemonUid || `${hit.species}:${hit.name}`;
        const row = this._activeRun.damageByPokemon[key] ??= {
          uid: hit.pokemonUid || key,
          species: hit.species,
          name: hit.name,
          shiny: !!hit.shiny,
          damage: 0,
          kos: 0
        };
        row.damage += Math.max(0, Number(hit.damage) || 0);
      }
    }
    for (const hit of hits) EventBus.getInstance().dispatch(new BattleAttackEvent(hit));
    const changed = this._flushLog() || hits.length > 0;
    if (changed) EventBus.getInstance().dispatch(new BattleStateChangedEvent(session.active.pokemon, session.foe.pokemon));
    if (session.isOver()) this._finish(session);
  }

  // --- Internals ---

  /**
   * @private
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} foe
   * @param {string} locationId
   * @param {string|null} questKey
   * @param {string|Array<{key: string, params: Object}>} intro - Battle log key of the first line
   *   (the foe name is its parameter), or the ready-made opening lines of a trainer battle
   * @param {Array<{pokemon: Object, intro?: Object}>} [reserves=[]] - Foes sent after `foe`
   * @param {Object} [foeOptions={}] - Temporary encounter scaling
   * @returns {boolean}
   */
  _begin(foe, locationId, questKey, intro, reserves = [], foeOptions = {}) {
    if (TrainingSystem.getInstance().isActive()) {
      this._warn('facility_outdoor_blocked_training');
      return false;
    }
    const save = SaveSystem.getInstance().getCurrentSave();
    const team = save?.team ?? [];
    if (!team.some((pokemon) => !pokemon.isFainted())) {
      this._warn('battle_no_team');
      return false;
    }
    this._locationId = locationId;
    this._questKey = questKey;
    const roamingNextFoes = new WeakSet();
    this._session = new BattleSession({
      team,
      foe,
      foeOptions,
      random: this._random,
      weather: LocationDB.getInstance().getById(locationId)?.weather ?? null,
      hiddenTalentUnlocked: (species) => save.talents.hasHidden(species),
      ownedQuantity: (itemId) => save.inventory.count(itemId),
      reserves,
      nextFoeFactory: this._wildChain
        ? () => {
            const encounter = EncounterRules.drawWildEncounter(
              LocationDB.getInstance().getEncounters(locationId),
              save.team,
              this._random,
              { roamingSpecies: RoamingSystem.getSpeciesAt(locationId) }
            );
            const nextFoe = encounter?.pokemon ?? null;
            if (encounter?.isRoaming && nextFoe) roamingNextFoes.add(nextFoe);
            if (nextFoe) save.pokedex.markSeen(nextFoe.species);
            return nextFoe;
          }
        : null,
      nextFoeIntroKey: (pokemon) => roamingNextFoes.has(pokemon)
        ? 'roaming_legendary_appeared'
        : 'battle_log.wild_appeared',
      onFoeDefeated: (encounter, runningSession) => {
        const defeated = encounter?.pokemon;
        if (defeated && !this._secretBaseBattle) EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent(
          defeated.species,
          defeated.level,
          locationId,
          { deferSave: true }
        ));
        if (this._wildChain) this._settleWildEncounter(save, runningSession, encounter);
      }
    });
    this._log = [];
    const lines = typeof intro === 'string' ? [{ key: intro, params: { name: foe.getDisplayName() } }] : intro;
    for (const line of lines) this._session.log.add(line.key, line.params);
    if (!this._secretBaseBattle && (reserves.length || typeof intro !== 'string')) {
      this._session.log.add('battle_log.trainer_sends', { name: foe.getDisplayName() });
    }
    this._session.start();
    this._flushLog();
    // The battle owns persistence for first-seen discoveries as well as the result.
    save.pokedex.markSeen(foe.species, { deferSave: true });
    NotificationSystem.getInstance().notifyTemporary(this._log[0], { channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING });
    EventBus.getInstance().dispatch(new BattleStartedEvent(this._session.active.pokemon, foe));
    return true;
  }

  /**
   * Resolves the original quest battle pool priority: local encounters, hand-authored town pool,
   * same-group route encounters, direct connection encounters, then the original safe fallback.
   * @private
   * @param {string} locationId
   * @returns {ReadonlyArray<{species:string,minLevel:number,maxLevel:number}>}
   */
  _getLocalQuestBattlePool(locationId) {
    const locations = LocationDB.getInstance();
    const location = locations.getById(locationId);
    if (!location) return LOCAL_QUEST_BATTLE_FALLBACK_POOL;
    const encounters = locations.getEncounters(locationId);
    if (encounters.length) return encounters;
    const townPool = LOCAL_QUEST_BATTLE_TOWN_POOLS[locationId];
    if (townPool?.length) return townPool;
    const group = locations.getGroup(locationId);
    const linkedLocation = locations.getAll().find((candidate) =>
      candidate.id !== locationId && locations.getGroup(candidate.id) === group &&
      locations.getEncounters(candidate.id).length > 0
    );
    if (linkedLocation) return locations.getEncounters(linkedLocation.id);
    for (const connectionId of location.connections) {
      const linkedEncounters = locations.getEncounters(connectionId);
      if (linkedEncounters.length) return linkedEncounters;
    }
    return LOCAL_QUEST_BATTLE_FALLBACK_POOL;
  }

  /** @private @param {LocalQuestBattleRequestedEvent} event */
  _startLocalQuestBattle(event) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const locationId = event?.locationId;
    const questKey = event?.questKey;
    const state = locationId ? QuestSystem.getInstance().getLocalDefeatBattleState(locationId) : null;
    if (!save || save.player.location !== locationId || !state || state.quest.key !== questKey) {
      this._warn('quest_battle_none');
      return false;
    }
    if (!save.team?.length) {
      this._warn('battle_no_team');
      return false;
    }
    if (TrainingSystem.getInstance().isActive()) {
      this._warn('training_in_progress_no_battle');
      return false;
    }
    if (this.isActive()) {
      this.endBattle(false);
      this._warn('quest_battle_stop_current');
      return false;
    }
    if (this._battleSummaryOpen) {
      this._warn('quest_battle_summary_open');
      return false;
    }

    const drawn = EncounterRules.drawQuestBattle(this._getLocalQuestBattlePool(locationId), this._random);
    if (!drawn?.pokemon) {
      this._warn('enemy_not_found_error');
      return false;
    }
    this._trainer = null;
    this._secretBaseBattle = null;
    this._questKey = null;
    this._localQuestBattleKey = questKey;
    this._wildChain = false;
    this._healOnEnd = true;
    this._dungeonContext = null;
    this._createRunSummary(locationId);
    const started = this._begin(drawn.pokemon, locationId, null, 'battle_log.wild_appeared');
    if (!started) {
      this._localQuestBattleKey = null;
      this._activeRun = null;
      this._healOnEnd = true;
      return false;
    }
    const questTitle = t(`quests.${state.quest.category}.${state.quest.id}.title`);
    this._session.log.add('quest_battle_started', { quest: questTitle });
    this._flushLog();
    EventBus.getInstance().dispatch(new BattleStateChangedEvent(
      this._session.active.pokemon,
      this._session.foe.pokemon
    ));
    return true;
  }

  /**
   * @private
   * @param {QuestEncounterRequestedEvent} event
   */
  _startQuestEncounter(event) {
    if (this.isActive() || !PokemonDB.getInstance().has(event.pokemon.species)) return;
    const foe = PokemonFactory.create(event.pokemon.species, event.pokemon.level, { shiny: !!event.pokemon.shiny });
    const locationId = event.locationId ?? LocationSystem.getInstance().getCurrentLocationId();
    this._trainer = null;
    this._secretBaseBattle = null;
    this._wildChain = false;
    this._localQuestBattleKey = null;
    this._activeRun = null;
    this._begin(foe, locationId, event.questKey, 'battle_log.quest_encounter');
  }

  /**
   * @private
   * @returns {boolean} true when new lines were added
   */
  _flushLog() {
    const entries = this._session?.log.drain() ?? [];
    for (const entry of entries) this._log.push(BattleLogFormatter.format(entry));
    if (this._log.length > LOG_MAX_LINES) this._log.splice(0, this._log.length - LOG_MAX_LINES);
    return entries.length > 0;
  }

  /**
   * @private
   * @param {BattleSession} session
   */
  _finish(session) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const foe = session.foe.pokemon;
    const dungeonContext = this._dungeonContext;
    const secretBaseBattle = this._secretBaseBattle;
    const localQuestBattle = !!this._localQuestBattleKey;
    const activeRun = this._activeRun;
    let exp = 0;
    let money = 0;
    let questPoints = 0;
    const victory = session.outcome === BattleOutcomes.VICTORY;
    for (const sent of session.sentFoes) save?.pokedex.markSeen(sent.species, { deferSave: true });

    if (secretBaseBattle) {
      const quote = victory ? secretBaseBattle.npc.messages?.lose : secretBaseBattle.npc.messages?.win;
      if (quote) session.log.add('edit.battle_quote', { name: secretBaseBattle.npc.name || '', quote });
      if (!victory) session.log.add('battle_log.defeat');
      secretBaseBattle.resolved = true;
      EventBus.getInstance().dispatch(new SecretBaseNpcBattleResolvedEvent(
        secretBaseBattle.visitId, secretBaseBattle.npc, victory, false
      ));
    } else if (this._wildChain && activeRun) {
      activeRun.playerKOs = session.playerKOs;
      exp = activeRun.expGained;
      money = activeRun.moneyGained;
      questPoints = activeRun.questPointsGained;
      if (!victory) {
        session.log.add('battle_log.defeat');
        NotificationSystem.getInstance().notifyTemporary(t('battle_lost_recover'), {
          channel: NotificationChannels.BATTLE,
          tone: NotificationTones.DANGER
        });
      }
    } else if (victory && save && this._trainer) {
      ({ exp, money, questPoints } = this._settleTrainer(save, session));
    } else if (victory && save) {
      const wild = !this._questKey;
      if (wild) save.statistics.recordWildWin(this._locationId);
      EventBus.getInstance().dispatch(new PokemonDefeatedEvent(
        foe.species,
        foe.level,
        this._locationId,
        wild,
        { deferSave: true }
      ));
      exp = this._grantExperience(save, foe);
      if (wild) {
        money = BonusSystem.getInstance().applyMultiplier(
          RewardRules.wildMoney(LocationDB.getInstance().getById(this._locationId)), BonusTypes.MONEY
        );
        save.currencies.add(BonusTypes.MONEY, money);
        session.log.add('battle_log.money', { money });
      }
      const capture = localQuestBattle ? null : this._tryCatch(save, session);
      if (activeRun && (dungeonContext || localQuestBattle)) {
        activeRun.battles = 1;
        activeRun.wins = 1;
        activeRun.expGained = exp;
        activeRun.moneyGained = money;
        activeRun.playerKOs = session.playerKOs;
        if (capture?.caught) {
          activeRun.catches.push({
            species: foe.species,
            form: foe.form,
            name: foe.getDisplayName(),
            shiny: !!foe.shiny,
            duplicate: capture.duplicate,
            ballId: capture.ballId
          });
          activeRun.tokensGained += capture.tokens;
        }
        const itemId = RouteDropRules.draw(this._locationId, this._random, save.team,
          BonusSystem.getInstance().getTotal(BonusTypes.ROUTE_LOOT));
        if (itemId) {
          const reward = grantItem(save, itemId, 1, { deferSave: true });
          if (reward.added > 0) {
            activeRun.items.push({ itemId, quantity: reward.added });
            session.log.add('battle_log.item_found', { itemId });
          }
          if (reward.money > 0) {
            activeRun.moneyGained += reward.money;
            session.log.add('battle_log.item_duplicate_money', { itemId, money: reward.money });
          }
        }
      }
      NotificationSystem.getInstance().notifyTemporary(
        t('notif_enemy_defeated', { name: foe.getDisplayName(), exp, money }),
        { channel: NotificationChannels.BATTLE }
      );
    } else {
      if (activeRun && (dungeonContext || localQuestBattle)) {
        activeRun.battles = 1;
        activeRun.wins = 0;
        activeRun.playerKOs = session.playerKOs;
      }
      session.log.add('battle_log.defeat');
      NotificationSystem.getInstance().notifyTemporary(t('battle_lost_recover'), {
        channel: NotificationChannels.BATTLE,
        tone: NotificationTones.DANGER
      });
    }
    this._flushLog();
    if (dungeonContext) {
      EventBus.getInstance().dispatch(new DungeonBattleResolvedEvent(
        this._locationId,
        dungeonContext.nodeId,
        victory,
        foe.species,
        this._snapshotRun()
      ));
    }
    this.endBattle(victory,exp,money,{questPoints,natural:true});
  }

  /**
   * Settles a single defeated wild Pokémon before the next encounter is sent in.
   * @private
   * @param {import('../data/save/SaveData.js').SaveData} save
   * @param {BattleSession} session
   * @param {Object} encounter - Frozen-per-foe battle counters and Pokémon identity
   */
  _settleWildEncounter(save, session, encounter) {
    const run = this._activeRun;
    const foe = encounter?.pokemon;
    if (!run || !foe) return;

    run.battles++;
    run.wins++;
    save.pokedex.markSeen(foe.species, { deferSave: true });
    save.statistics.recordWildWin(this._locationId);
    EventBus.getInstance().dispatch(new PokemonDefeatedEvent(
      foe.species,
      foe.level,
      this._locationId,
      true,
      { deferSave: true }
    ));

    let totalExp = 0;
    const reportedExp = this._grantExperience(save, foe, (share) => { totalExp += share; });
    run.expGained += totalExp;

    const money = BonusSystem.getInstance().applyMultiplier(
      RewardRules.wildMoney(LocationDB.getInstance().getById(this._locationId)), BonusTypes.MONEY
    );
    save.currencies.add(BonusTypes.MONEY, money);
    run.moneyGained += money;
    session.log.add('battle_log.money', { money });

    const capture = CatchSystem.getInstance().attemptDetailed({
      save,
      session,
      locationId: this._locationId,
      questKind: QuestCatchKinds.NONE,
      deferSave: true
    });
    if (capture.ballId) session.pauseForCapture(CaptureAnimationRules.TRANSITION_MS);
    if (capture.caught) {
      run.catches.push({
        species: foe.species,
        form: foe.form,
        name: foe.getDisplayName(),
        shiny: !!foe.shiny,
        duplicate: capture.duplicate,
        ballId: capture.ballId
      });
      run.tokensGained += capture.tokens;
      if (capture.addedToTeam && capture.pokemon) session.addPlayerPokemon(capture.pokemon);
    }

    const itemId = RouteDropRules.draw(this._locationId, this._random, save.team,
          BonusSystem.getInstance().getTotal(BonusTypes.ROUTE_LOOT));
    if (itemId) {
      const reward = grantItem(save, itemId, 1, { deferSave: true });
      if (reward.added > 0) {
        const existing = run.items.find((entry) => entry.itemId === itemId);
        if (existing) existing.quantity += reward.added;
        else run.items.push({ itemId, quantity: reward.added });
        session.log.add('battle_log.item_found', { itemId });
      } else if (reward.money > 0) {
        run.moneyGained += reward.money;
        session.log.add('battle_log.item_duplicate_money', { itemId, money: reward.money });
      }
    }

    if (encounter.scorerUid) {
      const scorer = run.damageByPokemon[encounter.scorerUid] ??= {
        uid: encounter.scorerUid,
        species: encounter.scorerSpecies,
        name: encounter.scorerName,
        shiny: encounter.scorerShiny,
        damage: 0,
        kos: 0
      };
      scorer.kos++;
    }
    run.playerKOs = session.playerKOs;
    NotificationSystem.getInstance().notifyTemporary(
      t('notif_enemy_defeated', { name: foe.getDisplayName(), exp: reportedExp, money }),
      { channel: NotificationChannels.BATTLE }
    );
    SaveSystem.getInstance().saveCurrent();
  }

  /**
   * Trainer win: the context applies badges / rewards, then the fixed experience share.
   * @private
   * @returns {{exp: number, money: number, questPoints: number}}
   */
  _settleTrainer(save, session) {
    const result = this._trainer.onVictory({ save, session, locationId: this._locationId, deferSave: true });
    const exp = result.expShare > 0 ? this._grantFixedExperience(save, result.expShare) : 0;
    NotificationSystem.getInstance().notifyTemporary(
      t('notif_trainer_defeated', { trainer: t(`trainer.${this._trainer.league?.id ?? this._trainer.id}.name`) }),
      { channel: NotificationChannels.BATTLE, tone: NotificationTones.ACCENT }
    );
    return { exp, money: result.money, questPoints: result.questPoints };
  }

  /**
   * Same experience for every living member (original champion win).
   * @private
   * @param {import('../data/save/SaveData.js').SaveData} save
   * @param {number} share
   */
  _grantFixedExperience(save, share) {
    const modifiedShare = BonusSystem.getInstance().applyMultiplier(share, BonusTypes.XP);
    for (const member of save.team.filter((pokemon) => !pokemon.isFainted())) this._giveExp(member, modifiedShare);
    return modifiedShare;
  }

  /**
   * @private
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} member
   * @param {number} share
   */
  _giveExp(member, share) {
    const log = this._session.log;
    const levels = member.addExp(share);
    log.add('battle_log.exp_gained', { name: member.getDisplayName(), exp: share });
    if (levels > 0) {
      log.add('battle_log.level_up', { name: member.getDisplayName(), level: member.level });
      NotificationSystem.getInstance().notifyTemporary(
        t('notif_level_up', { name: member.getDisplayName(), level: member.level }),
        { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.ACCENT }
      );
    }
  }

  /**
   * Original gainXP: every living member gets its scaled share.
   * @private
   * @returns {number} Highest share (reported by BattleEndedEvent)
   */
  _grantExperience(save, foe, onShare = null) {
    const log = this._session.log;
    const baseShare = RewardRules.baseShare(foe.getSpecies(), foe.level);
    let best = 0;
    for (const member of save.team.filter((pokemon) => !pokemon.isFainted())) {
      const luckyEgg = this._heldKind(member) === HeldEffectKinds.EXP;
      const baseMemberShare = RewardRules.memberExp(baseShare, member.level, foe.level, luckyEgg);
      const share = BonusSystem.getInstance().applyMultiplier(baseMemberShare, BonusTypes.XP);
      best = Math.max(best, share);
      if (share > 0) {
        this._giveExp(member, share);
        if (typeof onShare === 'function') onShare(share, member);
      }
    }
    if (best === 0) log.add('battle_log.exp_none');
    return best;
  }

  /**
   * Automatic catch (CatchSystem). The final encounter of a quest is claimed only once its
   * Pokémon is caught; otherwise it stays available (the ball is the only cost).
   * @private
   */
  _tryCatch(save, session) {
    const quest = this._questKey ? QuestDB.getInstance().getById(this._questKey) : null;
    let questKind = QuestCatchKinds.NONE;
    if (quest) questKind = quest.category === QuestCategories.MAIN ? QuestCatchKinds.GIFT : QuestCatchKinds.LEGENDARY;
    const result = CatchSystem.getInstance().attemptDetailed({
      save,
      session,
      locationId: this._locationId,
      questKind,
      deferTokens: !!this._dungeonContext,
      deferSave: true
    });
    if (result.caught && this._questKey) {
      QuestSystem.getInstance().claim(this._questKey, { encounterWon: true, deferSave: true });
    }
    return result;
  }

  /** @private @returns {string|null} HeldEffectKinds value of the held item */
  _heldKind(pokemon) {
    return pokemon.heldItem ? ItemDB.getInstance().getById(pokemon.heldItem)?.effect?.kind ?? null : null;
  }

  /** @private */
  _warn(key) {
    NotificationSystem.getInstance().notifyTemporary(t(key), { channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING });
  }
}
