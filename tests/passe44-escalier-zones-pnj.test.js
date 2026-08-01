import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 44 : retours utilisateur « escalier pire qu'avant » + PNJ ─────────
//  1. ESCALIER : sprite = VRAIS métatiles RSE (paire du présentoir), et les
//     DEUX colonnes de l'escalier sont franchissables (« pas que un seul »).
//  2. PRÉSENTOIR / TOBOGGAN : vraies hauteurs d'objets façon RSE — dessus
//     accessible UNIQUEMENT par l'escalier intégré (présentoir : escaliers
//     aux deux extrémités ; toboggan : escalier à gauche), jamais par les
//     bords ; toboggan : glissade FORCÉE jusqu'au tapis si on touche la tête
//     de rampe ; pose uniquement sur socle de niveau.
//  3. GABARITS À ÉTAGE organiques façon ROSA : salle non carrée, montée en
//     petit détour, niche d'escalier encadrée de hauteurs (position unique).
//     (invariants de forme vérifiés dans passe43-porte-lock-hauteurs.test.js D)
//  4. PNJ : début du système — vivier roster (8 copains, sprites de foule
//     dédiés, répliques i18n, équipes gen 1-2), pose/refus sur ancre,
//     interaction → combat borné (1/visite).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));

const SANDBOX_FILES = [
  'src/file-preflight.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/game/core/state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/game/base/base-core.js',
  'src/game/base/base-visit.js',
  'src/game/base/base-exchange.js',
  'src/game/base/base-editor.js',
  'src/game/base/base-debug.js',
];

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }, head: { dataset: {} }, documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, children: [], appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, addEventListener() {}, click() {}, remove() {} }),
      addEventListener() {}, removeEventListener() {},
    },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() },
    navigator: { language: 'fr' },
    location: { href: 'http://localhost/', reload() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    setInterval: () => 1, clearInterval() {}, setTimeout: (cb) => setTimeout(cb, 0), clearTimeout() {},
    PokeWorldGameStarted: false,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of SANDBOX_FILES) vm.runInContext(R(f), sandbox, { filename: f });
  return sandbox;
}

// ——— A — escalier : franchissement des DEUX colonnes (visite réelle) ———————
test('passe 44 A : les DEUX colonnes de l\u2019escalier sont franchissables', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    // passe 47 : les salles sont redessinées — on LIT la niche dans le gabarit
    // au lieu de coder ses coordonnées en dur.
    const L = baseLayoutGet('cave_5');
    const a0 = L.stairAnchors[0];
    const W = a0.x, E = a0.x + 1, AY = a0.y;   // paire d'ancres, rangée AY
    basePlace(st, 'stairs', W, AY, 0);
    const r = { W, E, AY };
    // colonne OUEST : spawn → plateau (2 rangées au-dessus de l'ancre)
    let sess = baseVisitCreate(st);
    let ok = baseVisitSetDestination(sess, W, AY - 2);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.westPath = !!ok; r.west = sess.pos; r.westElev = sess.elev;
    // colonne EST
    sess = baseVisitCreate(st);
    ok = baseVisitSetDestination(sess, E, AY - 2);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.eastPath = !!ok; r.east = sess.pos; r.eastElev = sess.elev;
    // latéralité SUR l'escalier : on rejoint l'autre colonne d'ancre
    sess = baseVisitCreate(st);
    baseVisitSetDestination(sess, E, AY);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.onStairs = sess.pos;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.westPath, true, 'colonne OUEST traversable');
  assert.deepEqual([out.west.x, out.west.y, out.westElev], [out.W, out.AY - 2, 1], 'montée OUEST → mezzanine');
  assert.equal(out.eastPath, true, 'colonne EST traversable');
  assert.deepEqual([out.east.x, out.east.y, out.eastElev], [out.E, out.AY - 2, 1], 'montée EST → mezzanine');
  assert.deepEqual([out.onStairs.x, out.onStairs.y], [out.E, out.AY], 'passage latéral entre colonnes d\u2019escalier');
});

