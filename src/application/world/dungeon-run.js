import { esc } from '../../engine/render/vdom.js';
// ════════════════════════════════════════════════════════════════════════════
// PASSE 32 — LES DONJONS : le péage achète une EXPÉDITION, plus un accès
// ════════════════════════════════════════════════════════════════════════════
// Mise en oeuvre de `docs/PROPOSITION-DONJONS.md`, validée par le joueur
// (« j'aime beaucoup l'idée »), gameplay et UI laissés à mon initiative.
//
// LE PRINCIPE, EN UNE PHRASE
//   On ne paie plus pour entrer dans un lieu : on paie pour tenter une descente
//   dont on repart avec un butin — à condition d'aller au bout, ou de savoir
//   s'arrêter à temps.
//
// LA BOUCLE
//   1. Payer le péage ouvre une descente de N paliers (N croît avec badgeReq).
//   2. Chaque palier demande un quota de victoires, puis offre un CHOIX :
//        « Descendre » (plus risqué, plus rentable) ou « Remonter » (encaisser).
//   3. Tout ce qui est gagné tombe dans un SAC D'EXPÉDITION, crédité seulement
//      à la remontée. Équipe entièrement K.O. → la moitié du sac est perdue.
//   4. Le dernier palier est un boss ; le battre clôt la session et verse un
//      bonus de complétion. Pour recommencer, on repaie.
//
// GARDE-FOU D'ÉQUITÉ (déjà écrit dans la proposition) : un K.O. au PREMIER
// palier rembourse le péage — on ne facture pas une expédition qui n'a pas eu
// lieu.
//
// CHOIX D'INTÉGRATION — pourquoi le sac n'intercepte PAS les gains existants :
// détourner chaque chemin de récompense (argent, objets, captures, XP) aurait
// demandé de réécrire des flux éprouvés, pour un bénéfice nul côté joueur. Le
// sac accumule donc un butin PROPRE au donjon (jetons + argent d'expédition),
// indexé sur la profondeur atteinte. Les gains ordinaires d'un combat restent
// versés normalement : on ajoute une couche, on n'en casse aucune.

// ── Réglages ────────────────────────────────────────────────────────────────

/** Profondeur d'un donjon selon son exigence en badges : 5 paliers au début,
 *  12 pour la Caverne Azurée. Une expédition longue doit rester une décision.
 *  PASSE 39 — retour joueur : « les donjons comme la Forêt de Jade n'ont pas
 *  de raison d'avoir de niveau, il devrait y en avoir qu'un puisque c'est une
 *  forêt et non une grotte. » Seules les grottes (et assimilés : tunnel,
 *  caverne de glace, volcan, montagne, souterrain) descendent en paliers ;
 *  tout autre décor (forêt, tour, laboratoire…) ne compte qu'UN niveau.
 *  PASSE 39d — retour joueur : « maintenant que l'on a nos pv qui ne remonte
 *  pas a chaque combat 12 palier a compléter c'est beaucoup trop et
 *  impossible, il faudrait grand max 3 palier. » Une grotte compte au
 *  maximum TROIS paliers : la descente reste un choix, sans devenir une
 *  corvée que les PV persistants rendent infranchissable. */
function dungeonDepthFor(badgeReq, locId) {
  if (locId && !_dgIsCaveLike(locId)) return 1;
  const b = Math.max(0, Math.min(8, Number(badgeReq) || 0));
  return 2 + Math.round((b / 8) * 1); // 0 badge → 2 · 8 badges → 3
}

/** Le lieu est-il une grotte (descente par paliers) ? Réutilise la
 *  classification de décor de location-backgrounds.js (forêt ≠ grotte).
 *  En repli (tests, décor inconnu), on suppose une grotte : la descente en
 *  paliers reste le comportement historique, et c'est le décor connu qui
 *  décide de la passer à un seul palier. */
function _dgIsCaveLike(locId) {
  try {
    if (typeof globalThis.getLocationBackground === 'function') {
      const bg = globalThis.getLocationBackground(locId);
      return ['cave', 'iceCave', 'trench', 'volcano', 'mountain', 'snow', 'desert'].includes(bg);
    }
  } catch (_) {}
  return true;
}

/** Multiplicateur de butin au palier `floor` (1-indexé). Croissance nette mais
 *  bornée : ×1 au premier, +0,5 par palier (max 3 paliers → ×1 / ×1,5 / ×2).
 *  C'est lui qui rend la descente tentante — et le K.O. coûteux. */
function dungeonMultFor(floor) {
  const f = Math.max(1, Number(floor) || 1);
  return Math.round((1 + (f - 1) * 0.5) * 100) / 100;
}

/** Victoires exigées pour ouvrir le palier suivant.
 *  PASSE 39d — les PV ne remontent plus entre les combats : un donjon entier
 *  se joue sur une seule réserve. Le quota est donc COURT (4 victoires au
 *  premier palier, +1 par palier) : chaque palier se purge en quelques
 *  combats et la difficulté vient de la descente, pas de la répétition. */
function dungeonQuotaFor(floor) {
  const f = Math.max(1, Number(floor) || 1);
  return 4 + (f - 1) * 1;
}

/** Butin déposé au sac à chaque victoire, avant multiplicateur.
 *  PASSE 39d — rehaussé : les donjons avancés (péage élevé) doivent payer
 *  nettement mieux que les donjons de début. Le péage a été plafonné (voir
 *  currency.js) et la récompense croît fortement avec les badges. */
function dungeonWinLoot(badgeReq) {
  const b = Math.max(0, Math.min(8, Number(badgeReq) || 0));
  return { tokens: 6 + b * 4, money: 80 + b * 60 };
}

/** Rendement d'une victoire une fois le quota du palier atteint : le palier est
 *  « épuisé ». On ne bloque rien — on rend simplement le sur-place beaucoup
 *  moins rentable que la descente, sans jamais punir le joueur prudent. */
const DUNGEON_EXHAUSTED_RATE = 0.4;

const DUNGEON_RULES = Object.freeze({
  depthMin: 1,
  depthMax: 3,
  multStep: 0.5,
  wipeKeepRatio: 0.5, // K.O. général : la moitié du sac survit
  completionBonus: 2.5, // le boss verse 2,5 × un palier de butin
  exhaustedRate: 0.4, // rendement d'un palier déjà purgé
  refundOnFirstFloorWipe: true,
});

// ── Accès à l'état ──────────────────────────────────────────────────────────

function _dgState() {
  return typeof globalThis !== 'undefined' && globalThis.G ? globalThis.G : null;
}
function _dgLoc(locId) {
  try {
    if (typeof globalThis.getLocObj === 'function') return globalThis.getLocObj(locId);
  } catch (_) {}
  return null;
}
function _dgNotify(msg, color) {
  try {
    if (typeof globalThis.notify === 'function') globalThis.notify(msg, color);
  } catch (_) {}
}
function _dgT(key, vars) {
  try {
    if (vars && typeof globalThis.tr === 'function') return globalThis.tr(key, vars);
    if (typeof globalThis.t === 'function') return globalThis.t(key);
  } catch (_) {}
  return key;
}

/** L'expédition en cours, ou null. Vit dans `G` : elle est donc sauvegardée
 *  telle quelle et survit à un rechargement de page (exigence du §5 de la
 *  proposition), sans aucune sérialisation dédiée à écrire. */
function currentDungeonRun() {
  const G = _dgState();
  const run = G ? G.dungeonRun : null;
  return run && run.active ? run : null;
}

/** Le joueur est-il en expédition dans CE lieu ? */
function isDungeonRunAt(locId) {
  const run = currentDungeonRun();
  return !!(run && run.loc === locId);
}

// ── Ouverture ───────────────────────────────────────────────────────────────

/**
 * Paie le péage et ouvre une descente. Renvoie l'expédition, ou null si le
 * lieu n'est pas un donjon / si les jetons manquent.
 */
