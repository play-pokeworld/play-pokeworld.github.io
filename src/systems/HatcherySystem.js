/**
 * @file HatcherySystem.js
 * @brief Remote daycare, Pokémon/fossil incubation, UID queues and fee-aware automation.
 * Collection objects are never moved or copied. All usages derive from the saved slot/queue UIDs.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { FossilSystem } from './FossilSystem.js';
import { FacilityStaffSystem } from './FacilityStaffSystem.js';
import { FacilityPurchase } from './facilities/FacilityPurchase.js';
import { FacilityCandidateRules } from './facilities/FacilityCandidateRules.js';
import { FacilityFilterData } from '../data/save/FacilityFilterData.js';
import { HatcheryQueue } from './facilities/HatcheryQueue.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { Random } from '../core/Random.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { BattleFoeKnockedOutEvent } from '../core/events/BattleFoeKnockedOutEvent.js';
import { HatcheryChangedEvent } from '../core/events/HatcheryChangedEvent.js';
import { HatcheryLevelUpEvent } from '../core/events/HatcheryLevelUpEvent.js';
import { EggHatchedEvent } from '../core/events/EggHatchedEvent.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { FacilityRules } from '../config/FacilityRules.js';
import { CONTENT_FEATURES } from '../config/ContentAccessRules.js';
import { PokemonRules } from '../config/PokemonRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export const HatcheryResults = Object.freeze({
  READY: 'ready', NO_SAVE: 'no-save', NO_SLOT: 'no-slot', NOT_FOUND: 'not-found',
  LAST_TEAM_MEMBER: 'last-team-member', NOT_DAYCARE: 'not-daycare', NOT_READY: 'not-ready',
  NOT_FOSSIL: 'not-fossil', NO_ITEM: 'no-item', STORY_LOCKED: 'story-locked', FEATURE_LOCKED: 'feature-locked',
  UNKNOWN_SPECIES: 'unknown-species', MAX_SLOTS: 'max-slots', NEED_QUEST_POINTS: 'need-quest-points',
  INVALID_MODE: 'invalid-mode', INELIGIBLE: 'ineligible', QUEUE_FULL: 'queue-full'
});

export class HatcherySystem extends BaseSystem {
  static _instance = null;
  /** @returns {HatcherySystem} */
  static getInstance() { return this._instance || (this._instance = new HatcherySystem()); }
  constructor() {
    super('HatcherySystem', 'System');
    this._onKnockout = null;
    this._random = Random.default;
    this._autoElapsed = 0;
  }
  /** @override */
  init() {
    if (this._onKnockout) return;
    this._onKnockout = (event) => this._handleKnockout(event);
    EventBus.getInstance().subscribe(BattleFoeKnockedOutEvent, this._onKnockout);
  }
  /** @override */
  onDestroy() {
    if (this._onKnockout) EventBus.getInstance().unsubscribe(BattleFoeKnockedOutEvent, this._onKnockout);
    this._onKnockout = null; super.onDestroy();
  }
  /** @param {Random} random */
  setRandom(random) { this._random = random; }
  /** @returns {boolean} */
  isUnlocked() { return FeatureAccessSystem.getInstance().isFeatureUnlocked(CONTENT_FEATURES.HATCHERY); }
  /** @returns {boolean} */
  canUseHere() { return this.isUnlocked(); }
  /** @returns {boolean} */
  isModeSwitchUnlocked() { return FossilSystem.getInstance().isRevivalUnlocked(); }
  /** @returns {boolean} */
  isPokemonIncubationUnlocked() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const index = QuestDB.getInstance().getMainChain(HatcheryRules.BREEDING_REGION)
      .findIndex((quest) => quest.key === HatcheryRules.BREEDING_MAIN_QUEST);
    return !!save && index >= 0 && save.quests.getMainStep(HatcheryRules.BREEDING_REGION) >= index;
  }
  /** @returns {Object} */
  getSnapshot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return { maxSlots: 0, slots: [], entries: [] };
    const data = save.hatchery;
    const slots = data.slots.map((slot) => slot ? { ...slot, pokemon: slot.pokemonUid ? save.collection.get(slot.pokemonUid) : null } : null);
    return { ...data.serialize(), slots,
      entries: slots.map((slot, index) => ({ index, slot, mode: data.modes[index], pendingMode: data.pendingModes[index],
        priority: data.priorities[index], filters:data.filters[index].serialize(), queue: data.queues[index].map((entry) => ({ ...entry,
          pokemon: entry.kind === 'pokemon' ? save.collection.get(entry.uid) : null })) })),
      queueLimit: HatcheryQueue.capacity(save), modeSwitchUnlocked: this.isModeSwitchUnlocked(),
      breedingUnlocked: this.isPokemonIncubationUnlocked(),
      hatchFee: FacilityStaffSystem.getInstance().getFee('hatchery', HatcheryRules.AUTO_HATCH_FEE),
      levelFee: FacilityStaffSystem.getInstance().getFee('hatchery', HatcheryRules.AUTO_DAYCARE_FEE) };
  }
  /**
   * Returns the regional level cap for a Pokémon in daycare.
   * A Pokémon in daycare cannot exceed the level of the player's best owned Pokémon from the same native region.
   * @param {import('../data/save/SaveData.js').SaveData} save
   * @param {string} speciesId
   * @param {string|null} [currentUid=null]
   * @returns {number} Level cap (1..100)
   */
  getRegionalDaycareCap(save, speciesId, currentUid = null) {
    if (!save) return PokemonRules.MAX_LEVEL;
    const species = PokemonDB.getInstance().getById(speciesId);
    if (!species?.region) return PokemonRules.MAX_LEVEL;
    const region = species.region;

    const regional = save.collection.getAll().filter((p) => {
      if (currentUid && p.uid === currentUid) return false;
      const s = PokemonDB.getInstance().getById(p.species);
      return s?.region === region;
    });

    if (regional.length === 0) {
      const current = currentUid ? save.collection.get(currentUid) : null;
      return current ? current.level : PokemonRules.MAX_LEVEL;
    }

    return Math.max(...regional.map((p) => p.level));
  }

  /** @param {number} [slotIndex=0] @param {{queue?:boolean}} [options] @returns {Object[]} */
  getCandidates(slotIndex = 0, { queue = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || slotIndex < 0 || slotIndex >= save.hatchery.maxSlots) return [];
    const incubation = save.hatchery.modes[slotIndex] === HatcheryRules.MODE_INCUBATION;
    if (incubation && !this.isPokemonIncubationUnlocked()) return [];
    return save.collection.getAll().filter((pokemon) => !pokemon.locked &&
      PokemonUsageSystem.getInstance().canPerform(pokemon.uid, PokemonActionIds.DEPOSIT_DAYCARE) &&
      (incubation ? pokemon.level >= PokemonRules.MAX_LEVEL : pokemon.level < this.getRegionalDaycareCap(save, pokemon.species, pokemon.uid)) &&
      (!save.teamMembers.includes(pokemon.uid) || (!queue && save.teamMembers.size > 1)))
      .sort((a, b) => Number(save.teamMembers.includes(b.uid)) - Number(save.teamMembers.includes(a.uid)))
      .map((pokemon) => ({ uid: pokemon.uid, label: pokemon.getDisplayName(),
        source: save.teamMembers.includes(pokemon.uid) ? 'team' : 'box', pokemon }));
  }
  /** @returns {Object[]} */
  getFossilCandidates() {
    const save = SaveSystem.getInstance().getCurrentSave();
    return FossilSystem.getInstance().getCandidates().map((entry) => ({ ...entry,
      quantity: HatcheryQueue.freeFossils(save, entry.itemId), reserved: HatcheryQueue.reservedFossils(save, entry.itemId) }));
  }
  /** @returns {Object} */
  upgradeSlot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (save.hatchery.maxSlots >= HatcheryRules.MAX_SLOT_COUNT) return this._failure(HatcheryResults.MAX_SLOTS);
    const result = FacilityPurchase.apply(save, HatcheryRules.SLOT_UPGRADE_COSTS[save.hatchery.maxSlots - 1],
      FacilityRules.QUEUE_CURRENCY, () => {
        save.hatchery.maxSlots++; save.hatchery.slots.push(null); save.hatchery.queues.push([]);
        save.hatchery.filters.push(new FacilityFilterData('hatchery'));
        save.hatchery.modes.push(HatcheryRules.MODE_DAYCARE); save.hatchery.pendingModes.push(null); save.hatchery.priorities.push('pokemon');
      });
    if (result.result === 'ready') this._commit();
    return result.result === 'insufficient-funds' ? this._failure(HatcheryResults.NEED_QUEST_POINTS) : result;
  }
  /** @param {string} uid @param {number|null} [slotIndex=null] @param {Object} [options] */
  depositPokemon(uid, slotIndex = null, { persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    const index = slotIndex === null ? save.hatchery.findEmptySlot() : slotIndex;
    if (!Number.isInteger(index) || index < 0 || index >= save.hatchery.maxSlots || save.hatchery.slots[index]) return this._failure(HatcheryResults.NO_SLOT);
    const pokemon = save.collection.get(uid);
    if (!pokemon) return this._failure(HatcheryResults.NOT_FOUND);
    if (save.teamMembers.includes(uid) && save.teamMembers.size <= 1) return this._failure(HatcheryResults.LAST_TEAM_MEMBER);
    if (!this.getCandidates(index).some((entry) => entry.uid === uid)) return this._failure(HatcheryResults.INELIGIBLE);
    const paid = save.hatchery.autoHatchEnabled;
    const fee = paid ? FacilityStaffSystem.getInstance().getFee('hatchery', HatcheryRules.AUTO_HATCH_FEE) : 0;
    if (save.currencies.get(FacilityRules.MONEY_CURRENCY) < fee) return { result: 'insufficient-funds' };
    const teamMember = save.teamMembers.includes(uid);
    if (teamMember && !TeamSystem.getInstance().removePokemon(uid, { persist: false, notify: false })) return this._failure(HatcheryResults.NOT_FOUND);
    const kind = save.hatchery.modes[index];
    save.hatchery.setSlot(index, { kind, pokemonUid: uid, knockouts: 0, initialLevel: pokemon.level, paid,
      ...(kind === HatcheryRules.MODE_INCUBATION ? { required: this._requiredFossilKos(pokemon.species), ready: false } : {}) });
    if (fee) save.currencies.add(FacilityRules.MONEY_CURRENCY, -fee);
    if (persist) this._commit(teamMember);
    return { result: HatcheryResults.READY, pokemon, slotIndex: index };
  }
  /**
   * Calculates the progressive fee for withdrawing a Pokémon from the daycare.
   * Base fee 100 ₽ + 100 ₽ per level gained while deposited.
   * @param {number} slotIndex
   * @returns {number}
   */
  getDaycareWithdrawFee(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return 0;
    const slot = save.hatchery.slots[slotIndex];
    if (slot?.kind !== HatcheryRules.MODE_DAYCARE) return 0;
    const pokemon = save.collection.get(slot.pokemonUid);
    if (!pokemon) return 0;
    const initialLevel = slot.initialLevel ?? pokemon.level;
    const levelsGained = Math.max(0, pokemon.level - initialLevel);
    return 100 + levelsGained * 100;
  }
  /** @param {number} slotIndex @param {Object} [options] */
  withdrawPokemon(slotIndex, { persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    const slot = save.hatchery.slots[slotIndex];
    if (slot?.kind !== HatcheryRules.MODE_DAYCARE) return this._failure(HatcheryResults.NOT_DAYCARE);
    const pokemon = save.collection.get(slot.pokemonUid);
    const fee = this.getDaycareWithdrawFee(slotIndex);
    const availableMoney = save.currencies.get(FacilityRules.MONEY_CURRENCY);
    const charge = Math.min(availableMoney, fee);
    if (charge > 0) {
      save.currencies.add(FacilityRules.MONEY_CURRENCY, -charge);
    }
    save.hatchery.setSlot(slotIndex, null);
    this._applyPendingMode(slotIndex);
    if (persist) this._commit();
    return { result: HatcheryResults.READY, pokemon, stored: 'box', feePaid: charge };
  }
  /** @param {string} itemId @param {number|null} [slotIndex=null] @param {Object} [options] */
  startFossilIncubation(itemId, slotIndex = null, { persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(HatcheryResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.isModeSwitchUnlocked()) return this._failure(HatcheryResults.STORY_LOCKED);
    const index = slotIndex === null ? save.hatchery.findEmptySlot() : slotIndex;
    if (!Number.isInteger(index) || index < 0 || index >= save.hatchery.maxSlots || save.hatchery.slots[index]) return this._failure(HatcheryResults.NO_SLOT);
    const item = ItemDB.getInstance().getById(itemId);
    if (!item || item.kind !== ItemKinds.FOSSIL || item.futureOnly || !item.revives) return this._failure(HatcheryResults.NOT_FOSSIL);
    if (!PokemonDB.getInstance().has(item.revives)) return this._failure(HatcheryResults.UNKNOWN_SPECIES);
    if (HatcheryQueue.freeFossils(save, itemId) < 1) return this._failure(HatcheryResults.NO_ITEM);
    save.hatchery.modes[index] = HatcheryRules.MODE_INCUBATION;
    save.hatchery.setSlot(index, { kind: 'fossil', itemId, speciesId: item.revives, knockouts: 0,
      required: this._requiredFossilKos(item.revives), ready: false });
    save.inventory.remove(itemId, 1, { deferSave: true });
    if (persist) this._commit();
    return { result: HatcheryResults.READY, slotIndex: index };
  }
  /** @param {number} slotIndex @param {Object} [options] */
  collectFossil(slotIndex, { persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    if (!this.isModeSwitchUnlocked()) return this._failure(HatcheryResults.STORY_LOCKED);
    const slot = save.hatchery.slots[slotIndex];
    if (slot?.kind !== 'fossil') return this._failure(HatcheryResults.NOT_FOSSIL);
    if (!slot.ready) return this._failure(HatcheryResults.NOT_READY);
    save.hatchery.setSlot(slotIndex, null);
    const revived = FossilSystem.getInstance().reviveSpeciesWithoutItem(save, slot.speciesId);
    if (!revived) { save.hatchery.setSlot(slotIndex, slot); return this._failure(HatcheryResults.UNKNOWN_SPECIES); }
    FacilityStaffSystem.getInstance().addXp('hatchery');
    this._applyPendingMode(slotIndex);
    if (persist) this._commit();
    return { result: HatcheryResults.READY, ...revived };
  }
  /** @param {number} slotIndex @param {Object} [options] */
  collectPokemon(slotIndex, { persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked() || !this.isPokemonIncubationUnlocked()) return this._failure(HatcheryResults.STORY_LOCKED);
    const slot = save.hatchery.slots[slotIndex];
    if (slot?.kind !== HatcheryRules.MODE_INCUBATION || !slot.ready) return this._failure(HatcheryResults.NOT_READY);
    const pokemon = save.collection.get(slot.pokemonUid);
    if (!pokemon) return this._failure(HatcheryResults.NOT_FOUND);
    const available = PokemonRules.STAT_KEYS.filter((stat) => pokemon.ivs[stat] < PokemonRules.IV_MAX);
    const stat = this._random.pick(available);
    let ivGain = 0;
    if (stat) {
      const double = this._random.next() < FacilityStaffSystem.getInstance().getBonus('hatchery', 'hatchery_double_iv_level');
      if (pokemon.addIv(stat)) ivGain++;
      if (double && pokemon.addIv(stat)) ivGain++;
    }
    const shiny = this._random.next() < 1 / HatcheryRules.SHINY_DENOMINATOR;
    if (shiny) { pokemon.setShiny(true); save.pokedex.markCaught(pokemon.species, true, { deferSave: true }); }
    const babySpecies = HatcheryRules.BABY_SPECIES[pokemon.species];
    let baby = null;
    if (babySpecies && !save.pokedex.isCaught(babySpecies) && !save.collection.getAll().some((entry) => entry.species === babySpecies)) {
      baby = PokemonFactory.create(babySpecies, HatcheryRules.BABY_LEVEL, { random: this._random,
        shiny: this._random.next() < 1 / HatcheryRules.SHINY_DENOMINATOR });
      if (baby) {
        if (TeamSystem.getInstance().hasFreeSlot()) TeamSystem.getInstance().addPokemon(baby, { notify: false, deferSave: true });
        else BoxSystem.getInstance().addPokemon(baby, { notify: false, deferSave: true });
      }
    }
    pokemon.setLevel(PokemonRules.MIN_LEVEL, { resetExperience: true }); pokemon.healFull();
    save.hatchery.setSlot(slotIndex, null);
    this._applyPendingMode(slotIndex);
    FacilityStaffSystem.getInstance().addXp('hatchery');
    EventBus.getInstance().dispatch(new EggHatchedEvent(pokemon.species, { deferSave: true }));
    if (persist) this._commit(!!baby);
    return { result: HatcheryResults.READY, pokemon, baby, stat, ivGain, shiny };
  }
  /** Mode transitions never cancel an in-progress incubation; pending changes are reversible. */
  toggleMode(slotIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked() || !this.isModeSwitchUnlocked() || slotIndex < 0 || slotIndex >= save.hatchery.maxSlots) return false;
    const data = save.hatchery;
    const slot = data.slots[slotIndex];
    const next = data.modes[slotIndex] === HatcheryRules.MODE_DAYCARE ? HatcheryRules.MODE_INCUBATION : HatcheryRules.MODE_DAYCARE;
    if (data.pendingModes[slotIndex]) { data.pendingModes[slotIndex] = null; this._commit(); return true; }
    data.queues[slotIndex] = [];
    if (slot && data.modes[slotIndex] === HatcheryRules.MODE_INCUBATION) {
      if (!slot.ready) data.pendingModes[slotIndex] = next;
      else {
        data.pendingModes[slotIndex] = next;
        if (slot.kind === 'fossil') this.collectFossil(slotIndex, { persist: false });
        else this.collectPokemon(slotIndex, { persist: false });
      }
    } else if (slot?.kind === HatcheryRules.MODE_DAYCARE) {
      const pokemon = save.collection.get(slot.pokemonUid);
      if (pokemon?.level >= PokemonRules.MAX_LEVEL && this.isPokemonIncubationUnlocked()) {
        data.modes[slotIndex] = next;
        data.setSlot(slotIndex, { kind: next, pokemonUid: pokemon.uid, knockouts: 0,
          required: this._requiredFossilKos(pokemon.species), ready: false });
      } else { data.setSlot(slotIndex, null); data.modes[slotIndex] = next; }
    } else data.modes[slotIndex] = next;
    this._commit(); return true;
  }

  /** @returns {Object} */
  upgradeQueue() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!this.isUnlocked()) return this._failure(HatcheryResults.FEATURE_LOCKED);
    const result = FacilityPurchase.apply(save, FacilityRules.QUEUE_UPGRADE_COSTS[save?.hatchery.queueLevel],
      FacilityRules.QUEUE_CURRENCY, () => save.hatchery.queueLevel++);
    if (result.result === 'ready') this._commit(); return result;
  }
  /** @param {'hatch'|'fill'} kind */
  buyAutomation(kind) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked() || !['hatch', 'fill'].includes(kind)) return { result: 'unavailable' };
    const key = kind === 'hatch' ? 'autoHatchPurchased' : 'autoFillPurchased';
    if (save.hatchery[key]) return { result: 'already-owned' };
    const result = FacilityPurchase.apply(save, kind === 'hatch' ? HatcheryRules.AUTO_HATCH_COST : HatcheryRules.AUTO_FILL_COST,
      FacilityRules.QUEUE_CURRENCY, () => { save.hatchery[key] = true; });
    if (result.result === 'ready') this._commit(); return result;
  }
  /** @param {'hatch'|'fill'} kind */
  toggleAutomation(kind) {
    const data = SaveSystem.getInstance().getCurrentSave()?.hatchery;
    if (!data || !this.isUnlocked() || !['hatch', 'fill'].includes(kind)) return false;
    const prefix = kind === 'hatch' ? 'autoHatch' : 'autoFill';
    if (!data[`${prefix}Purchased`]) return false;
    data[`${prefix}Enabled`] = !data[`${prefix}Enabled`]; this._commit(); return true;
  }
  /** @param {string} id */
  toggleAutoOption(id) {
    const data = SaveSystem.getInstance().getCurrentSave()?.hatchery;
    if (!data || !this.isUnlocked() || !HatcheryRules.AUTOMATION_FILTERS.includes(id)) return false;
    data.autoOptions = data.autoOptions.includes(id) ? data.autoOptions.filter((entry) => entry !== id) : [...data.autoOptions, id];
    this._commit(); return true;
  }
  /** @param {number} slotIndex */
  togglePriority(slotIndex) {
    const data = SaveSystem.getInstance().getCurrentSave()?.hatchery;
    if (!data || !this.isUnlocked() || !data.queues[slotIndex]) return false;
    data.priorities[slotIndex] = data.priorities[slotIndex] === 'fossil' ? 'pokemon' : 'fossil'; this._commit(); return true;
  }
  /** @param {number} slotIndex @param {string} uid */
  enqueue(slotIndex, uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked() || !this.getCandidates(slotIndex, { queue: true }).some((entry) => entry.uid === uid)) return { result: 'unavailable' };
    if (save.hatchery.queues[slotIndex].length >= HatcheryQueue.capacity(save)) return { result: HatcheryResults.QUEUE_FULL };
    save.hatchery.queues[slotIndex].push({ kind: 'pokemon', uid }); this._commit(); return { result: HatcheryResults.READY };
  }
  /** @param {number} slotIndex @param {string} itemId */
  enqueueFossil(slotIndex, itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const item = ItemDB.getInstance().getById(itemId);
    if (!save || !this.isUnlocked() || !this.isModeSwitchUnlocked() ||
      save.hatchery.modes[slotIndex] !== HatcheryRules.MODE_INCUBATION || item?.kind !== ItemKinds.FOSSIL ||
      item.futureOnly || !item.revives || HatcheryQueue.freeFossils(save, itemId) < 1) return { result: 'unavailable' };
    if (save.hatchery.queues[slotIndex].length >= HatcheryQueue.capacity(save)) return { result: HatcheryResults.QUEUE_FULL };
    save.hatchery.queues[slotIndex].push({ kind: 'fossil', itemId }); this._commit(); return { result: HatcheryResults.READY };
  }
  /** @param {number} slotIndex @param {number|null} [entryIndex=null] */
  removeFromQueue(slotIndex, entryIndex = null) {
    const data = SaveSystem.getInstance().getCurrentSave()?.hatchery;
    if (!data || !this.isUnlocked() || !data.queues[slotIndex]) return false;
    if (entryIndex === null) data.queues[slotIndex] = [];
    else if (Number.isInteger(entryIndex) && entryIndex >= 0) data.queues[slotIndex].splice(entryIndex, 1);
    this._commit(); return true;
  }
  /** @param {number} index @param {string} key @param {string} value @returns {boolean} */
  setAutomationFilter(index,key,value) {
    const data=SaveSystem.getInstance().getCurrentSave()?.hatchery;
    if (!this.isUnlocked() || !data?.filters[index]?.set(key,value)) return false;
    this._commit(); return true;
  }
  /** Selects future candidates only; explicitly queued entries always retain their FIFO semantics.
   * @private @param {number} index @returns {Object[]} */
  _automaticCandidates(index) {
    const save=SaveSystem.getInstance().getCurrentSave();
    if(!save?.hatchery.filters[index]) return [];
    const filters=save.hatchery.filters[index].serialize();
    const candidates = FacilityCandidateRules.select(save,this.getCandidates(index, { queue: true }),filters);
    const opts = save.hatchery.autoOptions;
    if (filters.sort==='legacy') candidates.sort((a, b) => {
          if (opts.includes('priority') && a.pokemon.favorite !== b.pokemon.favorite) return a.pokemon.favorite ? -1 : 1;
          if (opts.includes('nonShiny') && a.pokemon.shiny !== b.pokemon.shiny) return a.pokemon.shiny ? 1 : -1;
          for (const [option, key] of [['lowIV', 'ivs'], ['lowEV', 'evs']]) {
            if (!opts.includes(option)) continue;
            const total = (pokemon) => Object.values(pokemon[key]).reduce((sum, value) => sum + value, 0);
            const difference = total(a.pokemon) - total(b.pokemon); if (difference) return difference;
          }
          return a.uid.localeCompare(b.uid);
        });
    return candidates;
  }
  /** Fills queue positions round-robin. Existing FIFO entries are never silently reordered. */
  rebuildQueues(slotIndex=null) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked()) return 0;
    if(slotIndex!==null&&(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=save.hatchery.maxSlots))return 0;
    let added = 0;
    for (let rank = 0; rank < HatcheryQueue.capacity(save); rank++) {
      for (let index = 0; index < save.hatchery.maxSlots; index++) {
        if(slotIndex!==null&&slotIndex!==index)continue;
        const queue = save.hatchery.queues[index];
        if (queue.length !== rank || save.hatchery.pendingModes[index]) continue;
        const candidates=this._automaticCandidates(index);
        const fossil = save.hatchery.modes[index] === HatcheryRules.MODE_INCUBATION
          ? this.getFossilCandidates().find((entry) => entry.quantity > 0) : null;
        const preferFossil = save.hatchery.priorities[index] === 'fossil';
        if (fossil && (preferFossil || !candidates.length)) queue.push({ kind: 'fossil', itemId: fossil.itemId });
        else if (candidates.length) queue.push({ kind: 'pokemon', uid: candidates[0].uid });
        else continue;
        added++;
      }
    }
    if (added) this._commit(); return added;
  }

  /** @override @param {number} dt */
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this._autoElapsed += dt;
    if (this._autoElapsed < FacilityRules.AUTO_SCAN_SECONDS) return;
    this._autoElapsed = 0;
    if (this._processAutomation()) this._commit();
  }
  /** @private @returns {boolean} */
  _processAutomation() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked()) return false;
    const data = save.hatchery;
    let changed = false;
    data.slots.forEach((slot, index) => {
      if (slot?.kind === HatcheryRules.MODE_DAYCARE) {
        const pokemon = save.collection.get(slot.pokemonUid);
        const cap = pokemon ? this.getRegionalDaycareCap(save, pokemon.species, pokemon.uid) : PokemonRules.MAX_LEVEL;
        if ((data.autoHatchEnabled || data.autoFillEnabled) && pokemon && pokemon.level >= cap) {
          this.withdrawPokemon(index, { persist: false }); changed = true;
        }
      } else if (slot?.ready && data.autoHatchEnabled) {
        const fee = slot.paid ? 0 : FacilityStaffSystem.getInstance().getFee('hatchery', HatcheryRules.AUTO_HATCH_FEE);
        if (save.currencies.get(FacilityRules.MONEY_CURRENCY) < fee) return;
        const result = slot.kind === 'fossil' ? this.collectFossil(index, { persist: false }) : this.collectPokemon(index, { persist: false });
        if (result.result === HatcheryResults.READY) {
          if (fee) save.currencies.add(FacilityRules.MONEY_CURRENCY, -fee);
          changed = true;
        }
      }
    });
    if (data.autoFillEnabled) data.slots.forEach((slot, index) => {
      if(slot||data.pendingModes[index]) return;
      const queued=data.queues[index].length>0;
      const candidate=!queued?this._automaticCandidates(index)[0]:null;
      const fossil=!queued&&data.modes[index]===HatcheryRules.MODE_INCUBATION?this.getFossilCandidates().find((entry)=>entry.quantity>0):null;
      const entry=queued?data.queues[index].shift():fossil&&(data.priorities[index]==='fossil'||!candidate)?{kind:'fossil',itemId:fossil.itemId}:candidate?{kind:'pokemon',uid:candidate.uid}:null;
      if(!entry) return;
      const result = entry.kind === 'fossil'
        ? this.startFossilIncubation(entry.itemId, index, { persist: false })
        : this.depositPokemon(entry.uid, index, { persist: false });
      if(result.result==='insufficient-funds'){if(queued)data.queues[index].unshift(entry);}
      else if(queued||result.result==='ready') changed=true;
    });
    return changed;
  }
  /** @private @param {Object} event */
  _handleKnockout(event) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isUnlocked()) return;
    let changed = false;
    let levels = 0;
    for (const slot of save.hatchery.slots) {
      if (slot?.kind === HatcheryRules.MODE_DAYCARE) {
        const pokemon = save.collection.get(slot.pokemonUid);
        if (!pokemon) continue;
        const cap = Math.min(PokemonRules.MAX_LEVEL, this.getRegionalDaycareCap(save, pokemon.species, pokemon.uid));
        if (pokemon.level >= cap) continue;
        slot.knockouts++; changed = true;
        const fee = save.hatchery.autoHatchEnabled || save.hatchery.autoFillEnabled
          ? FacilityStaffSystem.getInstance().getFee('hatchery', HatcheryRules.AUTO_DAYCARE_FEE) : 0;
        while (slot.knockouts >= HatcheryRules.DAYCARE_KOS_PER_LEVEL && pokemon.level < cap) {
          if (save.currencies.get(FacilityRules.MONEY_CURRENCY) < fee) break;
          slot.knockouts -= HatcheryRules.DAYCARE_KOS_PER_LEVEL;
          pokemon.setLevel(pokemon.level + 1); levels++;
          const evolved = pokemon.checkLevelEvolution();
          if (evolved) {
            save.pokedex.markCaught(evolved, pokemon.shiny, { deferSave: true });
          }
          if (fee) save.currencies.add(FacilityRules.MONEY_CURRENCY, -fee);
        }
        if (pokemon.level >= cap) slot.knockouts = 0;
      } else if (slot && !slot.ready) {
        slot.knockouts = Math.min(slot.required, slot.knockouts + 1); slot.ready = slot.knockouts >= slot.required; changed = true;
      }
    }
    if (levels) {
      save.statistics.recordHatcheryLevels(levels);
      EventBus.getInstance().dispatch(new HatcheryLevelUpEvent(levels, save.statistics.hatcheryLevel, { deferSave: true }));
    }
    changed = this._processAutomation() || changed;
    if (!changed) return;
    this._dispatchChanged(); BoxSystem.getInstance().dispatchChanged(); PokemonUsageSystem.getInstance().dispatchChanged();
    if (event.deferSave !== true) SaveSystem.getInstance().saveCurrent();
  }
  /** @private */
  _applyPendingMode(index) {
    const data = SaveSystem.getInstance().getCurrentSave().hatchery;
    if (!data.pendingModes[index] || data.slots[index]) return;
    data.modes[index] = data.pendingModes[index]; data.pendingModes[index] = null; data.queues[index] = [];
  }
  /** @private @param {string} speciesId @returns {number} */
  _requiredFossilKos(speciesId) {
    const species = PokemonDB.getInstance().getById(speciesId);
    const bst = Object.values(species?.baseStats || {}).reduce((sum, value) => sum + value, 0);
    const base = HatcheryRules.LEGENDARY_DEX.includes(species?.dex) ? HatcheryRules.MAX_FOSSIL_KOS :
      HatcheryRules.BST_BANDS.find((band) => bst <= band.maximum)?.kos || HatcheryRules.MAX_FOSSIL_KOS;
    return Math.max(HatcheryRules.MIN_FOSSIL_KOS, Math.min(HatcheryRules.MAX_FOSSIL_KOS,
      Math.ceil(base * (1 - FacilityStaffSystem.getInstance().getBonus('hatchery', 'hatchery_speed')))));
  }
  /** @private */
  _commit(teamChanged = false) {
    SaveSystem.getInstance().saveCurrent();
    if (teamChanged) TeamSystem.getInstance().dispatchChanged();
    PokemonUsageSystem.getInstance().dispatchChanged(); BoxSystem.getInstance().dispatchChanged(); this._dispatchChanged();
  }
  /** @private */
  _dispatchChanged() { EventBus.getInstance().dispatch(new HatcheryChangedEvent(SaveSystem.getInstance().getCurrentSave()?.hatchery.maxSlots || 0)); }
  /** @private */
  _failure(result) { return { result, pokemon: null, stored: null }; }
  /** @private */
  _notify(key, params = {}) { NotificationSystem.getInstance().notifyTemporary(t(key, params), { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.INFO }); }
}