// ——— B — présentoir : hauteur d'objet canon (escaliers aux 2 extrémités) ———
test('passe 44 B : présentoir — montée/descente UNIQUEMENT par ses escaliers', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    basePlace(st, 'stand', 2, 3, 0);         // présentoir 4×2 : rangée 3 = dessus, rangée 4 = base
    const r = {};
    const g = baseBuildGrid(st);
    // base pleine bloquée (entre les 2 escaliers)
    r.baseBlocked = [baseCellWalkable(st, g, 3, 4, null), baseCellWalkable(st, g, 4, 4, null)];
    // escaliers d'extrémités franchissables ; dessus franchissable
    r.stairW = baseCellWalkable(st, g, 2, 4, null);
    r.stairE = baseCellWalkable(st, g, 5, 4, null);
    r.topWalk = baseCellWalkable(st, g, 3, 3, null);
    // montée par un escalier : spawn → dessus
    let sess = baseVisitCreate(st);
    r.upPath = baseVisitSetDestination(sess, 3, 3).map((s) => s.x + ',' + s.y);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.atTop = sess.pos; r.sub = sess.subElev;
    // depuis le dessus, AUCUNE sortie par les bords : (5,3) ne s'ouvre que sur
    // le dessus (4,3) et son escalier (5,4) — jamais (5,2) nord ni (6,3) est.
    r.vois = baseVisitNeighbors(sess, 5, 3, 0).map((n) => n.x + ',' + n.y).sort();
    r.vois2 = baseVisitNeighbors(sess, 2, 3, 0).map((n) => n.x + ',' + n.y).sort();
    // descente possible par l'escalier EST (5,4) : chemin dessus → sol sud-est
    r.downPath = baseVisitSetDestination(sess, 5, 5).map((s) => s.x + ',' + s.y);
    while (sess.path.length) baseVisitStepAlong(sess);
    r.gone = sess.pos;
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.baseBlocked, [false, false], 'soubassement plein bloqué');
  assert.equal(out.stairW && out.stairE, true, 'escaliers des DEUX extrémités franchissables');
  assert.equal(out.topWalk, true, 'dessus marchable');
  assert.deepEqual(out.atTop, { x: 3, y: 3 }, 'monté sur le présentoir');
  assert.equal(out.sub, 1, 'subElev = 1 sur le dessus (hauteur simulée)');
  // ✋ le verrou canon : depuis le dessus, seuls le dessus et l'escalier intégré
  assert.deepEqual(out.vois, ['4,3', '5,4'], 'coin EST : sortie = escalier EST seulement');
  assert.deepEqual(out.vois2, ['2,4', '3,3'], 'coin OUEST : sortie = escalier OUEST seulement');
  assert.ok(out.downPath && out.downPath.length > 0, 'sortie par l’escalier EST');
  assert.deepEqual(out.gone, { x: 5, y: 5 }, 'descendu au sol par l’escalier');
});

