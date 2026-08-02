// ============================================================================
// BASE SECRÈTE — Moteur (passe A)
// ----------------------------------------------------------------------------
// Logique pure, 100 % indépendante du rendu : la couche 3D/2.5D à venir ne
// consommera que ces fonctions. État stocké dans G.base (lazy-init, rétro-
// compatible avec les sauvegardes existantes).
//
// Modèle :
//   state = { layoutId, items:[{uid,s,x,y,rot}], stock:{slug:n},
//             npcs:[{id,name,sprite,team,msgs,x,y}|placés],
//             npcStock:[...], spawn:{x,y}|null (= entrée), uidSeq,
//             record:{w,l,visits} }
// ============================================================================

const BASE_DEFAULT_LAYOUT = 'cave_1';   // passe 37 : formes GBA canon

function baseCreateDefault() {
  return {
    layoutId: null,           // null = aucune base créée pour l'instant
    routeId: null,            // route de Hoenn où la base est établie
    items: [],
    stock: {},
    npcs: [],
    npcStock: [],
    spawn: null,
    uidSeq: 1,
    record: { w: 0, l: 0, visits: 0 },
    pcMessage: '',            // message perso du PC pour visiteurs (flag)
  };
}

// Accès paresseux : initialise G.base si absent (vieilles sauvegardes).
function baseGetState() {
  if (typeof G === 'undefined' || !G) return null;
  if (!G.base || typeof G.base !== 'object') G.base = baseCreateDefault();
  const st = G.base;
  if (!Array.isArray(st.items)) st.items = [];
  if (!st.stock || typeof st.stock !== 'object') st.stock = {};
  if (!Array.isArray(st.npcs)) st.npcs = [];
  if (!Array.isArray(st.npcStock)) st.npcStock = [];
  if (!st.record) st.record = { w: 0, l: 0, visits: 0 };
  if (typeof st.uidSeq !== 'number') st.uidSeq = 1;
  if (!st._v1) {
    delete st._moveUid; // transitoire éditeur (déplacement en cours) — jamais persisté
    // re-validation intégrale une fois par chargement (vieilles saves / JSON)
    const clean = baseSanitizeState(st);
    for (const k of Object.keys(st)) delete st[k];
    Object.assign(st, clean);
    st._v1 = true;
  }
  return st;
}

// ——— Stock ————————————————————————————————————————————————————————————————
function baseStockCount(st, slug) { return Math.max(0, (st.stock && st.stock[slug]) || 0); }
function baseStockAdd(st, slug, n) {
  if (!baseItemGet(slug) || !n) return 0;
  st.stock[slug] = baseStockCount(st, slug) + n;
  return st.stock[slug];
}
function baseStockRemove(st, slug, n) {
  const have = baseStockCount(st, slug);
  const take = Math.min(have, n || 1);
  if (take <= 0) return 0;
  const left = have - take;
  if (left > 0) st.stock[slug] = left; else delete st.stock[slug];
  return take;
}

// ——— Grille / occupation ———————————————————————————————————————————————————
// Construit la vue matérielle : cellules du gabarit + occupation par uid.
function baseBuildGrid(st) {
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return null;
  const occ = layout.cells.map((row) => row.map(() => null)); // uid | 'npc:<id>'
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue; // passe 40 : objet tenu à la souris (déplacement)
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    for (let dy = 0; dy < fp.d; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const x = it.x + dx, y = it.y + dy;
        if (y >= 0 && y < layout.h && x >= 0 && x < layout.w) occ[y][x] = it.uid;
      }
    }
  }
  for (const n of st.npcs) {
    if (n.x == null || n.y == null || !occ[n.y]) continue;
    const cur = occ[n.y][n.x];
    if (cur == null) { occ[n.y][n.x] = 'npc:' + n.id; continue; }
    // Un PNJ peut se tenir sur un objet marchable (tapis…) : il a la priorité.
    if (typeof cur === 'number') {
      const it = basePlacedFind(st, cur);
      if (it && baseItemGet(it.s).walk) occ[n.y][n.x] = 'npc:' + n.id;
    }
  }
  return { layout, occ };
}

function baseCellAt(grid, x, y) { return (grid && grid.layout.cells[y]) ? grid.layout.cells[y][x] : null; }

// Meuble PORTEUR (couche sol avec surface, ex. tapis/bureau) recouvrant la
// cellule (x,y) — indépendant de occ, car un objet « surface » peut y être
// posé par-dessus et masquer le porteur dans la grille.
function baseCarrierAt(st, x, y, ignoreUid) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue; // passe 40 : le tenu n'occupe plus son ancienne place
    if (ignoreUid != null && it.uid === ignoreUid) continue;
    const d = baseItemGet(it.s);
    if (!d || d.layer !== 'floor' || !d.surf) continue;
    const fp = baseItemFootprint(d, it.rot);
    if (x >= it.x && x < it.x + fp.w && y >= it.y && y < it.y + fp.d) return it;
  }
  return null;
}

// Objet de couche « surface » recouvrant (x,y) (règle canon : 1 par cellule).
function baseSurfaceAt(st, x, y, ignoreUid) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue;
    if (ignoreUid != null && it.uid === ignoreUid) continue;
    const d = baseItemGet(it.s);
    if (!d || d.layer !== 'surface') continue;
    const fp = baseItemFootprint(d, it.rot);
    if (x >= it.x && x < it.x + fp.w && y >= it.y && y < it.y + fp.d) return it;
  }
  return null;
}

// Escaliers posés : un escalier est-il ANCRÉ sur (x,y) ? L'ancre canon est la
// rangée BAS de l'escalier (stocké à son origine haut-gauche normalisée).
// Passe 44 (demande utilisateur) : l'escalier canon fait 2 cases de LARGE — les
// DEUX colonnes accrochent la falaise (toute la largeur de l'empreinte).
function baseStairsAt(st, x, y) {
  for (const it of st.items) {
    if (it.s !== 'stairs' || it.uid === st._moveUid) continue;
    const fp = baseItemFootprint(baseItemGet('stairs'), it.rot);
    if (x >= it.x && x < it.x + fp.w && it.y + fp.d - 1 === y) return true;
  }
  return false;
}

