/**
 * @file MigrationV11ToV12.js
 * @brief Save migration 11 -> 12 (v1.10): separate league titles from Gym badges and
 * repair sticky feature access when older saves contain durable proof of an unlock.
 *
 * Before v1.10, league victories were written both to statistics.leaguesWon and to
 * player.badges. The latter is reserved for Gym badges and feeds the 8-badge counter.
 */
import { LeagueDB } from '../../trainers/LeagueDB.js';
import { HatcheryRules } from '../../../config/HatcheryRules.js';
import { MineRules } from '../../../config/MineRules.js';
import { TrainingRules } from '../../../config/TrainingRules.js';
import { collectLegacyLocationUnlocks } from './LegacyLocationAccessMigration.js';

/** @param {*} value @returns {string[]} */
function readIds(value) {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).filter(([, enabled]) => enabled === true).map(([id]) => id)
      : [];
  return [...new Set(entries.filter((id) => typeof id === 'string' && id.length > 0))];
}

/** @param {*} value @returns {number} */
function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/** @param {*} hatchery @returns {boolean} */
function hasHatcheryProgress(hatchery) {
  if (!hatchery || typeof hatchery !== 'object') return false;
  const slots = Array.isArray(hatchery.slots) ? hatchery.slots : Array.isArray(hatchery) ? hatchery : [];
  return slots.some((slot) => !!slot) ||
    positiveNumber(hatchery.maxSlots ?? hatchery.hatcheryMaxSlots) > HatcheryRules.DEFAULT_SLOT_COUNT;
}

/** @param {*} mine @returns {boolean} */
function hasMineProgress(mine) {
  if (!mine || typeof mine !== 'object') return false;
  const gridExists = Array.isArray(mine.grid) && mine.grid.length === MineRules.HEIGHT &&
    mine.grid.every((row) => Array.isArray(row) && row.length === MineRules.WIDTH);
  const extraTool = mine.unlockedTools && typeof mine.unlockedTools === 'object' &&
    Object.keys(mine.unlockedTools).length > 1;
  return positiveNumber(mine.completedCount ?? mine.totalLayersDug ?? mine.layersDug) > 0 ||
    (Array.isArray(mine.items) && mine.items.length > 0) || extraTool ||
    !!mine.automation?.purchased || (gridExists && Array.isArray(mine.items) && mine.items.length > 0);
}

/** @param {*} features @param {string} id @returns {boolean} */
function hasFeatureFlag(features, id) {
  return !!features && typeof features === 'object' && features[id] === true;
}

export const MigrationV11ToV12 = Object.freeze({
  from: 11,
  to: 12,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const player = source.player && typeof source.player === 'object' ? source.player : {};
    const statistics = source.statistics && typeof source.statistics === 'object' ? source.statistics : {};
    const access = source.access && typeof source.access === 'object' ? source.access : {};
    const rawFeatures = access.unlockedFeatures && typeof access.unlockedFeatures === 'object'
      ? access.unlockedFeatures
      : access.features && typeof access.features === 'object'
        ? access.features
        : {};
    const badges = readIds(player.badges);
    const leagueById = new Map(LeagueDB.getInstance().getAll().map((league) => [league.id, league.region]));
    const knownRegions = new Set(LeagueDB.getInstance().getAll().map((league) => league.region));
    const leaguesWon = new Set();
    const addLeague = (value) => {
      if (typeof value !== 'string') return;
      if (leagueById.has(value)) leaguesWon.add(leagueById.get(value));
      else if (knownRegions.has(value)) leaguesWon.add(value);
    };

    for (const value of Array.isArray(statistics.leaguesWon) ? statistics.leaguesWon : []) addLeague(value);
    for (const badgeId of badges) addLeague(badgeId);
    const trainerWins = statistics.trainerWins && typeof statistics.trainerWins === 'object'
      ? statistics.trainerWins
      : {};
    for (const league of LeagueDB.getInstance().getAll()) {
      if (positiveNumber(trainerWins[league.id]) > 0) leaguesWon.add(league.region);
    }

    // Remove only known league identifiers; real Gym badge IDs and any forward-compatible
    // non-league identifiers are kept exactly once and in their original order.
    const gymBadges = badges.filter((id) => !leagueById.has(id));

    const unlockedLocations = new Set(collectLegacyLocationUnlocks(source));
    const mineWasVisited = unlockedLocations.has(MineRules.LOCATION_ID) || unlockedLocations.has('diglettscave_2');
    const hatcheryFlag = hasFeatureFlag(rawFeatures, 'hatchery') || access.hatcheryUnlocked === true || source.hatcheryUnlocked === true;
    const mineFlag = hasFeatureFlag(rawFeatures, 'mine') || access.mineUnlocked === true || source.mineUnlocked === true;
    const trainingFlag = hasFeatureFlag(rawFeatures, 'training') || access.trainingUnlocked === true || source.trainingUnlocked === true;
    const unlockedFeatures = {
      ...rawFeatures,
      // Keep explicit proof from older saves. Badge count alone is not durable proof:
      // the corresponding route/cave may still be inaccessible in the map graph.
      hatchery: hatcheryFlag || unlockedLocations.has(HatcheryRules.LOCATION_ID) ||
        hasHatcheryProgress(source.hatchery) || positiveNumber(statistics.hatcheryLevel) > 0,
      mine: mineFlag || mineWasVisited || hasMineProgress(source.mine),
      training: trainingFlag || gymBadges.includes(TrainingRules.REQUIRED_BADGE_ID) ||
        positiveNumber(statistics.trainingSessions) > 0
    };
    const championFlag = access.championTitle === true || access.milestones?.championTitle === true ||
      source.championTitle === true || source.leagueWon === true;
    // Before regional statistics, the generic champion milestone implies the first (Kanto) title.
    if (championFlag) leaguesWon.add('kanto');
    const championTitle = championFlag || leaguesWon.size > 0;

    return {
      ...source,
      version: 12,
      player: { ...player, badges: gymBadges },
      statistics: { ...statistics, leaguesWon: [...leaguesWon] },
      access: {
        ...access,
        unlockedLocations: [...unlockedLocations],
        unlockedFeatures,
        championTitle
      }
    };
  }
});