test('passe 44 B2 : présentoir/toboggan — socle de niveau exigé (pas à cheval)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    const L = baseLayoutGet('cave_5');
    const elevAt = (x, y) => {
      const c = L.cells[y] && L.cells[y][x];
      return (c && c.t === 'floor') ? c.elev : null;
    };
    // Passe 48 : les salles sont maintenant DEUX espaces séparés par une
    // falaise pleine largeur — il n'existe plus de cellules d'élévations
    // différentes côte à côte. Le cas « à cheval » se teste donc en visant
    // délibérément la rangée qui chevauche la falaise (plateau au nord,
    // sol au sud) : la pose doit être refusée.
    let cliffRow = -1;
    for (let y = 0; y < L.h && cliffRow < 0; y++) {
      for (let x = 0; x < L.w; x++) if (L.cells[y][x].t === 'cliff') { cliffRow = y; break; }
    }
    // On vérifie qu'AUCUNE pose 4×2 ne peut mélanger deux élévations : avec
    // la cloison de falaise pleine largeur, le cas « à cheval » n'existe même
    // plus géométriquement — c'est le résultat recherché.
    r.anyStraddle = null;
    for (let y = 0; y + 1 < L.h && !r.anyStraddle; y++) {
      for (let x = 0; x + 3 < L.w; x++) {
        const es = [];
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 4; dx++) es.push(elevAt(x + dx, y + dy));
        if (es.some((e) => e === null)) continue;
        if (new Set(es).size > 1) { r.anyStraddle = baseCanPlace(st, 'stand', x, y, 0); break; }
      }
    }
    // la falaise elle-même n'accepte jamais un meuble
    r.onCliff = baseCanPlace(st, 'stand', 4, cliffRow, 0);
    // de niveau sur le plateau
    for (let x = 1; x + 3 < L.w && !r.onMezz; x++) {
      const es = [];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 4; dx++) es.push(elevAt(x + dx, cliffRow - 2 + dy));
      if (es.every((e) => e === 1)) r.onMezz = baseCanPlace(st, 'stand', x, cliffRow - 2, 0);
    }
    // de niveau au sol : empreinte 2×3 du toboggan
    for (let y = cliffRow + 1; y + 2 < L.h && !r.onFloor; y++) {
      for (let x = 1; x + 1 < L.w; x++) {
        const es = [];
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) es.push(elevAt(x + dx, y + dy));
        if (es.some((e) => e !== 0)) continue;
        const c = baseCanPlace(st, 'slide', x, y, 0);
        if (c.ok) { r.onFloor = c; break; }
      }
    }
    return JSON.stringify(r);
  })()`, sb));
  // Passe 48 : plus aucune configuration « à cheval » possible (deux salles
  // séparées par une falaise pleine largeur). Si une subsiste, elle DOIT être
  // refusée pour socle inégal.
  if (out.anyStraddle) {
    assert.equal(out.anyStraddle.ok, false, 'présentoir à cheval refusé');
    assert.equal(out.anyStraddle.reason, 'base.err.uneven', 'raison : socle de niveau');
  }
  assert.equal(out.onCliff.ok, false, 'aucun meuble posé sur la falaise');
  assert.equal(out.onMezz.ok, true, 'présentoir sur le plateau (de niveau)');
  assert.equal(out.onFloor.ok, true, 'toboggan au sol (de niveau)');
});

// ——— C — toboggan : escalier à gauche, glissade forcée, rampe infranchie ———
test('passe 44 C : toboggan — montée par l\u2019escalier, glissade forcée au tapis', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');  // le PC auto-posé occupe (3,1)
    // passe 45 : empreinte 2×3 (6 cases) — le carter est un surplomb VISUEL
    // hors empreinte. Posé en (3,2) : palier r0 (y2), esc/rampe r1 (y3),
    // tapis r2 (y4) ; la case (3,1)/(4,1) SOUS le carter reste libre.
    const put = basePlace(st, 'slide', 3, 2, 0);
    if (!put.ok) return JSON.stringify({ placeFailed: put.reason });
    const r = {};
    const g = baseBuildGrid(st);
    // le sol DERRIÈRE le toboggan (sous le carter) est libre — retour utilisateur
    r.behindFree = baseCellWalkable(st, g, 3, 1, null) && baseCellWalkable(st, g, 4, 1, null);
    // passe 46 : la glissière n'est PLUS une case morte — elle est franchissable
    // (on y met le pied et on glisse), mais à SENS UNIQUE (cf. r.upRamp plus bas).
    r.rampSurf = baseCellWalkable(st, g, 4, 3, null);
    r.stairs = baseCellWalkable(st, g, 3, 3, null);
    r.mat = baseCellWalkable(st, g, 4, 4, null);
    // montée : tapis → escalier → palier → tête de rampe
    const sess = baseVisitCreate(st);
    r.climb = baseVisitSetDestination(sess, 4, 2).map((s) => s.x + ',' + s.y);
    while (sess.path.length) baseVisitStepAlong(sess);
    // la tête de rampe a DÉCLENCHÉ la glissade avant d'y stationner…
    r.after = sess.pos;
    r.logSlides = sess.log.filter((e) => e.fx === 'slide').length;
    r.subEnd = sess.subElev;
    // concrètement : destination intermédiaire = palier gauche (3,2) SANS glissade
    const sess2 = baseVisitCreate(st);
    baseVisitSetDestination(sess2, 3, 2);
    while (sess2.path.length) baseVisitStepAlong(sess2);
    r.onLanding = sess2.pos; r.subLand = sess2.subElev;
    r.noSlide = sess2.log.filter((e) => e.fx === 'slide').length;
    // impossible de remonter la rampe : tapis (4,4) → rampe (4,3) refusé
    r.upRamp = baseVisitSetDestination(sess2, 4, 3);
    return JSON.stringify(r);
  })()`, sb));
  assert.ok(!out.placeFailed, 'pose du toboggan acceptée' + (out.placeFailed ? ' (' + out.placeFailed + ')' : ''));
  assert.equal(out.behindFree, true, 'passe 45 : les 2 cases SOUS le carter restent libres (on passe derrière)');
  assert.equal(out.rampSurf, true, 'passe 46 : la glissière est une case utilisable (plus de case morte)');
  assert.equal(out.stairs && out.mat, true, 'escalier + tapis franchissables');
  const chain = out.climb.join(' ');
  assert.ok(chain.indexOf('3,4 3,3') >= 0, 'approche par le tapis puis l’escalier');
  assert.deepEqual(out.climb.slice(-3), ['3,3', '3,2', '4,2'], 'montée par l’escalier gauche jusqu’à la tête de rampe');
  assert.deepEqual(out.after, { x: 4, y: 4 }, 'tête de rampe touchée → glissade au tapis');
  assert.equal(out.logSlides, 1, 'un événement glissade');
  assert.equal(out.subEnd, 0, 'retombé au niveau du sol');
  assert.deepEqual(out.onLanding, { x: 3, y: 2 }, 'palier atteignable à pied');
  assert.equal(out.subLand, 1, 'perché sur le palier');
  assert.equal(out.noSlide, 0, 'pas de glissade sur le palier gauche');
  // Passe 50 : le haut du toboggan est désormais ACCESSIBLE (par l'escalier
  // intégré) — c'était la demande. Un chemin vers la glissière existe donc,
  // mais il passe forcément par le HAUT : il descend, il ne remonte pas.
  {
    const path = out.upRamp || [];
    const iTop = path.findIndex((s2) => s2.y <= 2);
    const iRamp = path.findIndex((s2) => s2.x === 4 && s2.y === 3);
    assert.ok(iRamp < 0 || (iTop >= 0 && iTop < iRamp),
      'la glissière n’est empruntée que du HAUT vers le bas');
  }
});

