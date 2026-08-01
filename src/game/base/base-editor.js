// ============================================================================
// BASE SECRÈTE — Éditeur de pose + visite interactive (passe 38, 2D d'abord)
// ----------------------------------------------------------------------------
// Machine à états SANS DOM dur (testable en vm) : sélection dans le stock,
// fantôme de pose, pose/pivot/ramassage par clic, placement des copains,
// visite « toucher-pour-marcher » + interactions, lancement du combat borné
// contre un copain (isChamp, une fois par visite — passe C).
//
// L'écran (base-window.js) ne fait que : lire baseEditorGet(), convertir les
// événements souris en cases (baseEditorCellFromEvent) et passer l'overlay au
// renderer 2D. La 3D est reportée (décision utilisateur : tout en 2D d'abord).
//
// Record propriétaire (canon RSE, du point de vue du propriétaire) :
//   visits++ à chaque visite reçue · w = copain victorieux · l = copain battu.
// ============================================================================

const _baseEd = {
  mode: 'edit',          // 'edit' | 'visit'
  slug: null,            // déco choisie dans le stock (pose)
  rot: 0,                // rotation de pose courante (index, cf baseItemRot*)
  npcId: null,           // copain choisi dans le vivier (pose)
  selUid: null,          // meuble posé sélectionné (rotation/ramassage)
  selNpc: null,          // copain posé sélectionné (retrait)
  moveUid: null,         // passe 40 : meuble TENU à la souris (re-clic sur un objet sélectionné = déplacement)
  hover: null,           // {x,y} case sous le curseur
  visit: null,           // session baseVisitCreate
  visitOwn: false,       // visite de SA propre base (→ on crédite G.base.record)
  visitName: '',         // nom du propriétaire visité (affichage)
  visitPath: [],         // miroir du chemin pour l'overlay (référence sess.path)
  visitPending: null,    // passe 46 : {x,y} du copain abordé — l'interaction se
                         // déclenche À L'ARRIVÉE (clic à distance sur un PNJ)
  moveNpc: null,         // passe 46 : PNJ TENU à la souris (déplacement en
                         // UN clic, exactement comme un meuble)
  npcNew: false,         // passe 47 : « objet PNJ » pris dans le stock, prêt à
                         // être posé sur une case (comme un meuble neuf)
};

function baseEditorGet() { return _baseEd; }

function baseEditorResetSel() {
  _baseEd.slug = null; _baseEd.npcId = null;
  _baseEd.selUid = null; _baseEd.selNpc = null; _baseEd.rot = 0;
  _baseEd.moveNpc = null; _baseEd.npcNew = false;
  // NB : moveUid/_moveUid ne sont PAS purgés ici — un déplacement en cours se
  // termine par baseEditorMoveCancel (clic droit) ou par la pose.
}

// ——— Sélection stock / vivier —————————————————————————————————————————————
// Clic sur un objet du stock : sélection (re-clic = désélection). La pose se
// fait ensuite au clic sur une case (fantôme vert/rouge entre-temps).
function baseEditorSelectSlug(st, slug) {
  if (_baseEd.mode !== 'edit' || _baseEd.moveUid != null) return null; // un meuble est tenu à la souris
  if (slug && (!baseItemGet(slug) || baseStockCount(st, slug) <= 0)) return null;
  const was = _baseEd.slug;
  baseEditorResetSel();
  _baseEd.slug = (was === slug) ? null : slug; // re-clic = désélection
  return _baseEd.slug;
}

// Passe 47 : prendre « l'objet PNJ » du stock (pose d'un PNJ tout neuf).
function baseEditorSelectNpcNew(st, on) {
  if (_baseEd.mode !== 'edit') return false;
  _baseEd.npcNew = (on === undefined) ? !_baseEd.npcNew : !!on;
  if (_baseEd.npcNew) {
    _baseEd.slug = null; _baseEd.npcId = null;
    _baseEd.selUid = null; _baseEd.selNpc = null; _baseEd.moveNpc = null;
  }
  return _baseEd.npcNew;
}

function baseEditorSelectNpc(st, npcId) {
  if (_baseEd.mode !== 'edit' || _baseEd.moveUid != null) return null;
  if (npcId && !st.npcStock.some((n) => n.id === npcId)) return null;
  baseEditorResetSel();
  _baseEd.npcId = npcId;
  return _baseEd.npcId;
}

