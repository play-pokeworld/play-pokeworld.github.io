/**
 * @file MoveLearningSystem.js
 * @brief Per-Pokémon TM/HM unlocks and learnable-move equipment (DOM-free).
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { BattleSystem } from './BattleSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { MoveLearnset } from '../data/pokemon/MoveLearnset.js';
import { MoveConfig } from '../config/MoveConfig.js';
import { MoveLearningResults } from '../config/ItemUseRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export class MoveLearningSystem extends BaseSystem {
  /** @private @type {MoveLearningSystem|null} */
  static _instance = null;

  /** @returns {MoveLearningSystem} */
  static getInstance() {
    if (!MoveLearningSystem._instance) MoveLearningSystem._instance = new MoveLearningSystem();
    return MoveLearningSystem._instance;
  }

  constructor() {
    super('MoveLearningSystem', 'System');
  }

  /** @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon @returns {string[]} */
  getLearnableMoveIds(pokemon) {
    if (!pokemon) return [];
    const moveDb = MoveDB.getInstance();
    const pool = MoveLearnset.poolFor(MoveLearnset.typesOf(pokemon));
    const naturalCount = MoveLearnset.knownCountAt(pokemon.level);
    const unlocked = Array.isArray(pokemon.unlockedMoves) ? pokemon.unlockedMoves : [];
    const current = new Set(Array.isArray(pokemon.moves) ? pokemon.moves : []);
    return [...new Set([...pool.slice(0, naturalCount), ...unlocked])]
      .filter((moveId) => moveDb.has(moveId) && !current.has(moveId));
  }

  /** @param {string} itemId @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon @returns {boolean} */
  canUnlockWithItem(itemId, pokemon) {
    const item = ItemDB.getInstance().getById(itemId);
    const moveId = item?.move;
    const move = moveId ? MoveDB.getInstance().getById(moveId) : null;
    if (!pokemon || !move || ![ItemKinds.TM, ItemKinds.HM].includes(item.kind)) return false;
    if (pokemon.moves.includes(moveId) || pokemon.unlockedMoves.includes(moveId)) return false;
    const types = MoveLearnset.typesOf(pokemon);
    const compatible = move.learnTypes.includes(MoveConfig.ANY_TYPE)
      || move.type === MoveConfig.ANY_TYPE
      || types.includes(move.type)
      || move.learnTypes.some((type) => types.includes(type));
    if (!compatible) return false;
    const pool = MoveLearnset.poolFor(types);
    const naturalCount = MoveLearnset.knownCountAt(pokemon.level);
    return !pool.slice(0, naturalCount).includes(moveId);
  }

  /** @param {string} uid @returns {Object|null} Owned Pokémon, wherever it is used */
  getPokemon(uid) {
    return BoxSystem.getInstance().getPokemonByUid(uid);
  }

  /** @param {string} uid @returns {boolean} A mode using this Pokémon forbids move changes */
  isUsageLocked(uid) {
    return !PokemonUsageSystem.getInstance().canPerform(uid, PokemonActionIds.LEARN_MOVE);
  }

  /** @returns {boolean} Move editing is not allowed while a battle is in progress. */
  isBattleLocked() {
    return BattleSystem.getInstance().isActive();
  }

  /**
   * Equips a currently learnable move, optionally replacing an existing active slot.
   * @param {string} uid
   * @param {string} moveId
   * @param {number|null} [replaceSlot=null]
   * @returns {{result:string, pokemonUid:string|null}}
   */
  learnMove(uid, moveId, replaceSlot = null) {
    if (!SaveSystem.getInstance().getCurrentSave()) return { result: MoveLearningResults.NO_SAVE, pokemonUid: null };
    if (this.isBattleLocked()) return { result: MoveLearningResults.BATTLE_ACTIVE, pokemonUid: uid || null };
    const pokemon = this.getPokemon(uid);
    if (!pokemon) return { result: MoveLearningResults.TARGET_MISSING, pokemonUid: null };
    if (this.isUsageLocked(uid)) return { result: MoveLearningResults.POKEMON_IN_USE, pokemonUid: uid };
    if (!MoveDB.getInstance().has(moveId)) return { result: MoveLearningResults.MOVE_UNKNOWN, pokemonUid: uid };
    if (!this.getLearnableMoveIds(pokemon).includes(moveId)) {
      return { result: MoveLearningResults.MOVE_NOT_AVAILABLE, pokemonUid: uid };
    }
    if (replaceSlot == null && pokemon.moves.length >= MoveConfig.ACTIVE_SLOTS) {
      return { result: MoveLearningResults.REPLACEMENT_REQUIRED, pokemonUid: uid };
    }
    if (replaceSlot != null && (!Number.isInteger(replaceSlot) || replaceSlot < 0 || replaceSlot >= pokemon.moves.length)) {
      return { result: MoveLearningResults.INVALID_SLOT, pokemonUid: uid };
    }

    const update = (target) => {
      if (!this.getLearnableMoveIds(target).includes(moveId)) return false;
      if (replaceSlot == null) {
        if (target.moves.length >= MoveConfig.ACTIVE_SLOTS) return false;
        target.moves.push(moveId);
      } else {
        if (!Number.isInteger(replaceSlot) || replaceSlot < 0 || replaceSlot >= target.moves.length) return false;
        target.moves[replaceSlot] = moveId;
      }
      return true;
    };
    if (!BoxSystem.getInstance().updatePokemon(uid, update, { persist: false, notify: false })) {
      return { result: MoveLearningResults.TARGET_MISSING, pokemonUid: null };
    }

    SaveSystem.getInstance().saveCurrent();
    BoxSystem.getInstance().dispatchPokemonChanged(uid);
    const name = pokemon.getDisplayName();
    NotificationSystem.getInstance().notifyTemporary(t('pokemon_info_move_learned', {
      name,
      move: t(`move.${moveId}`)
    }), { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.SUCCESS });
    return { result: MoveLearningResults.SUCCESS, pokemonUid: uid };
  }
}
