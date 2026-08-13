// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// ─── Gyms & Leagues — metadata (pass 19, grand project step 3) ───────
// The TEAMS of gym leaders and leagues (species, levels, moves, abilities,
// held items, IV/EV) now live in official-teams-data.js — FRLG canon (Kanto)
// / HGSS (Johto), validated by
// tests/official-teams.test.js.
//
// This file no longer contains ANY hardcoded Pokemon: the old legacy
// format ([id, level] + invalid compact move ids, filtered
// silently → empty movesets; instances rebuilt randomly
// by createPoke) is REMOVED. Only the following remains here:
//   - LEAGUE_META: league challenge metadata (first-win reward,
//     badge prerequisites),
//   - getChampDef(champId): compatibility view lazily rebuilt
//     from OFFICIAL_TEAMS (+ i18n) for the battle engine,
//   - getLeagueTrainersForRegion(region): gauntlet steps preview
//     (localized names/titles) for the UI and battle logs.
//
// Unchanged keys -> full save compatibility: G.badges keeps the
// gym ids ('brock'…'clair'), G.defeatedChamps keeps the champIds,
// the leagues stay 'elite4' / 'johto_elite4'.

const LEAGUE_META = {
  elite4:       { region: 'kanto', badge: 'champion',       badgeEmoji: '', badgeReq: 8, reward: 12000 },
  johto_elite4: { region: 'johto', badge: 'johto_champion', badgeEmoji: '', badgeReq: 8, reward: 14000 },
  hoenn_elite4: { region: 'hoenn', badge: 'hoenn_champion', badgeEmoji: '', badgeReq: 8, reward: 16000 },
};

// Flattened, instantiated preview of a league's teams (used for the
// gauntlet win-XP computation; fallback variant for the Champion).
function getLeagueFlattenedTeam(region) {
  const reg = region === 'johto' ? 'johto' : region === 'hoenn' ? 'hoenn' : 'kanto';
  if (typeof getOfficialLeagueKeys !== 'function' || typeof getOfficialTeam !== 'function') return [];
  const out = [];
  for (const key of getOfficialLeagueKeys(reg)) {
    const team = getOfficialTeam(key, null) || [];
    for (const p of team) out.push(p);
  }
  return out;
}

// Challenge definition of a gym leader or a league (metadata +
// instantiated OFFICIAL team). Returns null for an unknown champId
// (e.g. 'atoll', which has its own pipeline).
function getChampDef(champId) {
  if (!champId) return null;
  const lg = LEAGUE_META[champId];
  const off = ((typeof OFFICIAL_TEAMS !== 'undefined') ? OFFICIAL_TEAMS[champId] : null) ||
              ((typeof OFFICIAL_TEAMS_HOENN !== 'undefined') ? OFFICIAL_TEAMS_HOENN[champId] : null);
  if (lg) {
    return {
      id: champId,
      region: lg.region,
      badge: lg.badge,
      badgeEmoji: lg.badgeEmoji,
      reward: lg.reward,
      badgeReq: lg.badgeReq,
      strategy: [],
      get team() { return getLeagueFlattenedTeam(lg.region); },
    };
  }
  if (off && off.kind === 'gym') {
    return {
      id: champId,
      region: off.region,
      badge: off.badge,
      badgeEmoji: off.badgeEmoji || '',
      reward: off.rewardMoney || 0,
      badgeReq: off.badgeReq || 0,
      strategy: off.style || [],
      get team() { return (typeof getOfficialTeam === 'function') ? (getOfficialTeam(champId) || []) : []; },
    };
  }
  return null;
}

// Preview of a league's gauntlet steps: [{ id, name, title, team:
// [[id, level], …] }] — NAMES/TITLES are localized (champions.*),
// the real team is instantiated at battle time via
// getOfficialLeagueTeam (which also resolves the Champion Blue variant
// based on the player starter).
function getLeagueTrainersForRegion(region) {
  const reg = region === 'johto' ? 'johto' : 'kanto';
  const keys = (typeof getOfficialLeagueKeys === 'function') ? getOfficialLeagueKeys(reg) : [];
  return keys.map((key) => {
    const entry = (typeof OFFICIAL_TEAMS !== 'undefined') ? OFFICIAL_TEAMS[key] : null;
    const specs = (typeof getOfficialTeamSpecs === 'function') ? (getOfficialTeamSpecs(key, null) || []) : [];
    let name = (entry && entry.name) || key;
    let title = (entry && entry.title) || '';
    try {
      if (typeof t === 'function') {
        const tn = t('champions.' + key + '.name');
        const tt = t('champions.' + key + '.title');
        if (tn) name = tn;
        if (tt) title = tt;
      }
    } catch (_) {}
    return { id: key, name, title, team: specs.map((s) => [s.id, s.level]) };
  });
}

// --- Migrated to ES module, globals exposed ---
if (typeof LEAGUE_META !== 'undefined') { if (typeof window !== 'undefined') window.LEAGUE_META = LEAGUE_META; if (typeof globalThis !== 'undefined') globalThis.LEAGUE_META = LEAGUE_META; }
if (typeof getLeagueFlattenedTeam !== 'undefined') { if (typeof window !== 'undefined') window.getLeagueFlattenedTeam = getLeagueFlattenedTeam; if (typeof globalThis !== 'undefined') globalThis.getLeagueFlattenedTeam = getLeagueFlattenedTeam; }
if (typeof getChampDef !== 'undefined') { if (typeof window !== 'undefined') window.getChampDef = getChampDef; if (typeof globalThis !== 'undefined') globalThis.getChampDef = getChampDef; }
if (typeof getLeagueTrainersForRegion !== 'undefined') { if (typeof window !== 'undefined') window.getLeagueTrainersForRegion = getLeagueTrainersForRegion; if (typeof globalThis !== 'undefined') globalThis.getLeagueTrainersForRegion = getLeagueTrainersForRegion; }


// Wave 40 — native ESM module: grouped export of the same names as the
// classic surface kept above/here (bodies unchanged).
export {
  LEAGUE_META,
  getLeagueFlattenedTeam,
  getChampDef,
  getLeagueTrainersForRegion,
};