function startDungeonRun(locId) {
  const G = _dgState();
  if (!G) return null;
  const loc = _dgLoc(locId);
  if (!loc || loc.type !== 'dungeon') return null;
  if (currentDungeonRun()) return currentDungeonRun(); // déjà en cours
  // PASSE 39g — retour joueur : « après … perdu une fois, je ne peux plus
  // combattre du tout en re-rentrant dans le donjon. » Avec une équipe
  // entièrement K.O., l'expédition ne pourrait s'engager en aucun combat
  // (le combat s'ouvrirait et se refermerait aussitôt) : on bloque l'entrée
  // avec un message clair au lieu de prélever le péage pour rien.
  try {
    const team = G && Array.isArray(G.team) ? G.team : [];
    if (team.length && !team.some((p) => p && Number(p.currentHP) > 0)) {
      _dgNotify(_dgT('dungeon_team_ko_blocked'), 'var(--red)');
      return null;
    }
  } catch (_) {}

  const badgeReq = Number(loc.badgeReq) || 0;
  const toll = typeof globalThis.dungeonToll === 'function' ? globalThis.dungeonToll(badgeReq) : 0;
  if (toll > 0) {
    const w = typeof globalThis.ensureWallet === 'function' ? globalThis.ensureWallet() : null;
    const have = w ? w.dungeonTokens || 0 : 0;
    if (have < toll) {
      const _tb = { need: String(toll), have: String(have) };
      _dgNotify(_dgT('dungeon_toll_blocked', _tb), 'var(--red)');
      return null;
    }
    if (typeof globalThis.spendDungeonTokens === 'function') globalThis.spendDungeonTokens(toll);
  }

  G.dungeonRun = {
    active: true,
    loc: locId,
    badgeReq,
    toll,
    // PASSE 39 — la profondeur dépend du DÉCOR : une forêt n'a pas de paliers.
    depth: dungeonDepthFor(badgeReq, locId),
    floor: 1,
    wins: 0, // victoires sur le palier courant
    totalWins: 0,
    bag: { tokens: 0, money: 0 },
    // PASSE 38c — le BUTIN DU DONJON au complet (un donjon = un combat de
    // route entier) : captures et objets cumulés sur tout le run, affichés
    // sous la carte et versés au résumé de session à la sortie.
    loot: { catches: [], items: {} },
    bossDone: false,
    startedAt: Date.now(),
    // PASSE 36 — carte du palier (variante D) : une case par combat.
    auto: false, // pilote automatique (débloqué après N complétions)
  };
  _dgGenFloorMap(G.dungeonRun);
  G.dungeonsExplored = (G.dungeonsExplored || 0) + 1;
  _dgSyncRunFlag();
  // PASSE 38e — le butin d'une expédition repart de ZÉRO : la session de
  // combat (captures, objets, argent, jetons) précédente est vidée, sinon le
  // panneau sous la carte affiche l'ancien butin (retour joueur : « quand on
  // commence un donjon le butin ne se reset pas »).
  try {
    const _b = globalThis.battle;
    if (_b) {
      _b.sessionCatches = [];
      _b.sessionItems = {};
      _b.sessionMoney = 0;
      _b.sessionTokens = 0;
    }
  } catch (_) {}
  _dgNotify(_dgT('dungeon_run_started', { depth: String(G.dungeonRun.depth) }), 'var(--blue)');
  refreshDungeonPanel();
  return G.dungeonRun;
}

// ── Progression ─────────────────────────────────────────────────────────────

/** PASSE 38c/39 — absorbe le butin du combat courant dans le butin du donjon.
 *  Chaque victoire vide la session de combat (captures, objets, ARGENT) dans
 *  `run.loot`, puis remet la session à zéro : le prochain engagement repart
 *  propre, le total, lui, ne se perd jamais. L'argent de combat (victoire
 *  sauvage + doublons) est RÉCOLÉ À PART : il a déjà été crédité au joueur
 *  par les flux normaux, on ne le verse donc pas dans le sac d'expédition
 *  (sinon il serait compté deux fois à la remontée) — il ne sert qu'à
 *  l'affichage du butin. */
function _dgHarvestRunLoot(run) {
  try {
    const b = globalThis.battle;
    if (!b || !run) return;
    if (!run.loot) run.loot = { catches: [], items: {}, money: 0 };
    if (!run.loot.catches) run.loot.catches = [];
    if (!run.loot.items) run.loot.items = {};
    if (typeof run.loot.money !== 'number') run.loot.money = 0;
    for (const c of b.sessionCatches || []) run.loot.catches.push(c);
    b.sessionCatches = [];
    for (const [k, q] of Object.entries(b.sessionItems || {})) {
      run.loot.items[k] = (run.loot.items[k] || 0) + Number(q || 0);
    }
    b.sessionItems = {};
    run.loot.money += Number(b.sessionMoney) || 0;
    b.sessionMoney = 0;
  } catch (_) {}
}

/** Une victoire de plus dans l'expédition : elle remplit le sac. */
function dungeonOnWin() {
  const run = currentDungeonRun();
  if (!run) return null;
  _dgHarvestRunLoot(run);
  const loot = dungeonWinLoot(run.badgeReq);
  const mult = dungeonMultFor(run.floor);
  // Palier déjà purgé -> rendement réduit (voir DUNGEON_EXHAUSTED_RATE).
  const rate = run.wins >= dungeonQuotaFor(run.floor) ? DUNGEON_EXHAUSTED_RATE : 1;
  // PASSE 36 — case ÉLITE : le risque paie double (arbitrage de la carte).
  const b = typeof globalThis !== 'undefined' ? globalThis.battle : null;
  const elite = !!(b && b.dungeonElite);
  const eliteRate = elite ? 2 : 1;
  run.bag.tokens += Math.max(1, Math.round(loot.tokens * mult * rate * eliteRate));
  run.bag.money += Math.max(1, Math.round(loot.money * mult * rate * eliteRate));
  run.wins += 1;
  run.totalWins += 1;
  // PASSE 36/37 — la victoire solde la case engagée.
  if (run.map && run.pendingNode) {
    const n = _dgNode(run, run.pendingNode);
    if (n) {
      n.done = true;
      // PASSE 37 — le boss du palier battu laisse place à l'ECHELLE, et toute
      // la carte se dévoile pour laisser le temps de ramasser coffres/combats.
      // PASSE 38c — plus de toast « Boss vaincu… » (retour joueur) : l'échelle
      // qui remplace le boss est assez explicite seule.
      if (n.type === 'boss' && !dungeonIsBossFloor()) {
        run.bossDefeated = true;
        n.type = 'ladder';
        _dgRevealAll(run);
      }
    }
    run.pendingNode = null;
  }
  // PASSE 39 — la grille et le butin doivent refléter la victoire (case
  // soldée, échelle, sac, captures) même quand le combat n'était rattaché à
  // AUCUNE case (retour joueur : « le butin n'est pas visible »).
  refreshDungeonPanel();
  if (b) b.dungeonElite = false;
  return run;
}

/** PASSE 39g — chemin le plus court (BFS) de la position vers le PROCHAIN
 *  engagement du plateau : case de combat / élite non soldée ; le BOSS ne
 *  devient cible que s'il est le dernier engagement restant (combats vidés).
 *  L'échelle est exclue du parcours : le bouton n'engage jamais une descente.
 *  (Le garde du boss reste un combat comme un autre : on le traverse en le
 *  battant.) */
function _dgNearestEngagementPath(run) {
  if (!run || !run.map || !run.map.tiles) return null;
  const tiles = run.map.tiles;
  const open = Object.values(tiles).filter(
    (t) => !t.done && (t.type === 'combat' || t.type === 'elite' || t.type === 'boss')
  );
  if (!open.length) return null;
  const combats = open.filter((t) => t.type !== 'boss');
  const pool = (combats.length ? combats : open).map((t) => t.id);
  const prev = { [run.pos]: null };
  const queue = [run.pos];
  let found = null;
  while (queue.length) {
    const cur = queue.shift();
    if (cur !== run.pos && pool.includes(cur)) {
      found = cur;
      break;
    }
    const t = tiles[cur];
    if (!t) continue;
    for (const [dc, dr] of _DG_DIRS) {
      const n = tiles[_dgNodeId(t.col + dc, t.row + dr)];
      if (!n || n.id in prev || n.type === 'ladder') continue;
      prev[n.id] = cur;
      queue.push(n.id);
    }
  }
  if (!found) return null;
  const path = [];
  let p = found;
  while (p) {
    path.unshift(p);
    p = prev[p];
  }
  return path;
}

/**
 * Relance un combat depuis le bandeau. Le drapeau `pendingDungeonBoss` est
 * réarmé juste avant l'appel : `endBattle()` a pu le remettre à zéro, or c'est
 * lui qui fait entrer le gardien en scène.
 * PASSE 39g — retour joueur : « après l'avoir fait une fois, ou perdu une
 * fois, je ne peux plus combattre du tout en re-rentrant dans le donjon. »
 * Le bouton « Engager l'expédition » se contentait de faire un PAS vers une
 * case voisine — or la case de départ est toujours dans le sas (3 cases
 * vides) : cliquer ne lançait AUCUN combat, et les cases sous brouillard
 * n'étant pas encore révélées, le joueur se retrouvait bloqué à chaque
 * nouvelle carte. Le bouton MARCHE donc désormais jusqu'au prochain
 * engagement (brouillard levé au passage, coffres soldés au besoin) et
 * s'y engage : une pression = un combat.
 */
