/**
 * PokéWorld — Achievement Engine (V7 · P4a / ACH-01).
 *
 * Gère la progression, le déblocage rétroactif, les notifications et le calcul
 * des bonus permanents des 15 familles de succès (ACH-02).
 *
 * Garde-fous anti-inflation (V6 §9.3) :
 *   - ₽ global max +29 %
 *   - XP globale max +25 %
 *   - Taux de capture max +4,5 pt
 *   - Chance shiny max ×1,15
 *
 * @module application/achievements
 */

import { ACHIEVEMENTS, getAchievementDef } from '../data/achievements-data.js';

// Anti-inflation caps
const ANTI_INFLATION_CAPS = {
  money_global: 29,
  xp_global: 25,
  capture_global: 4.5,
  shiny_global: 1.15,
};

const LEGENDARY_IDS = new Set([
  144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384,
  385, 386,
]);

const ROAMER_IDS = new Set([144, 145, 146, 243, 244, 245, 380, 381]);
const BABY_IDS = new Set([172, 173, 174, 175, 236, 238, 239, 240, 298, 360]);

export function ensureAchievementsState(G) {
  if (!G) return;
  if (!G.achievements || typeof G.achievements !== 'object') {
    G.achievements = {
      unlockedTiers: {},
      unlockedAt: {},
      stats: {},
    };
  }
  if (!G.achievements.unlockedTiers) G.achievements.unlockedTiers = {};
  if (!G.achievements.unlockedAt) G.achievements.unlockedAt = {};
  if (!G.achievements.stats) G.achievements.stats = {};
  return G.achievements;
}

function countDexRange(G, start, end) {
  if (!G || !G.pokedex) return 0;
  let count = 0;
  for (let id = start; id <= end; id++) {
    const entry = G.pokedex[id];
    if (entry && (entry.caught || entry.captured)) count++;
  }
  return count;
}

function countTotalCaughtDex(G) {
  if (!G || !G.pokedex) return 0;
  let count = 0;
  for (const id in G.pokedex) {
    const entry = G.pokedex[id];
    if (entry && (entry.caught || entry.captured)) count++;
  }
  return count;
}

function countLegendariesCaught(G) {
  if (!G || !G.pokedex) return 0;
  let count = 0;
  for (const id of LEGENDARY_IDS) {
    const entry = G.pokedex[id];
    if (entry && (entry.caught || entry.captured)) count++;
  }
  return count;
}

function countShiniesCaught(G) {
  if (!G) return 0;
  let count = 0;
  if (G.pokedex) {
    for (const id in G.pokedex) {
      if (G.pokedex[id] && (G.pokedex[id].shiny || G.pokedex[id].shinyCaught)) count++;
    }
  }
  if (G.collection) {
    for (const k in G.collection) {
      const p = G.collection[k];
      if (p && (p.shiny || p.shinyActive)) count++;
    }
  }
  return Math.max(
    count,
    (G.achievements && G.achievements.stats && G.achievements.stats.shinyCaptured) || 0
  );
}

function countShiniesInTeam(G) {
  if (!G || !Array.isArray(G.team)) return 0;
  return G.team.filter((p) => p && (p.shiny || p.shinyActive)).length;
}

function countWildWins(G) {
  if (!G) return 0;
  let totalFromStats = 0;
  if (G.locStats) {
    for (const loc in G.locStats) {
      totalFromStats += Number(G.locStats[loc]?.beaten) || 0;
    }
  }
  if (G.wildWinsByLoc) {
    for (const loc in G.wildWinsByLoc) {
      totalFromStats = Math.max(totalFromStats, Number(G.wildWinsByLoc[loc]) || 0);
    }
  }
  let totalDexBeaten = 0;
  if (G.pokedex) {
    for (const id in G.pokedex) {
      totalDexBeaten += Number(G.pokedex[id]?.beaten) || 0;
    }
  }
  return Math.max(
    Number(G.totalWildWins) || 0,
    Number(G.achievements?.stats?.wildWins) || 0,
    totalFromStats,
    totalDexBeaten
  );
}

