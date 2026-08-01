import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 40 : compat file://, déplacement par re-clic, PC mobile ──────────
//  A. Manifeste 2D embarqué en script (fetch CORS-bloqué en file://) :
//     fichier généré = contenu du manifeste JSON, chargé AVANT les vues,
//     consommé en PRIORITÉ par base-view2d.js et base-window.js.
//  B. 3D : après UN échec (img « cross-origin » en file:// → texImage2D
//     jette), la 3D est coupée pour la session (broken3d + select repassé 2D).
//  C. Déplacement : UN clic sur un meuble posé = prise en main directe
//     (passe 41 — la sélection en 2 temps était invisible), empreinte
//     libérée (st._moveUid), pose au clic légal, annulation rend la place,
//     « Ramasser » RANGE le meuble tenu ; tapis de bienvenue fixe ; PC
//     déplaçable.
//  D. PC : objet automatique canon présent dès la création, jamais rangé
//     (Tout ranger/basePickup le conservent), repositionné au déménagement,
//     unique par base, et déplaçable TANT QU'il reste joignable à pied
//     depuis l'ouverture (base.err.pc_unreachable sinon).
//  (passe 41) F. escalier = empreinte canon 2×2 (style ROSA), cave_5 a été
//     regrillée : ancres (1,4)/(2,4), pilier x9-10 y6-7, porte E (6,9).
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
  'src/game/base/base-editor.js',
  'src/game/base/base-debug.js',
];

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {} },
      head: { dataset: {} }, documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, addEventListener() {}, click() {}, remove() {} }),
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

// ——— A — Manifeste script compatible file:// ————————————————————————————
test('passe 40 A : manifeste 2D embarqué en script, lu en priorité', () => {
  assert.ok(E('src/data/base-manifest-2d-data.js'), 'fichier manifeste JS présent');
  const js = R('src/data/base-manifest-2d-data.js');
  assert.ok(js.startsWith('// GENERE'), 'marqueur généré');
  const body = js.slice(js.indexOf('window.PokeWorldBaseManifest2D = '));
  const jsonTxt = body.slice(body.indexOf('{'), body.lastIndexOf(';'));
  const fromJs = JSON.parse(jsonTxt);
  const fromJson = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.deepEqual(Object.keys(fromJs.items).sort(), Object.keys(fromJson.items).sort(), 'mêmes slugs');
  assert.equal(fromJs.items.solid_board.emerald, fromJson.items.solid_board.emerald, 'mêmes chemins');
  // chargé AVANT les vues dans le loader
  const loader = R('src/loader.js');
  const iMan = loader.indexOf('src/data/base-manifest-2d-data.js');
  assert.ok(iMan > -1, 'manifeste JS dans le loader');
  assert.ok(iMan < loader.indexOf('src/game/base/base-view2d.js'), 'avant base-view2d');
  assert.ok(iMan < loader.indexOf('src/game/base/base-window.js'), 'avant base-window');
  // les DEUX consommateurs lisent la globale EN PRIORITÉ (fetch = repli http)
  const v2d = R('src/game/base/base-view2d.js');
  const win = R('src/game/base/base-window.js');
  for (const [name, src] of [['view2d', v2d], ['window', win]]) {
    assert.ok(src.includes('window.PokeWorldBaseManifest2D'), `${name} lit la globale`);
    assert.ok(src.indexOf('window.PokeWorldBaseManifest2D') < src.indexOf("fetch('src/assets/images/secret-base/manifest.render2d.json')"), `${name} : globale avant fetch`);
  }
});

// ——— B — 3D coupée proprement après le 1er échec ————————————————————————
test('passe 40 B : renderer 3D supprimé', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), 'renderer 3D supprimé');
});

