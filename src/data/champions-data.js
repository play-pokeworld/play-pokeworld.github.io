// ─── Arènes & Ligues — métadonnées (passe 19, grand projet étape 3) ───────
// Les ÉQUIPES des champions d'arène et des ligues (espèces, niveaux,
// attaques, talents, objets tenus, IV/EV) vivent désormais dans
// official-teams-data.js — canon RFVF (Kanto) / OAC (Johto), validées par
// tests/official-teams.test.js.
//
// Ce fichier ne contient plus AUCUN Pokémon « en dur » : l'ancien format
// legacy ([id, niveau] + ids d'attaques compacts invalides, filtrés
// silencieusement → movesets vides ; instances reconstruites aléatoirement
// par createPoke) est SUPPRIMÉ. Ne subsistent ici que :
//   - LEAGUE_META : métadonnées de défi des ligues (récompense 1re victoire,
//     prérequis de badges),
//   - getChampDef(champId) : vue de compatibilité reconstruite paresseusement
//     depuis OFFICIAL_TEAMS (+ i18n) pour le moteur de combat,
//   - getLeagueTrainersForRegion(region) : aperçu des étapes du gauntlet
//     (noms/titres localisés) pour l'UI et les logs de combat.
//
// Clés inchangées → compatibilité totale des sauvegardes : G.badges garde
// les ids d'arènes ('brock'…'clair'), G.defeatedChamps garde les champIds,
// les ligues restent 'elite4' / 'johto_elite4'.

const LEAGUE_META = {
  elite4:       { region: 'kanto', badge: 'champion',       badgeEmoji: '', badgeReq: 8, reward: 12000 },
  johto_elite4: { region: 'johto', badge: 'johto_champion', badgeEmoji: '', badgeReq: 8, reward: 14000 },
  hoenn_elite4: { region: 'hoenn', badge: 'hoenn_champion', badgeEmoji: '', badgeReq: 8, reward: 16000 },
};

// Aperçu aplati et instancié des équipes d'une ligue (utilisé pour le calcul
// d'XP de victoire du gauntlet ; variante de repli pour le Maître).
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

// Définition de défi d'un champion d'arène ou d'une ligue (métadonnées +
// équipe OFFICIELLE instanciée). Renvoie null pour un champId inconnu
// (ex. 'atoll', qui a son propre pipeline).
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

// Aperçu des étapes du gauntlet d'une ligue : [{ id, name, title, team:
// [[id, niveau], …] }] — les NOMS/TITRES sont localisés (champions.*),
// l'équipe réelle est instanciée au moment du combat via
// getOfficialLeagueTeam (qui résout aussi la variante du Maître Blue selon
// le starter du joueur).
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
if (typeof LEAGUE_META !== 'undefined' && typeof window !== 'undefined') window.LEAGUE_META = LEAGUE_META;
if (typeof getLeagueFlattenedTeam !== 'undefined' && typeof window !== 'undefined') window.getLeagueFlattenedTeam = getLeagueFlattenedTeam;
if (typeof getChampDef !== 'undefined' && typeof window !== 'undefined') window.getChampDef = getChampDef;
if (typeof getLeagueTrainersForRegion !== 'undefined' && typeof window !== 'undefined') window.getLeagueTrainersForRegion = getLeagueTrainersForRegion;

