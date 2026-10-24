/** @file PokemonTalentSystem.js @brief Species-ledger queries and centrally locked normal-talent equipment. */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';

export class PokemonTalentSystem extends BaseSystem {
  static _instance = null;
  /** @returns {PokemonTalentSystem} */
  static getInstance() { return this._instance || (this._instance = new PokemonTalentSystem()); }
  constructor() { super('PokemonTalentSystem', 'System'); }
  /** @param {string} uid @returns {Object|null} */
  getSnapshot(uid) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const pokemon = save?.collection.get(uid);
    if (!pokemon) return null;
    const species = pokemon.getSpecies();
    const lock = PokemonUsageSystem.getInstance().getActionLock(uid, PokemonActionIds.CHANGE_TALENT);
    return { current: pokemon.talent, locked: !!lock || BattleSystem.getInstance().isActive(), lock,
      battleActive: BattleSystem.getInstance().isActive(),
      options: [...new Set(species.talents)].filter((id) => id !== species.hiddenTalent)
        .map((id) => ({ id, unlocked: save.talents.has(species.id, id) })),
      hidden: species.hiddenTalent, hiddenUnlocked: save.talents.hasHidden(species.id) };
  }
  /** @param {string} uid @param {string} talentId @returns {boolean} */
  equip(uid, talentId) {
    const state = this.getSnapshot(uid);
    if (!state || state.locked || state.current === talentId || !state.options.some((option) => option.id === talentId && option.unlocked)) return false;
    return BoxSystem.getInstance().updatePokemon(uid, (pokemon) => { pokemon.talent = talentId; return true; });
  }
}