// Pivotement AVANT pose (objet du stock en main).
function baseEditorRotatePlacement() {
  const def = _baseEd.slug && baseItemGet(_baseEd.slug);
  if (!def || baseItemRotCount(def) <= 1) return 0;
  _baseEd.rot = baseItemRotNormalize(def, _baseEd.rot + 1);
  return _baseEd.rot;
}

// ——— Géométrie souris → case ——————————————————————————————————————————————
// canvas 2D : width = layout.w*32+8 (marge 4px), mis à l'échelle CSS parfois.
// ev = {clientX, clientY} ; canvas doit avoir width/height + getBoundingClientRect.
// Passe 47 — RÉSOLUTION EN HAUTEUR (retour utilisateur : « cliquer sur une des
// deux cases en haut nous amène derrière ; le jeu doit toujours prendre le
// point le plus HAUT quand on clique sur une case »).
//
// Le rendu 2D est une vue 3/4 : un objet « haut » (toboggan, mezzanine) est
// DESSINÉ au-dessus de son empreinte au sol. Les pixels d'une case écran
// peuvent donc appartenir à DEUX cellules : la cellule du sol située là, et la
// cellule (plus basse à l'écran) d'un volume qui déborde vers le haut. La
// conversion naïve pixel→case renvoyait toujours la première : d'où « ça
// m'amène derrière le toboggan ».
//
// baseEditorCellResolve teste donc les candidats du PLUS HAUT (au sens
// gameplay : élévation de mezzanine, puis surplomb d'objet) au plus bas, et
// retient le premier qui « couvre » réellement le pixel cliqué.
function baseEditorCellResolve(st, cx, cy) {
  const layout = st && baseLayoutGet(st.layoutId);
  if (!layout) return null;
  const C = (typeof BASE2D_CELL === 'number') ? BASE2D_CELL : 32;
  // Passe 53 : le renderer ne décale plus la mezzanine (le fond est cuit
  // tuile par tuile, la falaise fait pile une tuile). La résolution de clic
  // « en hauteur » doit suivre, sinon elle détourne les clics vers la case
  // du dessus alors que rien n'est décalé à l'écran.
  const ELEV_PX = 0;
  const base = { x: Math.floor(cx / C), y: Math.floor(cy / C) };
  if (base.x < 0 || base.y < 0 || base.x >= layout.w || base.y >= layout.h) return null;

  const cand = [];
  // Passe 49 : la résolution EN HAUTEUR ne doit s'appliquer qu'à la
  // NAVIGATION/sélection, jamais pendant une POSE. Quand le joueur a un objet
  // en main, il vise la case du sol qu'il voit sous son curseur : détourner le
  // clic vers l'empreinte d'un toboggan voisin faisait échouer les poses près
  // d'un mur (« le jeu croit que je vise le mur »).
  const placing = !!(_baseEd.slug || _baseEd.moveUid != null || _baseEd.npcNew || _baseEd.moveNpc);
  if (placing) return { x: base.x, y: base.y };

  // 1) SURPLOMB d'objet (toboggan) : ses `over` rangées hautes sont dessinées
  //    AU-DESSUS de l'empreinte. Passe 51 (retour utilisateur : « je ne peux
  //    toujours pas sélectionner les deux cases en haut ») — ces cases sont de
  //    VRAIES cases jouables (on y monte depuis la passe 50) : le clic doit
  //    donc les viser ELLES, et surtout PAS être redirigé vers l'empreinte.
  //    On les renvoie telles quelles, en priorité maximale : le fait qu'elles
  //    n'aient pas d'empreinte au sol ne doit plus les rendre incliquables.
  for (const it of (st.items || [])) {
    const def = (typeof baseItemGet === 'function') ? baseItemGet(it.s) : null;
    if (!def || !def.over) continue;
    const fp = baseItemFootprint(def, it.rot);
    for (let o = def.over; o >= 1; o--) {
      const sy = it.y - o;                       // rangée écran du surplomb
      if (base.y !== sy) continue;
      if (base.x < it.x || base.x >= it.x + fp.w) continue;
      cand.push({ x: base.x, y: sy, prio: 3 });  // la case HAUTE elle-même
    }
  }
  // 2) MEZZANINE : les cellules d'élévation 1 sont remontées de ELEV_PX à
  //    l'écran ; un clic dans cette bande appartient à la case du dessus.
  const belowY = Math.floor((cy + ELEV_PX) / C);
  if (belowY !== base.y && belowY >= 0 && belowY < layout.h) {
    const c = layout.cells[belowY] && layout.cells[belowY][base.x];
    if (c && c.elev) cand.push({ x: base.x, y: belowY, prio: 2 });
  }
  // 3) la case du sol, telle quelle (priorité la plus basse)
  cand.push({ x: base.x, y: base.y, prio: 1 });

  cand.sort((a, b) => b.prio - a.prio);
  for (const k of cand) {
    if (k.x < 0 || k.y < 0 || k.x >= layout.w || k.y >= layout.h) continue;
    return { x: k.x, y: k.y };
  }
  return null;
}

