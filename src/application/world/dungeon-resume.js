// V7-R1b (hotfix) — REPRISE D'UNE EXPÉDITION DE DONJON APRÈS RECHARGEMENT.
//
// Retour joueur (urgent) : « des joueurs sont lock dans les donjons » — après
// un F5 au milieu d'une expédition, le joueur ne pouvait plus rien faire :
//   · `G.dungeonRun` SURVIT à la sauvegarde (palier, carte, position, sac…),
//     mais tout le câblage d'exécution était perdu au démarrage :
//     - le drapeau `<html data-dungeon-run="1">` n'était posé que par
//       startDungeonRun / dungeonDescend / dungeonAscend / dungeonAbandon →
//       après rechargement, la feuille de style montrait « Exploration au
//       repos » et masquait le bandeau d'expédition (#battle-dungeon-bar) ;
//     - la grille du palier n'était dessinée que par startBattle / endBattle →
//       aucune case à cliquer ;
//     - la carte du monde REFUSE tout déplacement pendant une expédition
//       (règle PASSE 34 : on ne sort que par « Remonter et encaisser » ou
//       l'abandon) ;
//     - le bouton « Combattre au palier N » appelait exploreArea(), qui se
//       tait volontairement (PASSE 39) quand aucune case n'est engagée.
//   → verrou complet : ni combat, ni déplacement, ni sortie.
//
// Ce module ne touche PAS à la sauvegarde (aucun changement de schéma) : il
// REBRANCHE simplement l'expédition sauvegardée sur ses surfaces à chaque
// activation d'une sauvegarde (démarrage, changement de partie), exactement
// comme les tickers de mine / d'entraînement sont relancés au boot.
//
// Fichier séparé de dungeon-run.js : ce dernier est au plafond du budget de
// taille (tools/file-size-budget.json) ; tout passe par la surface globale
// déjà exposée par `_dgApi` (currentDungeonRun, refreshDungeonPanel,
// dungeonOnWipe, _dgAutoStep, _dgGenFloorMap) — règle DBT-04 : pas d'import
// statique vers l'i18n/l'UI depuis `application/world`.

function _dgrState() {
  return typeof globalThis !== 'undefined' && globalThis.G ? globalThis.G : null;
}
function _dgrCall(name, ...args) {
  try {
    const fn = typeof globalThis !== 'undefined' ? globalThis[name] : null;
    if (typeof fn === 'function') return fn(...args);
  } catch (_) {}
  return undefined;
}
function _dgrT(key, vars) {
  const viaTr = vars ? _dgrCall('tr', key, vars) : undefined;
  if (typeof viaTr === 'string') return viaTr;
  const via = _dgrCall('t', key);
  return typeof via === 'string' ? via : key;
}

/** La carte du palier est-elle exploitable (grille + case courante) ? */
function _dgrMapUsable(run) {
  return !!(
    run &&
    run.map &&
    run.map.grid &&
    run.map.tiles &&
    typeof run.pos === 'string' &&
    run.map.tiles[run.pos]
  );
}

/**
 * Rebranche l'expédition sauvegardée (le cas échéant) sur ses surfaces.
 *
 * Idempotente et sans effet hors expédition (elle retire alors un éventuel
 * drapeau résiduel laissé par une AUTRE sauvegarde). Retourne :
 *   · null      → aucune expédition en cours ;
 *   · 'wiped'   → l'équipe était entièrement K.O. : l'expédition est soldée
 *                 comme une défaite (règle du sac : moitié conservée) ;
 *   · 'resumed' → l'expédition continue là où elle en était.
 */
function dungeonResumeAfterLoad() {
  const G = _dgrState();
  const run = _dgrCall('currentDungeonRun');
  if (!G || !run || !run.active) {
    // Pas d'expédition : on s'assure seulement que la feuille de style ne
    // garde pas un drapeau d'une partie précédente (changement de sauvegarde).
    _dgrCall('refreshDungeonPanel');
    return null;
  }
  const b = typeof globalThis !== 'undefined' ? globalThis.battle : null;
  const inBattle = !!(b && b.active);

  // 1) L'expédition possède le lieu : la carte du monde est verrouillée sur
  //    le donjon pendant la descente, la position du joueur doit le refléter.
  if (G.location !== run.loc) {
    G.location = run.loc;
    _dgrCall('renderMap');
  }

  // 2) Équipe hors d'état de combattre (rechargement au moment du K.O.
  //    collectif) : impossible de reprendre un seul combat → l'expédition est
  //    soldée comme une défaite, l'équipe se repose, le joueur est libre.
  const alive = _dgrCall('aliveCount');
  if (!inBattle && typeof alive === 'number' && alive <= 0) {
    _dgrCall('dungeonOnWipe');
    return 'wiped';
  }

  // 3) Carte absente ou corrompue : on régénère le palier plutôt que de
  //    laisser une expédition sans aucune case à jouer.
  if (!_dgrMapUsable(run)) _dgrCall('_dgGenFloorMap', run);

  // 4) Le combat en cours n'a pas survécu au rechargement : la case engagée
  //    reste À BATTRE (elle n'a pas été soldée), on la libère pour qu'un clic
  //    la ré-engage proprement. Hors combat uniquement : le rattrapage
  //    hors-ligne peut avoir repris un combat avant nous.
  if (!inBattle) {
    run.pendingNode = null;
    if (b) {
      b.pendingDungeonBoss = false;
      b.dungeonElite = false;
    }
  }

  // 5) Surfaces : drapeau <html data-dungeon-run>, panneau du lieu, bandeau
  //    de combat (grille + sac + boutons) et raccourcis clavier — tout passe
  //    par refreshDungeonPanel().
  _dgrCall('refreshDungeonPanel');

  _dgrCall(
    'notify',
    _dgrT('dungeon_run_resumed', { floor: String(run.floor), depth: String(run.depth) }),
    'var(--blue)'
  );

  // 6) Pilote automatique : il reprend seul, comme avant le rechargement.
  if (run.auto && !inBattle) {
    setTimeout(() => {
      try {
        const r = _dgrCall('currentDungeonRun');
        if (r && r.active && r.auto) _dgrCall('_dgAutoStep');
      } catch (_) {}
    }, 900);
  }
  return 'resumed';
}

const _dgrApi = { dungeonResumeAfterLoad };
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _dgrApi);
if (typeof window !== 'undefined') Object.assign(window, _dgrApi);

export { dungeonResumeAfterLoad };