function dungeonFight() {
  const run = currentDungeonRun();
  if (!run) return null;
  // PASSE 38e — PLUS JAMAIS de gardien auto sur la carte : ce bloc posait
  // `pendingDungeonBoss` dès que le quota de victoires était atteint
  // (dungeonFloorCleared), et n'importe quel combat engagé ensuite devenait
  // le boss (retour joueur : « lancer un combat normal lance celui du boss,
  // comme si l'ancien compteur de boss au bout de N combats était encore
  // actif »). Le gardien ne s'engage QUE par un clic sur SA case :
  // `dungeonMoveTo` pose le drapeau quand la case cliquée EST le boss.
  // La relance historique (sans carte) garde son enchaînement quota → boss.
  if (!run.map && dungeonIsBossFloor() && dungeonFloorCleared()) {
    const b = globalThis.battle;
    if (b) b.pendingDungeonBoss = true;
  }
  // PASSE 37/39f — sans case choisie : on va au combat le PLUS PROCHE.
  if (run.map && run.map.grid && !run.pendingNode) {
    // 1) Un combat/élite VOISIN : engagement direct (une case de plus).
    const near = _dgNeighbors(run, run.pos);
    const adjacent = near.find((x2) => (x2.type === 'combat' || x2.type === 'elite') && !x2.done);
    if (adjacent) return dungeonMoveTo(adjacent.id);
    // 2) Sinon : marche la plus courte jusqu'à l'engagement le plus proche
    //    (le brouillard se lève au fil des pas), puis on s'y engage.
    const path = _dgNearestEngagementPath(run);
    if (path && path.length > 1) {
      const tiles = run.map.tiles;
      for (let i = 1; i < path.length - 1; i++) {
        const step = tiles[path[i]];
        if (!step || step.type === 'ladder') break; // ne descend jamais par le bouton
        dungeonMoveTo(step.id);
      }
      const finalTile = tiles[path[path.length - 1]];
      if (
        finalTile &&
        !finalTile.done &&
        (finalTile.type === 'combat' || finalTile.type === 'elite' || finalTile.type === 'boss')
      ) {
        return dungeonMoveTo(finalTile.id);
      }
    }
    // 3) Plus aucun engagement sur le plateau : le palier est purgé — on ne
    //    marche pas dans le vide (l'échelle attend, ou on remonte encaisser).
    if (dungeonFloorCleared()) {
      _dgNotify(_dgT('dungeon_log_floor_done'), 'var(--blue)');
      return run;
    }
    // Repli historique : un pas vers un combat voisin, sinon une case cachée.
    const n =
      near.find((x2) => x2.type === 'combat' || x2.type === 'elite') ||
      near.find((x2) => !x2.revealed) ||
      near[0];
    if (n) return dungeonMoveTo(n.id);
  }
  try {
    if (typeof globalThis.exploreArea === 'function') globalThis.exploreArea();
  } catch (_) {}
  return run;
}

/** Le palier courant est-il purgé ?
 *  PASSE 36 — CARTE DU DONJON (variante D de PROPOSITION-CHOIX-PAR-COMBAT) :
 *  le quota de victoires est remplacé par « atteindre le bout de la ligne » :
 *  un palier est purgé quand le joueur a rejoint la case de sortie
 *  (`run.exitReached`). La condition historique `wins >= quota` est conservée
 *  en repli : elle verrouille les harnais qui enchaînent `dungeonOnWin()` sans
 *  carte, et elle borne le farm d'un palier déjà traversé. */
function dungeonFloorCleared() {
  const run = currentDungeonRun();
  if (!run) return false;
  return run.bossDefeated === true || run.wins >= dungeonQuotaFor(run.floor);
}

/** Le palier courant est-il celui du boss ? */
function dungeonIsBossFloor() {
  const run = currentDungeonRun();
  return !!(run && run.floor >= run.depth);
}

/** Descendre d'un palier. Exige que le palier courant soit purgé. */
function dungeonDescend() {
  // PASSE 35 — la descente coupe le combat courant, puis la chaîne repart
  // toute seule au nouveau palier (quota remis à zéro) : plus de bouton.
  _dgSuppressAutoResume();
  _dgStopBattle();
  const run = currentDungeonRun();
  if (!run) return null;
  if (!dungeonFloorCleared()) {
    _dgNotify(
      _dgT('dungeon_floor_not_cleared', {
        need: String(dungeonQuotaFor(run.floor)),
        have: String(run.wins),
      }),
      'var(--red)'
    );
    return run;
  }
  if (run.floor >= run.depth) return run; // au boss, on ne descend plus
  run.floor += 1;
  run.wins = 0;
  _dgGenFloorMap(run); // PASSE 37 — nouveau plateau quadrillé
  _dgNotify(
    _dgT('dungeon_descend', {
      floor: String(run.floor),
      depth: String(run.depth),
      mult: dungeonMultFor(run.floor).toFixed(1),
    }),
    'var(--blue)'
  );
  refreshDungeonPanel();
  // Nouveau palier, quota vierge : la chaîne de combats reprend d'elle-même.
  _dgNoAutoResume = false;
  _dgAutoResume();
  // PASSE 36 — pilote auto : il entame lui-même la nouvelle carte.
  _dgAutoKick(run, 500);
  return run;
}

// ── Sorties ─────────────────────────────────────────────────────────────────

/** Verse le contenu du sac au joueur. */
function _dgCredit(bag) {
  const G = _dgState();
  if (!G || !bag) return;
  if (bag.tokens > 0 && typeof globalThis.gainDungeonTokens === 'function') {
    globalThis.gainDungeonTokens(bag.tokens);
  }
  if (bag.money > 0) {
    G.money = (G.money || 0) + bag.money;
    try {
      if (typeof globalThis.updateHeader === 'function') globalThis.updateHeader();
    } catch (_) {}
  }
}

/** Remonter et encaisser : sortie propre, le sac est versé en entier. */
/**
 * PASSE 33 — quitter une expédition met FIN AU COMBAT.
 * Retour joueur : « le remonter et encaisser n'arrête pas le combat, ce serait
 * logique qu'il l'arrête. » On coupe donc la session en cours avant de créditer.
 */
function _dgStopBattle() {
  try {
    const b = globalThis.battle;
    if (b && b.active) {
      b.chill = false; // empêche la chaîne de relancer un sauvage
      b.pendingDungeonBoss = false;
      if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    }
  } catch (_) {}
}

/**
 * PASSE 34 — l'écran « Exploration au repos » ne revient QU'À LA FIN du run.
 * `endBattle()` ne le rétablit plus tant que `G.dungeonRun` est actif (sinon il
 * réapparaissait entre deux paliers) : c'est donc ici, une fois le run soldé,
 * qu'on le remet en place.
 */
/**
 * PASSE 34 — drapeau d'expédition posé sur <html>.
 * Le style INLINE ne tient pas : le morph du DOM (`pwMorphHtml`) supprime
 * l'attribut `style` des nœuds qu'il reconstruit, si bien que le
 * `display:none` posé par `endBattle()` disparaissait et « Exploration au
 * repos » revenait entre deux paliers. Un attribut sur <html> survit à tous
 * les rendus : c'est la feuille de style qui masque l'écran (§34.3).
 */
function _dgSyncRunFlag() {
  try {
    if (typeof document === 'undefined') return;
    const run = currentDungeonRun();
    const root = document.documentElement;
    if (run && run.active) root.setAttribute('data-dungeon-run', '1');
    else root.removeAttribute('data-dungeon-run');
  } catch (_) {}
}

/**
 * PASSE 35 — RELANCE AUTOMATIQUE.
 * Règle demandée par le joueur : « si le quota n'est pas atteint, le combat se
 * relance automatiquement ; sinon, rien. » Il n'y a donc plus aucun bouton
 * « Reprendre le combat » : soit la chaîne repart d'elle-même, soit le palier
 * est purgé et le joueur choisit de descendre ou de remonter.
 *
 * `_dgNoAutoResume` est levé par toutes les sorties VOLONTAIRES (remontée,
 * abandon, descente, wipe) : on ne relance jamais un combat que le joueur vient
 * de clore, sinon quitter deviendrait impossible.
 */
let _dgNoAutoResume = false;

function _dgAutoResume() {
  try {
    if (_dgNoAutoResume) {
      _dgNoAutoResume = false;
      return false;
    }
    const run = currentDungeonRun();
    if (!run || !run.active) return false;
    // PASSE 36 — CARTE : plus de relance sauvage aveugle ; c'est le choix de
    // case (joueur ou pilote auto) qui engage le combat suivant.
    if (run.map) return false;
    const b = globalThis.battle;
    if (b && b.active) return false;
    // Équipe hors d'état de combattre : on ne relance pas dans le vide.
    if (typeof globalThis.aliveCount === 'function' && globalThis.aliveCount() <= 0) return false;
    if (dungeonFloorCleared()) return false; // quota atteint → rien
    setTimeout(() => {
      try {
        const r = currentDungeonRun();
        if (!r || !r.active) return;
        const bb = globalThis.battle;
        if (bb && bb.active) return;
        if (dungeonFloorCleared()) return;
        dungeonFight();
      } catch (_) {}
    }, 700);
    return true;
  } catch (_) {
    return false;
  }
}

/** Marque la prochaine fin de combat comme volontaire (pas de relance auto). */
function _dgSuppressAutoResume() {
  _dgNoAutoResume = true;
}

/**
 * PASSE 35 — le bouton « Quitter » du bas de la fenêtre de combat.
 * Retour joueur : « le quitter en bas du combat fait comme le remonter et
 * encaisser, ce n'est pas ce qu'il doit faire » et « on ne doit pas pouvoir
 * quitter le combat puis le reprendre ».
 * En expédition, « Quitter » n'est donc plus une simple fuite (qui laissait le
 * run en suspens avec un bouton de reprise) et ce n'est pas non plus un
 * encaissement : c'est un ABANDON. On sort du donjon en laissant le sac sur
 * place. Encaisser reste l'affaire du bouton « Remonter et encaisser ».
 */