function baseEditorCellFromEvent(st, canvas, ev) {
  const layout = st && baseLayoutGet(st.layoutId);
  if (!layout || !canvas || !ev || typeof canvas.getBoundingClientRect !== 'function') return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return null;
  const sx = canvas.width / rect.width, syCanvas = canvas.height / rect.height;
  const px = (ev.clientX - rect.left) * sx - 4;
  const py = (ev.clientY - rect.top) * syCanvas - 4;
  return baseEditorCellResolve(st, px, py);
}

function baseEditorSetHover(cell) { _baseEd.hover = cell || null; return _baseEd.hover; }

// ——— Fantôme de pose (vert = légal, rouge + raison sinon) —————————————————
// → null | {x,y,w,d,ok,reason,slug} — x/y = origine EFFECTIVE (l'escalier est
// normalisé par son ancre ; le fantôme recouvre l'empreinte réelle).
function baseEditorGhost(st) {
  if (_baseEd.mode !== 'edit') return null;
  const hov = _baseEd.hover;
  if (!hov) return null;
  if (_baseEd.npcId || _baseEd.moveNpc || _baseEd.npcNew) {
    // Fantôme copain : 1×1, légal si la case accepterait baseNpcPlace.
    // Passe 44 : aligné sur baseNpcPlace (pas d'ancre d'escalier, pas de
    // cellule bloquée d'un objet marchable — présentoir/toboggan).
    const grid = baseBuildGrid(st);
    const cell = baseCellAt(grid, hov.x, hov.y);
    let ok = false;
    if (cell && cell.t === 'floor' && !cell.stairAnchor) {
      const cur = grid.occ[hov.y][hov.x];
      if (cur == null) ok = true;
      else if (typeof cur === 'number') ok = baseCellWalkable(st, grid, hov.x, hov.y, null);
    }
    return { x: hov.x, y: hov.y, w: 1, d: 1, ok, reason: ok ? null : 'base.err.occupied', npc: true };
  }
  if (_baseEd.moveUid != null) {
    const itm = basePlacedFind(st, _baseEd.moveUid);
    if (!itm) return null;
    const d2 = baseItemGet(itm.s);
    if (!d2) return null;
    const chk2 = baseCanPlace(st, itm.s, hov.x, hov.y, _baseEd.rot);
    const fp2 = baseItemFootprint(d2, _baseEd.rot);
    return {
      x: chk2.ok ? chk2.x : hov.x, y: chk2.ok ? chk2.y : hov.y,
      w: fp2.w, d: fp2.d, ok: !!chk2.ok, reason: chk2.ok ? null : chk2.reason,
      slug: itm.s, rot: chk2.ok ? chk2.rot : _baseEd.rot, moving: true,
    };
  }
  if (!_baseEd.slug) return null;
  const def = baseItemGet(_baseEd.slug);
  if (!def) return null;
  let hx = hov.x, hy = hov.y;
  if (def.layer === 'wall') {
    const wcell = baseEditorWallCell(st, hov.x, hov.y);
    if (wcell) { hx = wcell.x; hy = wcell.y; }
  }
  const chk = baseCanPlace(st, _baseEd.slug, hx, hy, 0);
  const fp = baseItemFootprint(def, 0);
  return {
    x: chk.ok ? chk.x : hx, y: chk.ok ? chk.y : hy,
    w: fp.w, d: fp.d, ok: !!chk.ok, reason: chk.ok ? null : chk.reason,
    slug: _baseEd.slug, rot: 0,
  };
}


// ——— Ciblage mural (passe 42, « les posters se placent mal ») —————————————
// Objet « wall » en main : clic SUR la case mur/falaise, ou sur la case SOL
// directement devant — dans les deux cas on cible la face (x, y-1). Le
// moteur re-valide ensuite (face visible + sol au sud).
function baseEditorWallCell(st, x, y) {
  const g = baseBuildGrid(st);
  const at = (cx, cy) => baseCellAt(g, cx, cy);
  const c = at(x, y);
  if (!c) return null;
  if (c.t === 'wall' || c.t === 'cliff') return { x, y };
  if (c.t === 'floor') {
    const n = at(x, y - 1);
    if (n && (n.t === 'wall' || n.t === 'cliff')) return { x, y: y - 1 };
  }
  return { x, y };
}

