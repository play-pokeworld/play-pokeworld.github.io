/**
 * @file AchievementSystem.js
 * @brief Evaluates achievement progression, handles unlocks, retroactive calculation, and pinned tracker state.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { AchievementDB } from '../data/achievements/AchievementDB.js';
import { AchievementUnlockedEvent } from '../core/events/AchievementUnlockedEvent.js';
import { AchievementPinnedEvent } from '../core/events/AchievementPinnedEvent.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { EventBus } from '../core/EventBus.js';
import { PokemonCaughtEvent } from '../core/events/PokemonCaughtEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { TrainerDefeatedEvent } from '../core/events/TrainerDefeatedEvent.js';
import { EggHatchedEvent } from '../core/events/EggHatchedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { CurrencyChangedEvent } from '../core/events/CurrencyChangedEvent.js';
import { TrainingSessionCompletedEvent } from '../core/events/TrainingSessionCompletedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SecretBaseChangedEvent } from '../core/events/SecretBaseChangedEvent.js';
import { AtollBattleFinishedEvent } from '../core/events/AtollBattleFinishedEvent.js';
import { t } from '../localization/LocalizationManager.js';

const ROAMER_DEX = Object.freeze([144, 145, 146, 243, 244, 245, 380, 381]);
const FOSSIL_ITEMS = Object.freeze(['helix_fossil', 'dome_fossil', 'old_amber', 'root_fossil', 'claw_fossil', 'fossil']);
const EVO_STONES = Object.freeze(['fire_stone', 'water_stone', 'thunder_stone', 'leaf_stone', 'moon_stone', 'sun_stone']);

/** @param {Object} pokemon @returns {boolean} */
function isMaxIv(pokemon) {
  if (!pokemon?.ivs) return false;
  const sum = Object.values(pokemon.ivs).reduce((s, v) => s + (Number(v) || 0), 0);
  return sum >= 72;
}

/** @param {Object} pokemon @returns {boolean} */
function hasTwelveIv(pokemon) {
  if (!pokemon?.ivs) return false;
  return Object.values(pokemon.ivs).some((v) => Number(v) >= 12);
}

/** @param {Object} pokemon @returns {boolean} */
function isMaxEv(pokemon) {
  if (!pokemon?.evs) return false;
  const sum = Object.values(pokemon.evs).reduce((s, v) => s + (Number(v) || 0), 0);
  return sum >= 510;
}

export class AchievementSystem extends BaseSystem {
  /** @private @type {AchievementSystem|null} */
  static _instance = null;

  /** @returns {AchievementSystem} */
  static getInstance() {
    if (!AchievementSystem._instance) AchievementSystem._instance = new AchievementSystem();
    return AchievementSystem._instance;
  }

  constructor() {
    super('AchievementSystem', 'System');
    /** @private @type {Array<Function>} */
    this._unsubscribers = [];
  }

  /** @override */
  init() {
    const bus = EventBus.getInstance();

    this._unsubscribers.push(
      bus.subscribe(PokemonCaughtEvent, (event) => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        save.achievements.incrementStat('totalCaptures');
        if (event.shiny) save.achievements.incrementStat('shinyCaptured');
        const species = PokemonDB.getInstance().getById(event.speciesId);
        if (species && HatcheryRules.LEGENDARY_DEX.includes(species.dex)) {
          save.achievements.incrementStat('legendaryCaptures');
        }
        this.checkAll({ notify: true });
      }),

      bus.subscribe(PokemonDefeatedEvent, (event) => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        if (event.wild) {
          save.achievements.incrementStat('wildWins');
        }
        this.checkAll({ notify: true });
      }),