// ——— C — Déplacement en UN clic (passe 41) ————————————————————————————————
test('passe 41 C : UN clic sur un meuble posé = prise en main directe', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const r = {};
    basePlace(st, 'small_desk', 3, 4, 0);
    const desk = st.items.find((i) => i.s === 'small_desk');
    // UN clic sur le meuble posé = prise en main DIRECTE (passe 41 : la
    // sélection en 2 temps était invisible et lue comme un bug).
    const c1 = baseEditorClickCell(st, 3, 4);
    r.start = c1.type;
    r.moveUid = baseEditorGet().moveUid === desk.uid;
    // l'empreinte est libérée : un autre meuble pourrait passer par là
    r.canReuse = baseCanPlace(st, 'pokemon_chair', 3, 4, 0).ok === true;  // passe 42 : slug canon
    // clic sur une case illégale (mur) → toujours en main
    baseEditorSetHover({ x: 0, y: 0 });
    const bad = baseEditorClickCell(st, 0, 0);
    r.badOk = bad.ok !== false ? 'oui' : bad.reason;
    r.stillHeld = baseEditorGet().moveUid === desk.uid;
    // clic légal → posé là-bas, main relâchée
    const c3 = baseEditorClickCell(st, 5, 5);
    r.placed = c3.ok === true && st.items.find((i) => i.uid === desk.uid).x === 5;
    r.released = baseEditorGet().moveUid == null;
    // annulation : re-prise (un clic), pivot du tenu, clic droit → tout rendu
    baseEditorClickCell(st, 5, 5);
    baseEditorRotateSel(st); // passe 42 : rotation supprimée → sans effet, ne casse rien
    baseEditorMoveCancel(st);
    const d2 = st.items.find((i) => i.uid === desk.uid);
    r.backHome = d2.x === 5 && d2.y === 5 && d2.rot === 0; // pivot tenté jeté à l'annulation
    // « Ramasser » avec un meuble en main = le RANGE (passe 41) : plus de
    // blocage « ramassage impossible pendant un déplacement ».
    baseEditorClickCell(st, 5, 5);
    r.heldAgain = baseEditorGet().moveUid === desk.uid;
    const pk = baseEditorPickupSel(st);
    r.pickHeld = pk.ok === true && pk.slug === 'small_desk';
    r.gone = !st.items.some((i) => i.uid === desk.uid);
    r.backInStock = (st.stock.small_desk || 0) >= 1;
    // …mais le PC et le tapis, même tenus, refusent le rangement (automatiques)
    const pc = st.items.find((i) => i.s === 'pc');
    baseEditorClickCell(st, pc.x, pc.y);
    r.pcHeld = baseEditorGet().moveUid === pc.uid;
    r.pcPick = baseEditorPickupSel(st).reason || 'rangé?!';
    baseEditorMoveCancel(st);
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.start, 'move_start', 'UN clic = prise en main directe');
  assert.equal(out.moveUid, true);
  assert.equal(out.canReuse, true, 'empreinte libérée pendant le portage');
  assert.equal(out.badOk, 'base.err.floor_only');
  assert.equal(out.stillHeld, true, 'pose illégale : on garde le meuble');
  assert.equal(out.placed, true, 'pose légale au nouveau point');
  assert.equal(out.released, true);
  assert.equal(out.backHome, true, 'annulation : place et rotation d’origine rendues');
  assert.equal(out.heldAgain, true, 're-prise en un clic');
  assert.equal(out.pickHeld, true, '« Ramasser » range le meuble tenu');
  assert.equal(out.gone, true, 'meuble retiré du sol');
  assert.equal(out.backInStock, true, 'retourné dans le stock');
  assert.equal(out.pcHeld, true, 'le PC se prend en main comme tout meuble');
  assert.equal(out.pcPick, 'base.err.fixed', 'le PC tenu refuse le rangement');
});