function dungeonQuitFromBattle() {
  const run = currentDungeonRun();
  if (!run) return null;
  const perdu = { tokens: run.bag.tokens, money: run.bag.money };
  _dgSuppressAutoResume();
  const res = dungeonAbandon();
  _dgNotify(
    _dgT('dungeon_quit_battle', {
      tokens: String(perdu.tokens),
      money: String(perdu.money),
    }),
    'var(--red)'
  );
  return res;
}

function _dgRestoreIdleScreen() {
  try {
    const idle = document.getElementById('battle-idle-screen');
    const scene = document.getElementById('battle-active-scene');
    const b = globalThis.battle;
    if (b && b.active) return; // un autre combat tourne
    if (idle) idle.style.display = 'flex';
    if (scene) {
      scene.style.display = 'none';
      scene.classList.remove('is-live');
    }
  } catch (_) {}
}

/**
 * PASSE 39h — retour joueur : « après avoir fini un donjon, ma team n'est pas
 * heal, ce qui est vraiment problématique. » Pendant l'expédition il ne se
 * passe toujours AUCUN soin (règle 38e : les PV durent de combat en combat) ;
 * mais à la CLÔTURE de l'expédition (victoire du gardien, remontée, abandon
 * ou défaite — V7-R1 #5), l'équipe se repose en entier — PV complets, états
 * purgés — pour que la prochaine expédition reparte en pleine forme.
 */
function _dgRestTeam() {
  try {
    const G = _dgState();
    if (!G || !Array.isArray(G.team) || !G.team.length) return false;
    let rested = false;
    for (const p of G.team) {
      if (!p) continue;
      if (Number(p.currentHP) < Number(p.maxHP)) {
        p.currentHP = p.maxHP;
        rested = true;
      }
      if (p.status) {
        p.status = null;
        p.statusTurns = 0;
        rested = true;
      }
    }
    if (rested) _dgNotify(_dgT('dungeon_run_team_healed'), 'var(--green)');
    return rested;
  } catch (_) {
    return false;
  }
}

function dungeonAscend() {
  const run = currentDungeonRun();
  if (!run) return null;
  _dgSuppressAutoResume();
  // PASSE 39h — repos AVANT d'arrêter le combat : le renderTeamWindow() de
  // endBattle() affichera directement l'équipe en pleine forme.
  _dgRestTeam();
  _dgStopBattle();
  const bag = { tokens: run.bag.tokens, money: run.bag.money };
  _dgCredit(bag);
  // PASSE 38c — un donjon = un combat de route ENTIER : à la sortie, le
  // résumé de session s'ouvre avec TOUT le butin du run (captures, objets,
  // victoires, durée). On monte la session de combat à partir de `run.loot`.
  _dgHarvestRunLoot(run);
  try {
    const b = globalThis.battle;
    if (b) {
      b.sessionCatches = (run.loot && run.loot.catches) || [];
      b.sessionItems = (run.loot && run.loot.items) || {};
      // PASSE 39 — l'argent gagné en combat pendant le run paraît au résumé.
      b.sessionMoney = (run.loot && run.loot.money) || 0;
      // PASSE 39 — les jetons encaissés paraissent aussi au résumé (monnaies).
      b.sessionTokens = (bag && bag.tokens) || 0;
      b.sessionWins = run.totalWins || 0;
      b.sessionStartedAt = run.startedAt;
    }
  } catch (_) {}
  const G = _dgState();
  if (G) G.dungeonRun = null;
  _dgNotify(
    _dgT('dungeon_ascend', {
      tokens: String(bag.tokens),
      money: String(bag.money),
      floor: String(run.floor),
    }),
    'var(--green)'
  );
  refreshDungeonPanel();
  _dgSyncRunFlag();
  _dgRestoreIdleScreen();
  setTimeout(() => {
    try {
      if (typeof globalThis.openBattleSummary === 'function') globalThis.openBattleSummary(true);
    } catch (_) {}
  }, 250);
  return { outcome: 'ascend', floor: run.floor, gained: bag };
}

/**
 * Équipe entièrement K.O. : la descente s'arrête, la MOITIÉ du sac est perdue.
 * Au premier palier, le péage est remboursé — l'expédition n'a pas eu lieu.
 */
function dungeonOnWipe() {
  const run = currentDungeonRun();
  if (!run) return null;
  _dgSuppressAutoResume();
  const kept = {
    tokens: Math.floor(run.bag.tokens * DUNGEON_RULES.wipeKeepRatio),
    money: Math.floor(run.bag.money * DUNGEON_RULES.wipeKeepRatio),
  };
  const lost = { tokens: run.bag.tokens - kept.tokens, money: run.bag.money - kept.money };
  let refunded = 0;
  if (DUNGEON_RULES.refundOnFirstFloorWipe && run.floor === 1 && run.toll > 0) {
    refunded = run.toll;
    kept.tokens += refunded;
  }
  _dgCredit(kept);
  const G = _dgState();
  if (G) G.dungeonRun = null;
  _dgRestTeam(); // V7-R1 · #5 — expédition soldée → équipe soignée (comme à la remontée).
  const _wk = { tokens: String(kept.tokens), money: String(kept.money) };
  _dgNotify(_dgT('dungeon_wipe', _wk), 'var(--red)');
  refreshDungeonPanel();
  _dgSyncRunFlag();
  _dgRestoreIdleScreen();
  _dgRelaunchHook(run, 'wipe');
  return { outcome: 'wipe', floor: run.floor, kept, lost, refunded };
}

/** Boss vaincu : bonus de complétion, puis clôture de la session. */
function dungeonOnBossDefeated() {
  const run = currentDungeonRun();
  if (!run) return null;
  const loot = dungeonWinLoot(run.badgeReq);
  const mult = dungeonMultFor(run.depth);
  run.bag.tokens += Math.round(loot.tokens * mult * DUNGEON_RULES.completionBonus);
  run.bag.money += Math.round(loot.money * mult * DUNGEON_RULES.completionBonus);
  run.bossDone = true;
  if (globalThis.pwEmit) globalThis.pwEmit('bossDefeated', { dungeon: run.id, depth: run.depth }); // V7-R2 · SND-02 (EVENTS.BOSS_DEFEATED)
  const G = _dgState();
  if (G) {
    G.dungeonClears = G.dungeonClears || {};
    G.dungeonClears[run.loc] = (G.dungeonClears[run.loc] || 0) + 1;
  }
  const res = dungeonAscend();
  if (res) res.outcome = 'cleared';
  _dgNotify(_dgT('dungeon_cleared'), 'var(--green)');
  _dgRelaunchHook(run, 'cleared');
  return res;
}
/** V7-R3 · D30 — expédition soldée (K.O.) ou achevée (gardien) → relance auto
 *  (module automation/auto-dungeon-relaunch.js ; jamais sur abandon, ni en PW_FF). */
function _dgRelaunchHook(run, outcome) {
  const f = globalThis.scheduleAutoDungeonRelaunch;
  if (f && run && globalThis.PW_FF !== true) f({ loc: run.loc, mode: run.auto || null, outcome });
}

/** Abandon explicite sans encaisser (sécurité : quitter la zone). */
function dungeonAbandon() {
  _dgSuppressAutoResume();
  _dgStopBattle();
  const G = _dgState();
  if (!G || !currentDungeonRun()) return null;
  G.dungeonRun = null;
  _dgRestTeam(); // V7-R1 · #5 — fin de donjon (abandon) = équipe soignée.
  refreshDungeonPanel();
  _dgSyncRunFlag();
  _dgRestoreIdleScreen();
  return { outcome: 'abandoned' };
}

/** Échappement minimal — les valeurs affichées sont numériques ou traduites,
 *  mais on ne construit jamais de HTML sans filtrer. */
// V7 · DBT-05 — un seul échappement HTML (engine/render/vdom.js `esc`) ; les
// attributs générés ici sont toujours entre guillemets doubles.
function _dgEsc(v) {
  return esc(v == null ? '' : v);
}

/**
 * PASSE 33 — LE SUIVI D'EXPÉDITION S'AFFICHE DANS LA FENÊTRE DE COMBAT.
 * Retour joueur : « le fait que l'affichage soit dans la fenêtre lieu et non
 * dans celle de combat est un problème ». Le joueur regarde le combat, pas
 * l'onglet du lieu : le bandeau (palier, quota, sac, risque, boutons) est donc
 * rendu au-dessus de la scène. Le panneau du lieu reste en place — il sert à
 * LANCER l'expédition ; ce bandeau sert à la PILOTER.
 */
/** PASSE 37/38 — le plateau quadrillé, façon Pokéclicker : cases cachées sous
 *  un brouillard, révélées au passage ; le boss battu laisse place à l'échelle.
 *  PASSE 38 — retour joueur : « il faut des assets : vide → case vide, combat
 *  → symbole de pokéball, boss → symbole de boss ». Les icônes sont les vraies
 *  tuiles du dépôt Pokéclicker (downloadées dans src/assets/images/dungeon/,
 *  déclarées dans tools/download_assets.py) : encounter = combat, boss, chest,
 *  ladder. L'élite garde SA couleur orange (cadre + fond) pour rester distincte
 *  du boss. La case où l'on se trouve affiche le sprite PNJ de la carte. */
