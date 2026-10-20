/**
 * @file FossilSystem.js
 * @brief Pewter fossil laboratory and shared fossil-revival outcome.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { SpeciesOwnership } from './catch/SpeciesOwnership.js';
import { CatchRules } from './catch/CatchRules.js';
import { EncounterRules } from './battle/EncounterRules.js';
import { Random } from '../core/Random.js';
import { FossilRevivedEvent } from '../core/events/FossilRevivedEvent.js';
import { LocationSystem } from './LocationSystem.js';
import { FossilRules } from '../config/FossilRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export const FossilAvailability = Object.freeze({
  READY: 'ready',
  NO_SAVE: 'no-save',
  WRONG_LOCATION: 'wrong-location',
  NOT_FOSSIL: 'not-fossil',
  FUTURE_ONLY: 'future-only',
  NO_SPECIES: 'no-species',
  NO_ITEM: 'no-item',
  STORY_LOCKED: 'story-locked'
});

export class FossilSystem extends BaseSystem {
  /** @private @type {FossilSystem|null} */
  static _instance = null;

  /** @returns {FossilSystem} */
  static getInstance() {
    if (!FossilSystem._instance) FossilSystem._instance = new FossilSystem();
    return FossilSystem._instance;
  }

  constructor() {
    super('FossilSystem', 'System');
    /** @private @type {Random} */
    this._random = Random.default;
  }

  /** @param {Random} random */
  setRandom(random) {
    this._random = random;
  }

  /** @param {import('../data/save/SaveData.js').SaveData} [save] */
  isRevivalUnlocked(save = SaveSystem.getInstance().getCurrentSave()) {
    return !!save && save.quests.getMainStep('kanto') >= FossilRules.UNLOCK_MAIN_STEP;
  }

  /** @returns {Array<{itemId:string,speciesId:string,quantity:number}>} */
  getCandidates() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.isRevivalUnlocked(save)) return [];
    return save.inventory.entries().map(({ id, quantity }) => {
      const item = ItemDB.getInstance().getById(id);
      return item?.kind === ItemKinds.FOSSIL && !item.futureOnly && item.revives && PokemonDB.getInstance().has(item.revives)
        ? { itemId: id, speciesId: item.revives, quantity }
        : null;
    }).filter(Boolean);
  }

  /** @param {string} itemId */
  availability(itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return { result: FossilAvailability.NO_SAVE, speciesId: null };
    if (!this.isRevivalUnlocked(save)) return { result: FossilAvailability.STORY_LOCKED, speciesId: null };
    const item = ItemDB.getInstance().getById(itemId);
    if (!item || item.kind !== ItemKinds.FOSSIL) return { result: FossilAvailability.NOT_FOSSIL, speciesId: null };
    if (item.futureOnly) return { result: FossilAvailability.FUTURE_ONLY, speciesId: null };
    if (!item.revives || !PokemonDB.getInstance().has(item.revives)) return { result: FossilAvailability.NO_SPECIES, speciesId: null };
    if (LocationSystem.getInstance().getCurrentLocationId() !== FossilRules.LAB_LOCATION_ID) {
      return { result: FossilAvailability.WRONG_LOCATION, speciesId: item.revives };
    }
    if (!save.inventory.has(itemId)) return { result: FossilAvailability.NO_ITEM, speciesId: item.revives };
    return { result: FossilAvailability.READY, speciesId: item.revives };
  }

  /**
   * Revives one fossil at the Pewter laboratory.
   * @param {string} itemId
   * @returns {{result:string,speciesId:string|null,duplicate:boolean,ivStat:string|null,stored:string|null}}
   */
  revive(itemId) {
    const state = this.availability(itemId);
    if (state.result !== FossilAvailability.READY) {
      this._notifyAvailability(state.result);
      return { result: state.result, speciesId: state.speciesId, duplicate: false, ivStat: null, stored: null };
    }
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save.inventory.remove(itemId, 1)) {
      return { result: FossilAvailability.NO_ITEM, speciesId: state.speciesId, duplicate: false, ivStat: null, stored: null };
    }
    const revived = this._reviveSpecies(save, state.speciesId);
    if (!revived) {
      save.inventory.add(itemId, 1);
      return { result: FossilAvailability.NO_SPECIES, speciesId: state.speciesId, duplicate: false, ivStat: null, stored: null };
    }
    EventBus.getInstance().dispatch(new FossilRevivedEvent(state.speciesId, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    this._notifyRevived(revived);
    return { result: FossilAvailability.READY, speciesId: state.speciesId, ...revived };
  }

  /**
   * Completes an already-paid fossil incubation slot; the caller owns persistence.
   * @param {import('../data/save/SaveData.js').SaveData} save
   * @param {string} speciesId
   * @returns {{duplicate:boolean,ivStat:string|null,stored:string}|null}
   */
  reviveSpeciesWithoutItem(save, speciesId) {
    if (!save || !this.isRevivalUnlocked(save) || !PokemonDB.getInstance().has(speciesId)) return null;
    const revived = this._reviveSpecies(save, speciesId);
    if (!revived) return null;
    EventBus.getInstance().dispatch(new FossilRevivedEvent(speciesId, { deferSave: true }));
    this._notifyRevived(revived);
    return revived;
  }

  /** @private */
  _reviveSpecies(save, speciesId) {
    const alreadyCaught = save.pokedex.isCaught(speciesId) || SpeciesOwnership.isOwned(save, speciesId);
    if (alreadyCaught) {
      const existing = SpeciesOwnership.findOwned(save, speciesId);
      const ivStat = existing ? CatchRules.rollIvBonus(existing, this._random) : null;
      return { speciesId, duplicate: true, ivStat, stored: null, pokemon: existing };
    }
    const shiny = this._random.next() < EncounterRules.shinyRate(save.team);
    const pokemon = PokemonFactory.create(speciesId, FossilRules.REVIVED_LEVEL, { shiny, random: this._random });
    if (!pokemon) return null;
    const stored = TeamSystem.getInstance().hasFreeSlot() ? 'team' : 'box';
    const added = stored === 'team'
      ? TeamSystem.getInstance().addPokemon(pokemon)
      : BoxSystem.getInstance().addPokemon(pokemon);
    if (!added) return null;
    return { speciesId, duplicate: false, ivStat: null, stored, pokemon };
  }

  /** @private */
  _notifyAvailability(result) {
    const key = result === FossilAvailability.WRONG_LOCATION ? 'fossil_lab_required' :
      result === FossilAvailability.FUTURE_ONLY ? 'fossil_future_only' :
        result === FossilAvailability.STORY_LOCKED ? 'fossil_story_locked' :
          result === FossilAvailability.NO_ITEM ? 'fossil_not_available' : 'fossil_not_reviveable';
    NotificationSystem.getInstance().notifyTemporary(t(key), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.WARNING
    });
  }

  /** @private */
  _notifyRevived(result) {
    const name = result.pokemon?.getDisplayName() ?? t(`pokemon.${result.speciesId}`);
    const key = result.duplicate
      ? result.ivStat ? 'fossil_duplicate_iv' : 'fossil_duplicate_no_iv'
      : result.stored === 'team' ? 'fossil_revived_party' : 'fossil_revived_box';
    NotificationSystem.getInstance().notifyTemporary(t(key, {
      name,
      stat: result.ivStat ? t(`stat_${result.ivStat}`) : ''
    }), {
      channel: NotificationChannels.GAMEPLAY,
      tone: result.duplicate ? NotificationTones.INFO : NotificationTones.SUCCESS
    });
  }
}