// ——— Passe 44 : hauteurs d'objets (canon RSE : présentoir / toboggan) ———————
// En RSE, le présentoir (4×2) et le toboggan (2×4) simulent une VRAIE hauteur :
// leur dessus n'est accessible QUE par leur escalier intégré (présentoir :
// escaliers aux DEUX extrémités StairsLeft/StairsRight ; toboggan : escalier
// à gauche), et on n'en descend QUE par cet escalier — sauf la rampe du
// toboggan, qui fait glisser de force jusqu'au tapis de réception.
// Passe 50 : la zone d'un objet « haut » couvre TOUTE sa forme dessinée, pas
// seulement son empreinte au sol. Le toboggan est dessiné 2×4 mais n'occupe
// que 2×3 au sol (`over:1`) : sa rangée du HAUT — le carter — est un
// SURPLOMB. Retour utilisateur : « je ne peux toujours pas monter sur les deux
// dernières cases en haut (pas les 6 au sol, les deux encore au-dessus) ».
// On étend donc la zone d'une rangée vers le haut, et `dy` devient relatif à
// la forme DESSINÉE : dy 0 = carter (perché), 1 = palier, 2 = escalier/rampe,
// 3 = tapis.
function baseZoneDefAt(st, x, y) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue;
    if (it.s !== 'stand' && it.s !== 'slide') continue;
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    const over = def.over | 0;                 // rangées hautes hors empreinte
    const top = it.y - over;                   // 1re rangée DESSINÉE
    const dep = fp.d + over;                   // hauteur totale dessinée
    if (x < it.x || x >= it.x + fp.w || y < top || y >= top + dep) continue;
    return { it, fp: { w: fp.w, d: dep }, dx: x - it.x, dy: y - top, over };
  }
  return null;
}

// Cellule « dessus » (zone haute — perchée, nulle part où descendre sinon par
// l'escalier intégré). Présentoir : rangée NORD. Toboggan : palier + tête de
// rampe (la glissade se déclenche là).
// Passe 45 : le toboggan a perdu sa rangée 0 (carter = surplomb VISUEL hors
// empreinte), toutes ses rangées gameplay remontent donc de 1 :
//   dy 0 = palier + tête de rampe · dy 1 = escalier + rampe · dy 2 = tapis.
function baseZoneTopAt(st, x, y) {
  const z = baseZoneDefAt(st, x, y);
  if (!z) return null;
  if (z.it.s === 'stand') return (z.dy === 0) ? z.it : null;
  // Toboggan (dy relatif à la forme DESSINÉE, cf. baseZoneDefAt) :
  //   dy 0 = carter (le « toit », perché — passe 50)
  //   dy 1 = palier + tête de rampe (perchés)
  //   dy 2 = escalier (gauche, au sol) · glissière (droite, perchée)
  //   dy 3 = tapis de réception (au sol)
  if (z.it.s === 'slide') {
    if (z.dy <= 1) return z.it;
    if (z.dx === 1 && z.dy < z.fp.d - 1) return z.it;
  }
  return null;
}

// Cellule d'escalier intégré (franchissable, au sol : relie sol ↔ dessus).
function baseZoneStairAt(st, x, y) {
  const z = baseZoneDefAt(st, x, y);
  if (!z) return null;
  if (z.it.s === 'stand' && z.dy === z.fp.d - 1 && (z.dx === 0 || z.dx === z.fp.w - 1)) return z.it;
  if (z.it.s === 'slide' && z.dy === 2 && z.dx === 0) return z.it;
  return null;
}

// Cellule BLOQUÉE au sein d'un objet par ailleurs marchable : soubassement
// plein entre les deux escaliers du présentoir.
// Passe 46 (retour utilisateur « les deux cases en haut sont toujours
// inaccessibles ») : le TOBOGGAN n'a plus AUCUNE cellule morte. Ses 6 cases
// d'empreinte sont toutes utilisables — colonne gauche = escalier + palier,
// colonne droite = la glissière (on y met le pied, et on glisse), rangée
// basse = le tapis de réception.
function baseZoneBlockedAt(st, x, y) {
  // Passe 48 — TENTES (retour utilisateur : « on ne doit pouvoir passer qu'au
  // milieu des tentes »). Canon RSE (DecorGfx_RED_TENT / BLUE_TENT) : la tente
  // 3×3 n'a qu'UNE ouverture, la colonne CENTRALE (DoorTop + Door) ; les
  // colonnes gauche et droite sont la toile (TopLeft/MidLeft/BottomLeft…),
  // infranchissables. On ne bloque donc que les colonnes latérales.
  const tent = baseTentAt(st, x, y);
  if (tent) return tent.dx !== 1;

  const z = baseZoneDefAt(st, x, y);
  if (!z) return false;
  if (z.it.s === 'stand') return z.dy === z.fp.d - 1 && z.dx > 0 && z.dx < z.fp.w - 1;
  return false;
}

// Cellule d'une tente (3×3, marchable au canon) + position relative.
function baseTentAt(st, x, y) {
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue;
    if (it.s !== 'red_tent' && it.s !== 'blue_tent') continue;
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    if (x < it.x || x >= it.x + fp.w || y < it.y || y >= it.y + fp.d) continue;
    return { it, fp, dx: x - it.x, dy: y - it.y };
  }
  return null;
}

// Glissière du toboggan : y poser le pied = glissade jusqu'au tapis (canon).
// Passe 46 : TOUTE la colonne droite au-dessus du tapis déclenche la glissade
// (tête de rampe dy 0 ET corps de rampe dy 1) — avant, le corps de rampe était
// « bloqué », ce qui laissait une case définitivement inatteignable.
function baseSlideRampAt(st, x, y) {
  const z = baseZoneDefAt(st, x, y);
  if (!z || z.it.s !== 'slide') return null;
  // colonne droite, partout au-dessus du tapis : poser le pied = glissade
  return (z.dx === 1 && z.dy >= 1 && z.dy < z.fp.d - 1) ? z.it : null;
}

// Transition haut↔ras autorisée ? Canon : on ne monte/descend d'un présentoir
// ou d'un toboggan QUE par son escalier intégré — jamais en sautant les bords.
// Passe 46 : la GLISSIÈRE du toboggan est à SENS UNIQUE. On n'y entre que par
// le haut (depuis le palier ou en descendant la glissière) ; impossible d'y
// grimper depuis le tapis ni d'y accéder latéralement en partant de l'escalier.
function baseZoneGateOK(st, x, y, nx, ny) {
  const ramp = (typeof baseSlideRampAt === 'function') ? baseSlideRampAt(st, nx, ny) : null;
  if (ramp) {
    const from = baseZoneDefAt(st, x, y);
    // Passe 50 : on n'aborde la glissière QUE depuis le haut du toboggan —
    // le carter (dy 0) ou le palier (dy 1) du MÊME objet — et jamais en
    // remontant depuis le tapis. La descente reste donc à sens unique.
    if (!from || from.it.uid !== ramp.uid) return false;
    // On n'ENTRE sur la glissière que par le HAUT du toboggan (carter dy 0 ou
    // palier dy 1). Toute autre provenance — y compris le tapis juste en
    // dessous — est refusée : la descente reste strictement à sens unique.
    return from.dy <= 1 && ny >= y;
  }
  const aTop = baseZoneTopAt(st, x, y);
  const bTop = baseZoneTopAt(st, nx, ny);
  if (aTop && bTop) return aTop.uid === bTop.uid; // dessus↔dessus : même objet
  if (!aTop && !bTop) return true;                // ras↔ras : libre
  const top = aTop || bTop;
  const stairAt = aTop ? baseZoneStairAt(st, nx, ny) : baseZoneStairAt(st, x, y);
  return !!(stairAt && stairAt.uid === top.uid);  // seulement via l'escalier intégré
}