/** PASSE 38c — les icônes sont des GLYPHES MONOCHROMES (noir sur transparent)
 *  teintés en CSS par masque : `background-color: currentColor` + `mask-image`
 *  sur le sprite. Une teinte partagée (--pw-dgn-tint) pour pokéball et coffre ;
 *  le boss est ROUGE (retour joueur 39 : « le boss n'est plus en rouge »),
 *  l'échelle garde sa teinte propre, l'élite reste orange.
 *  PASSE 39 — le sprite est passé en URL ABSOLUE : la propriété CSS custom
 *  `--ic` est substituée dans `mask-image` par la feuille de style, et les
 *  navigateurs résolvent l'url() par rapport à CETTE feuille — le chemin
 *  relatif `src/assets/…` se retrouvait donc préfixé par `src/assets/styles/`
 *  et 404 → aucune icône n'était visible (retour joueur : « il n'y a plus
 *  aucun sprite/icon sur les cases »). Une URL absolue échappe à cette
 *  résolution, quel que soit le contexte de servation. */
function _dgGlyph(src) {
  let abs = src;
  try {
    if (typeof location !== 'undefined') abs = new URL(src, location.href).href;
  } catch (_) {}
  return '<span class="pw-dgn-ic" style="--ic:url(\'' + abs + '\')"></span>';
}

/** Icône de la case : combat = POKÉBALL de la barre de titre (retour 38e :
 *  « pourquoi tu n'utilises pas celui qui est dans le titre de la fenêtre
 *  pokéball ? »), élite = même pokéball + étoile (combat corsé, butin ×2),
 *  boss = symbole de boss, coffre = coffre (vidé → sans icône), échelle =
 *  échelle, vide/brouillard = rien. La couleur des icônes vient du CSS de la
 *  case (masque + currentColor) : boss ROUGE, élite ORANGE, coffre JAUNE,
 *  échelle BLEUE, combat VIOLET — jamais deux cases de même couleur.
 *  PASSE 38c — une case de combat TERMINÉE devient vide (style Pokéclicker) :
 *  seul reste le sol de la case. */
function _dgTileIcon(t) {
  if (!t.revealed) return '<span class="pw-dgn-fogq">?</span>';
  switch (t.type) {
    case 'combat':
      return t.done ? '' : _dgGlyph('src/assets/images/dungeon/pokeball.svg');
    case 'elite':
      return t.done
        ? ''
        : '<span class="pw-dgn-elite">' +
            _dgGlyph('src/assets/images/dungeon/pokeball.svg') +
            '<span class="pw-dgn-ic pw-dgn-star" style="--ic:url(\'' +
            _dgAbs('src/assets/images/dungeon/star.svg') +
            '\')"></span>' +
            '</span>';
    case 'boss':
      return _dgGlyph('src/assets/images/dungeon/boss.png');
    case 'chest':
      return t.done ? '' : _dgGlyph('src/assets/images/dungeon/chest.png');
    case 'ladder':
      return _dgGlyph('src/assets/images/dungeon/ladder.png');
    default:
      return ''; // case vide : pas d'icône
  }
}

/** URL absolue (échappe à la résolution relative contre la feuille CSS). */
function _dgAbs(src) {
  try {
    if (typeof location !== 'undefined') return new URL(src, location.href).href;
  } catch (_) {}
  return src;
}

function _dgGridHtml(run) {
  const { cols, rows, tiles } = run.map;
  const open = new Set(_dgNeighbors(run, run.pos).map((n) => n.id));
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tiles[_dgNodeId(c, r)];
      const label = _dgEsc(_dgT(t.revealed ? 'dungeon_node_' + t.type : 'dungeon_node_fog'));
      // PASSE 38 — toute case VISIBLE est atteignable (téléportation) ; les
      // cases voisines sous brouillard restent cliquables pour être découvertes.
      const clickable = t.revealed || open.has(t.id);
      const cls = [
        'pw-dgn-tile',
        't-' + t.type,
        t.id === run.pos ? 'is-here' : null,
        !t.revealed ? 'is-fog' : null,
        t.done && t.id !== run.pos ? 'is-done' : null,
        clickable ? 'is-open' : null,
      ]
        .filter(Boolean)
        .join(' ');
      // Sur l'échelle elle-même, le clic DESCEND ; ailleurs, il DÉPLACE.
      const isLadderHere = t.type === 'ladder' && t.id === run.pos;
      const callAttrs = isLadderHere
        ? ' data-call="dungeonDescend"'
        : ' data-call="dungeonMoveTo" data-call-args="\'' + t.id + '\' "';
      // PASSE 38 — la case où l'on est affiche le sprite PNJ de la carte
      // (même image que le joueur sur la carte des régions).
      const content =
        t.id === run.pos
          ? '<img class="pw-dgn-player" src="src/assets/images/trainers/profil/trainer-54.png" alt="" draggable="false">'
          : _dgTileIcon(t);
      cells.push(
        '<button type="button" class="' +
          cls +
          '" data-action="legacy-call"' +
          callAttrs +
          ' title="' +
          label +
          '" aria-label="' +
          label +
          '">' +
          content +
          '</button>'
      );
    }
  }
  return '<div class="pw-dgn-grid" style="--cols:' + cols + '">' + cells.join('') + '</div>';
}

/** PASSE 39 — formatage d'un nombre sans dépendre de formatNumber (toujours
 *  disponible en jeu, mais pas forcément dans les harnais de test). */
function formatNumberSafe(n) {
  try {
    if (typeof globalThis.formatNumber === 'function') return globalThis.formatNumber(n);
  } catch (_) {}
  return String(n);
}

function renderBattleDungeonBar() {
  try {
    if (typeof document === 'undefined') return;
    _dgInitDungeonKeys();
    const host = document.getElementById('battle-dungeon-bar');
    if (!host) return;
    const sum = dungeonRunSummary();
    if (!sum) {
      host.hidden = true;
      if (typeof globalThis._pwSetHtmlSafe === 'function') globalThis._pwSetHtmlSafe(host, '');
      else host.textContent = '';
      return;
    }
    host.hidden = false;
    const run = currentDungeonRun();

    const rows = [];
    // ── entête : titre, palier, multiplicateur, pilote auto (3 MODES) ──────
    // PASSE 38c — le pilote auto propose TROIS modes à la façon des mods
    // Pokéclicker : rapide vers le boss / plateau entier (farm) / coffres
    // uniquement. Cliquer sur le mode actif l'éteint.
    const AUTO_MODES = ['boss', 'farm', 'chest'];
    const autoBtn = sum.autoUnlocked
      ? '<span class="pw-bdg-auto">' +
        AUTO_MODES.map(
          (m) =>
            '<button class="hbtn pw-bdg-btn pw-bdg-auto-mode' +
            (sum.auto === m ? ' is-on' : '') +
            '" data-action="legacy-call" data-call="dungeonSetAuto" data-call-args="' +
            (sum.auto === m ? 'off' : m) +
            '">' +
            _dgEsc(_dgT('dungeon_auto_mode_' + m)) +
            '</button>'
        ).join('') +
        '</span>'
      : '<span class="pw-bdg-locked pw-bdg-auto-locked">' +
        _dgEsc(_dgT('dungeon_auto_locked', { need: String(DUNGEON_AUTO_UNLOCK_CLEARS) })) +
        '</span>';
    // PASSE 39 — pas de palier affiché pour un donjon à UN seul niveau
    // (forêt ≠ grotte) : « Palier 1 / 1 » n'a aucun sens.
    const floorLabel =
      sum.depth > 1
        ? '<span class="pw-bdg-floor">' +
          _dgEsc(
            _dgT('dungeon_floor_label', {
              floor: String(sum.floor),
              depth: String(sum.depth),
            })
          ) +
          '</span>'
        : '';
    rows.push(
      '<div class="pw-bdg-head">' +
        '<span class="pw-bdg-title">' +
        _dgEsc(_dgT('dungeon_bar_title')) +
        '</span>' +
        floorLabel +
        '<span class="pw-bdg-mult">×' +
        _dgEsc(sum.mult) +
        '</span>' +
        autoBtn +
        '</div>'
    );

    // ── le plateau quadrillé (brouillard de guerre inclus) ─────────────────
    // PASSE 38c — PLUS de légende ni d'aide clavier (retours joueur) : les
    // cases sont assez explicites seules (icône + couleur par type).
    if (run && run.map && run.map.grid) {
      rows.push('<div class="pw-bdg-map">' + _dgGridHtml(run) + '</div>');
    }

    // ── PASSE 38c/39e — LE BUTIN DU DONJON VIT SOUS LA CARTE ────────────────
    // PASSE 39e — plus de panneau parallèle : c'est la réglette COMMUNE
    // #battle-loot-inline (celle des combats normaux) qui s'affiche sous la
    // carte, alimentée par getBattleSessionSummaryData (tout le run agrégé).
    // renderBattleLoot est appelé à la fin de ce rendu pour la tenir à jour.

    // PASSE 39 — plus de « Victoires : X / Y » ni de barre de progression :
    // avec la carte, le quota ne sert à rien (retour joueur). Le palier se
    // purge en rejoignant le boss : l'échelle qui le remplace est la seule
    // clé de la descente.

    const acts = [];
    // PASSE 38c — « Remonter et encaisser » est ROUGE, comme le bouton
    // quitter en combat : c'est une action importante. La classe pw-btn-danger
    // sort le bouton du skin bouton générique (qui impose son fond en
    // !important) ; pw-bdg-up apporte la teinte rouge.
    acts.push(
      '<button class="hbtn pw-bdg-btn pw-bdg-up pw-btn-danger" data-action="legacy-call" ' +
        'data-call="dungeonAscend">' +
        _dgEsc(
          _dgT('dungeon_ascend_btn', {
            tokens: String(sum.bag.tokens),
            money: String(sum.bag.money),
          })
        ) +
        '</button>'
    );
    // PASSE 35/37 — pas de bouton « Reprendre » : ce sont les pas sur la
    // grille qui engagent les combats ; le bouton n'existe que pour le tout
    // premier engagement de l'expédition.
    const b = globalThis.battle;
    const jamaisEngage = sum.totalWins === 0;
    if ((!b || !b.active) && jamaisEngage && !sum.cleared) {
      acts.push(
        '<button class="hbtn pw-bdg-btn pw-bdg-fight" data-action="legacy-call" ' +
          'data-call="dungeonFight">' +
          _dgEsc(_dgT('dungeon_bar_fight')) +
          '</button>'
      );
    }
    rows.push('<div class="pw-bdg-actions">' + acts.join('') + '</div>');

    const html = rows.join('');
    if (typeof globalThis._pwSetHtmlSafe === 'function') globalThis._pwSetHtmlSafe(host, html);
    else if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(host, html);
    // PASSE 39e — la réglette de butin unifiée, sous la carte : toujours
    // synchronisée (ouverture, victoire, coffre, fin de combat).
    try {
      if (typeof globalThis.renderBattleLoot === 'function') globalThis.renderBattleLoot();
    } catch (_) {}
  } catch (_) {}
}

