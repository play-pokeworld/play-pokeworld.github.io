/**
 * @file SanctuarySystem.js
 * @brief Manages Sanctuary Relic forging and Legendary Boss raid encounters.
 */
import { BaseSystem } from './BaseSystem.js';
import { SanctuaryDB } from '../data/sanctuary/SanctuaryDB.js';
import { SaveSystem } from './SaveSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationTones } from '../config/NotificationConfig.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { BoxSystem } from './BoxSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { BattleSystem } from './BattleSystem.js';
import { t } from '../localization/LocalizationManager.js';

export class SanctuarySystem extends BaseSystem {
  /** @private @type {SanctuarySystem|null} */
  static _instance = null;

  /** @returns {SanctuarySystem} */
  static getInstance() {
    if (!SanctuarySystem._instance) SanctuarySystem._instance = new SanctuarySystem();
    return SanctuarySystem._instance;
  }

  constructor() {
    super('SanctuarySystem', 'System');
  }

  /**
   * Called when a wild Pokémon is defeated at a location.
   * Charges all sanctuaries associated with this location (direct sanctuary dungeon or connected farm route).
   * @param {string} locationId
   */
  recordWildKO(locationId) {
    if (!locationId) return;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const sanctuaries = SanctuaryDB.getInstance().getByFarmLocation(locationId);
    if (sanctuaries && sanctuaries.length > 0) {
      for (const s of sanctuaries) {
        save.sanctuary.recordWildKO(s.locationId, 1);
      }
    } else if (SanctuaryDB.getInstance().hasLocation(locationId)) {
      save.sanctuary.recordWildKO(locationId, 1);
    }
  }

  /**
   * Checks if enough wild KOs have been recorded to forge a relic.
   * @param {string} locationId
   * @returns {boolean}
   */
  canForgeRelic(locationId) {
    const sanctuary = SanctuaryDB.getInstance().getByLocation(locationId);
    if (!sanctuary) return false;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return false;
    return save.sanctuary.getProgress(locationId) >= sanctuary.requiredKOs;
  }

  /**
   * Forges +1 relic for the sanctuary at the given location.
   * @param {string} locationId
   * @returns {boolean}
   */
  forgeRelic(locationId) {
    const sanctuary = SanctuaryDB.getInstance().getByLocation(locationId);
    if (!sanctuary || !this.canForgeRelic(locationId)) return false;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return false;

    save.sanctuary.resetProgress(locationId, sanctuary.requiredKOs);
    save.inventory.add(sanctuary.relicItem, 1);
    SaveSystem.getInstance().saveCurrent();

    const item = ItemDB.getInstance().getById(sanctuary.relicItem);
    const itemName = item ? t(`item.${sanctuary.relicItem}.name`) : sanctuary.relicItem;
    NotificationSystem.getInstance().notify(
      t('sanctuary_relic_forged', { relic: itemName }),
      { tone: NotificationTones.SUCCESS }
    );
    return true;
  }

  /**
   * Checks if the player owns at least 1 relic required for the sanctuary.
   * @param {string} sanctuaryId
   * @returns {boolean}
   */
  hasRelic(sanctuaryId) {
    const sanctuary = SanctuaryDB.getInstance().getById(sanctuaryId);
    if (!sanctuary) return false;
    const save = SaveSystem.getInstance().getCurrentSave();
    return (save?.inventory.count(sanctuary.relicItem) || 0) > 0;
  }

  /**
   * Gets current relic count owned by the player for a sanctuary.
   * @param {string} sanctuaryId
   * @returns {number}
   */
  getRelicCount(sanctuaryId) {
    const sanctuary = SanctuaryDB.getInstance().getById(sanctuaryId);
    if (!sanctuary) return 0;
    const save = SaveSystem.getInstance().getCurrentSave();
    return save?.inventory.count(sanctuary.relicItem) || 0;
  }

  /**
   * Initiates a Sanctuary Raid Boss battle.
   * @param {string} sanctuaryId
   * @returns {boolean}
   */
  startBossBattle(sanctuaryId) {
    const sanctuary = SanctuaryDB.getInstance().getById(sanctuaryId);
    if (!sanctuary || !this.hasRelic(sanctuaryId)) return false;
    return BattleSystem.getInstance().startSanctuaryBattle(sanctuary);
  }

  /**
   * Called on Sanctuary Boss victory.
   * Consumes 1 relic, catches the boss, records completion, and notifies.
   * @param {string} sanctuaryId
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} foePokemon
   */
  onBossVictory(sanctuaryId, foePokemon) {
    const sanctuary = SanctuaryDB.getInstance().getById(sanctuaryId);
    if (!sanctuary) return;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;

    // 1. Consume 1 single-use relic
    save.inventory.remove(sanctuary.relicItem, 1);

    // 2. Award standard captured Pokémon
    const caught = PokemonFactory.create(sanctuary.species, sanctuary.level, {
      shiny: foePokemon?.shiny || false
    });
    if (caught) {
      if (TeamSystem.getInstance().hasFreeSlot()) {
        TeamSystem.getInstance().addPokemon(caught, { notify: true });
      } else {
        BoxSystem.getInstance().addPokemon(caught, { notify: true });
      }
    }

    // 3. Mark in Pokédex
    save.pokedex.markCaught(sanctuary.species, foePokemon?.shiny || false);

    // 4. Record sanctuary completion
    save.sanctuary.recordCompletion(sanctuaryId);
    SaveSystem.getInstance().saveCurrent();

    // 5. Notify player
    const speciesObj = PokemonDB.getInstance().getById(sanctuary.species);
    const bossName = speciesObj ? t(speciesObj.getNameKey()) : sanctuary.species;
    NotificationSystem.getInstance().notify(
      t('sanctuary_boss_captured', { name: bossName }),
      { tone: NotificationTones.SUCCESS }
    );
  }

  /**
   * Called on Sanctuary Boss defeat.
   * Relic is NOT consumed; player team recovers safely.
   * @param {string} sanctuaryId
   */
  onBossDefeat(sanctuaryId) {
    const sanctuary = SanctuaryDB.getInstance().getById(sanctuaryId);
    if (!sanctuary) return;
    const speciesObj = PokemonDB.getInstance().getById(sanctuary.species);
    const bossName = speciesObj ? t(speciesObj.getNameKey()) : sanctuary.species;
    NotificationSystem.getInstance().notify(
      t('sanctuary_boss_defeat', { name: bossName }),
      { tone: NotificationTones.DANGER }
    );
  }
}