// Cellule franchissable à pied EN (iso-élévation autorisée seulement via
// l'escalier : gérée par baseVisitStep côté visite).
function baseCellWalkable(st, grid, x, y, elev) {
  const cell = baseCellAt(grid, x, y);
  if (!cell) return false;

  // Passe 53 (retour utilisateur : « si la case derrière les deux cases du
  // haut du toboggan est un mur, on ne peut plus monter en haut »).
  // Cause racine : le CARTER du toboggan est un surplomb — il est dessiné
  // au-dessus de l'empreinte et n'occupe donc aucune case au sol. On y marche
  // pourtant : c'est le TOIT de l'objet. Or on testait le terrain de la case
  // située dessous ; adossé au mur du fond — le placement le plus naturel —
  // ce terrain est un mur (ou un trou), et la case était refusée. Le sommet
  // du toboggan devenait inatteignable dans 40 poses sur 214.
  // Quand on est sur le DESSUS d'un objet perché, le terrain en dessous n'a
  // aucune importance : seules comptent les règles de l'objet (baseZoneGateOK
  // interdit toujours d'y monter autrement que par l'escalier intégré).
  if (typeof baseZoneTopAt === 'function' && baseZoneTopAt(st, x, y)) {
    if (typeof baseZoneBlockedAt === 'function' && baseZoneBlockedAt(st, x, y)) return false;
    const uidTop = grid.occ[y] && grid.occ[y][x];
    if (typeof uidTop === 'string') return false;   // un PNJ bloque sa case
    return true;
  }

  if (cell.t === 'floor') {
    if (elev != null && cell.elev !== elev) return false;
  } else if (cell.t === 'hole') {
    // franchissable seulement si une planche la recouvre
    const uid = grid.occ[y][x];
    const it = uid ? basePlacedFind(st, uid) : null;
    if (!it || baseItemGet(it.s).fx !== 'board') return false;
    if (elev != null && elev !== 0) return false;
  } else {
    return false;
  }
  const uid = grid.occ[y][x];
  if (uid == null) return true;
  if (typeof uid === 'string') return false; // un PNJ bloque sa case
  const it = basePlacedFind(st, uid);
  if (!it) return true;
  const def = baseItemGet(it.s);
  if (!def.walk) return false;
  // passe 44 : cellule bloquée AU SEIN d'un objet marchable (soubassement du
  // présentoir, carter/rampe du toboggan)
  return !baseZoneBlockedAt(st, x, y);
}

function basePlacedFind(st, uid) {
  for (const it of st.items) if (it.uid === uid) return it;
  return null;
}

