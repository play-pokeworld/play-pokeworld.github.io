/**
 * @file MigrationV9ToV10.js
 * @brief Save migration 9 -> 10: persist sticky world / feature access.
 *
 * The old Rework showed all three feature panels, so previous use is inferred from durable data.
 * Original exports also carried `G.unlockedLocs`, `G.mineUnlocked`, starter flags and championTitle;
 * MigrationOriginalToV1 forwards those facts into this migration rather than discarding them.
 */
import { HatcheryRules } from '../../../config/HatcheryRules.js';
import { MineRules } from '../../../config/MineRules.js';
import { STARTERS_BY_REGION } from '../../pokemon/StarterData.js';

/** @param {*} value @returns {string[]} */
function readIds(value) {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).filter(([, enabled]) => enabled === true).map(([id]) => id)
      : [];
  return [...new Set(entries.filter((id) => typeof id === 'string' && id.length > 0))];
}

/** @param {Set<string>} regions @param {*} defeated @returns {void} */
function addDefeatedLeagueWins(regions, defeated) {
  if (!defeated || typeof defeated !== 'object') return;
  const isWon = (value) => value === true || (typeof value === 'number' && value > 0);
  if (isWon(defeated.elite4)) regions.add('kanto');
  for (const [key, value] of Object.entries(defeated)) {
    const match = /^([a-z0-9]+)_elite4$/.exec(key);
    if (match && isWon(value)) regions.add(match[1]);
  }
}

/** @param {*} mine @returns {boolean} */
function hasMineProgress(mine) {
  if (!mine || typeof mine !== 'object') return false;
  const hasGrid = Array.isArray(mine.grid) && mine.grid.length === MineRules.HEIGHT &&
    mine.grid.every((row) => Array.isArray(row) && row.length === MineRules.WIDTH);
  const tools = mine.unlockedTools && typeof mine.unlockedTools === 'object'
    ? Object.keys(mine.unlockedTools).length > 1
    : false;
  return Number(mine.completedCount) > 0 || Number(mine.totalLayersDug) > 0 || Number(mine.layersDug) > 0 ||
    (Array.isArray(mine.items) && mine.items.length > 0) || tools ||
    !!mine.automation?.purchased || (hasGrid && Array.isArray(mine.items) && mine.items.length > 0);
}

/** @param {*} hatchery @returns {boolean} */
function hasHatcheryProgress(hatchery) {
  if (!hatchery || typeof hatchery !== 'object') return false;
  const slots = Array.isArray(hatchery.slots) ? hatchery.slots : Array.isArray(hatchery) ? hatchery : [];
  return slots.some((slot) => !!slot) || Number(hatchery.maxSlots ?? hatchery.hatcheryMaxSlots) > HatcheryRules.DEFAULT_SLOT_COUNT;
}

export const MigrationV9ToV10 = Object.freeze({
  from: 9,
  to: 10,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const legacy = source.access && typeof source.access === 'object' ? source.access : {};
    const player = source.player && typeof source.player === 'object' ? source.player : {};
    const statistics = source.statistics && typeof source.statistics === 'object' ? source.statistics : {};
    const hatchery = source.hatchery && typeof source.hatchery === 'object' ? source.hatchery : {};
    const mine = source.mine && typeof source.mine === 'object' ? source.mine : {};
    const unlockedLocations = new Set(readIds(legacy.unlockedLocations ?? legacy.locations ?? legacy.unlockedLocs));
    if (typeof player.location === 'string' && player.location) unlockedLocations.add(player.location);
    const unlockedFeatures = legacy.unlockedFeatures && typeof legacy.unlockedFeatures === 'object'
      ? { ...legacy.unlockedFeatures }
      : legacy.features && typeof legacy.features === 'object'
        ? { ...legacy.features }
        : {};
    const badges = Array.isArray(player.badges) ? player.badges : [];
    const leaguesWon = new Set([
      ...readIds(statistics.leaguesWon),
      ...readIds(source.regionLeagueWon),
      ...readIds(legacy.regionLeagueWon),
      ...readIds(legacy.leaguesWon),
      ...readIds(legacy.milestones?.regionLeagueWon)
    ]);
    addDefeatedLeagueWins(leaguesWon, source.defeatedChamps);
    addDefeatedLeagueWins(leaguesWon, legacy.defeatedChamps);
    const championTitle = legacy.championTitle === true || legacy.milestones?.championTitle === true ||
      source.championTitle === true || source.leagueWon === true || legacy.leagueWon === true ||
      leaguesWon.size > 0;

    // A stored feature flag always wins. Otherwise durable use is evidence that the old save had
    // already reached the feature, while a never-used panel remains locked by its progression rule.
    unlockedFeatures.hatchery = unlockedFeatures.hatchery === true ||
      unlockedLocations.has(HatcheryRules.LOCATION_ID) || hasHatcheryProgress(hatchery) ||
      Number(statistics.hatcheryLevel) > 0;
    unlockedFeatures.mine = unlockedFeatures.mine === true ||
      unlockedLocations.has(MineRules.LOCATION_ID) || unlockedLocations.has('diglettscave_2') ||
      hasMineProgress(mine);
    unlockedFeatures.training = unlockedFeatures.training === true ||
      badges.includes('surge') || Number(statistics.trainingSessions) > 0;

    const regionStarters = new Set(readIds(legacy.regionStarters));
    const teamAndBox = [
      ...(Array.isArray(source.team) ? source.team : []),
      ...(Array.isArray(source.box) ? source.box : [])
    ];
    const pokedex = source.pokedex && typeof source.pokedex === 'object' ? source.pokedex : {};
    for (const region of ['kanto', 'johto', 'hoenn']) {
      if (legacy.regionStarter === region || legacy.regionStarter?.[region] === true ||
          legacy[`starter${region[0].toUpperCase()}${region.slice(1)}`] === true) {
        regionStarters.add(region);
      }
      const starters = STARTERS_BY_REGION[region] || [];
      if (starters.some((starter) => teamAndBox.some((pokemon) => pokemon?.species === starter.species) ||
          pokedex[starter.species]?.caught === true)) regionStarters.add(region);
    }

    return {
      ...source,
      version: 10,
      statistics: { ...statistics, leaguesWon: [...leaguesWon] },
      access: {
        unlockedLocations: [...unlockedLocations],
        unlockedFeatures,
        regionStarters: [...regionStarters],
        championTitle
      }
    };
  }
});