// ——— Sélection d'un meuble / copain POSÉ ——————————————————————————————————
// Priorité : objet « surface » (poupée sur bureau…) puis occupant de la case.
function baseEditorSelAt(st, x, y) {
  const surf = baseSurfaceAt(st, x, y);
  if (surf) return { kind: 'item', uid: surf.uid };
  const grid = baseBuildGrid(st);
  const cur = grid && grid.occ[y] ? grid.occ[y][x] : null;
  if (typeof cur === 'string' && cur.startsWith('npc:')) return { kind: 'npc', id: cur.slice(4) };
  if (typeof cur === 'number') {
    const it = basePlacedFind(st, cur);
    if (it) return { kind: 'item', uid: cur };
  }
  // Passe 51 : la grille d'occupation ne couvre que les EMPREINTES au sol.
  // Un clic sur le SURPLOMB d'un objet « over » (les deux cases hautes du
  // toboggan) n'y trouvait donc rien et ne sélectionnait pas l'objet. On
  // complète ici : le surplomb appartient bien à son objet.
  for (const it of (st.items || [])) {
    if (it.uid === st._moveUid) continue;
    const def = baseItemGet(it.s);
    if (!def || !def.over) continue;
    const fp = baseItemFootprint(def, it.rot);
    if (x < it.x || x >= it.x + fp.w) continue;
    if (y >= it.y - def.over && y < it.y) return { kind: 'item', uid: it.uid };
  }
  return null;
}

// ——— Clic sur une case (mode édition) —————————————————————————————————————
// Pose (déco ou copain) si quelque chose est en main, sinon sélection.
// → {type:'place'|'place_npc'|'select'|'none', ...} pour l'affichage.
function baseEditorClickCell(st, x, y) {
  if (_baseEd.mode !== 'edit' || !st) return { type: 'none' };
  if (_baseEd.moveUid != null) {
    // Pose le meuble tenu à la souris si la case est légale (sinon on garde).
    const it = basePlacedFind(st, _baseEd.moveUid);
    if (!it) { _baseEd.moveUid = null; st._moveUid = null; return { type: 'none' }; }
    const chk = baseCanPlace(st, it.s, x, y, _baseEd.rot);
    if (chk.ok) {
      it.x = chk.x; it.y = chk.y; it.rot = chk.rot;
      st._moveUid = null;
      _baseEd.moveUid = null;
      return { type: 'move', ok: true, slug: it.s, uid: it.uid };
    }
    return { type: 'move', ok: false, slug: it.s, reason: chk.reason };
  }
  // Passe 47 : « objet PNJ » neuf en main → on le crée ET on le pose ici.
  if (_baseEd.npcNew) {
    const res = baseNpcPlaceNew(st, x, y, {});
    if (res.ok) {
      _baseEd.npcNew = false;
      _baseEd.selNpc = res.id;      // sélectionné : le bouton « Modifier » apparaît
      return { type: 'place_npc', ok: true, npcId: res.id, fresh: true };
    }
    return { type: 'place_npc', ok: false, reason: res.reason };
  }
  // Passe 46 : PNJ TENU à la souris → on le repose ici s'il y a la place.
  if (_baseEd.moveNpc) {
    const npcId = _baseEd.moveNpc;
    const res = baseNpcPlace(st, npcId, x, y);
    if (res.ok) {
      _baseEd.moveNpc = null; _baseEd.npcNew = false;
      return { type: 'move_npc', ok: true, npcId };
    }
    return { type: 'move_npc', ok: false, npcId, reason: res.reason };
  }
  if (_baseEd.npcId) {
    const npcId = _baseEd.npcId;
    const res = baseNpcPlace(st, npcId, x, y);
    if (res.ok) { if (!st.npcStock.some((n) => n.id === npcId)) _baseEd.npcId = null; return { type: 'place_npc', ok: true, npcId }; }
    return { type: 'place_npc', ok: false, reason: res.reason };
  }
  if (_baseEd.slug) {
    const slug = _baseEd.slug;
    const defW = baseItemGet(slug);
    let tx = x, ty = y;
    if (defW && defW.layer === 'wall') {
      const wcell = baseEditorWallCell(st, x, y);
      if (!wcell) return { type: 'place', ok: false, slug, reason: 'base.err.wall_only' };
      tx = wcell.x; ty = wcell.y;
    }
    const res = basePlace(st, slug, tx, ty, 0);
    if (res.ok) {
      // Passe 39 (décision utilisateur) : pose UNIQUEMENT un par un — la main
      // se relâche après CHAQUE pose réussie (on re-clique le stock sinon).
      _baseEd.slug = null;
      return { type: 'place', ok: true, slug, uid: res.uid };
    }
    return { type: 'place', ok: false, slug, reason: res.reason };
  }
  const sel = baseEditorSelAt(st, x, y);
  if (!sel) { _baseEd.selUid = null; _baseEd.selNpc = null; return { type: 'none' }; }
  if (sel.kind === 'npc') {
    // Passe 49 (retour utilisateur : « je ne peux pas déplacer les PNJ en
    // cliquant dessus alors que ça devrait marcher comme les autres objets ») :
    // UN SEUL clic prend le PNJ en main, exactement comme un meuble. Il reste
    // AUSSI sélectionné, donc le bouton « Modifier le PNJ » demeure accessible
    // dans la barre pendant qu'on le déplace.
    const npc = baseNpcFind(st, sel.id);
    if (npc && baseNpcPickup(st, sel.id)) {
      _baseEd.moveNpc = sel.id;
      _baseEd.selNpc = sel.id;      // conservé : « Modifier » reste dispo
      _baseEd.selUid = null; _baseEd.slug = null; _baseEd.npcId = null;
      return { type: 'move_npc_start', npcId: sel.id, name: npc.name };
    }
    _baseEd.selNpc = sel.id;
    _baseEd.selUid = null;
    return { type: 'select', kind: 'npc', id: _baseEd.selNpc };
  }
  // Passe 41 (demande utilisateur) : UN clic sur un meuble posé le prend
  // DIRECTEMENT en main pour le déplacer (la sélection en 2 temps était
  // invisible et lue comme « le déplacement ne marche pas »).
  const mv = baseEditorMoveStart(st, sel.uid);
  return mv.ok ? { type: 'move_start', slug: mv.slug } : { type: 'select', kind: 'item', uid: null, reason: mv.reason };
}

