/**
 * @file BattleSystem.js
 * @brief Automatic wild battles (C++ equivalent: class BattleSystem : public BaseSystem).
 * startBattle() draws a wild Pokémon from the location encounter table; update(dt) then lets each
 * side attack on its own cooldown (derived from its speed, as in the original) until one side faints
 * or endBattle() is called.
 * Views follow the battle through BattleStartedEvent / BattleStateChangedEvent / BattleEndedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { PokemonData } from '../data/PokemonData.js';
import { PokemonDB } from '../data/PokemonDB.js';
import { LocationDB } from '../data/LocationDB.js';
import { BattleConfig } from '../config/BattleConfig.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { t } from '../localization/LocalizationManager.js';

/**
 * @param {number} min
 * @param {number} spread
 * @returns {number}
 */
const randomDamage = (min, spread) => min + Math.floor(Math.random() * spread);

/**
 * Speed stat of a Pokémon at its level (base stat of its species, neutral nature, no EV/IV).
 * @param {PokemonData} pokemon
 * @returns {number}
 */
const speedOf = (pokemon) => {
  const species = PokemonDB.getInstance().getBySlug(pokemon.species);
  const baseSpeed = species?.baseStats?.spe ?? 50;
  return Math.floor((2 * baseSpeed * pokemon.level) / 100) + 5;
};

/**
 * Attack cooldown of a Pokémon in seconds (original calcAttackCd).
 * @param {PokemonData} pokemon
 * @returns {number}
 */
const attackCooldownOf = (pokemon) => {
  const speed = Math.min(speedOf(pokemon), BattleConfig.ATTACK_SPEED_CAP);
  const cooldownMs = (BattleConfig.ATTACK_COOLDOWN_BASE_MS * 100) / (100 + speed);
  return Math.min(BattleConfig.ATTACK_COOLDOWN_MAX_MS, Math.max(BattleConfig.ATTACK_COOLDOWN_MIN_MS, cooldownMs)) / 1000;
};

export class BattleSystem extends BaseSystem {
  /** @private @type {BattleSystem|null} */
  static _instance = null;

  /** @returns {BattleSystem} */
  static getInstance() {
    if (!BattleSystem._instance) {
      BattleSystem._instance = new BattleSystem();
    }
    return BattleSystem._instance;
  }

  constructor() {
    super('BattleSystem', 'System');
    /** @private @type {PokemonData|null} */ this._player = null;
    /** @private @type {PokemonData|null} */ this._foe = null;
    /** @private Seconds before the next attack of the player's Pokémon. */ this._playerCooldown = 0;
    /** @private Seconds before the next attack of the wild Pokémon. */ this._foeCooldown = 0;
    /** @private @type {string[]} */ this._log = [];
  }

  // --- Queries ---

  /** @returns {boolean} */
  isActive() {
    return !!this._foe;
  }

  /** @returns {PokemonData|null} */
  getCurrentFoe() {
    return this._foe;
  }

  /** @returns {PokemonData|null} */
  getPlayerPokemon() {
    return this._player;
  }

  /** @returns {string[]} Localized battle log lines */
  getLog() {
    return [...this._log];
  }

  // --- Commands ---

  /**
   * Starts a wild battle at a location.
   * @param {string} [locationId] - Defaults to the player position
   * @returns {boolean} False when no battle can start (no team, no wild Pokémon, battle running)
   */
  startBattle(locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    if (this.isActive()) return false;
    const lead = (SaveSystem.getInstance().getCurrentSave()?.team ?? []).find((p) => !p.isFainted());
    const foe = this._drawWildPokemon(locationId);
    if (!lead || !foe) {
      NotificationSystem.getInstance().notifyTemporary(t(lead ? 'battle_no_wild_here' : 'battle_no_team'), {
        channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING
      });
      return false;
    }

    this._player = lead;
    this._foe = foe;
    this._playerCooldown = BattleConfig.START_DELAY_S + attackCooldownOf(lead);
    this._foeCooldown = BattleConfig.START_DELAY_S + attackCooldownOf(foe);
    this._log = [t('combat_wild_encounter', { name: foe.getDisplayName() })];
    NotificationSystem.getInstance().notifyTemporary(this._log[0], { channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING });
    EventBus.getInstance().dispatch(new BattleStartedEvent(lead, foe));
    return true;
  }