function countFormsObtained(G) {
  if (!G) return 0;
  let count = 0;
  if (G.pokedex) {
    for (const id in G.pokedex) {
      const entry = G.pokedex[id];
      if (entry && entry.forms) {
        for (const slot in entry.forms) {
          if (entry.forms[slot] && (entry.forms[slot].caught || entry.forms[slot].captured))
            count++;
        }
      }
    }
  }
  if (G.collection) {
    for (const k in G.collection) {
      const p = G.collection[k];
      if (p && Number(p.form) > 0) count++;
    }
  }
  return count;
}

export function getAchievementMetricValue(achOrId, G = globalThis.G) {
  if (!G) return 0;
  const ach = typeof achOrId === 'string' ? getAchievementDef(achOrId) : achOrId;
  if (!ach) return 0;
  const stats = (G.achievements && G.achievements.stats) || {};

  switch (ach.metric) {
    case 'dex_kanto':
      return countDexRange(G, 1, 151);
    case 'dex_johto':
      return countDexRange(G, 152, 251);
    case 'dex_hoenn':
      return countDexRange(G, 252, 386);
    case 'dex_national':
      return countTotalCaughtDex(G);
    case 'dex_legendaries':
    case 'legendary_captures':
      return countLegendariesCaught(G);
    case 'shiny_captured':
      return countShiniesCaught(G);
    case 'shiny_hatched': {
      let count = Number(stats.shinyHatched) || 0;
      if (G.pokedex) {
        for (const id in G.pokedex) {
          count += Number(G.pokedex[id]?.shinyHatched) || 0;
        }
      }
      return count;
    }
    case 'shiny_beaten': {
      let count = Number(stats.shinyBeaten) || 0;
      if (G.pokedex) {
        for (const id in G.pokedex) {
          count += Number(G.pokedex[id]?.shinyBeaten) || 0;
        }
      }
      return count;
    }
    case 'shiny_team':
      return countShiniesInTeam(G);
    case 'wild_wins':
      return countWildWins(G);
    case 'trainers_defeated': {
      const champCount = G.defeatedChamps ? Object.keys(G.defeatedChamps).length : 0;
      return Math.max(stats.trainersDefeated || 0, champCount);
    }
    case 'champions_beaten': {
      const bCount = Array.isArray(G.badges) ? G.badges.length : 0;
      const cCount = G.defeatedChamps ? Object.keys(G.defeatedChamps).length : 0;
      return Math.max(bCount, cCount);
    }
    case 'leagues_won':
      return G.regionLeagueWon ? Object.keys(G.regionLeagueWon).length : G.championTitle ? 1 : 0;
    case 'one_hit_kos':
      return stats.oneHitKOs || 0;
    case 'flawless_wins':
      return stats.flawlessWins || 0;
    case 'total_captures': {
      let dupes = 0;
      if (G.dupeCatches) {
        for (const k in G.dupeCatches) dupes += Number(G.dupeCatches[k]) || 0;
      }
      let collDupes = 0;
      if (G.collection) {
        for (const k in G.collection) {
          collDupes += Number(G.collection[k]?.dupeCount) || 0;
        }
      }
      return Math.max(
        countTotalCaughtDex(G) + dupes,
        countTotalCaughtDex(G) + collDupes,
        Number(stats.totalCaptures) || 0
      );
    }
    case 'afk_captures':
      return stats.afkCatches || 0;
    case 'same_species_captures': {
      let max = 0;
      if (G.dupeCatches) {
        for (const k in G.dupeCatches) max = Math.max(max, Number(G.dupeCatches[k]) || 0);
      }
      return max;
    }
    case 'route_species_variety':
      return stats.maxRouteSpecies || 0;
    case 'roamer_captured': {
      let count = 0;
      if (G.pokedex) {
        for (const id of ROAMER_IDS) {
          if (G.pokedex[id] && (G.pokedex[id].caught || G.pokedex[id].captured)) count++;
        }
      }
      return count;
    }
    case 'route_challenges_count': {
      let count = 0;
      if (G.locStats) {
        for (const loc in G.locStats) {
          if ((G.locStats[loc].beaten || 0) >= 50) count++;
        }
      }
      return count;
    }
    case 'rematches_gym_kanto':
    case 'rematches_gym_johto':
    case 'rematches_gym_hoenn':
    case 'rematches_league':
      return stats[ach.metric] || 0;
    case 'locations_visited':
      return G.visitedMaps ? Object.keys(G.visitedMaps).length : 0;
    case 'routes_100_dex':
      return stats.routes100Dex || 0;
    case 'route_masteries_gold':
      return stats.routeMasteriesGold || 0;
    case 'dungeons_completed': {
      let clears = Number(stats.dungeonsCompleted) || 0;
      if (G.dungeonClears) {
        for (const loc in G.dungeonClears) {
          clears += Number(G.dungeonClears[loc]) || 0;
        }
      }
      return Math.max(clears, Number(G.dungeonsExplored) || 0);
    }
    case 'regions_unlocked': {
      let r = 1;
      if (G.badges) {
        if (G.badges.includes('elite4') || G.region === 'johto') r = 2;
        if (G.badges.includes('johto_elite4') || G.region === 'hoenn') r = 3;
      }
      return r;
    }
    case 'eggs_hatched': {
      let count = Number(stats.eggsHatched) || 0;
      if (G.pokedex) {
        for (const id in G.pokedex) {
          count += Number(G.pokedex[id]?.hatcheryIncub) || 0;
        }
      }
      return count;
    }
    case 'max_iv_pokemon': {
      let count = Number(stats.maxIvPokemon) || 0;
      const allMons = [...(G.team || []), ...Object.values(G.collection || {})];
      let found = 0;
      for (const m of allMons) {
        if (!m || !m.ivs) continue;
        const sum = Object.values(m.ivs).reduce((s, v) => s + (Number(v) || 0), 0);
        if (sum >= 72) found++;
      }
      return Math.max(count, found);
    }
    case 'babies_hatched':
      return stats.babiesHatched || 0;
    case 'incub_dupes':
      return stats.incubDupes || 0;
    case 'twelve_iv_stat': {
      let count = Number(stats.twelveIvStat) || 0;
      const allMons = [...(G.team || []), ...Object.values(G.collection || {})];
      let found = 0;
      for (const m of allMons) {
        if (!m || !m.ivs) continue;
        if (Object.values(m.ivs).some((v) => Number(v) >= 12)) found++;
      }
      return Math.max(count, found);
    }
    case 'training_sessions':
      return stats.trainingSessions || 0;
    case 'max_ev_pokemon': {
      let count = Number(stats.maxEvPokemon) || 0;
      const allMons = [...(G.team || []), ...Object.values(G.collection || {})];
      let found = 0;
      for (const m of allMons) {
        if (!m || !m.evs) continue;
        const sum = Object.values(m.evs).reduce((s, v) => s + (Number(v) || 0), 0);
        if (sum >= 510) found++;
      }
      return Math.max(count, found);
    }
    case 'hidden_abilities':
      return G.unlockedTalents ? Object.keys(G.unlockedTalents).length : 0;
    case 'rare_abilities': {
      let count = Number(stats.rareAbilities) || 0;
      const allMons = [...(G.team || []), ...Object.values(G.collection || {})];
      let found = 0;
      for (const m of allMons) {
        if (m && (m.talentUnlocked || m.hiddenTalentActive || (m.talent && m.talent !== 'default')))
          found++;
      }
      return Math.max(count, found);
    }
    case 'mine_layers':
      return (G.mine && G.mine.completedCount) || 0;
    case 'mine_treasures':
      return Math.max(stats.mineTreasures || 0, (G.mine && G.mine.completedCount) || 0);
    case 'mine_fossils': {
      let fCount = Number(stats.mineFossils) || 0;
      if (G.inventory) {
        const fossilKeys = [
          'helix_fossil',
          'dome_fossil',
          'old_amber',
          'root_fossil',
          'claw_fossil',
          'fossil',
        ];
        for (const fk of fossilKeys) fCount += Number(G.inventory[fk]) || 0;
      }
      return fCount;
    }
    case 'mine_evo_items': {
      let evoCount = Number(stats.mineEvoItems) || 0;
      if (G.inventory) {
        const evoKeys = [
          'fire_stone',
          'water_stone',
          'thunder_stone',
          'leaf_stone',
          'moon_stone',
          'sun_stone',
        ];
        for (const ek of evoKeys) evoCount += Number(G.inventory[ek]) || 0;
      }
      return evoCount;
    }
    case 'mine_layers_100':
      return stats.mineLayers100 || 0;
    case 'money_earned':
      return Math.max(Number(stats.moneyEarned) || 0, Number(G.money) || 0);
    case 'money_spent':
      return stats.moneySpent || 0;
    case 'distinct_items':
      return G.inventory
        ? Object.keys(G.inventory).filter((k) => (G.inventory[k] || 0) > 0).length
        : 0;
    case 'max_level_staff': {
      let maxLvl = Number(stats.maxLevelStaff) || 0;
      if (G.staff && G.staff.level) {
        for (const id in G.staff.level) maxLvl = Math.max(maxLvl, Number(G.staff.level[id]) || 1);
      }
      return maxLvl;
    }
    case 'atoll_streak':
      return (
        (G.atoll && G.atoll.bestStreak) || (G.atoll && G.atoll.streak) || stats.atollStreak || 0
      );
    case 'atoll_room_wins':
      return stats.atollRoomWins || 0;
    case 'atoll_bosses':
      return stats.atollBosses || 0;
    case 'atoll_tokens_spent':
      return stats.atollTokensSpent || 0;
    case 'atoll_flawless_boss':
      return stats.atollFlawlessBoss || 0;
    case 'base_flags':
      return G.secretBaseFlags || 0;
    case 'base_decos':
      return stats.baseDecosPlaced || 0;
    case 'base_visitors':
      return stats.baseVisitors || 0;
    case 'first_step':
      return countTotalCaughtDex(G) > 0 ? 1 : 0;
    case 'magikarp_loyal':
      return stats.magikarpBattles || 0;
    case 'pepite_collector':
      return Math.max(stats.nuggetsSold || 0, (G.inventory && G.inventory['nugget']) || 0);
    case 'all_nighter':
      return G.playTimeMs || 0;
    case 'back_to_roots':
      return G.location === 'pallet' && G.badges && G.badges.includes('elite4') ? 1 : 0;
    case 'pc_full':
      return G.collection ? Object.keys(G.collection).length : 0;
    case 'zero_waste':
      return stats.totalDupesProduced || 0;
    case 'true_boss':
      return stats.atollUnevolvedBoss || 0;
    case 'forms_obtained':
      return countFormsObtained(G);
    default:
      if (ach.metric.startsWith('type_wins_')) {
        const type = ach.metric.replace('type_wins_', '');
        return (stats.typeWins && stats.typeWins[type]) || 0;
      }
      return stats[ach.metric] || 0;
  }
}