// ——— D — gabarits : tout le plateau atteignable en visite (escalier posé) ——
test('passe 44 D : les 12 niches relient 100 % du plateau en visite', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const res = {};
    for (const lid of ['cave_5','cave_6','tree_5','tree_6','bush_5','bush_6','cave_red_5','cave_red_6','cave_blue_5','cave_blue_6','cave_yellow_5','cave_yellow_6']) {
      const st = baseGetState();
      baseDebugCreate(lid);
      st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
      const L = baseLayoutGet(lid);
      // pose UN escalier par paire d'ancres (toutes les niches)
      const runs = [];
      for (const a of L.stairAnchors) if (!runs.some((r) => Math.abs(r - a.x) <= 1)) runs.push(a.x);
      let n = 0;
      for (const x of runs) { st.stock.stairs = (st.stock.stairs || 0) + 1; if (basePlace(st, 'stairs', x, L.stairAnchors[0].y, 0).ok) n++; }
      // portée totale depuis le spawn
      const from = L.spawn;
      const reach = baseReachableSet(st, baseBuildGrid(st), from.x, from.y);
      let hi = 0, hiOk = 0;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const c = L.cells[y][x];
        if (c.t === 'floor' && c.elev === 1) { hi++; if (reach.has(x + ',' + y)) hiOk++; }
      }
      res[lid] = { stairs: n, runs: runs.length, hi, hiOk };
    }
    return JSON.stringify(res);
  })()`, sb));
  for (const [lid, r] of Object.entries(out)) {
    assert.equal(r.stairs, r.runs, `${lid} : escalier posé dans chaque niche`);
    assert.ok(r.hi >= 10, `${lid} : plateau conséquent (${r.hi} cases)`);
    assert.equal(r.hiOk, r.hi, `${lid} : 100 % du plateau atteignable (${r.hiOk}/${r.hi})`);
  }
});

// ——— F — PNJ : pose, refus sur ancre, combat borné ————————————————————————
test('passe 44 F : PNJ — pose légale, refus sur ancre, combat borné', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const st = baseGetState();
    baseDebugCreate('cave_5');
    // passe 47 : plus de vivier — on pose des PNJ directement, comme un objet.
    const mk = (name) => baseNpcCreate(st, { name, sprite: 'trainer-0',
      team: [{ id: 19, level: 13 }, { id: 21, level: 14 }] });
    const a = mk('PNJ A');
    const b = mk('PNJ B');
    // pose légale sur sol libre
    const g0 = baseBuildGrid(st);
    let free = null;
    const L = baseLayoutGet('cave_5');
    for (let y = 0; y < L.h && !free; y++) for (let x = 0; x < L.w; x++) {
      const c = baseCellAt(g0, x, y);
      if (c && c.t === 'floor' && !c.stairAnchor && !c.entrance && !c.spawnPt
          && g0.occ[y][x] == null) { free = { x, y }; break; }
    }
    r.place = baseNpcPlace(st, a.id, free.x, free.y);
    // refus sur une ancre d'escalier
    const anch = L.stairAnchors[0];
    r.onAnchor = baseNpcPlace(st, b.id, anch.x, anch.y);
    // interaction → combat borné (1 fois par visite)
    const sess = baseVisitCreate(st);
    const inter = baseVisitInteract(sess, free.x, free.y);
    r.interType = inter.type;
    r.battle = inter.type === 'npc_battle'
      ? { kind: inter.battle.kind, team: inter.battle.team.length } : null;
    r.again = baseVisitInteract(sess, free.x, free.y).type;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.place.ok, true, 'pose sur sol libre');
  assert.equal(out.onAnchor.ok, false, 'pose refusée sur une ancre d’escalier');
  assert.equal(out.interType, 'npc_battle', 'interaction → duel borné');
  assert.equal(out.battle.kind, 'base_npc', 'duel base_npc');
  assert.equal(out.battle.team, 2, 'équipe transmise au duel');
  // Passe 52 (retour utilisateur : « on doit pouvoir le combattre autant
  //    qu'on veut ») : plus de verrou d'un combat par visite. Ouvrir le
  //    dialogue ne consomme plus rien non plus — c'était le second bug :
  //    « passer son chemin » brûlait quand même le duel.
  assert.equal(out.again, 'npc_battle', 'le PNJ reste combattable autant de fois qu’on veut');
});