/** Rafraîchit les DEUX surfaces : le panneau du lieu (qui lance l'expédition)
 *  et le bandeau de la fenêtre de combat (qui la pilote). */
function refreshDungeonPanel() {
  try {
    if (typeof document === 'undefined') return;
    _dgSyncRunFlag();
    if (globalThis.PW_FF === true) return; // V7-R2 — rattrapage AFK : rendu différé (dungeon-offline.js)
    const el =
      document.getElementById('location-info-panel') || document.getElementById('tab-content');
    if (el && typeof globalThis.renderLocInfo === 'function') globalThis.renderLocInfo(el);
    renderBattleDungeonBar();
  } catch (_) {}
}

/** Résumé prêt à afficher pour la fenêtre de lieu. */
function dungeonRunSummary() {
  const run = currentDungeonRun();
  if (!run) return null;
  return {
    loc: run.loc,
    floor: run.floor,
    depth: run.depth,
    mult: dungeonMultFor(run.floor),
    wins: run.wins,
    totalWins: run.totalWins || 0,
    quota: dungeonQuotaFor(run.floor),
    cleared: dungeonFloorCleared(),
    isBossFloor: dungeonIsBossFloor(),
    bag: { tokens: run.bag.tokens, money: run.bag.money },
    atRisk: {
      tokens: Math.ceil(run.bag.tokens * (1 - DUNGEON_RULES.wipeKeepRatio)),
      money: Math.ceil(run.bag.money * (1 - DUNGEON_RULES.wipeKeepRatio)),
    },
    // PASSE 36 — la carte du palier et l'état du pilote automatique.
    map: run.map || null,
    pos: run.pos || null,
    auto: run.auto || false,
    autoUnlocked: dungeonAutoUnlocked(run.loc),
    // PASSE 38c — tout le butin du donjon (affiché sous la carte).
    loot: run.loot || { catches: [], items: {} },
  };
}

// ── PASSE 37 — LA VRAIE CARTE QUADRILLÉE, façon Pokéclicker ─────────────────
// Retour joueur (passe 36) : « ce que tu as fait c'est plus un choix à branche
// et non une vraie carte » ; il faut « une carte quadrillée avec des cases
// combats, des cases coffres, des cases vides, des cases boss », comme
// Pokéclicker (DungeonRunner : tuiles entrance/enemy/chest/boss/ladder,
// déplacement case par case au clavier, brouillard de guerre).
//
// LE PLATEAU : grille 7×5 de cases cachées (brouillard). Le joueur entre par
// la case entrée ; chaque pas (clic sur une case voisine ou flèche) révèle la
// case et déclenche son contenu :
//   · vide / entrée  → rien ;
//   · combat (parfois ÉLITE, butin ×2) → un engagement ;
//   · coffre         → butin immédiat dans le sac ;
//   · boss           → LE boss du palier (unique).
// Une fois le boss trouvé et battu, **une échelle prend sa place** pour
// descendre au palier suivant, et **toute la carte se dévoile** : le joueur
// prend le temps de ramasser coffres et combats restants avant de descendre.
// Au palier final, le boss est le GARDIEN (espèce d'élite, furie) : le battre
// clôt l'expédition (bonus de complétion), comme avant.
//
// CLAVIER : les flèches déplacent le joueur d'une case (4 directions).
// AUTOMATISATION : après DUNGEON_AUTO_UNLOCK_CLEARS complétions, le pilote
// « Auto » explore, combat, ouvre les coffres, bat le boss, ramasse puis
// descend — plus un clic requis.

/** Nombre de complétions d'un donjon avant déverrouillage du pilote auto. */
const DUNGEON_AUTO_UNLOCK_CLEARS = 3;

/** PASSE 38c/39d — TAILLE DE LA CARTE PROGRESSIVE (retour joueur) : de 7×5 au
 *  début de l'aventure jusqu'à 11×8 au maximum, selon la localisation du
 *  donjon (`badgeReq` = avancement de l'aventure). PASSE 39d — plafonnée à
 *  11×8 (88 cases) : une grille 15×10 (150 cases) débordait de la fenêtre,
 *  les tuiles étant de taille fixe et l'ensemble plus haut que l'écran. */
function _dgGridSizeFor(badgeReq) {
  const b = Math.max(0, Math.min(8, Number(badgeReq) || 0));
  const cols = 7 + Math.round((11 - 7) * (b / 8));
  const rows = 5 + Math.round((8 - 5) * (b / 8));
  return { cols, rows };
}

const _DG_DIRS = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [0, 1],
];

function _dgNodeId(col, row) {
  return `c${col}r${row}`;
}
function _dgNode(run, id) {
  return run.map && run.map.tiles ? run.map.tiles[id] : null;
}

/** Plus court chemin (BFS) entre deux cases d'un plateau en construction. */
function _dgBfsOnTiles(tiles, fromId, toId) {
  if (fromId === toId) return [fromId];
  const prev = { [fromId]: null };
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    const t = tiles[cur];
    for (const [dc, dr] of _DG_DIRS) {
      const n = tiles[_dgNodeId(t.col + dc, t.row + dr)];
      if (!n || n.id in prev) continue;
      prev[n.id] = cur;
      if (n.id === toId) {
        const path = [n.id];
        let p = cur;
        while (p) {
          path.unshift(p);
          p = prev[p];
        }
        return path;
      }
      queue.push(n.id);
    }
  }
  return null;
}

/** Génère le plateau quadrillé du palier courant (brouillard compris).
 *  PASSE 38c (retour joueur : « trop de cases vides, on peut atteindre le
 *  boss sans combat ») :
 *   · grille PROGRESSIVE 7×5 → 15×10 selon le badgeReq du donjon ;
 *   · le boss est GARDÉ : toutes ses cases voisines sont des combats, on ne
 *     peut plus l'atteindre sans combattre (et il n'est pas téléportable —
 *     il exige l'adjacence, voir dungeonMoveTo) ;
 *   · un COULOIR de combats est garanti sur le chemin entrée → boss ;
 *   · la densité (combats + coffres) est proportionnelle à la surface :
 *     les cases vides restent des couloirs, pas la majorité du plateau. */