export function getAchievementProgress(achOrId, G = globalThis.G) {
  const ach = typeof achOrId === 'string' ? getAchievementDef(achOrId) : achOrId;
  if (!ach)
    return { currentTier: -1, metricValue: 0, nextTarget: 0, progressPct: 0, isCompleted: false };
  ensureAchievementsState(G);

  const value = getAchievementMetricValue(ach, G);
  const unlocked = G.achievements.unlockedTiers[ach.id];
  let currentTier = unlocked !== undefined ? unlocked : -1;

  for (let i = 0; i < ach.tiers.length; i++) {
    if (value >= ach.tiers[i] && i > currentTier) {
      currentTier = i;
    }
  }

  const isCompleted = currentTier >= ach.tiers.length - 1;
  const nextTier = isCompleted ? ach.tiers.length - 1 : currentTier + 1;
  const nextTarget = ach.tiers[nextTier];
  const prevTarget = currentTier >= 0 ? ach.tiers[currentTier] : 0;

  let progressPct = 0;
  if (isCompleted) {
    progressPct = 100;
  } else if (nextTarget > prevTarget) {
    progressPct = Math.max(
      0,
      Math.min(100, Math.round(((value - prevTarget) / (nextTarget - prevTarget)) * 100))
    );
  }

  return {
    ach,
    metricValue: value,
    currentTier,
    nextTier,
    nextTarget,
    progressPct,
    isCompleted,
  };
}