// ——— Déplacement d'un meuble posé (passe 40, re-clic sur la sélection) ————
// Le meuble est TENU à la souris : son empreinte est libérée (st._moveUid,
// transitoire), le fantôme suit le curseur, un clic le repose si légal,
// clic droit (base-editor-cancel) le rend à sa place d'origine. Le tapis de
// bienvenue canon reste fixe ; le PC se déplace (règle d'accès dans canPlace).
function baseEditorMoveStart(st, uid) {
  if (_baseEd.mode !== 'edit' || uid == null) return { ok: false };
  const it = basePlacedFind(st, uid);
  if (!it) return { ok: false };
  _baseEd.moveUid = uid; st._moveUid = uid;
  _baseEd.rot = it.rot; _baseEd.selUid = null; _baseEd.selNpc = null; _baseEd.slug = null; _baseEd.npcId = null;
  return { ok: true, slug: it.s };
}

function baseEditorMoveCancel(st) {
  if (_baseEd.moveUid == null) return { ok: false };
  st._moveUid = null; _baseEd.moveUid = null;
  return { ok: true };
}

// Ramasser la sélection posée (ou le meuble TENU) → retour stock.
function baseEditorPickupSel(st) {
  if (_baseEd.moveUid != null) {
    // Passe 41 : meuble en main + « Ramasser » = le ranger (clic droit =
    // l'annulation et le retour à sa place). Le PC est automatique : il ne se
    // range pas (clic droit pour annuler).
    const held = basePlacedFind(st, _baseEd.moveUid);
    if (!held) { _baseEd.moveUid = null; st._moveUid = null; return { ok: false }; }
    if (held.s === 'pc') return { ok: false, reason: 'base.err.fixed' };
    const heldSlug = held.s;
    const hn = basePickup(st, _baseEd.moveUid);
    _baseEd.moveUid = null; st._moveUid = null;
    return hn > 0 ? { ok: true, slug: heldSlug, count: hn } : { ok: false };
  }
  if (_baseEd.selNpc) {
    const id = _baseEd.selNpc;
    _baseEd.selNpc = null;
    return baseNpcPickup(st, id) ? { ok: true, npc: true } : { ok: false };
  }
  if (_baseEd.selUid == null) return { ok: false };
  const it = basePlacedFind(st, _baseEd.selUid);
  const slug = it && it.s;
  const n = basePickup(st, _baseEd.selUid);
  _baseEd.selUid = null;
  return n > 0 ? { ok: true, slug, count: n } : { ok: false };
}