      bus.subscribe(TrainerDefeatedEvent, (event) => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        save.achievements.incrementStat('trainersDefeated');
        this.checkAll({ notify: true });
      }),

      bus.subscribe(EggHatchedEvent, (event) => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        save.achievements.incrementStat('eggsHatched');
        const babySpeciesValues = Object.values(HatcheryRules.BABY_SPECIES);
        if (babySpeciesValues.includes(event.speciesId)) {
          save.achievements.incrementStat('babiesHatched');
        }
        this.checkAll({ notify: true });
      }),

      bus.subscribe(LocationChangedEvent, () => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        this.checkAll({ notify: true });
      }),

      bus.subscribe(CurrencyChangedEvent, () => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        this.checkAll({ notify: true });
      }),

      bus.subscribe(TrainingSessionCompletedEvent, () => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        save.achievements.incrementStat('trainingSessions');
        this.checkAll({ notify: true });
      }),

      bus.subscribe(SaveLoadedEvent, () => {
        this.checkAll({ notify: false });
      }),

      bus.subscribe(SaveCreatedEvent, () => {
        this.checkAll({ notify: false });
      }),

      bus.subscribe(SecretBaseChangedEvent, () => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        this.checkAll({ notify: true });
      }),

      bus.subscribe(AtollBattleFinishedEvent, () => {
        const save = SaveSystem.getInstance().getCurrentSave();
        if (!save?.achievements) return;
        this.checkAll({ notify: true });
      })
    );
  }

  /**
   * Evaluates the current numeric progress of an achievement.
   * @param {Object|string} achOrId
   * @param {Object} [save]
   * @returns {number}
   */
  getMetricValue(achOrId, save = null) {
    const currentSave = save || SaveSystem.getInstance().getCurrentSave();
    if (!currentSave) return 0;
    const ach = typeof achOrId === 'string' ? AchievementDB.getInstance().getById(achOrId) : achOrId;
    if (!ach) return 0;

    const stats = currentSave.achievements?.getAllStats() || {};
    const pokedex = currentSave.pokedex;
    const pokemonDb = PokemonDB.getInstance();

    switch (ach.metric) {
      case 'dex_kanto': {
        const kantoSpecies = pokemonDb.getByRegion('kanto');
        return pokedex ? kantoSpecies.filter((p) => pokedex.isCaught(p.id)).length : 0;
      }
      case 'dex_johto': {
        const johtoSpecies = pokemonDb.getByRegion('johto');
        return pokedex ? johtoSpecies.filter((p) => pokedex.isCaught(p.id)).length : 0;
      }
      case 'dex_hoenn': {
        const hoennSpecies = pokemonDb.getByRegion('hoenn');
        return pokedex ? hoennSpecies.filter((p) => pokedex.isCaught(p.id)).length : 0;
      }
      case 'dex_national':
        return pokedex ? pokedex.getCaughtCount() : 0;
      case 'dex_legendaries':
      case 'legendary_captures': {
        let count = 0;
        if (pokedex) {
          for (const dex of HatcheryRules.LEGENDARY_DEX) {
            const species = pokemonDb.getByDex(dex);
            if (species && pokedex.isCaught(species.id)) count++;
          }
        }
        return Math.max(count, stats.legendaryCaptures || 0);
      }
      case 'shiny_captured': {
        let count = 0;
        if (pokedex) {
          count = pokedex.getCaughtSpecies().filter((s) => s.shiny).length;
        }
        return Math.max(count, stats.shinyCaptured || 0);
      }
      case 'shiny_hatched':
        return stats.shinyHatched || 0;
      case 'shiny_beaten':
        return stats.shinyBeaten || 0;
      case 'shiny_team':
        return Array.isArray(currentSave.team) ? currentSave.team.filter((p) => p && p.shiny).length : 0;
      case 'wild_wins': {
        const wildWinsTotal = Object.values(currentSave.statistics?.wildWins || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
        return Math.max(wildWinsTotal, stats.wildWins || 0);
      }
      case 'trainers_defeated': {
        const trainerWinsTotal = Object.values(currentSave.statistics?.trainerWins || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
        const badgesCount = currentSave.player?.badges?.length || 0;
        return Math.max(trainerWinsTotal, badgesCount, stats.trainersDefeated || 0);
      }
      case 'champions_beaten': {
        const badgesCount = currentSave.player?.badges?.length || 0;
        const leaguesCount = currentSave.statistics?.leaguesWon?.length || 0;
        return Math.max(badgesCount, leaguesCount, stats.championsBeaten || 0);
      }
      case 'leagues_won':
        return Math.max(currentSave.statistics?.leaguesWon?.length || 0, stats.leaguesWon || 0);
      case 'one_hit_kos':
        return stats.oneHitKOs || 0;
      case 'flawless_wins':
        return stats.flawlessWins || 0;
      case 'total_captures':
        return Math.max(currentSave.statistics?.caughtTotal || 0, stats.totalCaptures || 0);
      case 'afk_captures':
        return stats.afkCatches || 0;
      case 'same_species_captures': {
        const dupes = Object.values(currentSave.statistics?.duplicateCatches || {});
        const maxDupe = dupes.length > 0 ? Math.max(...dupes) + 1 : 0;
        return Math.max(maxDupe, stats.sameSpeciesCaptures || 0);
      }
      case 'route_species_variety':
        return stats.maxRouteSpecies || 0;
      case 'roamer_captured': {
        let count = 0;
        if (pokedex) {
          for (const dex of ROAMER_DEX) {
            const species = pokemonDb.getByDex(dex);
            if (species && pokedex.isCaught(species.id)) count++;
          }
        }
        return count;
      }
      case 'route_challenges_count': {
        let count = 0;
        const wins = currentSave.statistics?.wildWins || {};
        for (const loc in wins) {
          if ((wins[loc] || 0) >= 50) count++;
        }
        return count;
      }
      case 'rematches_gym_kanto':
      case 'rematches_gym_johto':
      case 'rematches_gym_hoenn':
      case 'rematches_league':
        return stats[ach.metric] || 0;
      case 'locations_visited': {
        const visitedLocs = Object.keys(currentSave.statistics?.wildWins || {}).length;
        const unlocked = currentSave.access?.unlockedLocations?.length || 0;
        return Math.max(visitedLocs, unlocked, stats.locationsVisited || 0);
      }
      case 'routes_100_dex':
        return stats.routes100Dex || 0;
      case 'route_masteries_gold':
        return stats.routeMasteriesGold || 0;
      case 'dungeons_completed': {
        const clears = Object.values(currentSave.dungeons?.clears || {}).reduce((s, n) => s + (Number(n) || 0), 0);
        return Math.max(currentSave.dungeons?.exploredTotal || 0, clears, stats.dungeonsCompleted || 0);
      }
      case 'regions_unlocked': {
        const leagues = currentSave.statistics?.leaguesWon?.length || 0;
        const starters = currentSave.access?.regionStarters?.length || 1;
        return Math.max(1, leagues + 1, starters);
      }
      case 'eggs_hatched':
        return stats.eggsHatched || 0;
      case 'max_iv_pokemon': {
        const allMons = currentSave.collection?.getAll?.() || [];
        const count = allMons.filter(isMaxIv).length;
        return Math.max(count, stats.maxIvPokemon || 0);
      }
      case 'babies_hatched':
        return stats.babiesHatched || 0;
      case 'incub_dupes':
        return stats.incubDupes || 0;
      case 'twelve_iv_stat': {
        const allMons = currentSave.collection?.getAll?.() || [];
        const count = allMons.filter(hasTwelveIv).length;
        return Math.max(count, stats.twelveIvStat || 0);
      }
      case 'training_sessions':
        return Math.max(currentSave.statistics?.trainingSessions || 0, stats.trainingSessions || 0);
      case 'max_ev_pokemon': {
        const allMons = currentSave.collection?.getAll?.() || [];
        const count = allMons.filter(isMaxEv).length;
        return Math.max(count, stats.maxEvPokemon || 0);
      }
      case 'hidden_abilities': {
        const talentsCount = currentSave.talents?.getSpeciesCount?.() || 0;
        return Math.max(talentsCount, stats.hiddenAbilities || 0);
      }
      case 'rare_abilities': {
        const allMons = currentSave.collection?.getAll?.() || [];
        const count = allMons.filter((p) => p && p.talent && p.talent !== 'default').length;
        return Math.max(count, stats.rareAbilities || 0);
      }
      case 'mine_layers':
        return Math.max(currentSave.mine?.completedLayers || 0, stats.mineLayers || 0);
      case 'mine_treasures':
        return Math.max(currentSave.mine?.completedLayers || 0, stats.mineTreasures || 0);
      case 'mine_fossils': {
        let count = 0;
        if (currentSave.inventory) {
          for (const item of FOSSIL_ITEMS) count += currentSave.inventory.count(item);
        }
        return Math.max(count, stats.mineFossils || 0);
      }
      case 'mine_evo_items': {
        let count = 0;
        if (currentSave.inventory) {
          for (const item of EVO_STONES) count += currentSave.inventory.count(item);
        }
        return Math.max(count, stats.mineEvoItems || 0);
      }
      case 'mine_layers_100':
        return stats.mineLayers100 || 0;
      case 'money_earned':
        return Math.max(Number(currentSave.currencies?.get?.('money') || currentSave.player?.money || 0), stats.moneyEarned || 0);
      case 'money_spent':
        return stats.moneySpent || 0;
      case 'distinct_items':
        return currentSave.inventory ? currentSave.inventory.entries().length : 0;
      case 'max_level_staff': {
        const levels = Object.values(currentSave.staff?.levels || {});
        const maxLevel = levels.length > 0 ? Math.max(...levels) : 1;
        return Math.max(maxLevel, stats.maxLevelStaff || 0);
      }
      case 'atoll_streak':
        return stats.atollStreak || 0;
      case 'atoll_room_wins':
        return stats.atollRoomWins || 0;
      case 'atoll_bosses':
        return stats.atollBosses || 0;
      case 'atoll_tokens_spent':
        return stats.atollTokensSpent || 0;
      case 'atoll_flawless_boss':
        return stats.atollFlawlessBoss || 0;
      case 'base_flags':
        return Math.max(currentSave.secretBase?.flags?.count || 0, stats.baseFlags || 0);
      case 'base_decos':
        return Math.max(currentSave.secretBase?.decorations?.length || 0, stats.baseDecosPlaced || 0);
      case 'base_visitors':
        return Math.max(currentSave.secretBase?.record?.visits || 0, stats.baseVisitors || 0);
      case 'first_step':
        return pokedex && pokedex.getCaughtCount() > 0 ? 1 : 0;
      case 'magikarp_loyal':
        return stats.magikarpBattles || 0;
      case 'pepite_collector':
        return Math.max((stats.nuggetsSold || 0) + (currentSave.inventory?.count?.('nugget') || 0));
      case 'all_nighter':
        return Math.max(currentSave.player?.playTimeSeconds || 0, stats.allNighter || 0);
      case 'back_to_roots':
        return currentSave.player?.location === 'pallet-town' && (currentSave.player?.badges?.length || 0) >= 8 ? 1 : 0;
      case 'pc_full':
        return currentSave.collection?.getAll?.()?.length || 0;
      case 'zero_waste':
        return stats.totalDupesProduced || 0;
      case 'true_boss':
        return stats.atollUnevolvedBoss || 0;
      case 'forms_obtained':
        return stats.formsObtained || 0;
      default:
        if (ach.metric.startsWith('type_wins_')) {
          return stats[ach.metric] || 0;
        }
        return stats[ach.metric] || 0;
    }
  }

  /**
   * Returns current progress details for an achievement.
   * @param {Object|string} achOrId
   * @param {Object} [save]
   * @returns {{ach: Object|null, metricValue: number, currentTier: number, nextTier: number, nextTarget: number, progressPct: number, isCompleted: boolean}}
   */
  getProgress(achOrId, save = null) {
    const currentSave = save || SaveSystem.getInstance().getCurrentSave();
    const ach = typeof achOrId === 'string' ? AchievementDB.getInstance().getById(achOrId) : achOrId;
    if (!ach || !currentSave) {
      return {
        ach: null,
        metricValue: 0,
        currentTier: -1,
        nextTier: 0,
        nextTarget: 0,
        progressPct: 0,
        isCompleted: false
      };
    }

    const metricValue = this.getMetricValue(ach, currentSave);
    const unlocked = currentSave.achievements?.getUnlockedTier(ach.id);
    let currentTier = typeof unlocked === 'number' && unlocked >= 0 ? unlocked : -1;

    for (let i = 0; i < ach.tiers.length; i++) {
      if (metricValue >= ach.tiers[i] && i > currentTier) {
        currentTier = i;
      }
    }

    const isCompleted = currentTier >= ach.tiers.length - 1;
    const nextTier = isCompleted ? ach.tiers.length - 1 : currentTier + 1;
    const nextTarget = ach.tiers[nextTier];
    const previousTarget = currentTier >= 0 ? ach.tiers[currentTier] : 0;

    let progressPct = 0;
    if (isCompleted) {
      progressPct = 100;
    } else if (nextTarget > previousTarget) {
      progressPct = Math.max(0, Math.min(100, Math.round(((metricValue - previousTarget) / (nextTarget - previousTarget)) * 100)));
    }

    return {
      ach,
      metricValue,
      currentTier,
      nextTier,
      nextTarget,
      progressPct,
      isCompleted
    };
  }

  /**
   * Checks all achievements against metrics and unlocks tiers.
   * @param {{notify?: boolean, deferSave?: boolean}} [options]
   * @returns {Array<{ach: Object, tier: number}>}
   */
  checkAll({ notify = false, deferSave = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.achievements) return [];

    const db = AchievementDB.getInstance();
    const newlyUnlocked = [];

    for (const ach of db.getAll()) {
      const metricValue = this.getMetricValue(ach, save);
      const prevTier = save.achievements.getUnlockedTier(ach.id);

      let highestTier = prevTier;
      for (let i = 0; i < ach.tiers.length; i++) {
        if (metricValue >= ach.tiers[i]) {
          highestTier = i;
        }
      }

      if (highestTier > prevTier) {
        for (let tIdx = prevTier + 1; tIdx <= highestTier; tIdx++) {
          save.achievements.setUnlockedTier(ach.id, tIdx);
          const bonusLabel = db.getLocalizedBonusLabel(ach, tIdx);
          EventBus.getInstance().dispatch(new AchievementUnlockedEvent(ach, tIdx, bonusLabel, { deferSave }));
          newlyUnlocked.push({ ach, tier: tIdx });

          if (notify) {
            const name = db.getLocalizedName(ach);
            const msg = t('notif_achievement_unlocked', {
              name,
              tier: tIdx + 1,
              bonus: bonusLabel
            });
            NotificationSystem.getInstance().notifyTemporary(msg, {
              channel: NotificationChannels.ACHIEVEMENT,
              tone: NotificationTones.WARNING
            });
          }
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Records a metric stat and checks achievements.
   * @param {string} key
   * @param {number} [amount=1]
   * @param {{notify?: boolean}} [options]
   * @returns {number}
   */
  recordStat(key, amount = 1, { notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.achievements) return 0;
    const value = save.achievements.incrementStat(key, amount);
    this.checkAll({ notify });
    return value;
  }

  /**
   * Returns whether an achievement is pinned.
   * @param {string} achId
   * @param {Object} [save]
   * @returns {boolean}
   */
  isPinned(achId, save = null) {
    const currentSave = save || SaveSystem.getInstance().getCurrentSave();
    return Boolean(currentSave?.achievements?.isPinned(achId));
  }

  /**
   * Returns all pinned achievements.
   * @param {Object} [save]
   * @returns {Object[]}
   */
  getPinnedList(save = null) {
    const currentSave = save || SaveSystem.getInstance().getCurrentSave();
    const db = AchievementDB.getInstance();
    const list = currentSave?.achievements?.getPinnedList() || [];
    return list.map(id => db.getById(id)).filter(Boolean);
  }

  /**
   * Returns the pinned achievement definition.
   * @param {Object} [save]
   * @returns {Object}
   */
  getPinned(save = null) {
    const currentSave = save || SaveSystem.getInstance().getCurrentSave();
    const db = AchievementDB.getInstance();
    const pinnedId = currentSave?.achievements?.getPinnedId() || 'dex_kanto';
    return db.getById(pinnedId) || db.getById('dex_kanto') || db.getAll()[0];
  }

  /**
   * Sets the pinned achievement.
   * @param {string} achId
   * @param {{notify?: boolean}} [options]
   */
  setPinned(achId, { notify = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.achievements) return;
    save.achievements.setPinnedId(achId);
    EventBus.getInstance().dispatch(new AchievementPinnedEvent(achId, true));
    if (notify) {
      const ach = AchievementDB.getInstance().getById(achId);
      const name = ach ? AchievementDB.getInstance().getLocalizedName(ach) : achId;
      NotificationSystem.getInstance().notifyTemporary(
        t('notif_achievement_pinned', { name }),
        { channel: NotificationChannels.ACHIEVEMENT }
      );
    }
  }

  /**
   * Toggles the pinned status of an achievement.
   * @param {string} achId
   * @param {{notify?: boolean}} [options]
   * @returns {boolean}
   */
  togglePinned(achId, { notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.achievements) return false;
    const isNowPinned = save.achievements.togglePin(achId);
    EventBus.getInstance().dispatch(new AchievementPinnedEvent(achId, isNowPinned));
    if (notify) {
      const ach = AchievementDB.getInstance().getById(achId);
      const name = ach ? AchievementDB.getInstance().getLocalizedName(ach) : achId;
      NotificationSystem.getInstance().notifyTemporary(
        isNowPinned ? t('notif_achievement_pinned', { name }) : t('notif_achievement_unpinned', { name }),
        { channel: NotificationChannels.ACHIEVEMENT }
      );
    }
    return isNowPinned;
  }

  /**
   * Returns a progress summary across all achievements.
   * @param {Object} [save]
   * @returns {{totalTiers: number, maxTiers: number, completedCount: number, progressPct: number}}
   */
  getSummary(save = null) {
    const currentSave = save || SaveSystem.getInstance().getCurrentSave();
    const db = AchievementDB.getInstance();
    const maxTiers = db.countTotalTiers();
    if (!currentSave?.achievements) {
      return { totalTiers: 0, maxTiers, completedCount: 0, progressPct: 0 };
    }

    let totalTiers = 0;
    let completedCount = 0;

    for (const ach of db.getAll()) {
      const tier = currentSave.achievements.getUnlockedTier(ach.id);
      if (tier >= 0) {
        totalTiers += tier + 1;
        if (tier >= ach.tiers.length - 1) {
          completedCount++;
        }
      }
    }

    const progressPct = maxTiers > 0 ? Math.round((totalTiers / maxTiers) * 100) : 0;
    return { totalTiers, maxTiers, completedCount, progressPct };
  }

  /** @override */
  onDestroy() {
    for (const unsubscribe of this._unsubscribers) {
      if (typeof unsubscribe === 'function') unsubscribe();
    }
    this._unsubscribers = [];
    super.onDestroy();
  }
}