// BFS sur cellules franchissables (élévation libre : validation d'édition) —
// renvoie l'ensemble "x,y" atteignables depuis (sx,sy).
function baseReachableSet(st, grid, sx, sy) {
  const seen = new Set();
  if (!baseCellWalkable(st, grid, sx, sy, null)) return seen;
  const q = [[sx, sy]];
  seen.add(sx + ',' + sy);
  while (q.length) {
    const [cx, cy] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
      let walkable = baseCellWalkable(st, grid, nx, ny, null);
      // Escalier : une falaise devient franchissable si ses escaliers y sont
      // ancrés (sinon le spawn en hauteur rendrait toute pose « bloquante »).
      if (!walkable) {
        const c = baseCellAt(grid, nx, ny);
        if (c && c.t === 'cliff') {
          const below = baseCellAt(grid, nx, ny + 1);
          walkable = !!(below && below.stairAnchor && baseStairsAt(st, nx, ny + 1));
        }
      }
      // passe 44 : hauteurs d'objets — on ne franchit les bords d'un
      // présentoir/toboggan que par son escalier intégré (canon).
      if (walkable && !baseZoneGateOK(st, cx, cy, nx, ny)) walkable = false;
      if (seen.has(k) || !walkable) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

// État hypoTHÉTIQUE : copie de st avec une pose supplémentaire (validation).
function baseWithPlaced(st, placed) {
  const copy = { ...st, items: st.items.concat([placed]), npcs: st.npcs, itemShallow: true };
  return copy;
}

// ——— Vérification de pose ——————————————————————————————————————————————————
// → {ok:true} | {ok:false, reason:<clé i18n base.err.*>}
function baseCanPlace(st, slug, x, y, rot, opts) {
  const def = baseItemGet(slug);
  if (!def) return { ok: false, reason: 'base.err.unknown' };
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return { ok: false, reason: 'base.err.no_base' };
  rot = baseItemRotNormalize(def, rot || 0);
  const fp = baseItemFootprint(def, rot);
  const ignoreUid = (opts && opts.ignoreUid) || null;
  const grid = baseBuildGrid(st);
  // ignoreUid : la case de l'objet qu'on re-valide (rotation) est libre.
  if (ignoreUid != null) {
    for (let yy = 0; yy < grid.occ.length; yy++) {
      for (let xx = 0; xx < grid.occ[yy].length; xx++) {
        if (grid.occ[yy][xx] === ignoreUid) grid.occ[yy][xx] = null;
      }
    }
  }
  opts = opts || {};

  // Origine effective (coin haut-gauche de l'empreinte) — l'escalier est
  // posé PAR SON ANCRE (rangée bas canon) puis normalisé.
  let px = x, py = y;

  // Cas spécial : escaliers → uniquement sur une ancre du gabarit ; ils
  // recouvrent la falaise au nord (cellules sol/falaise, jamais occupées).
  if (def.fx === 'stairs') {
    let ay = y;
    const c0 = baseCellAt(grid, x, ay);
    if (!(c0 && c0.stairAnchor)) {
      // Idempotence : on accepte aussi l'origine déjà normalisée d'un objet
      // posé (ré-validation lors d'un import / chargement).
      const c1 = baseCellAt(grid, x, y + fp.d - 1);
      if (c1 && c1.stairAnchor) ay = y + fp.d - 1;
      else return { ok: false, reason: 'base.err.stairs_anchor' };
    }
    py = ay - (fp.d - 1);
    // Passe 44 (canon, demande utilisateur) : les ancres viennent par paire
    // et l'escalier a UNE SEULE position dans sa niche — cliquer n'importe
    // quelle ancre de la paire aligne la pose sur son début.
    {
      let start = px;
      while (start > 0 && baseCellAt(grid, start - 1, ay) && baseCellAt(grid, start - 1, ay).stairAnchor) start--;
      let run = true;
      for (let dx = 0; dx < fp.w; dx++) {
        const c = baseCellAt(grid, start + dx, ay);
        if (!(c && c.stairAnchor)) { run = false; break; }
      }
      if (run) px = start;
    }
    // Les DEUX colonnes de l'escalier doivent tomber sur une ancre.
    for (let dx = 0; dx < fp.w; dx++) {
      const ca = baseCellAt(grid, px + dx, ay);
      if (!(ca && ca.stairAnchor)) return { ok: false, reason: 'base.err.stairs_anchor' };
    }
    for (let dy = 0; dy < fp.d; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const cx = px + dx, cy = py + dy;
        const cell = baseCellAt(grid, cx, cy);
        if (!cell) return { ok: false, reason: 'base.err.out_of_bounds' };
        if (cell.t !== 'floor' && cell.t !== 'cliff') return { ok: false, reason: 'base.err.floor_only' };
        if (cell.entrance) return { ok: false, reason: 'base.err.entrance' };
        if (grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
      }
    }
  // Cas spécial : planche (1×2 canon RSE). Passe 42 (demande utilisateur) :
  // posable PARTOUT — sur un trou (elle le comble, son utilité première) ou
  // sur du sol nu (chemin décoratif, terrain de jeu pour poupées). Règles
  // conservées : chaque case doit être floor|trou, libre, hors entrée/spawn.
  } else if (def.fx === 'board') {
    for (let dy = 0; dy < fp.d; dy++) {
      const c = baseCellAt(grid, x, y + dy);
      if (!c) return { ok: false, reason: 'base.err.out_of_bounds' };
      if (c.entrance || c.spawnPt) return { ok: false, reason: 'base.err.entrance' };
      if (c.t !== 'hole' && c.t !== 'floor') return { ok: false, reason: 'base.err.floor_only' };
      if (grid.occ[y + dy][x] != null) return { ok: false, reason: 'base.err.occupied' };
    }
  } else {
    // Empreinte dans les limites + règles de couche.
    for (let dy = 0; dy < fp.d; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const cx = px + dx, cy = py + dy;
        const cell = baseCellAt(grid, cx, cy);
        if (!cell) return { ok: false, reason: 'base.err.out_of_bounds' };
        if (def.layer === 'wall') {
          if (cell.t !== 'wall' && cell.t !== 'cliff') return { ok: false, reason: 'base.err.wall_only' };
          if (grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
        } else if (def.layer === 'surface') {
          // Passe 39 (décision utilisateur) : poupées/coussins se posent AUSSI
          // au sol, pas seulement sur un porteur. Règles : 1 objet « surface »
          // par cellule (porteur ou sol), entrée/interdits préservés.
          if (cell.t !== 'floor') return { ok: false, reason: 'base.err.surface_only' };
          if (cell.entrance || cell.spawnPt) return { ok: false, reason: 'base.err.entrance' };
          if (baseSurfaceAt(st, cx, cy, ignoreUid)) return { ok: false, reason: 'base.err.surface_taken' };
          const carrier = baseCarrierAt(st, cx, cy, ignoreUid);
          if (!carrier && grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
        } else { // floor
          if (cell.t !== 'floor') return { ok: false, reason: 'base.err.floor_only' };
          if (cell.stairAnchor) return { ok: false, reason: 'base.err.stairs_anchor' };
          if (cell.entrance) return { ok: false, reason: 'base.err.entrance' };
          if (cell.spawnPt) return { ok: false, reason: 'base.err.entrance' }; // passe 37 : point d'arrivée (métatile 544) non décorable
          if (grid.occ[cy][cx] != null) return { ok: false, reason: 'base.err.occupied' };
        }
      }
    }
    // Passe 44 (canon RSE) : présentoir et toboggan exigent un SOCLE DE
    // NIVEAU — leur escalier intégré ne se pose pas à cheval sur la falaise.
    if (slug === 'stand' || slug === 'slide') {
      let elevRef = null;
      for (let dy = 0; dy < fp.d; dy++) {
        for (let dx = 0; dx < fp.w; dx++) {
          const cc = baseCellAt(grid, px + dx, py + dy);
          const e = (cc && cc.elev) || 0;
          if (elevRef == null) elevRef = e;
          else if (e !== elevRef) return { ok: false, reason: 'base.err.uneven' };
        }
      }
    }
    // Canon : un mural ne s'accroche que sur une FACE VISIBLE — mur nord ou
    // face de falaise (passe 42 : les salles à étage acceptent les posters
    // sur la paroi), avec du sol praticable directement au sud de chaque
    // colonne de l'empreinte. Toujours pas de murs latéraux/sud.
    if (def.layer === 'wall') {
      for (let dx = 0; dx < fp.w; dx++) {
        const c = baseCellAt(grid, px + dx, py);
        const s = baseCellAt(grid, px + dx, py + fp.d);
        if (!c || (c.t !== 'wall' && c.t !== 'cliff')) return { ok: false, reason: 'base.err.wall_only' };
        if (!s || s.t !== 'floor') return { ok: false, reason: 'base.err.wall_only' };
      }
    }
  }

  // Limite canon : 26 objets posés (hors tapis de bienvenue automatique).
  const placedCount = st.items.filter((i) => baseItemGet(i.s) && baseItemGet(i.s).acq !== 'auto').length;
  if (def.acq !== 'auto' && placedCount >= BASE_ITEM_MAX_PLACED) return { ok: false, reason: 'base.err.max_placed' };

  // Anti-blocage : l'entrée doit toujours rejoindre le spawn, le PC et chaque PNJ.
  const hypo = baseWithPlaced(st, { uid: -1, s: slug, x: px, y: py, rot });
  const grid2 = baseBuildGrid(hypo);
  if (def.layer !== 'wall') {
    const sp = st.spawn || layout.spawn;
    const reach = baseReachableSet(hypo, grid2, layout.spawn.x, layout.spawn.y);
    if (sp && !reach.has(sp.x + ',' + sp.y)) return { ok: false, reason: 'base.err.blocks_spawn' };
    for (const n of hypo.npcs) {
      if (n.x == null) continue;
      let okAdj = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (reach.has((n.x + dx) + ',' + (n.y + dy))) { okAdj = true; break; }
      }
      if (!okAdj) return { ok: false, reason: 'base.err.blocks_npc' };
    }
    // Vérifie que le PC reste accessible même quand on pose autre chose que le PC
    const pcIt = hypo.items.find(i => i.s === 'pc');
    if (pcIt) {
      let pcAdj = false;
      const pcDef = baseItemGet('pc');
      const pcFp = pcDef ? baseItemFootprint(pcDef, pcIt.rot) : { w: 1, d: 1 };
      for (let dy = -1; dy <= pcFp.d && !pcAdj; dy++) {
        for (let dx = -1; dx <= pcFp.w && !pcAdj; dx++) {
          if (dx >= 0 && dx < pcFp.w && dy >= 0 && dy < pcFp.d) continue;
          if (reach.has((pcIt.x + dx) + ',' + (pcIt.y + dy))) pcAdj = true;
        }
      }
      if (!pcAdj) return { ok: false, reason: 'base.err.pc_unreachable' };
    }
    // Ancien check spécifique PC (garde pour pose du PC lui-même, redondant mais explicite)
    if (slug === 'pc') {
      let adj = false;
      for (let dy = -1; dy <= fp.d && !adj; dy++) {
        for (let dx = -1; dx <= fp.w && !adj; dx++) {
          if (dx >= 0 && dx < fp.w && dy >= 0 && dy < fp.d) continue;
          if (reach.has((px + dx) + ',' + (py + dy))) adj = true;
        }
      }
      if (!adj) return { ok: false, reason: 'base.err.pc_unreachable' };
    }
  }
  // Passe 40 : un objet automatique est unique par base (pas de 2e PC posé).
  if (def.acq === 'auto' && ignoreUid == null && st.items.some((i) => i.s === slug && i.uid !== st._moveUid)) {
    return { ok: false, reason: 'base.err.already_placed' };
  }
  return { ok: true, rot, x: px, y: py };
}

// ——— Pose / ramassage / rotation ———————————————————————————————————————————
function basePlace(st, slug, x, y, rot, opts) {
  opts = opts || {};
  if (!opts.free && baseStockCount(st, slug) <= 0) return { ok: false, reason: 'base.err.not_in_stock' };
  const chk = baseCanPlace(st, slug, x, y, rot, opts);
  if (!chk.ok) return chk;
  if (!opts.free) baseStockRemove(st, slug, 1);
  const placed = { uid: st.uidSeq++, s: slug, x: chk.x, y: chk.y, rot: chk.rot };
  st.items.push(placed);
  return { ok: true, uid: placed.uid };
}

// Ramasse un objet (et récursivement ce qui est posé dessus) → retour stock.
function basePickup(st, uid) {
  const idx = st.items.findIndex((i) => i.uid === uid);
  if (idx < 0) return 0;
  // Passe 40 : les objets automatiques (tapis de bienvenue, PC) sont des
  // éléments FIXES de la base — déplaçables (éditeur), JAMAIS rangés ni jetés.
  const d0 = baseItemGet(st.items[idx].s);
  if (d0 && d0.acq === 'auto') return 0;
  const def = baseItemGet(st.items[idx].s);
  let back = 0;
  if (def && def.acq !== 'auto') { baseStockAdd(st, st.items[idx].s, 1); back++; }
  const carrierCells = [];
  const fp = def ? baseItemFootprint(def, st.items[idx].rot) : null;
  if (fp) for (let dy = 0; dy < fp.d; dy++) for (let dx = 0; dx < fp.w; dx++) carrierCells.push([st.items[idx].x + dx, st.items[idx].y + dy]);
  st.items.splice(idx, 1);
  // Objets « surface » qui reposaient dessus et ne sont PLUS valides :
  // ramassés (passe 39 : la poupée sur un sol libre RESTE — ignoreUid pour
  // qu'elle ne se bloque pas elle-même dans la re-validation).
  if (carrierCells.length) {
    const snapshot = st.items.slice();
    const orphans = snapshot.filter((it) => {
      if (st.items.indexOf(it) < 0) return false; // déjà retiré
      const d2 = baseItemGet(it.s);
      if (!d2 || d2.layer !== 'surface') return false;
      const chk = baseCanPlace(st, it.s, it.x, it.y, it.rot, { free: true, ignoreUid: it.uid });
      return !chk.ok;
    });
    for (const o of orphans) back += basePickup(st, o.uid);
  }
  return back;
}

function baseRotate(st, uid, dir) {
  const it = basePlacedFind(st, uid);
  if (!it) return { ok: false, reason: 'base.err.unknown' };
  const def = baseItemGet(it.s);
  const n = baseItemRotCount(def);
  if (n <= 1) return { ok: false, reason: 'base.err.not_rotatable' };
  const next = baseItemRotNormalize(def, it.rot + (dir || 1));
  const chk = baseCanPlace(st, it.s, it.x, it.y, next, { free: true, ignoreUid: uid });
  if (!chk.ok) return chk;
  it.rot = next;
  // Le porteur a pu pivoter sous ses objets « surface » : restés sans support
  // valide → stock (passe 39 : le sol libre RESTE un support valide).
  for (const o of st.items.slice()) {
    const d2 = baseItemGet(o.s);
    if (!d2 || d2.layer !== 'surface') continue;
    const re = baseCanPlace(st, o.s, o.x, o.y, o.rot, { free: true, ignoreUid: o.uid });
    if (!re.ok) basePickup(st, o.uid);
  }
  return { ok: true, rot: next };
}

// « Tout ranger » : renvoie tous les objets (hors automatique) au stock.
function baseClearAll(st) {
  let n = 0;
  for (const it of st.items.slice()) n += basePickup(st, it.uid);
  return n;
}

// Première case libre pour le PC automatique : BALAYAGE depuis l'arrivée
// (ordre lecture haut-gauche → bas-droite), sol non décoré et atteignable
// à pied depuis l'entrée/sorte par construction (parite sur grille quasi
// vide — tapis déjà reposé). Repli : la case du tapis.
function basePcSpot(layout, st) {
  const g = baseBuildGrid(st);
  // Passe 44 : deux passes. Le PC automatique préfère le REZ-DE-CHAUSSÉE —
  // sur une mezzanine il serait injoignable tant que l'escalier n'est pas
  // posé (le PC sert dès l'arrivée). Repli : n'importe quelle cellule libre.
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < layout.h; y++) {
      for (let x = 0; x < layout.w; x++) {
        const c = layout.cells[y][x];
        if (!c || c.t !== 'floor' || c.entrance || c.spawnPt || c.stairAnchor) continue;
        if (pass === 0 && (c.elev || 0) !== 0) continue; // passe 0 : sol uniquement
        if (g.occ[y][x] != null) continue;
        return { x, y };
      }
    }
  }
  return null;
}

