/**
 * @file TrainingSystem.js
 * @brief Persistent training assignments, two exact-resume Rework battles and automation queues.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BattleSession, BattleOutcomes } from './battle/BattleSession.js';
import { FacilityCandidateRules } from './facilities/FacilityCandidateRules.js';
import { FacilityFilterRules } from '../config/FacilityFilterRules.js';
import { TrainingProgression } from './facilities/TrainingProgression.js';
import { FacilityPurchase } from './facilities/FacilityPurchase.js';
import { Random } from '../core/Random.js';
import { SeededRandom } from '../core/SeededRandom.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { FacilityStaffSystem } from './FacilityStaffSystem.js';
import { StaffRules } from '../config/StaffRules.js';
import { TrainingData } from '../data/save/TrainingData.js';
import { TrainingOpponentDB } from '../data/training/TrainingOpponentDB.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationSystem } from './LocationSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { BattleFoeKnockedOutEvent } from '../core/events/BattleFoeKnockedOutEvent.js';
import { TrainingSessionCompletedEvent } from '../core/events/TrainingSessionCompletedEvent.js';
import { TrainingBattleChangedEvent } from '../core/events/TrainingBattleChangedEvent.js';
import { TrainingResultChangedEvent } from '../core/events/TrainingResultChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { TrainingRules } from '../config/TrainingRules.js';
import { FacilityRules } from '../config/FacilityRules.js';
import { CONTENT_FEATURES } from '../config/ContentAccessRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export const TrainingResults = Object.freeze({
  READY: 'ready', SLOT_OCCUPIED: 'slot-occupied', NO_SAVE: 'no-save', FEATURE_LOCKED: 'feature-locked', NEED_BADGE: 'need-badge',
  BATTLE_ACTIVE: 'battle-active', SESSION_ACTIVE: 'session-active', POKEMON_NOT_FOUND: 'pokemon-not-found',
  NO_MOVES: 'no-moves', UNKNOWN_MODE: 'unknown-mode', COMPLETED: 'completed', CANCELLED: 'cancelled',
  MODE_LOCKED: 'mode-locked', NO_SLOT: 'no-slot', QUEUE_FULL: 'queue-full'
});

export class TrainingSystem extends BaseSystem {
  static _instance = null;
  /** @returns {TrainingSystem} */
  static getInstance() { return this._instance || (this._instance = new TrainingSystem()); }
  constructor() {
    super('TrainingSystem', 'System');
    this._sessions = new Map();
    this._saveId = null;
    this._saveRef = null;
    this._random = Random.default;
    this._unsubscribers = [];
    this._autoElapsed = 0;
  }
  /** @override */
  init() {
    if (this._unsubscribers.length) return;
    this._unsubscribers = [SaveLoadedEvent, SaveCreatedEvent].map((type) =>
      EventBus.getInstance().subscribe(type, () => this._restoreSessions()));
    this._restoreSessions();
  }
  /** @override */
  onDestroy() {
    this._captureSessions();
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];
    this._sessions.clear();
    this._saveId = null;
    this._saveRef = null;
    super.onDestroy();
  }
  /** @param {Random} random */
  setRandom(random) { this._random = random; }
  /** @returns {boolean} */
  isUnlocked() { return FeatureAccessSystem.getInstance().isFeatureUnlocked(CONTENT_FEATURES.TRAINING); }
  /** @returns {boolean} */
  canUseHere() { return this.isUnlocked(); }
  /** @returns {boolean} */
  isActive() { this._ensureContext(); return this._sessions.size > 0; }
  /** Compatibility accessor: the first live battle; owned state is always in save.training. */
  get _session() { return this._sessions.values().next().value || null; }
  /** @param {number} [slotIndex=0] @returns {Object|null} */
  getLastResult(slotIndex = 0) { return SaveSystem.getInstance().getCurrentSave()?.training.slots[slotIndex]?.result || null; }

  /** @param {number} [slotIndex=0] @param {{queue?:boolean}} [options] @returns {Object[]} */
  getCandidates(slotIndex=0,{queue=false,replace=false}={}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot=save?.training.slots[slotIndex];
    if(!slot||(!queue&&(slot.battle||(!replace&&slot.pokemonUid)))) return [];
    return save.collection.getAll().filter((pokemon) => !pokemon.locked &&
      (!queue || !save.teamMembers.includes(pokemon.uid)) &&
      PokemonUsageSystem.getInstance().canPerform(pokemon.uid, PokemonActionIds.TRAIN) &&
      TrainingRules.MODES.some((mode) => TrainingProgression.eligible(save, pokemon, mode)))
      .map((pokemon) => ({ uid: pokemon.uid, label: pokemon.getDisplayName(), pokemon }));
  }
  /** @param {number} slotIndex @param {string} uid @param {{persist?:boolean}} [options] */
  assignPokemon(slotIndex,uid,{persist=true,replace=false}={}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    if (!this.isUnlocked()) return this._failure(TrainingResults.FEATURE_LOCKED);
    if (!slot) return this._failure(TrainingResults.NO_SLOT);
    if (slot.battle) return this._failure(TrainingResults.SESSION_ACTIVE);
    if(slot.pokemonUid&&slot.pokemonUid===uid) return {result:TrainingResults.READY};
    if(slot.pokemonUid&&!replace) return this._failure(TrainingResults.SLOT_OCCUPIED);
    if (!this.getCandidates(slotIndex,{replace}).some((entry) => entry.uid === uid)) return this._failure(TrainingResults.POKEMON_NOT_FOUND);
    slot.pokemonUid = uid;
    slot.result = null;
    if (persist) this._commit();
    return { result: TrainingResults.READY };
  }
  /** Only explicit removal or a confirmed atomic replacement releases an assigned UID. */
  clearSlot(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    if (!slot || slot.battle || !this.isUnlocked()) return false;
    slot.pokemonUid = '';
    slot.result = null;
    this._commit();
    return true;
  }

  /** @param {string} pokemonUid @param {string} [mode='move'] @param {number} [slotIndex=0] @param {Object} [options] */
  startSession(pokemonUid, mode = TrainingRules.MODE_ID, slotIndex = 0, { automatic = false, persist = true } = {}) {
    this._ensureContext();
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(TrainingResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(TrainingResults.FEATURE_LOCKED);
    const slot = save.training.slots[slotIndex];
    if (!slot) return this._failure(TrainingResults.NO_SLOT);
    if (slot.battle) return this._failure(TrainingResults.SESSION_ACTIVE);
    if (BattleSystem.getInstance().isActive()) return this._failure(TrainingResults.BATTLE_ACTIVE);
    if (!TrainingRules.MODES.includes(mode)) return this._failure(TrainingResults.UNKNOWN_MODE);
    if (!TrainingProgression.isModeUnlocked(save, mode)) return this._failure(TrainingResults.MODE_LOCKED);
    const trainee = save.collection.get(pokemonUid);
    if (!trainee || !TrainingProgression.eligible(save, trainee, mode)) return this._failure(TrainingResults.NO_MOVES);
    const fee = FacilityStaffSystem.getInstance().getFee('training', TrainingRules.AUTOMATION_FEE);
    if (automatic && save.currencies.get(FacilityRules.MONEY_CURRENCY) < fee) return { result: 'insufficient-funds' };
    if (slot.pokemonUid !== pokemonUid) {
      const assigned = this.assignPokemon(slotIndex, pokemonUid, { persist: false });
      if (assigned.result !== TrainingResults.READY) return assigned;
    }
    const random = new SeededRandom(this._random.int(1, 4294967295));
    const opponents = this._createOpponents(trainee, random, mode);
    if (opponents.length < TrainingRules.MIN_STAFF_OPPONENT_COUNT) return this._failure(TrainingResults.NO_MOVES);
    trainee.healFull();
    slot.mode = mode;
    slot.elapsed = 0;
    slot.result = null;
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const session = new BattleSession({ team: [trainee], foe: opponents[0],
      reserves: opponents.slice(1).map((pokemon) => ({ pokemon })), training: true, healBetweenFoes: true,
      random, weather: LocationDB.getInstance().getById(locationId)?.weather || null,
      ...this._battleServices(save, locationId) });
    session.start();
    this._sessions.set(slotIndex, session);
    slot.battle = { ...session.captureState(), locationId };
    if (automatic) save.currencies.add(FacilityRules.MONEY_CURRENCY, -fee);
    if (persist) this._commit();
    return { result: TrainingResults.READY, opponentCount: opponents.length };
  }

  /** @param {number} [slotIndex=0] @returns {Object} */
  getSnapshot(slotIndex = 0) {
    this._ensureContext();
    const save = SaveSystem.getInstance().getCurrentSave();
    const slots = (save?.training.slots || []).map((slot, index) => this._slotSnapshot(save, slot, index));
    return { ...(slots[slotIndex] || { active: false }), slots, maxSlots: slots.length,
      queueLimit: FacilityRules.QUEUE_DEFAULT + (save?.training.queueLevel || 0) * FacilityRules.QUEUE_STEP,
      queueLevel: save?.training.queueLevel || 0, saveId: save?.id || null };
  }
  /** @private */
  _slotSnapshot(save, slot, index) {
    const pokemon = save.collection.get(slot.pokemonUid);
    const session = this._sessions.get(index);
    const foe = session?.foe;
    return { index, pokemon, pokemonUid: slot.pokemonUid, active: !!session,
      mode: slot.mode, modes: TrainingProgression.modes(save, pokemon), result: slot.result,
      autoPurchased: slot.autoPurchased, autoEnabled: slot.autoEnabled, autoOptions: [...slot.autoOptions],
      filters:slot.filters.serialize(),
      metadata: pokemon ? {evs:FacilityCandidateRules.total(pokemon,'evs'),talents:save.talents.getIds(pokemon.species).length,
        talentTotal:pokemon.getSpecies().talents.length,moves:TrainingProgression.availableMoves(pokemon).length} : null,
      queue: slot.queue.map((uid) => ({ uid, pokemon: save.collection.get(uid) })).filter((entry) => entry.pokemon),
      traineeUid: pokemon?.uid, traineeName: pokemon?.getDisplayName(), traineeSpecies: pokemon?.species,
      traineeLevel: pokemon?.level, traineeHp: pokemon?.hp, traineeMaxHp: pokemon?.getMaxHp(),
      foeName: foe?.name, foeSpecies: foe?.pokemon.species, foeLevel: foe?.level, foeHp: foe?.hp, foeMaxHp: foe?.maxHp,
      foePokemon: foe?.pokemon, traineeCooldown: session ? 1 - session.playerCooldownMs / Math.max(1, session.playerCooldownTotalMs) : 0,
      foeCooldown: session ? 1 - session.foeCooldownMs / Math.max(1, session.foeCooldownTotalMs) : 0,
      traineeStatus: session?.active.status, foeStatus: foe?.status,
      traineeMove: session?.active.lastMoveId, foeMove: foe?.lastMoveId,
      opponentsDefeated: session?.defeatedFoes.length || 0,
      opponentCount: session ? session.sentFoes.length + session.reserveCount : TrainingRules.OPPONENT_COUNT };
  }

  /** Live combat-only projection, without recomputing move pools on animation frames. @returns {Object[]} */
  getLiveStates() {
    this._ensureContext();
    const save = SaveSystem.getInstance().getCurrentSave();
    return [...this._sessions].map(([index, session]) => ({ index, mode: save.training.slots[index].mode,
      pokemon: session.active.pokemon, foePokemon: session.foe.pokemon,
      opponentsDefeated: session.defeatedFoes.length, opponentCount: session.sentFoes.length + session.reserveCount,
      player: session.active, foe: session.foe, field: session.field,
      playerCooldownMs: session.playerCooldownMs, playerCooldownTotalMs: session.playerCooldownTotalMs,
      foeCooldownMs: session.foeCooldownMs, foeCooldownTotalMs: session.foeCooldownTotalMs }));
  }

  /** @override @param {number} dt */
  update(dt) {
    this._ensureContext();
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !Number.isFinite(dt) || dt <= 0) return;
    let changed = false;
    for (const [index, session] of [...this._sessions]) {
      const slot = save.training.slots[index];
      const duration = TrainingRules.MAX_SIMULATION_TICKS * TrainingRules.TICK_SECONDS;
      const step = Math.max(0, Math.min(dt, duration - slot.elapsed));
      slot.elapsed += step;
      session.update(step);
      const hits = session.drainHits();
      const logs = session.log.drain();
      changed = changed || hits.length > 0 || logs.length > 0;
      const timedOut = !session.isOver() && slot.elapsed >= duration;
      if (timedOut) session.outcome = BattleOutcomes.DEFEAT;
      if (session.isOver()) this._finishSession(session, timedOut ? 'timeout' : null, index);
      else slot.battle = { ...session.captureState(), locationId: slot.battle.locationId };
    }
    this._autoElapsed += dt;
    if (this._autoElapsed >= FacilityRules.AUTO_SCAN_SECONDS) { this._autoElapsed = 0; this._processAutomation(); }
    if (changed) this._dispatchBattleChanged();
  }
  /** @param {number} [slotIndex=0] @returns {boolean} */
  cancelSession(slotIndex = 0) {
    this._ensureContext();
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    if (!slot?.battle) return false;
    save.collection.get(slot.pokemonUid)?.healFull();
    slot.battle = null;
    slot.autoEnabled = false;
    slot.result = { result: TrainingResults.CANCELLED, success: false, pokemonUid: slot.pokemonUid, slotIndex };
    this._sessions.delete(slotIndex);
    this._commit();
    return true;
  }
  /** @private @param {BattleSession} session @param {string|null} [reason] @param {number} [slotIndex=0] */
  _finishSession(session, reason = null, slotIndex = 0) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    const trainee = save?.collection.get(slot?.pokemonUid);
    if (!slot || !trainee || !slot.battle || this._sessions.get(slotIndex) !== session) return;
    const success = session.outcome === BattleOutcomes.VICTORY;
    const reward = success ? TrainingProgression.reward(save, trainee, slot.mode, session.random) : null;
    trainee.healFull();
    slot.battle = null;
    slot.result = { result: TrainingResults.COMPLETED, success, mode: slot.mode, pokemonUid: trainee.uid,
      reward, rewardMove: reward?.move || null,
      opponentsDefeated: session.defeatedFoes.length, reason, slotIndex };
    if (!success) slot.autoEnabled = false;
    this._sessions.delete(slotIndex);
    save.statistics.recordTrainingSession();
    FacilityStaffSystem.getInstance().addXp('training', success ? 1 : 0.5);
    const dropChance = FacilityStaffSystem.getInstance().getBonus('training', 'training_drop');
    if (success && session.random.next() < dropChance) save.inventory.add(session.random.pick(StaffRules.TRAINING_DROP_ITEMS), 1, { deferSave: true });
    this._captureSessions();
    EventBus.getInstance().dispatch(new TrainingSessionCompletedEvent(1, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    BoxSystem.getInstance().dispatchPokemonChanged(trainee.uid);
    EventBus.getInstance().dispatch(new TrainingResultChangedEvent(slot.result));
    this._dispatchBattleChanged();
    this._notify(success ? t('facility_training_success', { name: trainee.getDisplayName() }) :
      t('training_session_failed', { name: trainee.getDisplayName() }), success ? NotificationTones.SUCCESS : NotificationTones.WARNING);
  }

  /** @returns {Object} */
  upgradeSlot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!this.isUnlocked()) return this._failure(TrainingResults.FEATURE_LOCKED);
    if (!save || save.training.maxSlots >= TrainingRules.MAX_SLOT_COUNT) return { result: 'max-upgrade' };
    const result = FacilityPurchase.apply(save, TrainingRules.SECOND_SLOT_COST, FacilityRules.QUEUE_CURRENCY, () => {
      const expanded = new TrainingData({ ...save.training.serialize(), maxSlots: save.training.maxSlots + 1 });
      save.training = expanded;
    });
    if (result.result === 'ready') this._commit();
    return result;
  }
  /** @returns {Object} */
  upgradeQueue() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!this.isUnlocked()) return this._failure(TrainingResults.FEATURE_LOCKED);
    const cost = FacilityRules.QUEUE_UPGRADE_COSTS[save?.training.queueLevel];
    const result = FacilityPurchase.apply(save, cost, FacilityRules.QUEUE_CURRENCY, () => save.training.queueLevel++);
    if (result.result === 'ready') this._commit();
    return result;
  }
  /** @param {number} slotIndex */
  buyAutomation(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    if (!slot || slot.autoPurchased || !this.isUnlocked()) return { result: 'unavailable' };
    const result = FacilityPurchase.apply(save, TrainingRules.AUTOMATION_COST, FacilityRules.QUEUE_CURRENCY, () => {
      slot.autoPurchased = true; slot.autoOptions = ['move']; slot.filters.set('mode','move');
    });
    if (result.result === 'ready') this._commit();
    return result;
  }
  /** @param {number} slotIndex */
  toggleAutomation(slotIndex) {
    const slot = SaveSystem.getInstance().getCurrentSave()?.training.slots[slotIndex];
    if (!slot?.autoPurchased || !this.isUnlocked() || BattleSystem.getInstance().isActive()) return false;
    slot.autoEnabled = !slot.autoEnabled;
    this._commit();
    return true;
  }
  /** @param {number} slotIndex @param {string} id */
  toggleAutoOption(slotIndex, id) {
    const slot = SaveSystem.getInstance().getCurrentSave()?.training.slots[slotIndex];
    if (!slot || !TrainingRules.AUTOMATION_OPTIONS.includes(id) || !this.isUnlocked()) return false;
    slot.filters.set('mode','configured');
    slot.autoOptions = slot.autoOptions.includes(id) ? slot.autoOptions.filter((option) => option !== id) : [...slot.autoOptions, id];
    this._commit(); return true;
  }
  /** @param {number} slotIndex @param {string} uid */
  enqueue(slotIndex, uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    if (!slot || !this.isUnlocked() || !this.getCandidates(slotIndex, { queue: true }).some((entry) => entry.uid === uid)) return { result: 'unavailable' };
    if (slot.queue.length >= this.getSnapshot().queueLimit) return { result: TrainingResults.QUEUE_FULL };
    slot.queue.push(uid); this._commit(); return { result: TrainingResults.READY };
  }
  /** @param {number} slotIndex @returns {number} */
  fillQueue(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const slot = save?.training.slots[slotIndex];
    if (!slot || !this.isUnlocked()) return 0;
    const capacity = FacilityRules.QUEUE_DEFAULT + save.training.queueLevel * FacilityRules.QUEUE_STEP;
    const candidates=this._automaticCandidates(slotIndex).slice(0,Math.max(0,capacity-slot.queue.length));
    slot.queue.push(...candidates.map((entry) => entry.uid));
    if (candidates.length) this._commit();
    return candidates.length;
  }

  /** @private @param {number} slotIndex @returns {Object[]} */
  _automaticCandidates(slotIndex) {
    const save=SaveSystem.getInstance().getCurrentSave(),slot=save?.training.slots[slotIndex];
    if(!slot) return [];
    return FacilityCandidateRules.select(save,this.getCandidates(slotIndex,{queue:true})
      .filter((entry)=>slot.autoOptions.some((mode)=>TrainingProgression.eligible(save,entry.pokemon,mode))),slot.filters.serialize());
  }
  /** @param {number} index @param {string} key @param {string} value @returns {boolean} */
  setAutomationFilter(index,key,value) {
    const slot=SaveSystem.getInstance().getCurrentSave()?.training.slots[index];
    if (!this.isUnlocked() || !slot?.filters.set(key,value)) return false;
    if (key==='mode' && value!=='configured') slot.autoOptions=value==='all'?[...FacilityFilterRules.MODE_ORDER]:[value];
    this._commit(); return true;
  }
  /** @param {number} slotIndex @param {string|null} [uid=null] */
  removeFromQueue(slotIndex, uid = null) {
    const slot = SaveSystem.getInstance().getCurrentSave()?.training.slots[slotIndex];
    if (!slot || !this.isUnlocked()) return false;
    slot.queue = uid ? slot.queue.filter((entry) => entry !== uid) : [];
    this._commit(); return true;
  }
  /** @private */
  _processAutomation() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked() || BattleSystem.getInstance().isActive()) return;
    let changed = false;
    save.training.slots.forEach((slot, index) => {
      if (!slot.autoEnabled || !slot.autoPurchased || slot.battle) return;
      const options = slot.autoOptions;
      if (!options.length) return;
      const fee = FacilityStaffSystem.getInstance().getFee('training', TrainingRules.AUTOMATION_FEE);
      if (save.currencies.get(FacilityRules.MONEY_CURRENCY) < fee) return;
      let pokemon = save.collection.get(slot.pokemonUid);
      let mode = options.find((id) => TrainingProgression.eligible(save, pokemon, id));
      if (!mode) {
        if (slot.pokemonUid) return;
        const head=slot.queue[0]||this._automaticCandidates(index)[0]?.uid;
        if (!head || !options.some((id) => TrainingProgression.eligible(save, save.collection.get(head), id))) return;
        slot.pokemonUid=slot.queue.length?slot.queue.shift():head;
        pokemon = save.collection.get(slot.pokemonUid);
        mode = options.find((id) => TrainingProgression.eligible(save, pokemon, id));
        changed = true;
      }
      if (this.startSession(pokemon.uid, mode, index, { automatic: true, persist: false }).result === 'ready') changed = true;
    });
    if (changed) this._commit();
  }

  /** @private */
  _ensureContext() {
    if (SaveSystem.getInstance().getCurrentSave() !== this._saveRef) this._restoreSessions();
  }
  /** @private */
  _restoreSessions() {
    const save = SaveSystem.getInstance().getCurrentSave();
    this._sessions.clear();
    this._saveId = save?.id || null;
    this._saveRef = save;
    this._autoElapsed = 0;
    save?.training.slots.forEach((slot, index) => {
      if (!slot.battle) return;
      if (slot.battle.teamUids?.length !== 1 || slot.battle.teamUids[0] !== slot.pokemonUid) { slot.battle = null; slot.autoEnabled = false; return; }
      const session = BattleSession.restore(slot.battle, { resolvePokemon: (uid) => save.collection.get(uid),
        random: this._random, ...this._battleServices(save, slot.battle.locationId) });
      if (session) this._sessions.set(index, session);
      else { slot.battle = null; slot.autoEnabled = false; }
    });
    this._dispatchBattleChanged();
  }
  /** @private */
  _captureSessions() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (save !== this._saveRef) return;
    for (const [index, session] of this._sessions) {
      const slot = save.training.slots[index];
      if (slot) slot.battle = { ...session.captureState(), locationId: slot.battle?.locationId || TrainingRules.LOCATION_ID };
    }
  }
  /** @private */
  _battleServices(save, locationId) {
    return { ownedQuantity: (id) => save.inventory.count(id), hiddenTalentUnlocked: (species) => save.talents.hasHidden(species),
      onFoeDefeated: (encounter) => EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent(
        encounter.pokemon.species, encounter.pokemon.level, locationId, { deferSave: true })) };
  }
  /** @private */
  _createOpponents(trainee, random, mode) {
    const pool = TrainingOpponentDB.getInstance().getSpeciesForType(trainee.getTypes()[0] || 'normal');
    const base = Math.max(TrainingRules.MIN_OPPONENT_LEVEL, trainee.level + (TrainingRules.MODE_LEVEL_OFFSETS[mode] || 0));
    const active = SaveSystem.getInstance().getCurrentSave()?.staff.active.training;
    const level = active === 'trainer_saffron' ? SaveSystem.getInstance().getCurrentSave().staff.owned[active]?.level || 1 : 1;
    const count = TrainingRules.OPPONENT_COUNT - Math.round(TrainingRules.MAX_STAFF_OPPONENT_REDUCTION * (level - 1) / (StaffRules.MAX_LEVEL - 1));
    return pool.slice(0, count).map((species, index) => PokemonFactory.create(species,
      Math.max(TrainingRules.MIN_OPPONENT_LEVEL, base + TrainingRules.LEVEL_VARIATION[index % TrainingRules.LEVEL_VARIATION.length]),
      { random })).filter(Boolean);
  }
  /** @private */
  _commit() {
    this._captureSessions();
    SaveSystem.getInstance().saveCurrent();
    PokemonUsageSystem.getInstance().dispatchChanged();
    this._dispatchBattleChanged();
  }
  /** @private */
  _dispatchBattleChanged() { EventBus.getInstance().dispatch(new TrainingBattleChangedEvent(null)); }
  /** @private */
  _failure(result) {
    if (result === TrainingResults.BATTLE_ACTIVE) this._notify(t('training_battle_active'), NotificationTones.WARNING);
    return { result, opponentCount: 0 };
  }
  /** @private */
  _notify(text, tone) { NotificationSystem.getInstance().notifyTemporary(text, { channel: NotificationChannels.GAMEPLAY, tone }); }
}
