/**
 * @file AtollSystem.js
 * @brief Battle Atoll system: 12-hour dated rotations, team validation, factory runs, shop, and legend fragments.
 */

import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { BonusSystem } from './BonusSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { BonusTypes } from '../config/BonusRules.js';
import { ModalIds } from '../config/ModalIds.js';
import { ModalCloseRequestedEvent } from '../core/events/ModalCloseRequestedEvent.js';
import { PokemonRankRules } from './box/PokemonRankRules.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { PokemonData } from '../data/pokemon/PokemonData.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import {
  ATOLL_MODES,
  ATOLL_SHOP,
  LEGEND_FRAGMENT_COST,
  FRAGMENT_LEGENDARY_LEVEL,
  FRAGMENT_LEGENDARIES_BY_REGION,
  getRotationWindow,
  getRotationTimeLeftMs,
  formatRotationCountdown,
  getAtollCycleInfo,
  getAtollBannedLegendaries,
  getAtollSpeciesList,
  getAtollRotationTeams,
  buildAtollTeam
} from '../data/atoll/AtollDB.js';
import { AtollBattleContext } from './atoll/AtollBattleContext.js';
import { AtollStateChangedEvent } from '../core/events/AtollStateChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class AtollSystem extends BaseSystem {
  /** @private @type {AtollSystem|null} */
  static _instance = null;

  /** @returns {AtollSystem} */
  static getInstance() {
    if (!AtollSystem._instance) AtollSystem._instance = new AtollSystem();
    return AtollSystem._instance;
  }

  constructor() {
    super('AtollSystem', 'System');
  }

  /**
   * Whether the player has beaten the Kanto League to access the Atoll.
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {boolean}
   */
  isUnlocked(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return false;
    return !!(s.statistics.hasWonLeague('kanto') || s.player.hasChampionTitle?.());
  }

  /**
   * Retrieves current Atoll state.
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {import('../data/save/AtollData.js').AtollData|null}
   */
  getState(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    return s?.atoll || null;
  }

  getMode(key) {
    return ATOLL_MODES[key] || null;
  }

  // --- Rotation & Determinism Helpers ---

  getRotationWindow(now = Date.now()) {
    return getRotationWindow(now);
  }

  getTimeUntilRotation(now = Date.now()) {
    return getRotationTimeLeftMs(now);
  }

  formatCountdown(ms) {
    return formatRotationCountdown(ms);
  }

  getCycleInfo(windowOpt = null) {
    return getAtollCycleInfo(windowOpt);
  }

  getBannedLegendaries(modeKey, windowOpt = null) {
    return getAtollBannedLegendaries(modeKey, windowOpt);
  }

  getSpeciesList(modeKey, windowOpt = null, kind = 'enemy') {
    return getAtollSpeciesList(modeKey, windowOpt, kind);
  }

  getRotationTeams(modeKey, windowOpt = null, kind = 'enemy') {
    return getAtollRotationTeams(modeKey, windowOpt, kind);
  }

  // --- Team Validation ---

  /**
   * Validates party eligibility against the format rules and current rotation bans.
   * @param {string} modeKey
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {{valid: boolean, reasonKey?: string, params?: Object}}
   */
  validateTeam(modeKey, save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return { valid: false, reasonKey: 'no_pokemon_in_team' };

    const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
    if (mode.borrowed) return { valid: true };

    const playerTeam = s.team || [];
    if (!playerTeam.length) return { valid: false, reasonKey: 'no_pokemon_in_team' };

    // 1. Rotating legendary bans
    const banned = getAtollBannedLegendaries(mode.key);
    if (banned.length) {
      const viol = playerTeam.filter((p) => p && banned.includes(p.getSpecies()?.dex));
      if (viol.length) {
        return {
          valid: false,
          reasonKey: 'atoll_banned_blocked',
          params: { pokemon: viol.slice(0, 3).map((p) => p.getDisplayName()).join(', ') }
        };
      }
    }

    // 2. Rank cap
    if (mode.maxRank) {
      const activeRestricted = mode.playerCap ? playerTeam.slice(0, mode.playerCap) : playerTeam;
      const maxRankVal = PokemonRankRules.rankValue(mode.maxRank);
      const invalid = activeRestricted.filter((p) => PokemonRankRules.rankValue(PokemonRankRules.getRank(p)) > maxRankVal);
      if (invalid.length) {
        return {
          valid: false,
          reasonKey: 'atoll_rank_blocked',
          params: { rank: mode.maxRank, pokemon: invalid.slice(0, 3).map((p) => p.getDisplayName()).join(', ') }
        };
      }
    }

    return { valid: true };
  }

  // --- Factory Run Lifecycle ---

  /**
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {Object|null}
   */
  getFactoryRun(save = null) {
    const st = this.getState(save);
    return st?.factoryRun || null;
  }

  /**
   * Starts a new rental run with the current rotation's rental roster.
   * @param {string} [modeKey='factory_c']
   * @param {number|null} [windowOpt=null]
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {Object}
   */
  createFactoryRun(modeKey = 'factory_c', windowOpt = null, save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    const w = windowOpt != null ? windowOpt : getRotationWindow();
    const rentalTeam = buildAtollTeam(modeKey, w, 'rental');
    const serializedTeam = rentalTeam.map((p) => p.serialize());

    const run = { modeKey, seedWindow: w, streak: 0, team: serializedTeam };
    if (s?.atoll) {
      s.atoll.setFactoryRun(run);
      SaveSystem.getInstance().saveCurrent();
      EventBus.getInstance().dispatch(new AtollStateChangedEvent());
      return s.atoll.factoryRun;
    }
    return run;
  }

  /**
   * Abandons active rental run.
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   */
  abandonFactoryRun(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (s?.atoll) {
      s.atoll.clearFactoryRun();
      SaveSystem.getInstance().saveCurrent();
      NotificationSystem.getInstance().notify(t('atoll_factory_run_ended'), { tone: NotificationTones.DANGER });
      EventBus.getInstance().dispatch(new AtollStateChangedEvent());
    }
  }

  /**
   * Swaps Pokémon positions in active rental team.
   * @param {number} fromIndex
   * @param {number} toIndex
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   */
  swapFactoryPokemon(fromIndex, toIndex, save = null) {
    const run = this.getFactoryRun(save);
    if (!run || !Array.isArray(run.team)) return;
    const from = Math.max(0, Math.floor(fromIndex));
    const to = Math.max(0, Math.floor(toIndex));
    if (from >= run.team.length || to >= run.team.length || from === to) return;

    const tmp = run.team[from];
    run.team[from] = run.team[to];
    run.team[to] = tmp;

    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new AtollStateChangedEvent());
  }

  /**
   * Swaps move positions for a rental Pokémon.
   * @param {number} pokeIndex
   * @param {number} fromMoveIndex
   * @param {number} toMoveIndex
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   */
  swapFactoryMoves(pokeIndex, fromMoveIndex, toMoveIndex, save = null) {
    const run = this.getFactoryRun(save);
    if (!run || !Array.isArray(run.team) || !run.team[pokeIndex]) return;
    const p = run.team[pokeIndex];
    if (!Array.isArray(p.moves)) return;

    const from = Math.max(0, Math.floor(fromMoveIndex));
    const to = Math.max(0, Math.floor(toMoveIndex));
    if (from >= p.moves.length || to >= p.moves.length || from === to) return;

    const tmp = p.moves[from];
    p.moves[from] = p.moves[to];
    p.moves[to] = tmp;

    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new AtollStateChangedEvent());
  }

  // --- Shop Management ---

  /**
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {Array<{key: string, name: string, basePrice: number, price: number, affordable: boolean}>}
   */
  getShopOffers(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    const tokens = s?.atoll?.tokens || 0;
    const discountPct = BonusSystem.getInstance().getTotal(BonusTypes.ATOLL_DISCOUNT);
    const itemDb = ItemDB.getInstance();

    return ATOLL_SHOP.map(([key, basePrice]) => {
      const price = discountPct > 0 ? Math.max(1, Math.round(basePrice * (1 - discountPct / 100))) : basePrice;
      const affordable = tokens >= price;
      const item = itemDb.getById(key);
      const name = item ? t(`item.${item.id}.name`) : key;
      return { key, name, basePrice, price, affordable };
    });
  }

  /**
   * Purchases an item with Atoll tokens.
   * @param {string} itemKey
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {boolean}
   */
  buyItem(itemKey, save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return false;

    const offer = this.getShopOffers(s).find((o) => o.key === itemKey);
    if (!offer) return false;

    if (s.atoll.tokens < offer.price) {
      NotificationSystem.getInstance().notify(t('atoll_not_enough_tokens'), { tone: NotificationTones.DANGER });
      return false;
    }

    s.atoll.spendTokens(offer.price);
    s.inventory.add(offer.key, 1);
    s.achievements.incrementStat('atoll_tokens_spent', offer.price);

    NotificationSystem.getInstance().notify(
      t('atoll_item_bought', { item: offer.name }),
      { tone: NotificationTones.SUCCESS }
    );

    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new AtollStateChangedEvent());
    return true;
  }

  // --- Legend Fragments ---

  /**
   * Adds legend fragments to the save, applying achievement bonuses.
   * @param {number} n
   * @param {string} [reason='']
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {number}
   */
  gainFragments(n, reason = '', save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return 0;
    const base = Math.max(0, Math.floor(Number(n) || 0));
    if (!base) return 0;

    const multiplied = BonusSystem.getInstance().applyMultiplier(base, BonusTypes.ATOLL_FRAGMENTS) || base;
    s.atoll.addFragments(multiplied);

    if (reason === 'atoll_boss') {
      s.achievements.incrementStat('atoll_bosses', 1);
    }

    NotificationSystem.getInstance().notify(
      t('legend_fragments_gained', { n: multiplied, total: s.atoll.fragments, cost: LEGEND_FRAGMENT_COST }),
      { tone: NotificationTones.SUCCESS }
    );

    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new AtollStateChangedEvent());
    return multiplied;
  }

  /**
   * Resolves summonable legendary pokedex IDs based on unlocked regions.
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {number[]}
   */
  getFragmentLegendaryChoices(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    const unlockedRegions = ['kanto'];
    if (s?.statistics.hasWonLeague('kanto')) unlockedRegions.push('johto');
    if (s?.statistics.hasWonLeague('johto')) unlockedRegions.push('hoenn');

    const out = [];
    for (const r of unlockedRegions) {
      for (const id of FRAGMENT_LEGENDARIES_BY_REGION[r] || []) out.push(id);
    }
    return out;
  }

  canSummon(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    return !!(s && !s.atoll.pendingFragmentLegendary && s.atoll.fragments >= LEGEND_FRAGMENT_COST);
  }

  /**
   * Spends 50 fragments to summon a legendary, setting it pending and initiating encounter.
   * @param {number} dexId
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {boolean}
   */
  summon(dexId, save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return false;

    const id = Number(dexId);
    if (!s.atoll.pendingFragmentLegendary) {
      const choices = this.getFragmentLegendaryChoices(s);
      if (!choices.includes(id)) {
        NotificationSystem.getInstance().notify(t('legend_fragment_not_available'), { tone: NotificationTones.DANGER });
        return false;
      }
      if (s.atoll.fragments < LEGEND_FRAGMENT_COST) {
        NotificationSystem.getInstance().notify(
          t('legend_fragment_missing', { n: LEGEND_FRAGMENT_COST - s.atoll.fragments, cost: LEGEND_FRAGMENT_COST }),
          { tone: NotificationTones.DANGER }
        );
        return false;
      }
      s.atoll.spendFragments(LEGEND_FRAGMENT_COST);
      s.atoll.pendingFragmentLegendary = id;
      SaveSystem.getInstance().saveCurrent();
      EventBus.getInstance().dispatch(new AtollStateChangedEvent());
    }

    return this.startFragmentLegendaryBattle(save);
  }

  /**
   * Launches or restarts battle encounter for pending fragment legendary.
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {boolean}
   */
  startFragmentLegendaryBattle(save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    const id = Number(s?.atoll?.pendingFragmentLegendary || 0);
    if (!id) return false;

    const battle = BattleSystem.getInstance();
    if (battle.isActive()) {
      NotificationSystem.getInstance().notify(t('battle_in_progress'), { tone: NotificationTones.DANGER });
      return false;
    }

    EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(ModalIds.ATOLL));

    const species = PokemonDB.getInstance().getByDex(id);
    if (!species) return false;

    const foe = PokemonFactory.create(species.id, FRAGMENT_LEGENDARY_LEVEL, { shiny: false });
    if (!foe) return false;

    // Start special duel with catch multiplier x2
    const context = {
      modeKey: 'fragment_legendary',
      foes: [{ pokemon: foe }],
      openingLines: [{ key: 'battle_log.quest_encounter', params: { name: foe.getDisplayName() } }],
      onBattleEnd: (victory, session) => {
        if (victory && session?.foe?.isFainted?.()) {
          // If caught, complete summoning
          if (s.pokedex?.isCaught(species.id)) {
            this.completeFragmentLegendary(id, s);
          }
        }
      }
    };

    return battle.startAtollBattle(context);
  }

  /**
   * Finalizes completed summoning when legendary is caught.
   * @param {number} dexId
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   */
  completeFragmentLegendary(dexId, save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return;
    s.atoll.pendingFragmentLegendary = 0;
    const species = PokemonDB.getInstance().getByDex(dexId);
    const name = species ? t(species.getNameKey()) : `#${dexId}`;
    NotificationSystem.getInstance().notify(t('legend_fragment_caught', { pokemon: name }), { tone: NotificationTones.SUCCESS });
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new AtollStateChangedEvent());
  }

  // --- Battle Dispatcher ---

  /**
   * Starts an Atoll battle challenge for the given mode key.
   * @param {string} modeKey
   * @param {import('../data/save/SaveData.js').SaveData} [save]
   * @returns {boolean}
   */
  startBattle(modeKey = 'tower_c', save = null) {
    const s = save || SaveSystem.getInstance().getCurrentSave();
    if (!s) return false;

    if (!this.isUnlocked(s)) {
      NotificationSystem.getInstance().notify(t('atoll_locked'), { tone: NotificationTones.DANGER });
      return false;
    }

    if (TrainingSystem.getInstance().isActive()) {
      NotificationSystem.getInstance().notify(t('training_in_progress_no_battle'), { tone: NotificationTones.DANGER });
      return false;
    }

    const battle = BattleSystem.getInstance();
    if (battle.isActive()) {
      NotificationSystem.getInstance().notify(t('battle_in_progress'), { tone: NotificationTones.DANGER });
      return false;
    }

    const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
    const validation = this.validateTeam(modeKey, s);
    if (!validation.valid) {
      const msg = validation.params ? t(validation.reasonKey, validation.params) : t(validation.reasonKey);
      NotificationSystem.getInstance().notify(msg, { tone: NotificationTones.DANGER });
      return false;
    }

    const currentWindow = getRotationWindow();
    let enemyWindow = currentWindow;
    let playerTeam = null;

    if (mode.borrowed) {
      let run = this.getFactoryRun(s);
      if (run && run.modeKey !== modeKey) {
        NotificationSystem.getInstance().notify(
          t('atoll_factory_wrong_mode', { mode: t((ATOLL_MODES[run.modeKey] || {}).label || '') }),
          { tone: NotificationTones.DANGER }
        );
        return false;
      }
      if (!run) {
        run = this.createFactoryRun(modeKey, currentWindow, s);
      }
      if (!run || !Array.isArray(run.team) || !run.team.length) {
        NotificationSystem.getInstance().notify(t('atoll_factory_broken'), { tone: NotificationTones.DANGER });
        return false;
      }

      // Rehydrate rental team
      const rentalTag = t('atoll_rental') + ' ';
      playerTeam = run.team.map((entry) => {
        const p = new PokemonData(entry);
        p.nickname = rentalTag + p.getDisplayName();
        p.hp = p.getMaxHp();
        return p;
      });

      // Opponent climbs the rotation table: w + streak
      enemyWindow = currentWindow + (run.streak || 0);
    } else {
      playerTeam = (s.team || []).map((p) => new PokemonData(p.serialize()));
      if (mode.playerCap && playerTeam.length > mode.playerCap) {
        playerTeam = playerTeam.slice(0, mode.playerCap);
      }
      if (mode.noItems) {
        for (const p of playerTeam) p.heldItem = null;
      }
    }

    const foeTeam = buildAtollTeam(mode.key, enemyWindow, 'enemy');
    const foes = foeTeam.map((pokemon) => ({ pokemon, trainerId: 'atoll' }));

    const context = new AtollBattleContext({
      modeKey: mode.key,
      foes
    });
    context.playerTeam = playerTeam;

    EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(ModalIds.ATOLL));
    return battle.startAtollBattle(context);
  }
}