// ——— Déménagement (une seule base, canon : les meubles suivent) ———————————
function baseRelocate(st, newLayoutId) {
  if (!baseLayoutGet(newLayoutId)) return { ok: false, reason: 'base.err.unknown' };
  baseClearAll(st);
  // Fix demandé : pas de sauvegarde des PNJ en stock qui bloquait le créateur
  // On vide tout au déménagement
  st.npcs = [];
  st.npcStock = [];
  st.layoutId = newLayoutId;
  st.spawn = null;
  // Objet AUTOMATIQUE canon : le PC (présent dans TOUTE base) est repositionné
  // dans le nouveau gabarit, jamais perdu (basePickup l'épargne, baseClearAll
  // le laisse). Passe 43 : le « tapis d'accueil » disparaît (RSE n'en montre
  // pas — le joueur apparaît devant la porte, cf. marqueur 'S' des gabarits).
  const lay2 = baseLayoutGet(newLayoutId);
  let pc = st.items.find((i) => i.s === 'pc');
  const pspot = basePcSpot(lay2, st);
  if (pspot) {
    if (!pc) st.items.push({ uid: st.uidSeq++, s: 'pc', x: pspot.x, y: pspot.y, rot: 0 });
    else { pc.x = pspot.x; pc.y = pspot.y; pc.rot = 0; }
  }
  return { ok: true };
}