function _dgGenFloorMap(run) {
  const { cols, rows } = _dgGridSizeFor(run.badgeReq);
  const tiles = {};
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      tiles[_dgNodeId(c, r)] = {
        id: _dgNodeId(c, r),
        col: c,
        row: r,
        type: 'empty',
        revealed: false,
        done: false,
      };
    }
  }
  // PASSE 38 — l'entrée est EN BAS AU MILIEU (et non à gauche) : on arrive par
  // le bas de la carte, comme Pokéclicker.
  const startId = _dgNodeId(Math.floor(cols / 2), rows - 1);
  // PASSE 38/38c — la première case est TOUJOURS VIDE (jamais un combat) :
  // le joueur choisit librement sa direction. C'est la position du joueur
  // (sprite PNJ) qui la marque tant qu'il y est.
  tiles[startId].type = 'empty';
  tiles[startId].revealed = true;
  tiles[startId].done = true;
  const start = tiles[startId];
  const startNeighbors = _DG_DIRS
    .map(([dc, dr]) => tiles[_dgNodeId(start.col + dc, start.row + dr)])
    .filter(Boolean);
  // la zone de départ (entrée + voisines) reste un « sas » sans combat ni
  // élite : le joueur choisit sa direction en toute sécurité.
  const startZone = new Set([startId, ...startNeighbors.map((t) => t.id)]);
  // le boss se cache au fond du donjon, JAMAIS dans la zone de départ, et
  // jamais COLLÉ à elle (sinon il serait atteignable depuis l'entrée sans
  // passer par un garde — PASSE 38c).
  const farIds = Object.keys(tiles).filter((id) => {
    const t = tiles[id];
    if (t.col < cols - 3 || startZone.has(id)) return false;
    return !_DG_DIRS.some(([dc, dr]) => {
      const n = tiles[_dgNodeId(t.col + dc, t.row + dr)];
      return n && startZone.has(n.id);
    });
  });
  const bossId = farIds[Math.floor(Math.random() * farIds.length)];
  tiles[bossId].type = 'boss';

  // PASSE 38c — LE BOSS EST GARDÉ : chaque case voisine existante devient un
  // combat. Impossible de poser le pied sur le boss sans d'abord en battre un.
  const guards = [];
  for (const [dc, dr] of _DG_DIRS) {
    const n = tiles[_dgNodeId(tiles[bossId].col + dc, tiles[bossId].row + dr)];
    if (n && !startZone.has(n.id)) {
      n.type = 'combat';
      guards.push(n.id);
    }
  }

  // couloir garanti : sur le plus court chemin entrée → boss, un combat tous
  // les ~3 pas (jamais sur la zone de départ ni sur les gardes déjà posés).
  const corridor = _dgBfsOnTiles(tiles, startId, bossId) || [];
  const corridorSet = new Set();
  for (let i = 2; i < corridor.length - 1; i += 3) {
    const id = corridor[i];
    const t = tiles[id];
    if (t && t.type === 'empty' && !startZone.has(id) && !guards.includes(id)) {
      t.type = 'combat';
      corridorSet.add(id);
    }
  }

  // répartition proportionnelle à la surface : combats + coffres majoritaires
  // face aux cases vides (retour joueur : « trop de cases vides »).
  const area = cols * rows;
  const chestCount = Math.max(5, Math.round(area * 0.1));
  const combatCount = Math.max(12, Math.round(area * 0.4));
  // le pool de répartition exclut la zone de départ, le boss, ses gardes ET
  // le couloir de combats garanti (sinon la dispersion les écraserait).
  const pool = Object.keys(tiles).filter(
    (id) => !startZone.has(id) && id !== bossId && !guards.includes(id) && !corridorSet.has(id)
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let k = 0;
  for (let n = 0; n < chestCount && k < pool.length; n++, k++) tiles[pool[k]].type = 'chest';
  for (let n = 0; n < combatCount && k < pool.length; n++, k++) {
    tiles[pool[k]].type = 'combat';
    if (n < 2) tiles[pool[k]].type = 'elite'; // deux combats corsés, butin ×2
  }
  run.map = { grid: true, cols, rows, tiles };
  run.pos = startId;
  run.pendingNode = null;
  run.bossDefeated = false;
  run.bossTile = bossId;
  // PASSE 38 — brouillard de guerre façon Pokéclicker : on VOIT les cases
  // adjacentes à la position, pas seulement la case où l'on est.
  _dgRevealAround(run, startId);
  return run.map;
}

/** PASSE 38 — révèle la case `id` ET ses 4 voisines (brouillard de guerre). */
function _dgRevealAround(run, id) {
  const t = _dgNode(run, id);
  if (!t) return;
  t.revealed = true;
  for (const n of _dgNeighbors(run, id)) n.revealed = true;
}

function _dgNeighbors(run, id) {
  const t = _dgNode(run, id);
  if (!t) return [];
  const out = [];
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const n = _dgNode(run, _dgNodeId(t.col + dc, t.row + dr));
    if (n) out.push(n);
  }
  return out;
}

function _dgRevealAll(run) {
  for (const t of Object.values(run.map.tiles)) t.revealed = true;
}

/** Plus court chemin de la position vers `targetId`, ou null.
 *  V7-R1c — (1) la case du BOSS (puis l'échelle qui la remplace) n'est JAMAIS
 *  traversée « en passant » : y poser le pied l'engage, et c'est ainsi que le
 *  pilote « allait directement au boss » ; (2) `fightCost` > 0 fait éviter
 *  les combats non soldés quand un détour existe (mode coffres). */
function _dgBfsPath(run, targetId, fightCost) {
  if (run.pos === targetId) return [run.pos];
  const cost = { [run.pos]: 0 };
  const prev = { [run.pos]: null };
  const open = [run.pos];
  while (open.length) {
    open.sort((a, b2) => cost[a] - cost[b2]); // ≤ 88 cases : un tri suffit
    const cur = open.shift();
    if (cur === targetId) break;
    for (const n of _dgNeighbors(run, cur)) {
      if (n.id !== targetId && n.id === run.bossTile) continue;
      const fight = !n.done && (n.type === 'combat' || n.type === 'elite');
      const c = cost[cur] + 1 + (fightCost && fight && n.id !== targetId ? fightCost : 0);
      if (!(n.id in cost) || c < cost[n.id]) {
        cost[n.id] = c;
        prev[n.id] = cur;
        if (!open.includes(n.id)) open.push(n.id);
      }
    }
  }
  if (!(targetId in prev)) return null;
  const path = [];
  for (let p = targetId; p; p = prev[p]) path.unshift(p);
  return path;
}

