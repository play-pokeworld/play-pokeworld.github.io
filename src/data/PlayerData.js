/**
 * @file PlayerData.js
 * @brief Trainer profile model (C++ equivalent: class PlayerData : public BaseModel).
 * Money lives in CurrenciesData (single source of truth).
 * Stores identifiers only (location id, portrait file stem): display text is resolved by the views.
 */

import { BaseModel } from './BaseModel.js';
import { EventBus } from '../core/EventBus.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { LocationDB } from './LocationDB.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';

export class PlayerData extends BaseModel {
  /**
   * @param {Object} [initialData={}]
   */
  constructor(initialData = {}) {
    super('PlayerData', 'Data');
    this.deserialize(initialData);
  }

  /** Unlocks the next gym badge */
  unlockBadge() {
    if (this.badges < this.totalBadges) {
      this.badges++;
      EventBus.getInstance().dispatch(new BadgesChangedEvent(this.badges, this.totalBadges));
    }
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      trainerName: this.trainerName,
      trainerSprite: this.trainerSprite,
      badges: this.badges,
      totalBadges: this.totalBadges,
      region: this.region,
      location: this.location,
      caughtCount: this.caughtCount,
      playTimeSeconds: this.playTimeSeconds
    };
  }

  /**
   * Accepts the current format and the fields written by older builds
   * (trainerAvatar / profileIcon file names, translated location names).
   * @override
   * @param {Object} data
   */
  deserialize(data = {}) {
    const raw = data || {};
    this.trainerName = raw.trainerName || PlayerDefaults.TRAINER_NAME;
    this.trainerSprite = PlayerData.normalizeSprite(raw.trainerSprite || raw.profileIcon || raw.trainerAvatar);
    this.badges = raw.badges ?? 0;
    this.totalBadges = raw.totalBadges ?? PlayerDefaults.TOTAL_BADGES;
    this.region = raw.region || PlayerDefaults.REGION;
    this.location = PlayerData.normalizeLocation(raw.location);
    this.caughtCount = raw.caughtCount ?? 1;
    this.playTimeSeconds = raw.playTimeSeconds ?? 0;
  }

  /**
   * Turns a legacy file name ('trainer-0.png', 'npcs/Youngster.png') into a portrait file stem.
   * @param {string} value
   * @returns {string}
   */
  static normalizeSprite(value) {
    if (!value) return PlayerDefaults.TRAINER_SPRITE;
    return String(value).replace(/^.*\//, '').replace(/\.png$/i, '') || PlayerDefaults.TRAINER_SPRITE;
  }

  /**
   * Keeps known LocationDB ids, maps anything else (old translated names) to the start town.
   * @param {string} value
   * @returns {string}
   */
  static normalizeLocation(value) {
    return value && LocationDB.getInstance().getById(value) ? value : PlayerDefaults.LOCATION_ID;
  }
}