// Création initiale (alias explicite).
function baseCreate(st, layoutId) { return baseRelocate(st, layoutId); }

// ——— PNJ « copains secrets » ———————————————————————————————————————————————
// team = [{id,level,moves:[..],talent,shiny}] (instantané autonome — jamais
// de référence vivante vers l'équipe, pour que l'export soit autosuffisant).
let baseNpcSeq = 1;
function baseNpcAdd(st, def) {
  // passe 47 : allowEmpty → PNJ posé mais pas encore configuré (équipe vide)
  if (!def || !Array.isArray(def.team) || (!def.team.length && !def.allowEmpty)) {
    return { ok: false, reason: 'base.err.npc_team' };
  }
  const npc = {
    id: 'n' + (baseNpcSeq++) + '_' + Date.now().toString(36),
    name: String(def.name || '').slice(0, 18) || 'Copain',
    sprite: String(def.sprite || 'youngster'),
    team: def.team.slice(0, 6).map((p) => ({
      id: p.id | 0, level: Math.min(100, Math.max(1, p.level | 0)),
      moves: Array.isArray(p.moves) ? p.moves.slice(0, 4) : [],
      talent: p.talent || null, shiny: !!p.shiny,
    })),
    msgs: {
      pre: String((def.msgs && def.msgs.pre) || '').slice(0, 80),
      win: String((def.msgs && def.msgs.win) || '').slice(0, 80),
      lose: String((def.msgs && def.msgs.lose) || '').slice(0, 80),
    },
    x: null, y: null,
  };
  st.npcStock.push(npc);
  return { ok: true, id: npc.id };
}

function baseNpcPlace(st, npcId, x, y) {
  const i = st.npcStock.findIndex((n) => n.id === npcId);
  if (i < 0) return { ok: false, reason: 'base.err.unknown' };
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return { ok: false, reason: 'base.err.no_base' };
  const grid = baseBuildGrid(st);
  const cell = baseCellAt(grid, x, y);
  // Occupée = occupant non marchable ; un PNJ peut se tenir sur un tapis.
  // Passe 44 : jamais sur l'ancre d'escalier (elle doit rester franchissable)
  // ni sur une cellule BLOQUÉE d'un objet marchable (soubassement du
  // présentoir, carter/rampe du toboggan).
  let free = false;
  if (cell && cell.t === 'floor' && !cell.stairAnchor) {
    const cur = grid.occ[y][x];
    if (cur == null) free = true;
    else if (typeof cur === 'number') free = baseCellWalkable(st, grid, x, y, null);
  }
  if (!free) return { ok: false, reason: 'base.err.occupied' };

  // ——— Vérif accessibilité PC / PNJ (fix demandé) ————————————————
  // On construit l'état hypothétique avec le PNJ posé et on vérifie que :
  //  - le PC reste accessible (adjacence)
  //  - chaque PNJ EXISTANT reste accessible (le nouveau peut être sur mezzanine non encore reliée, on l'autorise)
  //  - le spawn reste atteignable
  const npcSrc = st.npcStock[i];
  const npcHypo = { ...npcSrc, x, y };
  const hypo = {
    ...st,
    items: st.items,
    npcs: st.npcs.concat([npcHypo]),
  };
  const grid2 = baseBuildGrid(hypo);
  const reach = baseReachableSet(hypo, grid2, layout.spawn.x, layout.spawn.y);
  const sp = st.spawn || layout.spawn;
  if (sp && !reach.has(sp.x + ',' + sp.y)) return { ok: false, reason: 'base.err.blocks_spawn' };
  // PC doit rester accessible
  const pcIt = hypo.items.find(it => it.s === 'pc');
  if (pcIt) {
    let pcAdj = false;
    const pcDef = baseItemGet('pc');
    const pcFp = pcDef ? baseItemFootprint(pcDef, pcIt.rot) : { w:1, d:1 };
    for (let dy=-1; dy<=pcFp.d && !pcAdj; dy++) {
      for (let dx=-1; dx<=pcFp.w && !pcAdj; dx++) {
        if (dx>=0 && dx<pcFp.w && dy>=0 && dy<pcFp.d) continue;
        if (reach.has((pcIt.x+dx)+','+(pcIt.y+dy))) pcAdj = true;
      }
    }
    if (!pcAdj) return { ok: false, reason: 'base.err.pc_unreachable' };
  }
  // PNJ existants doivent rester abordables (le nouveau peut être sur mezzanine)
  for (const n of st.npcs) {
    if (n.x == null) continue;
    let okAdj = false;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (reach.has((n.x+dx)+','+(n.y+dy))) { okAdj = true; break; }
    }
    if (!okAdj) return { ok: false, reason: 'base.err.blocks_npc' };
  }

  const npc = st.npcStock.splice(i, 1)[0];
  npc.x = x; npc.y = y;
  st.npcs.push(npc);
  return { ok: true };
}

function baseNpcPickup(st, npcId) {
  const i = st.npcs.findIndex((n) => n.id === npcId);
  if (i < 0) return false;
  const npc = st.npcs.splice(i, 1)[0];
  npc.x = null; npc.y = null;
  st.npcStock.push(npc);
  return true;
}

// ——— Passe 45 : ÉDITEUR de PNJ (création libre, façon presets d'équipe) ————
// Plafond de PNJ par base (RSE en autorise peu ; on reste large mais borné,
// l'export JSON devant rester léger pour la visite par fichier).
const BASE_NPC_MAX = 8;

