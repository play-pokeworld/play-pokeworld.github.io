/**
 * @file TeamAmbushSystem.js
 * @brief Manages hostile team ambushes on map nodes, initiating combat upon arrival
 * and enforcing retreat to previous location on defeat.
 */

import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { TrainerSystem } from './TrainerSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { TeamAmbushChangedEvent } from '../core/events/TeamAmbushChangedEvent.js';
import { TeamAmbushRules } from '../config/TeamAmbushRules.js';
import { BadgeRules } from './trainers/BadgeRules.js';
import { t } from '../localization/LocalizationManager.js';

export class TeamAmbushSystem extends BaseSystem {
  /** @type {TeamAmbushSystem|null} */
  static _instance = null;

  /** @returns {TeamAmbushSystem} */
  static getInstance() {
    if (!TeamAmbushSystem._instance) {
      TeamAmbushSystem._instance = new TeamAmbushSystem();
    }
    return TeamAmbushSystem._instance;
  }

  constructor() {
    super('TeamAmbushSystem', 'System');
    /** @private @type {{destinationId: string, previousLocationId: string, trainerId: string}|null} */
    this._pendingAmbush = null;
    /** @private @type {Function|null} */
    this._unsubBattle = null;
  }

  init() {
    if (this._unsubBattle) {
      this._unsubBattle();
      this._unsubBattle = null;
    }

    this._unsubBattle = EventBus.getInstance().subscribe(BattleEndedEvent, (event) => {
      this._onBattleEnded(event);
    });
  }

  onDestroy() {
    if (this._unsubBattle) {
      this._unsubBattle();
      this._unsubBattle = null;
    }
    this._pendingAmbush = null;
  }

  /**
   * Returns all active ambushes for a given region.
   * @param {string} region
   * @returns {Array<Object>}
   */
  getAmbushesForRegion(region) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];

    const regionBadges = BadgeRules.regionCount(save.player, region);

    return TeamAmbushRules.AMBUSHES.filter((ambush) => {
      if (ambush.region !== region) return false;
      if (regionBadges < ambush.minBadges) return false;
      const wins = save.statistics.trainerWins[ambush.trainerId] || 0;
      return wins === 0;
    });
  }

  /**
   * Checks if a location has an active ambush.
   * @param {string} locationId
   * @returns {Object|null}
   */
  getAmbush(locationId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return null;

    const ambush = TeamAmbushRules.AMBUSHES.find((a) => a.locationId === locationId);
    if (!ambush) return null;

    const regionBadges = BadgeRules.regionCount(save.player, ambush.region);
    if (regionBadges < ambush.minBadges) return null;

    const wins = save.statistics.trainerWins[ambush.trainerId] || 0;
    return wins === 0 ? ambush : null;
  }

  /**
   * @param {string} locationId
   * @returns {boolean}
   */
  hasAmbush(locationId) {
    return !!this.getAmbush(locationId);
  }

  /**
   * Triggers the ambush when the player attempts to enter an ambushed node.
   * @param {string} destinationId
   * @param {string} previousLocationId
   * @returns {boolean} true if ambush battle started
   */
  triggerAmbush(destinationId, previousLocationId) {
    const ambush = this.getAmbush(destinationId);
    if (!ambush) return false;

    const battle = BattleSystem.getInstance();
    if (battle.isActive()) {
      battle.endBattle(false);
    }

    this._pendingAmbush = { destinationId, previousLocationId, trainerId: ambush.trainerId };

    NotificationSystem.getInstance().notifyTemporary(
      t('team_ambush_warning', { team: t(ambush.teamNameKey) }),
      { channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING }
    );

    const started = TrainerSystem.getInstance().challenge(ambush.trainerId, { locationId: destinationId });
    if (!started) {
      this._pendingAmbush = null;
      return false;
    }

    return true;
  }

  /**
   * @private
   * @param {BattleEndedEvent} event
   */
  _onBattleEnded(event) {
    if (!this._pendingAmbush) return;

    const pending = this._pendingAmbush;
    this._pendingAmbush = null;

    if (event.victory) {
      NotificationSystem.getInstance().notifyTemporary(
        t('team_ambush_victory', { location: t(`location.${pending.destinationId}`) }),
        { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.ACCENT }
      );
      LocationSystem.getInstance().travelTo(pending.destinationId);
    } else {
      NotificationSystem.getInstance().notifyTemporary(
        t('team_ambush_defeat', { location: t(`location.${pending.previousLocationId}`) }),
        { channel: NotificationChannels.BATTLE, tone: NotificationTones.DANGER }
      );
      LocationSystem.getInstance().travelTo(pending.previousLocationId);
    }

    EventBus.getInstance().dispatch(new TeamAmbushChangedEvent());
  }
}
