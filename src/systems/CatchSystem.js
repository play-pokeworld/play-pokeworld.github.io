/**
 * @file CatchSystem.js
 * @brief Automatic catch after a won battle (C++ equivalent: class CatchSystem : public BaseSystem).
 * No DOM access. Port of the original attemptAutoCatch():
 *   1. the Poké Ball filters choose the ball (BallSelector); no ball → nothing is thrown;
 *   2. rate = BallRateRules.effectiveRate (only the ball counts), changed by the quest kind
 *      (CatchRules.finalRate); the ball is consumed whatever the result;
 *   3. CatchRules.roll (guaranteed first catch);
 *   4. success: Pokédex, statistics; a shiny encounter unlocks the shiny of the species
 *      (owned ones become shiny);
 *      - species and form already owned (duplicate): no new Pokémon, 10 % chance of +1 IV on
 *        the owned one;
 *      - otherwise a new Pokémon, level 1 (level 5 with a Luxury Ball), talent weighted by rarity,
 *        10 % chance of +1 IV, no held item: team when a slot is free, PC box otherwise;
 *      - dungeon tokens (duplicates included), PokemonCaughtEvent.
 * The battle log lines go to the session log; the caller saves once afterwards.
 */

import { BaseSystem } from './BaseSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { EventBus } from '../core/EventBus.js';
import { Random } from '../core/Random.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { QuestCatchKinds } from '../data/catch/QuestCatchKinds.js';
import { BallRules } from '../config/BallRules.js';
import { CaptureRules } from '../config/CaptureRules.js';
import { CatchEncounter } from './catch/CatchEncounter.js';
import { BallSelector } from './catch/BallSelector.js';
import { BallRateRules } from './catch/BallRateRules.js';
import { CatchRules } from './catch/CatchRules.js';
import { SpeciesOwnership } from './catch/SpeciesOwnership.js';
import { RewardRules } from './battle/RewardRules.js';
import { PokemonCaughtEvent } from '../core/events/PokemonCaughtEvent.js';
import { CaptureAttemptResolvedEvent } from '../core/events/CaptureAttemptResolvedEvent.js';

/** Currency earned by every catch. */
const CATCH_CURRENCY = 'dungeonToken';

export class CatchSystem extends BaseSystem {
  /** @private @type {CatchSystem|null} */
  static _instance = null;

  /** @returns {CatchSystem} */
  static getInstance() {
    if (!CatchSystem._instance) {
      CatchSystem._instance = new CatchSystem();
    }
    return CatchSystem._instance;
  }

  constructor() {
    super('CatchSystem', 'System');
    /** @private @type {Random} */ this._random = Random.default;
  }

  /**
   * Random source of the next catches (tests use Random.sequence).
   * @param {Random} random
   */
  setRandom(random) {
    this._random = random;
  }

  /**
   * @param {Object} attempt
   * @param {import('../data/save/SaveData.js').SaveData} attempt.save
   * @param {import('./battle/BattleSession.js').BattleSession} attempt.session - Finished battle
   * @param {string} attempt.locationId
   * @param {string} [attempt.questKind=QuestCatchKinds.NONE]
   * @param {boolean} [attempt.deferSave=false] - Leave persistence to the enclosing operation
   * @returns {boolean} true when the Pokémon was caught (duplicates included)
   */
  attempt({ save, session, locationId, questKind = QuestCatchKinds.NONE, deferSave = false }) {
    return this.attemptDetailed({ save, session, locationId, questKind, deferSave }).caught;
  }

