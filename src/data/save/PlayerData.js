/**
 * @file PlayerData.js
 * @brief Trainer profile model (C++: class PlayerData : public BaseModel).
 * Money lives in CurrenciesData. Stores identifiers only (location id, portrait file stem,
 * badge ids): display text is resolved by the views.
 *
 * Serialized shape (save schema 3):
 *   { trainerName, trainerSprite, region, location, playTimeSeconds, badges[gym leader ids] }
 */
import { BaseModel } from '../core/BaseModel.js';
import { EventBus } from '../../core/EventBus.js';
import { BadgesChangedEvent } from '../../core/events/BadgesChangedEvent.js';
import { LocationDB } from '../world/LocationDB.js';
import { PlayerDefaults } from '../../config/PlayerDefaults.js';

export class PlayerData extends BaseModel {
  /**
   * @param {Object} [initialData={}]
   */
  constructor(initialData = {}) {
    super('PlayerData', 'Data');
    this.deserialize(initialData);
  }

  /** @returns {number} Badges owned */
  getBadgeCount() {
    return this.badges.length;
  }

  /**
   * @param {string} badgeId - Gym leader id ('brock')
   * @returns {boolean}
   */
  hasBadge(badgeId) {
    return this.badges.includes(badgeId);
  }

  /**
   * Awards a badge (no-op when already owned).
   * @param {string} badgeId - Gym leader id ('brock')
   * @returns {boolean} true when the badge is new
   */
  earnBadge(badgeId) {
    if (!badgeId || this.hasBadge(badgeId)) return false;
    this.badges.push(badgeId);
    EventBus.getInstance().dispatch(new BadgesChangedEvent(this.badges, PlayerDefaults.TOTAL_BADGES));
    return true;
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      trainerName: this.trainerName,
      trainerSprite: this.trainerSprite,
      region: this.region,
      location: this.location,
      playTimeSeconds: this.playTimeSeconds,
      badges: [...this.badges]
    };
  }

  /**
   * Reads the current shape only: older shapes are converted by data/save/migrations/.
   * @override
   * @param {Object} data
   */
  deserialize(data = {}) {
    const raw = data || {};
    this.trainerName = raw.trainerName || PlayerDefaults.TRAINER_NAME;
    this.trainerSprite = raw.trainerSprite || PlayerDefaults.TRAINER_SPRITE;
    this.region = raw.region || PlayerDefaults.REGION;
    this.location = raw.location && LocationDB.getInstance().has(raw.location) ? raw.location : PlayerDefaults.LOCATION_ID;
    this.playTimeSeconds = Math.max(0, Number(raw.playTimeSeconds) || 0);
    /** @type {string[]} */
    this.badges = Array.isArray(raw.badges) ? [...new Set(raw.badges.filter((id) => typeof id === 'string'))] : [];
  }
}