export function checkAchievements(G = globalThis.G, options = {}) {
  if (!G) return [];
  ensureAchievementsState(G);

  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    const value = getAchievementMetricValue(ach, G);
    const prevTier =
      G.achievements.unlockedTiers[ach.id] !== undefined
        ? G.achievements.unlockedTiers[ach.id]
        : -1;

    let highestTier = prevTier;
    for (let i = 0; i < ach.tiers.length; i++) {
      if (value >= ach.tiers[i]) {
        highestTier = i;
      }
    }

    if (highestTier > prevTier) {
      for (let t = prevTier + 1; t <= highestTier; t++) {
        G.achievements.unlockedTiers[ach.id] = t;
        G.achievements.unlockedAt[`${ach.id}_${t}`] = Date.now();
        newlyUnlocked.push({ ach, tier: t });

        if (options.notify && typeof globalThis.notify === 'function') {
          const lang = G.lang === 'en' ? 'en' : 'fr';
          const name = lang === 'en' ? ach.name_en : ach.name_fr;
          const bonusVal = ach.bonus && ach.bonus.values[t];
          const bonusLbl = ach.bonus
            ? (lang === 'en' ? ach.bonus.label_en : ach.bonus.label_fr).replace('{v}', bonusVal)
            : '';
          const msg =
            lang === 'en'
              ? `Achievement unlocked: ${name} (Tier ${t + 1}) — ${bonusLbl}`
              : `Succès débloqué : ${name} (Palier ${t + 1}) — ${bonusLbl}`;
          globalThis.notify(msg, 'var(--yellow)');
        }
      }
    }
  }

  return newlyUnlocked;
}