  /**
   * Detailed capture result for battle-session loot tracking. `attempt()` remains the boolean
   * compatibility surface used by existing systems and tests.
   * @param {Object} attempt
   * @param {import('../data/save/SaveData.js').SaveData} attempt.save
   * @param {import('./battle/BattleSession.js').BattleSession} attempt.session
   * @param {string} attempt.locationId
   * @param {string} [attempt.questKind=QuestCatchKinds.NONE]
   * @param {boolean} [attempt.deferTokens=false] - Leave catch tokens for an expedition settlement
   * @param {boolean} [attempt.deferSave=false] - Leave persistence to the enclosing operation
   * @returns {{caught:boolean, ballId:string|null, duplicate:boolean, pokemon:Object|null, addedToTeam:boolean, tokens:number}}
   */
  attemptDetailed({ save, session, locationId, questKind = QuestCatchKinds.NONE, deferTokens = false, deferSave = false }) {
    const foe = session.foe.pokemon;
    const log = session.log;
    const name = foe.getDisplayName();
    const failed = (ballId = null) => ({ caught: false, ballId, duplicate: false, pokemon: null, addedToTeam: false, tokens: 0 });
    const dispatchResult = (caught, duplicate = false) => EventBus.getInstance().dispatch(
      new CaptureAttemptResolvedEvent({
        speciesId: foe.species,
        form: foe.form,
        name,
        shiny: foe.shiny,
        ballId,
        rate,
        caught,
        duplicate
      })
    );
    const location = LocationDB.getInstance().getById(locationId);
    const owned = SpeciesOwnership.isOwned(save, foe.species, foe.form);
    const encounter = new CatchEncounter({
      pokemon: foe,
      owned,
      shinyOwned: owned && SpeciesOwnership.isShinyUnlocked(save, foe.species, foe.form),
      locationKind: location?.kind ?? null,
      weather: session.field.weather,
      foeTurns: session.foeTurns,
      playerAttacks: session.playerAttacks
    });

    const ballId = BallSelector.ballFor(save.ballFilters.getAll(), encounter, (id) => save.inventory.count(id));
    if (!ballId) {
      log.add('battle_log.ball_no_target', { name });
      return failed();
    }
    const ballRate = BallRateRules.effectiveRate(ballId, encounter);
    const rate = CatchRules.finalRate(ballRate, questKind);
    save.inventory.remove(ballId, 1, { deferSave });
    const firstCatch = save.statistics.caughtTotal === 0 && save.collection.size <= 1;
    if (!CatchRules.roll(rate, firstCatch, this._random)) {
      log.add('battle_log.catch_fail', { name, ballId });
      dispatchResult(false);
      return failed(ballId);
    }

    log.add('battle_log.catch_success', { name, ballId });
    save.statistics.recordCatch(locationId);
    save.pokedex.markCaught(foe.species, foe.shiny, { deferSave });
    if (foe.shiny) this._unlockShiny(save, foe);
    let storedPokemon = null;
    let addedToTeam = false;
    if (owned) {
      this._keepDuplicate(save, foe, log);
    } else {
      const stored = this._storeNew(save, foe, ballId, log, { deferSave });
      storedPokemon = stored?.pokemon ?? null;
      addedToTeam = stored?.addedToTeam === true;
    }

    const tokens = RewardRules.catchTokens(location);
    if (!deferTokens) save.currencies.add(CATCH_CURRENCY, tokens);
    log.add('battle_log.catch_tokens', { amount: tokens });
    EventBus.getInstance().dispatch(new PokemonCaughtEvent(foe.species, locationId, foe.shiny, { deferSave }));
    dispatchResult(true, owned);
    return { caught: true, ballId, duplicate: owned, pokemon: storedPokemon, addedToTeam, tokens };
  }

  /**
   * Original unlockShinyForSpecies: every owned Pokémon of the species and form becomes shiny.
   * @private
   */
  _unlockShiny(save, foe) {
    SpeciesOwnership.unlockShiny(save,foe.species,foe.form);
  }

  /** @private */
  _keepDuplicate(save, foe, log) {
    const species = foe.getSpecies();
    CatchRules.unlockCapturedTalent(save, species, CatchRules.rollTalent(species, this._random), this._random);
    const existing = SpeciesOwnership.findOwned(save, foe.species, foe.form);
    const stat = existing ? CatchRules.rollIvBonus(existing, this._random) : null;
    if (stat) log.add('battle_log.catch_duplicate_iv', { name: existing.getDisplayName(), stat });
    save.statistics.recordDuplicateCatch(foe.species);
    if (foe.shiny) log.add('battle_log.catch_shiny_unlocked', { name: foe.getDisplayName() });
    log.add('battle_log.catch_duplicate', { name: foe.getDisplayName() });
    if (existing) BoxSystem.getInstance().dispatchPokemonChanged(existing.uid);
  }

  /** @private @returns {{pokemon:Object, addedToTeam:boolean}|null} */
  _storeNew(save, foe, ballId, log, { deferSave = false } = {}) {
    const luxury = ballId === BallRules.LUXURY_BALL;
    const level = luxury ? CaptureRules.LUXURY_CAUGHT_LEVEL : CaptureRules.CAUGHT_LEVEL;
    const shiny = foe.shiny || SpeciesOwnership.isShinyUnlocked(save, foe.species, foe.form);
    const caught = PokemonFactory.create(foe.species, level, { form: foe.form, shiny, random: this._random });
    if (!caught) return;
    caught.talent = CatchRules.rollTalent(caught.getSpecies(), this._random) ?? caught.talent;
    const stat = CatchRules.rollIvBonus(caught, this._random);
    caught.healFull();
    if (luxury) log.add('battle_log.catch_luxury_level', { name: caught.getDisplayName(), ballId, level: caught.level });
    if (stat) log.add('battle_log.catch_iv', { name: caught.getDisplayName(), stat });
    const addedToTeam = TeamSystem.getInstance().addPokemon(caught, { deferSave });
    if (addedToTeam) {
      log.add('battle_log.catch_team', { name: caught.getDisplayName(), level: caught.level });
    } else {
      BoxSystem.getInstance().addPokemon(caught, { deferSave });
      log.add('battle_log.catch_box', { name: caught.getDisplayName(), level: caught.level });
    }
    return { pokemon: caught, addedToTeam };
  }
}