function _dgNearestPath(run, filter, fightCost) {
  let best = null;
  for (const t of Object.values(run.map.tiles)) {
    if (!filter(t)) continue;
    const path = _dgBfsPath(run, t.id, fightCost);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}

function _dgTeamHpRatio() {
  try {
    const G = _dgState();
    const team = (G && G.team) || [];
    const alive = team.filter((p) => p && p.currentHP > 0);
    if (!alive.length) return 0;
    let cur = 0,
      max = 0;
    for (const p of alive) {
      cur += p.currentHP;
      max += p.maxHP || p.currentHP;
    }
    return max > 0 ? cur / max : 1;
  } catch (_) {
    return 1;
  }
}

/**
 * Déplace le joueur vers la case `id` : la révèle (avec ses voisines) et
 * déclenche son contenu (combat / coffre / boss / échelle).
 * PASSE 38 — retour joueur : on peut se déplacer INSTANTANÉMENT vers
 * n'importe quelle case VISIBLE (brouillard levé) ; les cases encore sous
 * brouillard exigent l'adjacence (on les découvre en marchant). Même effet
 * au clic et aux flèches.
 */
function dungeonMoveTo(id) {
  const run = currentDungeonRun();
  if (!run || !run.map || !run.map.grid) return null;
  const b = globalThis.battle;
  if (b && b.active) {
    _dgNotify(_dgT('dungeon_map_move_blocked'), 'var(--red)');
    return run;
  }
  const tile = _dgNode(run, id);
  if (!tile) return run;
  const here = _dgNode(run, run.pos);
  const adjacent = Math.abs(tile.col - here.col) + Math.abs(tile.row - here.row) === 1;
  // PASSE 39 — on peut se TÉLÉPORTER sur n'importe quelle case VISIBLE, y
  // compris le boss (retour joueur : « même celle du boss, car je me retrouve
  // bloqué avec le message "le boss se défie depuis une case voisine" »).
  // Les gardes autour du boss restent des combats, mais le joueur choisit.
  // case visible → téléportation ; case sous brouillard → un pas seulement
  if (!tile.revealed && !adjacent) return run;

  run.pos = id;
  tile.revealed = true;
  _dgRevealAround(run, id);

  if (tile.type === 'chest' && !tile.done) {
    tile.done = true;
    if (globalThis.pwEmit) globalThis.pwEmit('dungeon:chest', { floor: run.floor }); // V7-R2 · SND-02
    const loot = dungeonWinLoot(run.badgeReq);
    const mult = dungeonMultFor(run.floor);
    run.bag.tokens += Math.round(loot.tokens * mult * 2);
    run.bag.money += Math.round(loot.money * mult * 2);
    _dgNotify(
      _dgT('dungeon_chest_loot', { tokens: String(Math.round(loot.tokens * mult * 2)) }),
      'var(--green)'
    );
    refreshDungeonPanel();
    _dgAutoKick(run, 450);
    return run;
  }
  if (tile.type === 'ladder') {
    return dungeonDescend();
  }
  if ((tile.type === 'combat' || tile.type === 'elite' || tile.type === 'boss') && !tile.done) {
    run.pendingNode = id;
    if (tile.type === 'boss' && dungeonIsBossFloor()) {
      if (b) b.pendingDungeonBoss = true; // le gardien, seul boss du donjon
    }
    dungeonFight();
    refreshDungeonPanel();
    return run;
  }
  refreshDungeonPanel();
  _dgAutoKick(run, 350);
  return run;
}

/** Déplacement au clavier (flèches) — un pas dans la direction demandée. */
function dungeonMove(dir) {
  const run = currentDungeonRun();
  if (!run || !run.map || !run.map.grid) return null;
  const t = _dgNode(run, run.pos);
  const d = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[dir];
  if (!d) return run;
  const target = _dgNode(run, _dgNodeId(t.col + d[0], t.row + d[1]));
  if (!target) {
    _dgNotify(_dgT('dungeon_map_move_blocked'), 'var(--red)');
    return run;
  }
  return dungeonMoveTo(target.id);
}

/** Pilote automatique : réservé aux vétérans (N complétions du donjon). */
function dungeonAutoUnlocked(locId) {
  const G = _dgState();
  const clears = (G && G.dungeonClears && G.dungeonClears[locId]) || 0;
  return clears >= DUNGEON_AUTO_UNLOCK_CLEARS;
}

/** PASSE 38c — le pilote auto a TROIS MODES (façon mods Pokéclicker) :
 *  · 'boss'  → fonce au boss par le plus court chemin (ne combat que ce qui
 *              barre la route), puis descend ;
 *  · 'farm'  → explore tout le plateau, ramasse combats + coffres + boss,
 *              puis descend ;
 *  · 'chest' → récupère UNIQUEMENT les coffres, puis va au boss.
 *  `true` (ancien appel) reste accepté et vaut 'farm'. */
const _DG_AUTO_MODES = ['boss', 'farm', 'chest'];

function dungeonSetAuto(mode) {
  const run = currentDungeonRun();
  if (!run) return null;
  let next = mode;
  if (next === true) next = 'farm';
  if (next === 'off' || next === false || next == null) next = false;
  if (next !== false && !_DG_AUTO_MODES.includes(next)) next = false;
  if (next && !dungeonAutoUnlocked(run.loc)) {
    _dgNotify(
      _dgT('dungeon_auto_locked', { need: String(DUNGEON_AUTO_UNLOCK_CLEARS) }),
      'var(--red)'
    );
    return run;
  }
  run.auto = next;
  refreshDungeonPanel();
  _dgAutoKick(run, 400);
  return run;
}

/** Relance différée du pilote (après un coffre, un pas, une descente…). */
function _dgAutoKick(run, delay) {
  if (!run || !run.auto || globalThis.PW_FF === true) return;
  setTimeout(() => {
    try {
      _dgAutoStep();
    } catch (_) {}
  }, delay);
}

/** Le pilote auto selon le MODE choisi (boss / farm / coffres).
 *  V7-R1c — retour joueur : « le plateau va directement au boss au lieu de
 *  faire tout le plateau, pareil pour coffres ». Le boss n'est engagé QU'UNE
 *  FOIS la mission du mode accomplie sur le palier :
 *    · farm   → tout le plateau révélé ET soldé (combats, élites, coffres) ;
 *    · chest  → tous les coffres du plateau ouverts (les combats sont évités
 *               quand un détour existe) ;
 *    · boss   → droit au boss, ne combat que ce qui barre la route.
 *  Boss battu (échelle à sa place) → on descend. Sur le dernier palier, le
 *  gardien clôt l'expédition : d'où l'importance de tout ramasser AVANT. */
function _dgAutoStep(opts) {
  // V7-R2 — pendant le rattrapage hors-ligne (PW_FF), seul le moteur AFK
  // (dungeon-offline.js, opts.offline) fait avancer le pilote : les relances
  // différées (setTimeout) se taisent pour ne pas doubler les pas simulés.
  if (globalThis.PW_FF === true && !(opts && opts.offline)) return null;
  const run = currentDungeonRun();
  if (!run || !run.map || !run.map.grid || !run.auto) return null;
  const b = globalThis.battle;
  if (b && b.active) return null;
  if (typeof globalThis.aliveCount === 'function' && globalThis.aliveCount() <= 0) return null;
  const mode = run.auto === 'chest' ? 'chest' : run.auto === 'boss' ? 'boss' : 'farm';
  const tiles = Object.values(run.map.tiles);
  const isChest = (t) => !t.done && t.type === 'chest';
  const isLoot = (t) => isChest(t) || (!t.done && (t.type === 'combat' || t.type === 'elite'));
  let path = null;
  if (mode === 'farm' && tiles.some((t) => !t.revealed || isLoot(t))) {
    path = _dgNearestPath(run, (t) => isLoot(t) || !t.revealed);
  } else if (mode === 'chest' && tiles.some(isChest)) {
    path = _dgNearestPath(run, isChest, 4);
  } else if (run.bossDefeated && run.pos === run.bossTile) {
    return dungeonDescend();
  } else {
    // mission accomplie (ou mode boss) : le boss, puis l'échelle qui le remplace.
    path = _dgBfsPath(run, run.bossTile);
  }
  if (!path || path.length < 2) {
    // V7-R2 — la cible est la case où l'on se tient (combat/coffre laissé en
    // plan par un rechargement ou le rattrapage AFK) : on la ré-engage sur place
    // au lieu de caler (le pilote restait muet jusqu'à un clic du joueur).
    const here = path && path.length === 1 ? _dgNode(run, run.pos) : null;
    if (here && !here.done && ['combat', 'elite', 'boss', 'chest'].includes(here.type))
      return dungeonMoveTo(here.id);
    return null;
  }
  // PASSE 38 — le pilote téléporte directement sur la cible si elle est déjà
  // visible ; sinon il fait un pas (le brouillard se lève au passage).
  // PASSE 39 — le boss est téléportable comme n'importe quelle case visible.
  const target = _dgNode(run, path[path.length - 1]);
  if (target && target.revealed) return dungeonMoveTo(target.id);
  return dungeonMoveTo(path[1]);
}

/** Flèches = déplacements sur la grille (hors saisie de texte). */
let _dgKeysInit = false;
function _dgInitDungeonKeys() {
  if (_dgKeysInit || typeof document === 'undefined') return;
  _dgKeysInit = true;
  document.addEventListener('keydown', (e) => {
    try {
      const t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')) return;
      const dirs = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down' };
      const dir = dirs[e.key];
      if (!dir) return;
      const run = currentDungeonRun();
      const b = globalThis.battle;
      if (!run || (b && b.active)) return;
      e.preventDefault();
      dungeonMove(dir);
    } catch (_) {}
  });
}

// ── Surface classique (fenêtres, dispatcher d'actions, harnais) ─────────────// ── Surface classique (fenêtres, dispatcher d'actions, harnais) ─────────────
const _dgApi = {
  dungeonDepthFor,
  dungeonMultFor,
  dungeonQuotaFor,
  dungeonWinLoot,
  currentDungeonRun,
  isDungeonRunAt,
  startDungeonRun,
  dungeonOnWin,
  dungeonFloorCleared,
  dungeonIsBossFloor,
  dungeonDescend,
  dungeonFight,
  dungeonAscend,
  dungeonOnWipe,
  dungeonOnBossDefeated,
  dungeonAbandon,
  dungeonQuitFromBattle,
  _dgAutoResume,
  _dgSuppressAutoResume,
  renderBattleDungeonBar,
  dungeonRunSummary,
  refreshDungeonPanel,
  DUNGEON_RULES,
  // PASSE 36 — carte du donjon, clavier et pilote automatique.
  dungeonMoveTo,
  dungeonMove,
  dungeonSetAuto,
  dungeonAutoUnlocked,
  _dgAutoStep,
  _dgGenFloorMap,
  DUNGEON_AUTO_UNLOCK_CLEARS,
  // PASSE 38c — grille progressive, gardes du boss, butin du donjon.
  _dgGridSizeFor,
  _dgHarvestRunLoot,
  // PASSE 39 — profondeur selon le décor (forêt = 1 niveau, grotte = paliers).
  _dgIsCaveLike,
  formatNumberSafe,
};
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _dgApi);
if (typeof window !== 'undefined') Object.assign(window, _dgApi);
if (
  typeof PokeActions !== 'undefined' &&
  PokeActions &&
  typeof PokeActions.register === 'function'
) {
  try {
    PokeActions.register('startDungeonRun', startDungeonRun);
    PokeActions.register('dungeonDescend', dungeonDescend);
    PokeActions.register('dungeonAscend', dungeonAscend);
    PokeActions.register('dungeonMoveTo', dungeonMoveTo);
    PokeActions.register('dungeonSetAuto', dungeonSetAuto);
  } catch (_) {}
}

export {
  dungeonDepthFor,
  dungeonMultFor,
  dungeonQuotaFor,
  dungeonWinLoot,
  currentDungeonRun,
  isDungeonRunAt,
  startDungeonRun,
  dungeonOnWin,
  dungeonFloorCleared,
  dungeonIsBossFloor,
  dungeonDescend,
  dungeonFight,
  dungeonAscend,
  dungeonOnWipe,
  dungeonOnBossDefeated,
  dungeonAbandon,
  dungeonQuitFromBattle,
  _dgAutoResume,
  _dgSuppressAutoResume,
  renderBattleDungeonBar,
  dungeonRunSummary,
  refreshDungeonPanel,
  DUNGEON_RULES,
  dungeonMoveTo,
  dungeonMove,
  dungeonSetAuto,
  dungeonAutoUnlocked,
  _dgAutoStep,
  _dgGenFloorMap,
  DUNGEON_AUTO_UNLOCK_CLEARS,
  _dgGridSizeFor,
  _dgHarvestRunLoot,
  _dgIsCaveLike,
  formatNumberSafe,
};