// Pivoter la sélection posée (clic droit / bouton) — sinon la pose en main.
function baseEditorRotateSel(st) {
  if (_baseEd.moveUid != null) {
    // pivote le meuble TENU (fantôme) — posé au clic suivant avec cette rotation
    const itm = basePlacedFind(st, _baseEd.moveUid);
    const d3 = itm && baseItemGet(itm.s);
    if (!d3 || baseItemRotCount(d3) <= 1) return { placed: false, ok: false, reason: 'base.err.not_rotatable' };
    _baseEd.rot = baseItemRotNormalize(d3, _baseEd.rot + 1);
    return { placed: false, ok: true, rot: _baseEd.rot, moving: true };
  }
  if (_baseEd.selUid != null) {
    const res = baseRotate(st, _baseEd.selUid, 1);
    return { placed: true, ...res };
  }
  if (_baseEd.slug) return { placed: false, ok: true, rot: baseEditorRotatePlacement() };
  return { placed: false, ok: false, reason: 'base.err.not_rotatable' };
}

// ——— Visite interactive ———————————————————————————————————————————————————
// srcState = état PROPRIÉTAIRE (copié par baseVisitCreate). meta = {name, source}
// source 'own' = sa propre base (record crédité) · 'import' = fichier d'un ami.
function baseEditorStartVisit(srcState, meta) {
  const sess = baseVisitCreate(srcState);
  if (!sess) return { ok: false, reason: 'base.err.no_base' };
  baseEditorResetSel();
  _baseEd.mode = 'visit';
  _baseEd.visit = sess;
  _baseEd.visitOwn = !!(meta && meta.source === 'own');
  _baseEd.visitName = (meta && meta.name) || '';
  _baseEd.visitPath = sess.path;
  _baseEd.hover = null;
  if (_baseEd.visitOwn && typeof G !== 'undefined' && G && G.base && G.base.record) {
    G.base.record.visits = (G.base.record.visits | 0) + 1;
  }
  return { ok: true, sess };
}

// Adopte une session déjà construite (import JSON d'un ami validé).
function baseEditorAdoptVisit(sess, meta) {
  if (!sess) return { ok: false, reason: 'base.err.import_layout' };
  baseEditorResetSel();
  _baseEd.mode = 'visit';
  _baseEd.visit = sess;
  _baseEd.visitOwn = false; // jamais de crédit sur la base d'un ami (anti-triche)
  _baseEd.visitName = (meta && meta.name) || '';
  _baseEd.visitPath = sess.path;
  _baseEd.hover = null;
  // Quête découverte (217) : la visite d'une base d'ami compte aussi.
  try { if (typeof advanceQuests === 'function') advanceQuests('base_visit', (typeof G !== 'undefined' && G) ? G.location : null, 1); } catch (_) {}
  return { ok: true, sess };
}