// Allures des PNJ — passe 47 (retour utilisateur : « les assets des PNJ que tu
// as mis sont horribles, utilise les assets dans images/trainers/profil »).
// Ce sont les VRAIS portraits de dresseurs déjà livrés avec le jeu (101
// fichiers trainer-N.png). On en expose une sélection variée ; l'identifiant
// d'allure EST le nom du fichier, ce qui rend le rendu direct et sans cuisson.
const BASE_NPC_SPRITES = [
  'trainer-0','trainer-1','trainer-2','trainer-3','trainer-4','trainer-5','trainer-6','trainer-7','trainer-8','trainer-9',
  'trainer-10','trainer-11','trainer-12','trainer-13','trainer-14','trainer-15','trainer-16','trainer-17','trainer-18','trainer-19',
  'trainer-20','trainer-21','trainer-22','trainer-23','trainer-24','trainer-25','trainer-26','trainer-27','trainer-28','trainer-29',
  'trainer-30','trainer-31','trainer-32','trainer-33','trainer-34','trainer-35','trainer-36','trainer-37','trainer-38','trainer-39',
  'trainer-40','trainer-41','trainer-42','trainer-43','trainer-44','trainer-45','trainer-46','trainer-47','trainer-48','trainer-49',
  'trainer-50','trainer-51','trainer-52','trainer-53','trainer-54','trainer-55','trainer-56','trainer-57','trainer-58','trainer-59',
  'trainer-60','trainer-61','trainer-62','trainer-63','trainer-64','trainer-65','trainer-66','trainer-67','trainer-68','trainer-69',
  'trainer-70','trainer-71','trainer-72','trainer-73','trainer-74','trainer-75','trainer-76','trainer-77','trainer-78','trainer-79',
  'trainer-80','trainer-81','trainer-82','trainer-83','trainer-84','trainer-85','trainer-86','trainer-87','trainer-88','trainer-89',
  'trainer-90','trainer-91','trainer-92','trainer-93','trainer-94','trainer-95','trainer-96','trainer-97','trainer-98','trainer-99',
  'trainer-100',
];
const BASE_NPC_SPRITE_DEFAULT = 'trainer-0';
// Chemin du portrait d'une allure (identique côté rendu et côté UI).
function baseNpcSpriteUrl(sprite) {
  const s = (BASE_NPC_SPRITES.indexOf(sprite) >= 0) ? sprite : BASE_NPC_SPRITE_DEFAULT;
  return 'src/assets/images/trainers/profil/' + s + '.png';
}

function baseNpcFind(st, npcId) {
  return (st.npcs || []).find((n) => n.id === npcId)
      || (st.npcStock || []).find((n) => n.id === npcId)
      || null;
}

function baseNpcCount(st) {
  // Fix demandé : on ne compte que les PNJ placés, le stock est vidé au chargement
  // pour éviter la banque invisible qui bloquait le créateur (x0)
  return ((st.npcs || []).length);
}

// Normalise une équipe saisie par le joueur → INSTANTANÉ GELÉ.
// (choix produit validé : jamais de référence vivante vers un preset, sinon
// l'export de base vers un autre joueur serait incohérent.)
function baseNpcNormalizeTeam(team) {
  if (!Array.isArray(team)) return [];
  const out = [];
  for (const p of team.slice(0, 6)) {
    const id = (p && p.id) | 0;
    if (id < 1) continue;
    out.push({
      id,
      level: Math.min(100, Math.max(1, (p && p.level) | 0 || 5)),
      moves: Array.isArray(p && p.moves) ? p.moves.map((m) => (m && m.id) || m).filter(Boolean).slice(0, 4) : [],
      talent: (p && p.talent) || null,
      shiny: !!(p && p.shiny),
      // passe 47 : objet tenu du PNJ (copié, jamais retiré de l'inventaire)
      item: (p && (p.item || p.heldItem)) || null,
    });
  }
  return out;
}

// Création « éditeur » : mêmes garde-fous que baseNpcAdd + plafond + sprite
// validé. → {ok:true,id} | {ok:false, reason:<clé i18n>}
function baseNpcCreate(st, def) {
  if (!st) return { ok: false, reason: 'base.err.no_base' };
  if (baseNpcCount(st) >= BASE_NPC_MAX) return { ok: false, reason: 'base.err.npc_max' };
  const team = baseNpcNormalizeTeam(def && def.team);
  const sprite = BASE_NPC_SPRITES.includes(def && def.sprite) ? def.sprite : BASE_NPC_SPRITE_DEFAULT;
  // Passe 47 : un PNJ FRAÎCHEMENT POSÉ peut avoir une équipe vide — c'est un
  // décor tant que le joueur ne l'a pas configuré (bouton « Modifier »). Seul
  // le COMBAT exige une équipe (baseVisitInteract le vérifie).
  return baseNpcAdd(st, { name: (def && def.name) || '', sprite, team, msgs: (def && def.msgs) || {}, allowEmpty: true });
}

// Passe 47 — POSE DIRECTE d'un PNJ, comme n'importe quel meuble (retour
// utilisateur : « je ne veux pas de banque de PNJ, juste un objet PNJ qu'on
// pose dans la base »). Crée le PNJ ET le place en une seule opération.
function baseNpcPlaceNew(st, x, y, def) {
  const res = baseNpcCreate(st, def || {});
  if (!res.ok) return res;
  const put = baseNpcPlace(st, res.id, x, y);
  if (!put.ok) { baseNpcDelete(st, res.id); return put; }
  return { ok: true, id: res.id };
}

// Édition d'un PNJ existant (posé ou en vivier) — champs optionnels.
function baseNpcUpdate(st, npcId, patch) {
  const npc = baseNpcFind(st, npcId);
  if (!npc) return { ok: false, reason: 'base.err.unknown' };
  if (!patch) return { ok: true };
  if (patch.name != null) npc.name = String(patch.name).slice(0, 18) || npc.name;
  if (patch.sprite != null && BASE_NPC_SPRITES.includes(patch.sprite)) npc.sprite = patch.sprite;
  if (patch.team != null) {
    npc.team = baseNpcNormalizeTeam(patch.team);
    npc.rosterKey = null;  // équipe retouchée à la main
  }
  if (patch.msgs) {
    npc.msgs = {
      pre: String(patch.msgs.pre != null ? patch.msgs.pre : npc.msgs.pre || '').slice(0, 80),
      win: String(patch.msgs.win != null ? patch.msgs.win : npc.msgs.win || '').slice(0, 80),
      lose: String(patch.msgs.lose != null ? patch.msgs.lose : npc.msgs.lose || '').slice(0, 80),
    };
  }
  return { ok: true };
}