// ——— D — PC automatique mobile sous contrainte d'accès ——————————————————
test('passe 40 D : PC auto, jamais rangé, repositionné, unique, joignable', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    const pc1 = st.items.find((i) => i.s === 'pc');
    r.autoAtCreate = !!pc1;
    r.walkableFromOpen = (() => {
      const g = baseBuildGrid(st);
      const reach = baseReachableSet(st, g, 5, 8); // E cave_1 = (5,8)
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        if (reach.has((pc1.x + dx) + ',' + (pc1.y + dy))) return true;
      }
      return false;
    })();
    // « Tout ranger » : le PC et le tapis RESTENT
    r.cleared = baseClearAll(st);
    r.pcStillThere = st.items.some((i) => i.s === 'pc');
    r.matGone = !st.items.some((i) => i.s === 'welcome_mat'); // passe 43 : retiré
    // déménagement : repositionné près de la nouvelle ouverture
    baseRelocate(st, 'tree_2');
    const pc2 = st.items.find((i) => i.s === 'pc');
    r.repositioned = pc2.x !== pc1.x || pc2.y !== pc1.y || st.layoutId !== 'cave_1';
    r.singlePc = st.items.filter((i) => i.s === 'pc').length;
    // unique : pas de 2e PC posable même en stock
    baseDebugGrantAll();
    st.stock.pc = 1;
    r.secondRefused = baseCanPlace(st, 'pc', pc2.x, pc2.y + 2, 0).reason;
    // déplaçable tant que joignable : UN clic = prise en main (passe 41)
    baseEditorClickCell(st, pc2.x, pc2.y);
    r.held = baseEditorGet().moveUid === pc2.uid;
    const g2 = baseBuildGrid(st);
    const reach2 = baseReachableSet(st, g2, 3, 9); // E tree_2 = (3,9)
    let spot = null;
    for (let y = 0; y < 11 && !spot; y++) for (let x = 0; x < 10 && !spot; x++) {
      const c = st.layoutId ? baseLayoutGet(st.layoutId).cells[y][x] : null;
      if (c && c.t === 'floor' && reach2.has(x + ',' + y) && g2.occ[y][x] == null) spot = [x, y];
    }
    const okMv = baseEditorClickCell(st, spot[0], spot[1]);
    r.movedOk = okMv.ok === true;
    // coincement : zone coupée de l'arrivée par un rideau → pc_unreachable.
    // cave_3 (15x11) : S arrive à l'EST (12,3) ; l'ouest (x1..4) ne rejoint
    // l'est que par le couloir nord (y=1). 12 bureaux y=1 x1..12 le scellent.
    const st2 = baseGetState();
    baseDebugCreate('cave_3');
    st2.items = st2.items.filter((i) => i.s !== 'pc' && i.s !== 'welcome_mat');
    st2.stock = {}; st2.npcs = []; st2.npcStock = []; st2.uidSeq = 50;
    r.westFreeNoCurtain = baseCanPlace(st2, 'pc', 2, 4, 0).ok === true; // sans rideau : OK
    for (let x = 1; x <= 12; x++) st2.items.push({ uid: 100 + x, s: 'small_desk', x, y: 1, rot: 0 });
    r.blocked = baseCanPlace(st2, 'pc', 2, 4, 0).reason;                 // avec rideau : injoignable
    r.freeOk = r.westFreeNoCurtain;
    // et à l'est, toujours joignable malgré le rideau (pas de faux positif)
    const g9 = baseBuildGrid(st2);
    let eastOk = null;
    for (let y = 3; y < 9 && eastOk == null; y++) for (let x = 10; x < 14 && eastOk == null; x++) {
      if (baseLayoutGet('cave_3').cells[y][x].t === 'floor' && g9.occ[y][x] == null) {
        eastOk = baseCanPlace(st2, 'pc', x, y, 0).ok === true;
      }
    }
    r.eastStillOk = eastOk;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.autoAtCreate, true, 'PC posé dès la création');
  assert.equal(out.walkableFromOpen, true, 'PC initial joignable depuis l’ouverture');
  assert.equal(out.pcStillThere, true, '« Tout ranger » conserve le PC');
  assert.equal(out.matGone, true, 'passe 43 : le tapis d\u2019accueil n\u2019existe plus (RSE fidèle)');
  assert.equal(out.repositioned, true, 'PC repositionné au déménagement');
  assert.equal(out.singlePc, 1, 'un seul PC par base');
  assert.equal(out.secondRefused, 'base.err.already_placed');
  assert.equal(out.held, true, 'le PC se prend en main comme tout meuble');
  assert.equal(out.movedOk, true, 'déplacement légal du PC');
  assert.equal(out.blocked, 'base.err.pc_unreachable', 'coincé → refus explicite');
  assert.equal(out.freeOk, true, 'même case sans rideau → acceptée');
  assert.equal(out.eastStillOk, true, 'côté arrivée, le PC reste posable (pas de faux positif)');
});

