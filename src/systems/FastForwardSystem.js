/**
 * @file FastForwardSystem.js
 * @brief Deterministic post-AFK fast-forward battle simulation engine.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { EncounterRules } from './battle/EncounterRules.js';
import { RouteDropRules } from './battle/RouteDropRules.js';
import { RewardRules } from './battle/RewardRules.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { BonusTypes } from '../config/BonusRules.js';
import { BonusSystem } from './BonusSystem.js';
import { EventBus } from '../core/EventBus.js';
import { Random } from '../core/Random.js';
import { FastForwardCompletedEvent } from '../core/events/FastForwardCompletedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';

export class FastForwardSystem extends BaseSystem {
  /** @private @type {FastForwardSystem|null} */
  static _instance = null;

  /** @returns {FastForwardSystem} */
  static getInstance() {
    if (!FastForwardSystem._instance) FastForwardSystem._instance = new FastForwardSystem();
    return FastForwardSystem._instance;
  }

  constructor() {
    super('FastForwardSystem', 'System');
  }

  /**
   * Triggers deterministic catch-up calculation and opens the AFK report modal.
   * @param {number} elapsedMs
   */
  triggerCatchUp(elapsedMs) {
    const summary = this.simulateOffline(elapsedMs);
    if (summary && summary.battlesSimulated > 0) {
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.AFK_SUMMARY, { summary }));
    }
  }

  /**
   * Simulates offline progress from wall-clock milliseconds using the active save.
   * @param {number} elapsedMs
   * @returns {Object|null}
   */
  simulateOffline(elapsedMs) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return null;
    let locationId = save.player?.location || 'route1';
    let encounters = LocationDB.getInstance().getEncounters(locationId);
    if (!encounters || encounters.length === 0) {
      locationId = 'route1';
      encounters = LocationDB.getInstance().getEncounters(locationId);
    }
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    if (elapsedSeconds < 2) return null;

    const result = this.simulate({
      save,
      locationId,
      elapsedSeconds,
      deferSave: false
    });

    const itemCounts = {};
    for (const itemId of result.items) {
      itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
    }
    const itemsDropped = Object.entries(itemCounts).map(([itemId, quantity]) => ({ itemId, quantity }));

    return {
      durationMs: elapsedMs,
      battlesSimulated: result.battles,
      wins: result.wins,
      currencyEarned: result.moneyGained,
      itemsDropped,
      daycareKoAdvanced: result.battles,
      stoppedByFatigue: result.stoppedByFatigue,
      stoppedByDefeat: result.stoppedByDefeat,
      fatigueWearApplied: result.stoppedByFatigue ? 1 : 0
    };
  }

  /**
   * Simulates offline / fast-forward progress deterministically.
   * @param {Object} options
   * @param {import('../data/save/SaveData.js').SaveData} options.save
   * @param {string} options.locationId
   * @param {number} options.elapsedSeconds
   * @param {Random} [options.random=Random.default]
   * @param {boolean} [options.deferSave=false]
   * @returns {Object} Simulation summary
   */
  simulate({ save, locationId, elapsedSeconds, random = Random.default, deferSave = false }) {
    const summary = {
      battles: 0,
      wins: 0,
      moneyGained: 0,
      catches: [],
      items: [],
      stoppedByFatigue: false,
      stoppedByDefeat: false
    };

    if (!save || !locationId || elapsedSeconds <= 0) return summary;
    const encounters = LocationDB.getInstance().getEncounters(locationId);
    if (!encounters || encounters.length === 0) return summary;

    const livingMembers = save.team.filter((p) => !p.isFainted());
    if (livingMembers.length === 0) {
      summary.stoppedByDefeat = true;
      return summary;
    }

    // Battle duration estimate: 2.5s base
    const battleSeconds = 2.5;
    const maxBattles = Math.min(500, Math.floor(elapsedSeconds / battleSeconds));

    for (let i = 0; i < maxBattles; i++) {
      summary.battles++;

      // Fatigue check after 50 consecutive battles
      if (summary.battles > 50) {
        const fatigueStep = Math.min(10, Math.floor((summary.battles - 50) / 10));
        if (fatigueStep > 0) {
          let anyAlive = false;
          for (const member of save.team) {
            if (!member.isFainted()) {
              const hasStamina = member.talent === 'stamina' || (save.talents?.hasHidden && save.talents.hasHidden(member.species));
              const fatigueDiv = hasStamina ? 2 : 1;
              const wearDamage = Math.max(1, Math.round((member.getMaxHp() * 0.01 * fatigueStep) / fatigueDiv));
              member.hp = Math.max(1, member.hp - wearDamage);
              if (member.hp > 1) anyAlive = true;
            }
          }
          if (!anyAlive) {
            summary.stoppedByFatigue = true;
            break;
          }
        }
      }

      // Draw wild Pokémon
      const foe = EncounterRules.drawWild(encounters, save.team, random);
      if (!foe) break;

      summary.wins++;
      save.statistics.recordWildWin(locationId);
      save.pokedex.markSeen(foe.species, { deferSave: true });

      // Reward currency
      const baseMoney = RewardRules.wildMoney(LocationDB.getInstance().getById(locationId));
      const money = BonusSystem.getInstance().applyMultiplier(baseMoney, BonusTypes.MONEY);
      save.currencies.add(BonusTypes.MONEY, money);
      summary.moneyGained += money;

      // Route drop
      const itemId = RouteDropRules.draw(locationId, random, save.team, BonusSystem.getInstance().getTotal(BonusTypes.ROUTE_LOOT));
      if (itemId) {
        save.inventory.add(itemId, 1, { deferSave: true });
        summary.items.push(itemId);
      }

      // Daycare progress
      if (save.hatchery?.slots) {
        for (const slot of save.hatchery.slots) {
          if (slot?.kind === HatcheryRules.MODE_DAYCARE) {
            slot.knockouts = (slot.knockouts || 0) + 1;
            if (slot.knockouts >= HatcheryRules.DAYCARE_KOS_PER_LEVEL) {
              slot.knockouts = 0;
              const housed = save.collection.get(slot.pokemonUid);
              if (housed) {
                housed.setLevel(housed.level + 1);
                const evolved = housed.checkLevelEvolution();
                if (evolved) {
                  save.pokedex.markCaught(evolved, housed.shiny, { deferSave: true });
                }
              }
            }
          }
        }
      }
    }

    if (!deferSave) SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new FastForwardCompletedEvent(summary));
    return summary;
  }
}