// Clic en visite : case occupée ADJACENTE (face-à-face 4 directions) →
// interaction ; sinon toucher-pour-marcher (BFS du moteur). → description.
function baseEditorVisitClick(x, y) {
  const sess = _baseEd.visit;
  if (!sess) return { type: 'none' };
  const dist = Math.abs(sess.pos.x - x) + Math.abs(sess.pos.y - y);
  const uid = sess.grid.occ[y] && sess.grid.occ[y][x];
  if (dist === 0) return { type: 'none' };
  // Face à une case occupée NON franchissable → interaction (parler au copain,
  // lire le panneau, se soigner…). Les objets piétonnables se foulent : le
  // déplacement dessus déclenche leurs pièges naturellement.
  if (dist === 1 && uid != null) {
    let walkThrough = false;
    if (typeof uid === 'number') {
      const it = basePlacedFind(sess.st, uid);
      walkThrough = !!(it && baseItemGet(it.s).walk);
    }
    if (!walkThrough) {
      const res = baseVisitInteract(sess, x, y);
      return { type: 'interact', res, x, y };
    }
  }
  let steps = baseVisitSetDestination(sess, x, y);
  if (!steps) {
    // Case non franchissable (meuble ou copain à distance) : on s'approche de
    // la case voisine LIBRE LA PLUS PROCHE — devant, derrière ou à côté (le
    // moteur BFS trouve le chemin). Passe 46 : on essaie les 4 orientations et
    // on garde la plus courte, au lieu de prendre la première qui marche.
    let best = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const s = baseVisitSetDestination(sess, x + dx, y + dy);
      if (s && (!best || s.length < best.length)) best = s;
    }
    // rejoue la meilleure approche (setDestination a écrasé sess.path)
    if (best) {
      const last = best[best.length - 1] || { x, y };
      steps = baseVisitSetDestination(sess, last.x, last.y);
    }
  }
  _baseEd.visitPath = sess.path;
  if (!steps) return { type: 'blocked', x, y };
  // Passe 46 (retour utilisateur) : cliquer un COPAIN à distance doit
  // l'aborder — on marche jusqu'à lui, puis l'interaction se déclenche à
  // l'arrivée (baseEditorVisitTick). Le joueur peut venir de n'importe quel
  // côté : devant, derrière ou à côté.
  if (typeof uid === 'string' && uid.startsWith('npc:')) {
    // Passe 52 : le PNJ est re-combattable sans limite (retour utilisateur),
    // l'approche est donc TOUJOURS mémorisée. Le dialogue s'ouvre à l'arrivée
    // et c'est le joueur qui décide de combattre ou de passer son chemin.
    _baseEd.visitPending = { x, y };
    return { type: 'move', steps: steps.length, approach: 'npc' };
  }
  _baseEd.visitPending = null;
  return { type: 'move', steps: steps.length };
}

// Un pas animé (appelé par le minuteur de l'écran). → {moved, ev, done}
function baseEditorVisitTick() {
  const sess = _baseEd.visit;
  if (!sess) return { moved: false, done: true };
  // Pause pendant un combat : le visiteur attend la fin du duel.
  if (typeof battle !== 'undefined' && battle && battle.active) return { moved: false, done: false };
  const r = baseVisitStepAlong(sess);
  _baseEd.visitPath = sess.path;
  const done = !sess.path.length;
  // Passe 46 : arrivé à côté du copain visé, on déclenche l'interaction —
  // c'est ce qui rend le clic à distance sur un PNJ « parlant ».
  if (done && _baseEd.visitPending) {
    const { x, y } = _baseEd.visitPending;
    _baseEd.visitPending = null;
    if (Math.abs(sess.pos.x - x) + Math.abs(sess.pos.y - y) === 1) {
      const res = baseVisitInteract(sess, x, y);
      return { moved: r.moved, ev: r.ev || null, done: true, interact: res };
    }
  }
  return { moved: r.moved, ev: r.ev || null, done };
}

// Crédit de fin de combat contre un copain (passe C : 1 combat par copain et
// par visite). won = le VISITEUR a gagné. Du point de vue du PROPRIÉTAIRE
// (canon) : copain vainqueur → record.w++, copain battu → record.l++.
function baseEditorCreditBattle(won) {
  const sess = _baseEd.visit;
  if (!sess) return false;
  if (won) sess.battlesWon++; else sess.battlesLost++;
  if (_baseEd.visitOwn && typeof G !== 'undefined' && G && G.base && G.base.record) {
    if (won) G.base.record.l = (G.base.record.l | 0) + 1;
    else G.base.record.w = (G.base.record.w | 0) + 1;
  }
  return true;
}

function baseEditorStopVisit() {
  const sess = _baseEd.visit;
  _baseEd.mode = 'edit';
  _baseEd.visit = null; _baseEd.visitOwn = false; _baseEd.visitPath = [];
  baseEditorResetSel();
  return sess ? { w: sess.battlesWon | 0, l: sess.battlesLost | 0 } : null;
}

// ——— Combat contre un copain (borné) ——————————————————————————————————————
// Équipe stockée (instantané {id,level,moves:[noms],talent,shiny}) → équipe
// INSTANCIÉE façon dresseur officiel (passe 19 : createPoke + moves objets,
// repli sur le moveset naturel si un nom de capacité est inconnu / absent).
function baseNpcTeamToChampTeam(team) {
  if (!Array.isArray(team)) return [];
  const hasFactory = (typeof createPoke === 'function') && (typeof MOVES !== 'undefined') && MOVES;
  const out = [];
  for (const p of team.slice(0, 6)) {
    const id = Math.min(1025, Math.max(1, (p && p.id) | 0));
    const level = Math.min(100, Math.max(1, (p && p.level) | 0));
    if (!hasFactory) { out.push({ id, level, shiny: !!(p && p.shiny), moves: [] }); continue; }
    const mon = createPoke(id, level, !!(p && p.shiny));
    if (!mon) continue;
    const named = (Array.isArray(p.moves) ? p.moves : []).filter((m) => m && MOVES[m]).slice(0, 4);
    if (named.length) mon.moves = named.map((m) => ({ id: m }));
    if (p.talent) mon.talent = p.talent;
    if (p.item) mon.heldItem = p.item;   // passe 47 : objet tenu du PNJ
    out.push(mon);
  }
  return out;
}