  /**
   * Stops the current battle.
   * @param {boolean} [victory=false]
   * @param {number} [exp=0]
   * @param {number} [money=0]
   */
  endBattle(victory = false, exp = 0, money = 0) {
    if (!this.isActive()) return;
    this._foe = null;
    this._player = null;
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new BattleEndedEvent(victory, exp, money));
  }

  /**
   * @override
   * @param {number} dt - Seconds since the last frame
   */
  update(dt) {
    if (!this.isActive()) return;
    this._playerCooldown -= dt;
    if (this._playerCooldown <= 0) {
      this._playerCooldown += attackCooldownOf(this._player);
      if (this._playerAttacks()) return;
    }
    this._foeCooldown -= dt;
    if (this._foeCooldown <= 0) {
      this._foeCooldown += attackCooldownOf(this._foe);
      this._foeAttacks();
    }
  }

  // --- Internals ---

  /**
   * @private
   * @returns {boolean} True when the battle ended (wild Pokémon fainted)
   */
  _playerAttacks() {
    const player = this._player;
    const foe = this._foe;
    const damage = randomDamage(BattleConfig.PLAYER_DAMAGE_MIN, BattleConfig.PLAYER_DAMAGE_SPREAD);
    foe.takeDamage(damage);
    this._log.push(t('combat_player_attack', { attacker: player.getDisplayName(), move: this._moveName(), damage }));
    if (foe.isFainted()) {
      this._win();
      return true;
    }
    EventBus.getInstance().dispatch(new BattleStateChangedEvent(player, foe));
    return false;
  }

  /** @private */
  _foeAttacks() {
    const player = this._player;
    const foe = this._foe;
    const damage = randomDamage(BattleConfig.FOE_DAMAGE_MIN, BattleConfig.FOE_DAMAGE_SPREAD);
    player.takeDamage(damage);
    this._log.push(t('combat_enemy_attack', { attacker: foe.getDisplayName(), move: this._moveName(), damage }));
    EventBus.getInstance().dispatch(new BattleStateChangedEvent(player, foe));

    if (player.isFainted()) {
      this._log.push(t('combat_player_fainted'));
      NotificationSystem.getInstance().notifyTemporary(t('combat_player_fainted'), { channel: NotificationChannels.BATTLE, tone: NotificationTones.DANGER });
      player.healFull();
      this.endBattle(false);
    }
  }

  /** @private @returns {string} Localized name of the move used by both sides */
  _moveName() {
    return t(`move.${BattleConfig.DEFAULT_MOVE_ID}`);
  }

  /** @private */
  _win() {
    const player = this._player;
    const foe = this._foe;
    const exp = BattleConfig.EXP_BASE + foe.level * BattleConfig.EXP_PER_LEVEL;
    const money = BattleConfig.MONEY_BASE + foe.level * BattleConfig.MONEY_PER_LEVEL;
    const save = SaveSystem.getInstance().getCurrentSave();

    EventBus.getInstance().dispatch(new BattleStateChangedEvent(player, foe));
    const leveledUp = player.addExp(exp);
    if (save) save.currencies.add('money', money);

    this._log.push(t('combat_victory', { name: foe.getDisplayName() }));
    NotificationSystem.getInstance().notifyTemporary(
      t('notif_enemy_defeated', { name: foe.getDisplayName(), exp, money }),
      { channel: NotificationChannels.BATTLE }
    );
    if (leveledUp) {
      NotificationSystem.getInstance().notifyTemporary(
        t('notif_level_up', { name: player.getDisplayName(), level: player.level }),
        { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.ACCENT }
      );
    }
    this.endBattle(true, exp, money);
  }

  /**
   * Weighted draw in the encounter table of a location.
   * @private
   * @param {string} locationId
   * @returns {PokemonData|null}
   */
  _drawWildPokemon(locationId) {
    const encounters = LocationDB.getInstance().getEncounters(locationId);
    if (encounters.length === 0) return null;

    const weightOf = (entry) => BattleConfig.RARITY_WEIGHTS[entry.rarity] ?? BattleConfig.RARITY_WEIGHTS.common;
    let roll = Math.random() * encounters.reduce((sum, entry) => sum + weightOf(entry), 0);
    const entry = encounters.find((e) => (roll -= weightOf(e)) < 0) || encounters[0];

    const species = PokemonDB.getInstance().getById(entry.speciesId);
    if (!species) return null;
    const level = entry.minLvl + Math.floor(Math.random() * (entry.maxLvl - entry.minLvl + 1));
    const maxHp = Math.floor((species.baseStats.hp * level) / BattleConfig.WILD_HP_DIVISOR) + level + BattleConfig.WILD_HP_FLAT;
    return new PokemonData({ species: species.getSlug(), level, maxHp, hp: maxHp, types: species.getTypes() });
  }
}
