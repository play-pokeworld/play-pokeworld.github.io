// ============================================================================
// BASE SECRÈTE — Logique de visite (passe C logique, sans rendu)
// ----------------------------------------------------------------------------
// Session de visite pure : position, élévation, pathfinding (toucher-pour-
// marcher), pièges ROSA, interaction PNJ/objets. Consommable par n'importe
// quel renderer (3D/2.5D) comme par les tests headless.
// ============================================================================

// Crée une session de visite depuis l'état du PROPRIÉTAIRE (copie isolée).
function baseVisitCreate(src) {
  const st = (typeof structuredClone === 'function') ? structuredClone(src) : JSON.parse(JSON.stringify(src));
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return null;
  const spawn = st.spawn || layout.spawn;
  const grid = baseBuildGrid(st);
  const sess = {
    st, grid,
    pos: { x: spawn.x, y: spawn.y },
    elev: grid.layout.cells[spawn.y][spawn.x].elev,
    path: [],
    // passe 42 : orientation + phase de marche (réelles frames GBA en 2D)
    dir: 'down',           // down|up|left|right (dernière direction)
    animStep: 0,           // avance à chaque pas → cadence les frames de marche
    subElev: 0,            // passe 44 : dessus d'un objet (présentoir/toboggan)
    trapsFired: {},      // uid -> true (pitfall/squareone/warp consommés)
    broken: {},          // uid -> true (ballons/boue/porte cassée)
    lit: {},             // uid -> bool (lumières)
    talkedToday: {},     // npcId -> nb de duels LIVRÉS pendant la visite (passe 52 :
                         // plus un verrou, un simple compteur — le PNJ est
                         // re-combattable autant de fois qu'on veut)
    battlesWon: 0, battlesLost: 0,
    log: [],
  };
  return sess;
}

function baseVisitCellWalk(sess, x, y, elev) { return baseCellWalkable(sess.st, sess.grid, x, y, elev); }

// Transition verticale : la cellule est-elle un passage d'escalier actif ?
// (case falaise dont la case SUD est une ancre avec escaliers posés)
function baseStairPass(sess, x, y) {
  const cell = baseCellAt(sess.grid, x, y);
  if (!cell || cell.t !== 'cliff') return false;
  const below = baseCellAt(sess.grid, x, y + 1);
  return !!(below && below.stairAnchor && baseStairsAt(sess.st, x, y + 1));
}

// Voisins en tenant compte de l'élévation (escaliers).
// Passe 44 : + verrou des HAUTEURS D'OBJETS (canon) — on ne monte/descend
// d'un présentoir ou d'un palier de toboggan QUE par son escalier intégré.
function baseVisitNeighbors(sess, x, y, elev) {
  const out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    // passage d'escalier ?
    if (baseStairPass(sess, nx, ny)) { out.push({ x: nx, y: ny, elev }); continue; }
    // case falaise (actuellement sur l'escalier) → franchir vers l'autre élévation
    if (baseStairPass(sess, x, y)) {
      const c = baseCellAt(sess.grid, nx, ny);
      if (c && c.t === 'floor' && c.elev !== elev && baseCellWalkable(sess.st, sess.grid, nx, ny, c.elev)) {
        out.push({ x: nx, y: ny, elev: c.elev });
        continue;
      }
    }
    if (baseVisitCellWalk(sess, nx, ny, elev)) out.push({ x: nx, y: ny, elev });
  }
  return out.filter((n) => baseZoneGateOK(sess.st, x, y, n.x, n.y));
}

// Met à jour la hauteur d'objet (dessus de présentoir / palier de toboggan).
function baseVisitSyncSubElev(sess) {
  sess.subElev = baseZoneTopAt(sess.st, sess.pos.x, sess.pos.y) ? 1 : 0;
  return sess.subElev;
}

// BFS (x,y,elev) → chemin [{x,y}...] (sans la case de départ) ou null.
function baseFindPath(sess, tx, ty) {
  const startK = sess.pos.x + ',' + sess.pos.y + ',' + sess.elev;
  const seen = new Set([startK]);
  const prev = {};
  const q = [{ x: sess.pos.x, y: sess.pos.y, elev: sess.elev }];
  let found = null;
  while (q.length && !found) {
    const cur = q.shift();
    for (const n of baseVisitNeighbors(sess, cur.x, cur.y, cur.elev)) {
      const k = n.x + ',' + n.y + ',' + n.elev;
      if (seen.has(k)) continue;
      seen.add(k);
      prev[k] = cur;
      if (n.x === tx && n.y === ty) { found = n; break; }
      q.push(n);
    }
  }
  if (!found) return null;
  const steps = [];
  let cur = found;
  while (cur && !(cur.x === sess.pos.x && cur.y === sess.pos.y)) {
    steps.unshift({ x: cur.x, y: cur.y, elev: cur.elev });
    cur = prev[cur.x + ',' + cur.y + ',' + cur.elev];
  }
  return steps;
}