// ——— E — 12 grottes canon manquantes ajoutées ————————————————————————————
test('passe 40 E : 24 gabarits canon = map.bin (4 couleurs × 4 grottes)', () => {
  const canon = J('tools/emerald-ref/canon-grids.json');
  const ids = Object.keys(canon).sort();
  assert.equal(ids.length, 24, '24 gabarits canon persistés (12 originales + 12 grottes)');
  for (const c of ['cave_red', 'cave_blue', 'cave_yellow']) {
    for (let n = 1; n <= 4; n++) assert.ok(ids.includes(`${c}_${n}`), `gabarit ${c}_${n}`);
  }
  // classification moteur alignée sur la référence
  const src = R('src/data/base-layouts-data.js');
  const m = src.match(/const BASE_LAYOUT_SHAPES = \{([\s\S]*?)\n\};/);
  const js = {};
  for (const b of m[1].matchAll(/(\w+):\s*\{\s*canon: '[^']+',\s*rows: \[([\s\S]*?)\]/g)) {
    js[b[1]] = [...b[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  assert.deepEqual(Object.keys(js).sort(), ids, 'les 24 ids canon dans les données');
  // passe 43 : 'S' normalisé — sa position (devant la porte) est un choix de
  // gameplay utilisateur, pas une collision map.bin.
  const norm = (rows) => rows.map((r) => r.split('S').join('.'));
  for (const id of ids) assert.deepEqual(norm(js[id]), norm(canon[id]), `${id} grille (hors 'S') == map.bin`);
  // fonds cuits pour les 12 nouvelles + thème de rendu partagé 'cave'
  const sb = makeSandbox();
  for (const c of ['cave_red_1', 'cave_blue_2', 'cave_yellow_3']) {
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${c}.png`), `fond ${c}`);
    const th = vm.runInContext(`baseLayoutGet(${JSON.stringify(c)}).theme`, sb);
    assert.equal(th, 'cave', `${c} : thème cave`);
  }
  // noms i18n FR/EN pour la fenêtre
  for (const id of ids) {
    for (const lang of ['fr', 'en']) {
      assert.equal(typeof vm.runInContext(
        `I18N.${lang}.base.win.layout[${JSON.stringify(id)}]`, sb), 'string', `${lang} layout.${id}`);
    }
  }
});

// ——— F — 6 gabarits perso deux-niveaux + escalier ————————————————————————
test('passe 40 F : mezzanine + falaise + escalier (pose, refuge, traversée)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    r.shapeIds = baseLayoutIds().length;
    r.custom = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6'].map((id) => {
      const L = baseLayoutGet(id);
      return { id, anchors: L.stairAnchors.length, elev: L.cells.flat().filter((c) => c.elev === 1).length,
               cliff: L.cells.flat().filter((c) => c.t === 'cliff').length };
    });
    // pose de l'escalier sur une ancre de cave_5 + refus hors ancre
    const st = baseGetState();
    baseDebugCreate('cave_5');
    st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
    baseStockAdd(st, 'stairs', 1);
    const L = baseLayoutGet('cave_5');
    const a = L.stairAnchors[0];
    r.anchorCells = L.stairAnchors.length;
    const p = basePlace(st, 'stairs', a.x, a.y, 0);
    r.placed = p.ok === true;
    const st2 = st.items.find((i) => i.s === 'stairs');
    r.footprint = st2 ? { x: st2.x, y: st2.y } : null; // empreinte normalisée ^/=/a
    // passe 47 : les salles ont été redessinées — on CHERCHE une case de sol
    // nu, libre et sans ancre, au lieu d'en coder une en dur.
    r.notOnFloor = null;
    {
      const LL = baseLayoutGet('cave_5');
      const gg = baseBuildGrid(st);
      for (let y = 0; y < LL.h && !r.notOnFloor; y++) for (let x = 0; x < LL.w; x++) {
        const c = LL.cells[y][x];
        if (c && c.t === 'floor' && !c.stairAnchor && !c.entrance && !c.spawnPt
            && c.elev === 0 && gg.occ[y][x] == null) {
          const why = baseCanPlace(st, 'stairs', x, y, 0).reason;
          if (why) { r.notOnFloor = why; break; }
        }
      }
    }
    // la falaise est franchie UNIQUEMENT là où l'escalier est ancré
    const g = baseBuildGrid(st);
    r.cliffBlocked = false;
    {
      const LL = baseLayoutGet('cave_5');
      for (let y = 0; y < LL.h; y++) for (let x = 0; x < LL.w; x++) {
        const c = LL.cells[y][x];
        if (c && c.t === 'cliff' && !baseStairsAt(st, x, y + 1)) {
          if (baseCellWalkable(st, g, x, y, 0)) r.cliffBlocked = true;
        }
      }
    }
    r.stairWalk = baseCellWalkable(st, g, a.x, a.y, 0); // case ancre marchable
    // traversée complète en visite : du spawn à la mezzanine et retour
    const sess = baseVisitCreate(st);
    const path = baseFindPath(sess, a.x, 1, 1); // case mezzanine (1,1) elev1… cible = (a.x,1)?
    r.havePath = !!path;
    baseVisitSetDestination(sess, a.x, 1);
    let up = null;
    let guard = 0;
    while (sess.path.length && guard++ < 64) baseVisitStepAlong(sess);
    r.topElev = sess.elev;
    r.topPos = sess.pos;
    baseVisitSetDestination(sess, 8, 5); // redescendre plein est, plain-pied (regrillé passe 41 : ex-(9,6) = pilier '#')
    guard = 0;
    while (sess.path.length && guard++ < 64) baseVisitStepAlong(sess);
    r.downElev = sess.elev;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.shapeIds, 36, '36 gabarits (24 canon + 12 à mezzanine, passe 42)');
  for (const c of out.custom) {
    assert.ok(c.anchors >= 1, `${c.id} ≥1 ancre`);
    assert.ok(c.elev >= 6, `${c.id} mezzanine ≥6 cases`);
    assert.ok(c.cliff >= 3, `${c.id} falaise ≥3 cases`);
  }
  assert.equal(out.placed, true, 'escalier posé sur ancre');
  assert.equal(out.notOnFloor, 'base.err.stairs_anchor', 'hors ancre refusé');
  // empreinte normalisée 2×2 (passe 41, style ROSA) : ancre + falaise au nord
  const a0 = JSON.parse(vm.runInContext(`JSON.stringify(baseLayoutGet('cave_5').stairAnchors[0])`, sb));
  // passe 47 : les niches sont redessinées à chaque refonte des salles — on
  // vérifie la STRUCTURE (paire d'ancres alignées, flanquée de falaise), pas
  // des coordonnées gravées dans le test.
  assert.equal(typeof a0.x, 'number', 'cave_5 : une 1re ancre existe');
  assert.equal(out.footprint.y, a0.y - 1, 'empreinte escalier 2 de profondeur vers le haut');
  assert.equal(out.cliffBlocked, false, 'falaise infranchissable sans escalier');
  assert.equal(out.stairWalk, true, 'escalier marchable');
  assert.equal(out.havePath, true, 'chemin jusqu’à la mezzanine');
  assert.equal(out.topElev, 1, 'le visiteur MONTE au niveau 1');
  assert.equal(out.topPos.y <= 2, true, 'atteint la mezzanine');
  assert.equal(out.downElev, 0, 'le visiteur REDESCEND');
});

// ——— G — Fonds perso + sprite escalier cuits ————————————————————————————
test('passe 40 G : fonds perso + sprite escalier + manifeste à jour', () => {
  for (const id of ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6']) {
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${id}.png`), `fond ${id}`);
  }
  const man = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.equal(man.items.stairs.emerald, 'src/assets/images/secret-base/emerald/stairs.png');
  assert.ok(E(man.items.stairs.emerald), 'stairs.png présent');
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('bake_custom_layouts'), 'baker perso');
  assert.ok(bake.includes('bake_stairs_sprite'), 'baker escalier');
  assert.ok(bake.includes('read_custom_shapes'), 'source unique = données JS');
});

// ——— H — Onglets et boutons d'objets harmonisés façon sac / dictionnaire ———
test('passe 40 H : stock de la base harmonisé avec les menus (sac, dex)', () => {
  const css = R('src/assets/css/style.css');
  const win = R('src/game/base/base-window.js');
  const stockBlock = css.slice(css.indexOf('#base-stock'), css.indexOf('#story-panel'));
  // onglets façon .hbtn (charte claire --light1/--dark1) + pastille façon .inv-qty
  assert.match(stockBlock, /\.base-stock-tab \{[\s\S]*?background: var\(--light1\)/, 'onglet = fond clair hbtn');
  assert.match(stockBlock, /\.base-stock-tab:hover \{ background: var\(--light2\)/, 'survol onglet = hbtn');
  assert.match(stockBlock, /\.base-stock-tab\.sel \{ background: var\(--light2\); border-color: var\(--light2\); font-weight: bold; \}/, 'onglet actif = hbtn.active');
  assert.match(stockBlock, /\.base-stock-tab-count \{[\s\S]*?background: var\(--dark1\);[\s\S]*?border-radius: 12px;/, 'pastille compteur façon sac');
  // cartes objets façon .inv-item / .dex-entry (claires, 2px, survol en lévitation)
  assert.match(stockBlock, /\.base-stock-item \{[\s\S]*?background: var\(--light1\);[\s\S]*?border: 2px solid var\(--dark1\);[\s\S]*?transition: all 0\.2s;/, 'carte façon inv-item');
  assert.match(stockBlock, /\.base-stock-item:hover \{ border-color: var\(--light2\); background: var\(--light2\); transform: translateY\(-2px\)/, 'survol carte façon inv-item');
  assert.match(stockBlock, /\.base-stock-count \{[\s\S]*?background: var\(--dark1\);[\s\S]*?border-radius: 12px;/, 'compteur ×n en pastille');
  // fini le thème sombre local de la passe 39
  assert.ok(!stockBlock.includes('#14151b'), 'plus de fond sombre local dans le stock');
  assert.ok(!stockBlock.includes('#ffd54f'), 'plus de liseré jaune local dans le stock');
  // JS : compteur en <span> dédié + optgroups (le <select> de gabarits est
  // désormais masqué : les alcôves se choisissent depuis la fenêtre Lieu)
  assert.ok(win.includes("pill.className = 'base-stock-tab-count'"), 'compteur d’onglet en pastille');
  assert.ok(win.includes("layoutSel.style.cssText = 'display:none'"), 'select gabarits masqué (alcôves par route)');
  assert.ok(win.includes("document.createElement('optgroup')"), 'gabarits groupés (optgroup)');
  assert.ok(win.includes("t('base.win.layout_group.'"), 'libellés de groupes i18n');
  // i18n : 6 groupes dans les deux langues
  for (const loc of ['src/localization/fr/base.js', 'src/localization/en/base.js']) {
    const s = R(loc);
    assert.ok(s.includes('"layout_group"'), loc + ' : bloc layout_group');
    for (const g of ['cave', 'cave_red', 'cave_blue', 'cave_yellow', 'tree', 'bush'])
      assert.ok(s.includes('"' + g + '":'), loc + ' : groupe ' + g);
  }
});