// Suppression définitive (retire de la salle ET du vivier).
function baseNpcDelete(st, npcId) {
  const a = (st.npcs || []).findIndex((n) => n.id === npcId);
  if (a >= 0) { st.npcs.splice(a, 1); return true; }
  const b = (st.npcStock || []).findIndex((n) => n.id === npcId);
  if (b >= 0) { st.npcStock.splice(b, 1); return true; }
  return false;
}

// Instantané d'équipe depuis un preset (ou l'équipe active) — voie « comme
// avec les presets de team » demandée par l'utilisateur. Renvoie un tableau
// {id,level,moves,talent,shiny} GELÉ, prêt pour baseNpcCreate/baseNpcUpdate.
function baseNpcTeamFromPreset(presetKey) {
  const G_ = (typeof G !== 'undefined') ? G : null;
  if (!G_) return [];
  let mons = [];
  if (!presetKey || presetKey === 'active') {
    mons = Array.isArray(G_.team) ? G_.team.filter(Boolean) : [];
  } else {
    const preset = G_.teamPresets && G_.teamPresets[presetKey];
    const uids = (preset && Array.isArray(preset.uids)) ? preset.uids : [];
    for (const uid of uids) {
      const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
      if (found && found.p) mons.push(found.p);
    }
  }
  return baseNpcNormalizeTeam(mons.slice(0, 6).map((p) => ({
    id: p.id, level: p.level,
    moves: (Array.isArray(p.moves) ? p.moves : []).map((m) => (m && m.id) || m).filter(Boolean),
    talent: p.talent || null, shiny: !!(p.shiny || p.shinyActive),
  })));
}

// ——— Intégrité (import / chargement sauvegarde) ————————————————————————————
function baseSanitizeState(st) {
  if (!st || typeof st !== 'object') return baseCreateDefault();
  const clean = baseCreateDefault();
  clean.layoutId = baseLayoutGet(st.layoutId) ? st.layoutId : null;
  clean.routeId = (typeof st.routeId === 'string' && st.routeId) ? st.routeId : null;
  // passe 42 : migration vers le catalogue canon RSE (renommages mappés via
  // baseItemMigrate ; objets hors DA retirés : leur stock/item saute — les
  // renommages passent, les ORAS-only disparaissent proprement).
  for (const k of Object.keys(st.stock || {})) {
    const mk = typeof baseItemMigrate === 'function' ? baseItemMigrate(k) : (baseItemGet(k) ? k : null);
    if (!mk) continue;
    clean.stock[mk] = Math.min(99, (clean.stock[mk] | 0) + Math.max(0, st.stock[k] | 0));
    if (!clean.stock[mk]) delete clean.stock[mk];
  }
  for (const it of (Array.isArray(st.items) ? st.items : [])) {
    const ms = typeof baseItemMigrate === 'function' ? baseItemMigrate(it.s) : (baseItemGet(it.s) ? it.s : null);
    if (!ms) continue;
    const chk = baseCanPlace(clean, ms, it.x | 0, it.y | 0, 0, { free: true });
    if (chk.ok) {
      clean.items.push({ uid: clean.uidSeq++, s: ms, x: chk.x, y: chk.y, rot: 0 });
    }
  }
  for (const n of (Array.isArray(st.npcs) ? st.npcs : [])) {
    // Fix : on autorise les PNJ à équipe vide (décor) – ne pas les supprimer à la sanitization
    if (!Array.isArray(n.team)) n.team = [];
    if (n.x == null || !baseCellWalkable(clean, baseBuildGrid(clean), n.x, n.y, null)) { n.x = null; n.y = null; clean.npcs.push(n); }
    else clean.npcs.push(n);
  }
  // Fix demandé : pas de sauvegarde des PNJ en stock (banque invisible qui bloquait le créateur)
  // On vide le stock à chaque chargement
  clean.npcStock = [];
  clean.pcMessage = (st.pcMessage || '').slice(0, 200);
  clean.uidSeq = Math.max(clean.uidSeq, (st.uidSeq | 0) || 1);
  clean.record = { w: (st.record && st.record.w | 0) || 0, l: (st.record && st.record.l | 0) || 0, visits: (st.record && st.record.visits | 0) || 0 };
  // passe 43 : pas de spawn personnalisé — toujours le marqueur 'S' (porte).
  return clean;
}

window.baseCreateDefault = baseCreateDefault;
window.baseGetState = baseGetState;
window.baseStockAdd = baseStockAdd;
window.baseStockRemove = baseStockRemove;
window.baseStockCount = baseStockCount;
window.baseBuildGrid = baseBuildGrid;
window.baseCellWalkable = baseCellWalkable;
window.baseCarrierAt = baseCarrierAt;
window.baseSurfaceAt = baseSurfaceAt;
window.baseReachableSet = baseReachableSet;
window.baseCanPlace = baseCanPlace;
window.basePlace = basePlace;
window.basePickup = basePickup;
window.basePlacedFind = basePlacedFind;
window.baseRotate = baseRotate;
window.baseClearAll = baseClearAll;
window.baseRelocate = baseRelocate;
window.baseCreate = baseCreate;
window.baseNpcAdd = baseNpcAdd;
window.baseNpcPlace = baseNpcPlace;
window.baseNpcPickup = baseNpcPickup;
// passe 45 — éditeur de PNJ (création/édition/suppression + import de preset)
window.BASE_NPC_MAX = BASE_NPC_MAX;
window.BASE_NPC_SPRITES = BASE_NPC_SPRITES;
window.BASE_NPC_SPRITE_DEFAULT = BASE_NPC_SPRITE_DEFAULT;
window.baseNpcSpriteUrl = baseNpcSpriteUrl;
window.baseNpcFind = baseNpcFind;
window.baseNpcCount = baseNpcCount;
window.baseNpcNormalizeTeam = baseNpcNormalizeTeam;
window.baseNpcCreate = baseNpcCreate;
window.baseNpcPlaceNew = baseNpcPlaceNew;
window.baseNpcUpdate = baseNpcUpdate;
window.baseNpcDelete = baseNpcDelete;
window.baseNpcTeamFromPreset = baseNpcTeamFromPreset;
window.baseSanitizeState = baseSanitizeState;
// passe 44 — hauteurs d'objets (présentoir/toboggan) + escalier 2 colonnes
window.baseStairsAt = baseStairsAt;
window.baseZoneTopAt = baseZoneTopAt;
window.baseZoneStairAt = baseZoneStairAt;
window.baseZoneBlockedAt = baseZoneBlockedAt;
window.baseSlideRampAt = baseSlideRampAt;
window.baseTentAt = baseTentAt;
window.baseZoneGateOK = baseZoneGateOK;