function baseVisitSetDestination(sess, tx, ty) {
  if (!baseVisitCellWalk(sess, tx, ty, null) && !baseStairPass(sess, tx, ty)) return null;
  const steps = baseFindPath(sess, tx, ty);
  if (steps) sess.path = steps;
  return steps;
}

// Effects pièges au franchissement de la case → décrit l'événement, met à
// jour la session. Renvoie null si rien.
function baseVisitTrigger(sess, uid) {
  const it = basePlacedFind(sess.st, uid);
  if (!it) return null;
  const def = baseItemGet(it.s);
  const fx = def.fx;
  if (!fx) return null;
  const ev = { fx, uid, item: it.s };
  switch (fx) {
    case 'burst':
      if (sess.broken[uid]) return null;
      sess.broken[uid] = true;
      ev.msg = 'base.visit.burst';
      return ev;
    case 'glitter': ev.msg = 'base.visit.glitter'; return ev;
    case 'jump': ev.msg = 'base.visit.jump'; return ev;
    case 'tall_grass': return null;
    case 'note:0': case 'note:1': case 'note:2': case 'note:3':
    case 'note:4': case 'note:5': case 'note:6': case 'note:7': {
      const base = Number(fx.split(':')[1]) || 0;
      ev.note = (base + baseItemRotNormalize(def, it.rot)) % 8; // tourner = changer la note (canon)
      ev.msg = 'base.visit.note';
      return ev;
    }
    case 'spin':
      // repoussé à la case précédente
      ev.msg = 'base.visit.spin';
      ev.pushBack = true;
      return ev;
    case 'spinforce': {
      const dirIdx = baseItemRotNormalize(def, it.rot) % 8;
      const dir = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]][dirIdx];
      // notre déplacement est 4-directions : arrondi au cardinal le plus proche
      const cardinal = Math.abs(dir[0]) >= Math.abs(dir[1]) ? [Math.sign(dir[0]), 0] : [0, Math.sign(dir[1])];
      ev.msg = 'base.visit.spinforce';
      ev.force = cardinal;
      return ev;
    }
    case 'pitfall':
      if (sess.trapsFired[uid]) return null;
      sess.trapsFired[uid] = true;
      ev.msg = 'base.visit.pitfall';
      ev.stop = true;
      return ev;
    case 'squareone':
      if (sess.trapsFired[uid]) return null;
      sess.trapsFired[uid] = true;
      ev.msg = 'base.visit.squareone';
      ev.teleportSpawn = true;
      return ev;
    case 'warp': {
      if (sess.trapsFired[uid]) return null;
      const others = sess.st.items.filter((o) => o.s === it.s && o.uid !== uid);
      if (!others.length) return null;
      sess.trapsFired[uid] = true;
      ev.msg = 'base.visit.warp';
      ev.teleport = { x: others[0].x, y: others[0].y };
      return ev;
    }
    case 'door': {
      if (!sess.broken[uid]) { sess.broken[uid] = true; ev.msg = 'base.visit.door_break'; return ev; }
      return null; // déjà cassée : franchissable (géré par walk)
    }
    case 'invisible': ev.msg = 'base.visit.invisible'; return ev;
    default: return null;
  }
}

// Un pas le long du chemin courant. Renvoie l'événement éventuel.
function baseVisitStepAlong(sess) {
  if (!sess.path.length) return { moved: false };
  const step = sess.path.shift();
  const prev = { ...sess.pos };
  // passe 42 : orientation de marche (l'instant du pas, avant triggers)
  if (step.x > prev.x) sess.dir = 'right';
  else if (step.x < prev.x) sess.dir = 'left';
  else if (step.y > prev.y) sess.dir = 'down';
  else if (step.y < prev.y) sess.dir = 'up';
  sess.animStep = (sess.animStep | 0) + 1;
  sess.pos = { x: step.x, y: step.y };
  if (step.elev != null) sess.elev = step.elev;
  const uid = sess.grid.occ[step.y][step.x];
  let ev = null;
  if (typeof uid === 'number') ev = baseVisitTrigger(sess, uid);
  // Passe 44 (canon) : tête de rampe du TOBOGGAN → glissade FORCÉE jusqu'au
  // tapis de réception au sud. La rampe ne se franchit jamais à pied.
  const ramp = baseSlideRampAt(sess.st, step.x, step.y);
  if (ramp) {
    sess.dir = 'down';
    sess.animStep = (sess.animStep | 0) + 2;
    // atterrissage sur le tapis = dernière rangée de l'EMPREINTE (passe 45 :
    // 2×3 depuis que le carter est un surplomb visuel hors empreinte).
    const rfp = baseItemFootprint(baseItemGet('slide'), ramp.rot);
    sess.pos = { x: ramp.x + 1, y: ramp.y + rfp.d - 1 };
    sess.path = [];
    const evs = { fx: 'slide', uid: ramp.uid, item: 'slide', msg: 'base.visit.slide', stop: true };
    sess.log.push(evs);
    baseVisitSyncSubElev(sess);
    return { moved: true, ev: evs };
  }
  baseVisitSyncSubElev(sess);
  if (ev) {
    if (ev.pushBack) { sess.pos = prev; sess.path = []; baseVisitSyncSubElev(sess); }
    if (ev.teleport) {
      sess.pos = { ...ev.teleport };
      sess.path = [];
      const dc = sess.grid.layout.cells[ev.teleport.y] && sess.grid.layout.cells[ev.teleport.y][ev.teleport.x];
      if (dc) sess.elev = dc.elev;
      baseVisitSyncSubElev(sess);
    }
    if (ev.teleportSpawn) {
      const sp = sess.st.spawn || sess.grid.layout.spawn;
      sess.pos = { x: sp.x, y: sp.y }; sess.path = [];
      sess.elev = sess.grid.layout.cells[sp.y][sp.x].elev;
      baseVisitSyncSubElev(sess);
    }
    if (ev.force && !sess.broken[ev.uid]) {
      // pas forcé si la case cible est franchissable
      const nx = sess.pos.x + ev.force[0], ny = sess.pos.y + ev.force[1];
      if (baseVisitCellWalk(sess, nx, ny, sess.elev)) { sess.pos = { x: nx, y: ny }; }
    }
    if (ev.stop) sess.path = [];
    sess.log.push(ev);
    return { moved: true, ev };
  }
  return { moved: true };
}