export function recalculateAllAchievements(G = globalThis.G) {
  return checkAchievements(G, { notify: false });
}

export function getAchievementBonus(bonusType, scope = 'global', G = globalThis.G) {
  if (!G || !G.achievements || !G.achievements.unlockedTiers) return 0;
  let total = 0;

  for (const ach of ACHIEVEMENTS) {
    if (!ach.bonus || ach.bonus.type !== bonusType) continue;
    const tier = G.achievements.unlockedTiers[ach.id];
    if (tier === undefined || tier < 0) continue;

    const achScope = ach.scope || 'global';
    const matchesScope =
      scope === 'all' ? true : scope === 'global' ? achScope === 'global' : achScope === scope;
    if (!matchesScope) continue;

    const val = ach.bonus.values[tier];
    if (typeof val === 'number') total += val;
  }

  // Anti-inflation capping
  if (scope === 'global' || scope === 'all') {
    const capKey = `${bonusType}_global`;
    if (ANTI_INFLATION_CAPS[capKey] !== undefined) {
      total = Math.min(total, ANTI_INFLATION_CAPS[capKey]);
    }
  }

  return total;
}

export function recordAchievementStat(key, amount = 1, G = globalThis.G) {
  if (!G) return 0;
  ensureAchievementsState(G);
  G.achievements.stats[key] = (Number(G.achievements.stats[key]) || 0) + Number(amount);
  return G.achievements.stats[key];
}

export function countUnlockedAchievements(G = globalThis.G) {
  if (!G || !G.achievements || !G.achievements.unlockedTiers)
    return { totalTiers: 0, maxTiers: 0, completedCount: 0 };
  let totalTiers = 0;
  let completedCount = 0;
  let maxTiers = 0;

  for (const ach of ACHIEVEMENTS) {
    maxTiers += ach.tiers.length;
    const tier = G.achievements.unlockedTiers[ach.id];
    if (tier !== undefined && tier >= 0) {
      totalTiers += tier + 1;
      if (tier >= ach.tiers.length - 1) completedCount++;
    }
  }

  return { totalTiers, maxTiers, completedCount };
}

// Global exposure
if (typeof globalThis !== 'undefined') {
  globalThis.ensureAchievementsState = ensureAchievementsState;
  globalThis.getAchievementMetricValue = getAchievementMetricValue;
  globalThis.getAchievementProgress = getAchievementProgress;
  globalThis.checkAchievements = checkAchievements;
  globalThis.recalculateAllAchievements = recalculateAllAchievements;
  globalThis.getAchievementBonus = getAchievementBonus;
  globalThis.recordAchievementStat = recordAchievementStat;
  globalThis.countUnlockedAchievements = countUnlockedAchievements;
}