// Lance le duel borné depuis le résultat npc_battle de baseVisitInteract.
function baseEditorLaunchNpcBattle(battleSpec) {
  if (!battleSpec || !battleSpec.npc) return { ok: false };
  const npc = battleSpec.npc;
  const team = baseNpcTeamToChampTeam(npc.team);
  if (!team.length || typeof startBattle !== 'function') return { ok: false, reason: 'base.err.npc_team' };
  const ok = startBattle(null, true, 'base_npc', team);
  // startBattle renvoie undefined en cas de succès historique : si l'équipe
  // adverse est bien posée, le combat est actif.
  if (ok === false || (typeof battle === 'undefined' || !battle || !battle.active)) return { ok: false, reason: 'base.err.npc_team' };
  // Passe 52 : c'est ICI (duel réellement accepté) qu'on compte le combat,
  // plus à l'ouverture du dialogue.
  if (_baseEd.visit && _baseEd.visit.talkedToday) {
    _baseEd.visit.talkedToday[npc.id] = (_baseEd.visit.talkedToday[npc.id] | 0) + 1;
  }
  battle.isBaseNpcBattle = true;
  battle.baseNpcName = npc.name;
  // Passe 52 : le PNJ est mémorisé pour le PANNEAU DE FIN DE COMBAT — le
  // joueur ne voyait jamais la réplique de victoire/défaite (elle partait
  // dans le journal de combat, qui se ferme avec le duel).
  battle.baseNpcRef = npc;
  battle.baseNpcSprite = npc.sprite || null;
  battle.baseNpcMsgs = { win: npc.msgs.win || '', lose: npc.msgs.lose || '' };
  battle.chill = false;           // duel réel, pas une chaîne d'exploration
  battle.noAutoCatch = true;      // jamais de capture chez un copain !
  if (npc.msgs.pre && typeof addBattleLog === 'function') addBattleLog('« ' + npc.msgs.pre + ' » — ' + npc.name);
  return { ok: true };
}

// Texte de fin de visite (compteurs) — l'écran notifie.
function baseEditorVisitSummary() {
  const sess = _baseEd.visit;
  return sess ? { w: sess.battlesWon | 0, l: sess.battlesLost | 0, name: _baseEd.visitName } : null;
}

window.baseEditorGet = baseEditorGet;
window.baseEditorResetSel = baseEditorResetSel;
window.baseEditorSelectSlug = baseEditorSelectSlug;
window.baseEditorSelectNpc = baseEditorSelectNpc;
window.baseEditorSelectNpcNew = baseEditorSelectNpcNew;
window.baseEditorRotatePlacement = baseEditorRotatePlacement;
window.baseEditorCellFromEvent = baseEditorCellFromEvent;
window.baseEditorCellResolve = baseEditorCellResolve;
window.baseEditorSetHover = baseEditorSetHover;
window.baseEditorGhost = baseEditorGhost;
window.baseEditorWallCell = baseEditorWallCell;
window.baseEditorSelAt = baseEditorSelAt;
window.baseEditorClickCell = baseEditorClickCell;
window.baseEditorMoveStart = baseEditorMoveStart;
window.baseEditorMoveCancel = baseEditorMoveCancel;
window.baseEditorPickupSel = baseEditorPickupSel;
window.baseEditorRotateSel = baseEditorRotateSel;
window.baseEditorStartVisit = baseEditorStartVisit;
window.baseEditorAdoptVisit = baseEditorAdoptVisit;
window.baseEditorVisitClick = baseEditorVisitClick;
window.baseEditorVisitTick = baseEditorVisitTick;
window.baseEditorCreditBattle = baseEditorCreditBattle;
window.baseEditorStopVisit = baseEditorStopVisit;
window.baseEditorVisitSummary = baseEditorVisitSummary;
window.baseNpcTeamToChampTeam = baseNpcTeamToChampTeam;
window.baseEditorLaunchNpcBattle = baseEditorLaunchNpcBattle;