// Avance le long du chemin jusqu'à épuisement ou interruption (tests/FF).
function baseVisitRunPath(sess, maxSteps) {
  let n = 0, lastEv = null;
  const cap = maxSteps || 200;
  while (sess.path.length && n < cap) {
    const r = baseVisitStepAlong(sess);
    if (!r.moved) break;
    n++;
    if (r.ev) lastEv = r.ev;
    if (r.ev && (r.ev.pushBack || r.ev.teleport || r.ev.teleportSpawn || r.ev.stop)) break;
  }
  return { steps: n, lastEv };
}

// Interaction face-à-case (parler PNJ, lire panneau, lit, lumière…).
function baseVisitInteract(sess, tx, ty) {
  const uid = sess.grid.occ[ty] && sess.grid.occ[ty][tx];
  if (uid == null) return { type: 'nothing' };
  if (typeof uid === 'string' && uid.startsWith('npc:')) {
    const npc = sess.st.npcs.find((n) => 'npc:' + n.id === uid);
    if (!npc) return { type: 'nothing' };
    // passe 47 : un PNJ posé mais pas encore configuré (équipe vide) ne
    // propose pas de combat — il salue simplement.
    if (!Array.isArray(npc.team) || !npc.team.length) return { type: 'npc_idle', npc };
    // Passe 52 (retours utilisateur) :
    //   « On doit pouvoir le combattre autant qu'on veut. »
    //   « Ouvrir son panneau nous considère comme si on l'avait déjà
    //     combattu alors que non. »
    // Deux bugs en un : (1) le verrou `talkedToday` limitait le PNJ à UN
    // combat par visite ; (2) il était posé par la simple OUVERTURE du
    // dialogue, donc « Passer son chemin » brûlait quand même le combat.
    // On lève le verrou : le PNJ est re-combattable sans limite, et
    // `talkedToday` ne sert plus qu'à compter les duels RÉELLEMENT livrés
    // (posé par baseEditorLaunchNpcBattle, à l'acceptation du duel).
    // Intention de combat BORNÉ (compatible passe 32 : isChamp)
    return {
      type: 'npc_battle', npc,
      battle: {
        kind: 'base_npc',
        trainerName: npc.name,
        intro: npc.msgs.pre, win: npc.msgs.win, lose: npc.msgs.lose,
        team: npc.team.map((p) => ({ ...p })),
      },
    };
  }
  const it = basePlacedFind(sess.st, uid);
  if (!it) return { type: 'nothing' };
  const def = baseItemGet(it.s);
  switch (def.fx) {
    case 'heal': return { type: 'heal', item: it.s };
    case 'message': return { type: 'message', item: it.s };
    case 'light': sess.lit[uid] = !sess.lit[uid]; return { type: 'light', on: sess.lit[uid] };
    case 'punch': return { type: 'punch', item: it.s };
    case 'pc': return { type: 'pc', record: sess.st.record || null };
    case 'battle_rules': return { type: 'rules', item: it.s };
    case 'sit': return { type: 'sit', item: it.s };
    case 'invisible': sess.broken[uid] = true; return { type: 'reveal', item: it.s };
    case 'cuttable': return { type: 'msg', msg: 'base.visit.makiwara' };
    default: return { type: 'item', item: it.s };
  }
}

window.baseVisitCreate = baseVisitCreate;
window.baseVisitNeighbors = baseVisitNeighbors;
window.baseVisitSyncSubElev = baseVisitSyncSubElev;
window.baseFindPath = baseFindPath;
window.baseVisitSetDestination = baseVisitSetDestination;
window.baseVisitStepAlong = baseVisitStepAlong;
window.baseVisitRunPath = baseVisitRunPath;
window.baseVisitTrigger = baseVisitTrigger;
window.baseVisitInteract = baseVisitInteract;

