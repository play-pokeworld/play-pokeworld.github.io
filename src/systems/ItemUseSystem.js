/**
 * @file ItemUseSystem.js
 * @brief Validated Kanto item effects for the bag (DOM-free, one save write per use).
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { BattleSystem } from './BattleSystem.js';
import { EvolutionSystem } from './EvolutionSystem.js';
import { MoveLearningSystem } from './MoveLearningSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { PokemonRules } from '../config/PokemonRules.js';
import { ItemUseActions, ItemUseResults, ItemUseRules } from '../config/ItemUseRules.js';
import { Random } from '../core/Random.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export class ItemUseSystem extends BaseSystem {
  /** @private @type {ItemUseSystem|null} */
  static _instance = null;

  /** @returns {ItemUseSystem} */
  static getInstance() {
    if (!ItemUseSystem._instance) ItemUseSystem._instance = new ItemUseSystem();
    return ItemUseSystem._instance;
  }

  constructor() {
    super('ItemUseSystem', 'System');
    this._random = Random.default;
  }

  /** @param {Random} random */
  setRandom(random) {
    this._random = random;
  }

  /** @param {string} itemId @returns {string|null} */
  getUseAction(itemId) {
    const item = ItemDB.getInstance().getById(itemId);
    if (!item) return null;
    if ([ItemKinds.TM, ItemKinds.HM].includes(item.kind) && item.move) return ItemUseActions.UNLOCK_MOVE;
    if (itemId === ItemUseRules.RARE_CANDY_ID && item.kind === ItemKinds.CANDY) return ItemUseActions.RARE_CANDY;
    if (item.kind === ItemKinds.CONSUMABLE && item.category === ItemUseRules.VITAMIN_CATEGORY) return ItemUseActions.VITAMIN;
    if (this._hasEvolutionForItem(itemId)) return ItemUseActions.EVOLVE;
    return null;
  }

  /** @param {string} itemId @returns {boolean} */
  isSupported(itemId) {
    return this.getUseAction(itemId) !== null;
  }

  /**
   * A read-only list for the target modal (party first, then the rest of the collection; Pokémon
   * whose current usage forbids item use are skipped). `location` is 'team' for a party member,
   * 'box' otherwise. Names remain ids/nicknames; UI owns localization.
   * @param {string} itemId
   * @returns {ReadonlyArray<Object>}
   */
  getEligibleTargets(itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const action = this.getUseAction(itemId);
    if (!save || !action || !save.inventory.has(itemId) || BattleSystem.getInstance().isActive()) return [];
    const others = save.collection.getAll().filter((pokemon) => !save.teamMembers.includes(pokemon.uid));
    const targets = [
      ...save.team.map((pokemon) => ({ pokemon, location: 'team' })),
      ...others.map((pokemon) => ({ pokemon, location: 'box' }))
    ];
    return Object.freeze(targets
      .filter(({ pokemon }) => this._canTarget(action, itemId, pokemon))
      .map(({ pokemon, location }) => Object.freeze({
        uid: pokemon.uid,
        location,
        species: pokemon.species,
        form: pokemon.form,
        nickname: pokemon.nickname,
        shiny: pokemon.shiny,
        level: pokemon.level
      })));
  }

  /**
   * Uses one supported item on an eligible owned Pokémon. Invalid attempts never consume it.
   * @param {string} itemId
   * @param {string} uid
   * @returns {{result:string,action:string|null,pokemonUid:string|null,moveId?:string,targetSpecies?:string,stat?:string,level?:number}}
   */
  useOnPokemon(itemId, uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return { result: ItemUseResults.NO_SAVE, action: null, pokemonUid: null };
    if (!save.inventory.has(itemId)) return { result: ItemUseResults.NOT_OWNED, action: null, pokemonUid: uid || null };
    const action = this.getUseAction(itemId);
    if (!action) return { result: ItemUseResults.UNSUPPORTED, action: null, pokemonUid: uid || null };
    if (BattleSystem.getInstance().isActive()) return { result: ItemUseResults.BATTLE_ACTIVE, action, pokemonUid: uid || null };
    const box = BoxSystem.getInstance();
    const pokemon = box.getPokemonByUid(uid);
    if (!pokemon || !this._canTarget(action, itemId, pokemon)) {
      return { result: ItemUseResults.TARGET_INELIGIBLE, action, pokemonUid: uid || null };
    }

    const targetName = pokemon.getDisplayName();
    if (!save.inventory.remove(itemId, 1, { deferSave: true })) {
      return { result: ItemUseResults.NOT_OWNED, action, pokemonUid: uid };
    }
    const effect = {};
    const update = (target) => {
      if (!this._isEligible(action, itemId, target)) return false;
      Object.assign(effect, this._apply(action, itemId, target));
      return Object.keys(effect).length > 0;
    };
    if (!box.updatePokemon(uid, update, { persist: false, notify: false })) {
      save.inventory.add(itemId, 1, { deferSave: true });
      return { result: ItemUseResults.TARGET_INELIGIBLE, action, pokemonUid: uid };
    }

    if (effect.targetSpecies) {
      save.pokedex.markCaught(effect.targetSpecies, pokemon.shiny, { deferSave: true });
    }
    SaveSystem.getInstance().saveCurrent();
    box.dispatchPokemonChanged(uid);
    this._notifyUse(itemId, action, targetName, effect);
    return { result: ItemUseResults.SUCCESS, action, pokemonUid: uid, ...effect };
  }

  /** @private @param {string} action @param {string} itemId @param {Object} pokemon @returns {boolean} */
  _canTarget(action, itemId, pokemon) {
    return this._isEligible(action, itemId, pokemon)
      && PokemonUsageSystem.getInstance().canPerform(pokemon.uid, PokemonActionIds.USE_ITEM);
  }

  /** @private @param {string} itemId @returns {boolean} */
  _hasEvolutionForItem(itemId) {
    return PokemonDB.getInstance().getAll().some((species) =>
      species.evolutions.some((evolution) => evolution.item === itemId));
  }

  /** @private @param {string} action @param {string} itemId @param {Object} pokemon @returns {boolean} */
  _isEligible(action, itemId, pokemon) {
    if (!pokemon) return false;
    if (action === ItemUseActions.UNLOCK_MOVE) {
      return MoveLearningSystem.getInstance().canUnlockWithItem(itemId, pokemon);
    }
    if (action === ItemUseActions.RARE_CANDY) return pokemon.level < PokemonRules.MAX_LEVEL;
    if (action === ItemUseActions.VITAMIN) return this._eligibleEvStats(pokemon).length > 0;
    if (action === ItemUseActions.EVOLVE) return !!this._findEvolution(pokemon, itemId);
    return false;
  }

  /** @private @param {Object} pokemon @returns {string[]} */
  _eligibleEvStats(pokemon) {
    const total = PokemonRules.STAT_KEYS.reduce((sum, stat) => sum + (Number(pokemon.evs[stat]) || 0), 0);
    if (total >= PokemonRules.EV_TOTAL_MAX) return [];
    return PokemonRules.STAT_KEYS.filter((stat) => (Number(pokemon.evs[stat]) || 0) < PokemonRules.EV_MAX);
  }

  /** @private @param {Object} pokemon @param {string} itemId @returns {Object|null} */
  _findEvolution(pokemon, itemId) {
    return EvolutionSystem.getInstance().findItemEvolution(pokemon, itemId);
  }

  /** @private @param {string} action @param {string} itemId @param {Object} pokemon @returns {Object} */
  _apply(action, itemId, pokemon) {
    if (action === ItemUseActions.UNLOCK_MOVE) {
      const moveId = ItemDB.getInstance().getById(itemId).move;
      return pokemon.unlockMove(moveId) ? { moveId } : {};
    }
    if (action === ItemUseActions.RARE_CANDY) {
      pokemon.setLevel(pokemon.level + 1);
      // The candy only raises the level: evolutions are produced by EvolutionSystem, which keeps
      // this Pokémon and adds the evolved species at level 1 to the collection.
      const evolved = EvolutionSystem.getInstance().applyLevelEvolutions(pokemon, { notify: false, deferSave: true });
      return { level: pokemon.level, targetSpecies: evolved.targets[0], evolutions: evolved.targets };
    }
    if (action === ItemUseActions.VITAMIN) {
      const stat = this._random.pick(this._eligibleEvStats(pokemon));
      return stat && pokemon.addEv(stat, 1) > 0 ? { stat } : {};
    }
    if (action === ItemUseActions.EVOLVE) {
      const outcome = EvolutionSystem.getInstance().applyItemEvolution(pokemon, itemId, { notify: false, deferSave: true });
      return outcome ? { targetSpecies: outcome.target } : {};
    }
    return {};
  }

  /** @private @param {string} itemId @param {string} action @param {string} name @param {Object} effect */
  _notifyUse(itemId, action, name, effect) {
    const itemName = t(`item.${itemId}.name`);
    let key = 'item_use_consumable_success';
    const params = { item: itemName, name };
    if (action === ItemUseActions.UNLOCK_MOVE) {
      key = 'item_use_move_unlocked';
      params.move = t(`move.${effect.moveId}`);
    } else if (action === ItemUseActions.EVOLVE) {
      key = 'item_use_evolved';
      params.evolution = t(`pokemon.${effect.targetSpecies}`);
      params.level = PokemonRules.MIN_LEVEL;
    } else if (action === ItemUseActions.RARE_CANDY) {
      key = effect.targetSpecies ? 'item_use_rare_candy_evolved' : 'item_use_rare_candy';
      params.level = effect.level;
      if (effect.targetSpecies) {
        params.evolution = t(`pokemon.${effect.targetSpecies}`);
        params.minLevel = PokemonRules.MIN_LEVEL;
      }
    } else if (action === ItemUseActions.VITAMIN) {
      key = 'item_use_vitamin';
      params.stat = t(`stat_${effect.stat}`);
    }
    NotificationSystem.getInstance().notifyTemporary(t(key, params), {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }
}
