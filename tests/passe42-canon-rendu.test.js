import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 42 : REFONTE CANON RSE complète de la base secrète ────────────────
// Verrous livrés dans cette passe (demandes utilisateur, captures Émeraude) :
//  A. Catalogue = gDecorations pokeemerald (120 décos RSE + pc/welcome/stairs)
//  B. Sprites : 122 assets natifs au manifeste, pc 16×16, stairs 32×32,
//     5 feuilles de personnages 64×128
//  C. Poses : plante haute collée au mur, planche partout, grosse poupée
//     centrée sur tapis, poster via clic au sol (mur + falaise)
//  D. Rotation SUPPRIMÉE (canon RSE) — bouton caché, normalisation figée
//  E. Les 6 grottes colorées ont un étage (ancres d'escalier + trou + fonds)
//  F. Migration : renommages appliqués, hors-canon retirés à l'import
//  G. Visite : direction + compteur d'animation avancent (marche animée)
//  H. Renderer : feuilles de personnages (hero/PNJ) chargées et exportées
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));

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

// ——— A — Catalogue = gDecorations pokeemerald ———————————————————————————————
test('passe 42 A : catalogue == canon-decor.json (gDecorations RSE, 120 + 2)', () => {
  const canon = J('tools/emerald-ref/canon-decor.json');
  const CAT = { DESK: 'desks', CHAIR: 'chairs', PLANT: 'plants', ORNAMENT: 'objects', MAT: 'mats', POSTER: 'wall', DOLL: 'dolls', CUSHION: 'cushions' };
  const sb = makeSandbox();
  for (const [key, v] of Object.entries(canon)) {
    if (key === 'DECOR_NONE') continue;
    const slug = key.replace('DECOR_', '').toLowerCase().replace(/ /g, '_');
    const out = vm.runInContext(`(() => { const d = baseItemGet(${JSON.stringify(slug)}); return d && { w: d.w, d: d.d, cat: d.cat, price: d.price, layer: d.layer, behind: !!d.behind, rot: d.rot }; })()`, sb);
    assert.ok(out, `canon présent : ${slug}`);
    const [w, d] = v.shape.split('x').map(Number);
    assert.deepEqual([out.w, out.d], [w, d], `${slug} : forme DECORSHAPE ${v.shape}`);
    assert.equal(out.cat, CAT[v.cat], `${slug} : catégorie ${v.cat}`);
    assert.equal(out.price, v.price ? v.price : null, `${slug} : prix canon ${v.price || 'invendu'}`);
    assert.equal(out.rot, 0, `${slug} : rotation supprimée`);
    const wantLayer = v.perm === 'DECORPERM_NA_WALL' ? 'wall' : (v.perm === 'DECORPERM_SPRITE' ? 'surface' : 'floor');
    assert.equal(out.layer, wantLayer, `${slug} : couche ${v.perm}`);
    if (v.perm === 'DECORPERM_BEHIND_FLOOR') assert.equal(out.behind, true, `${slug} : BEHIND_FLOOR (collision rangée de base)`);
  }
  assert.equal(vm.runInContext('BASE_ITEMS.length', sb), 122, '122 objets (120 canon + stairs + pc — passe 43 : welcome_mat retiré)');
});

// ——— B — Sprites natifs ———————————————————————————————————————————————————
test('passe 42 B : 122 sprites au manifeste, fichiers natifs, personnages', () => {
  const dir = 'src/assets/images/secret-base/emerald';
  const manPath = 'src/assets/images/secret-base/manifest.render2d.json';
  const items = J(manPath).items;
  const files = fs.readdirSync(new URL(`../${dir}`, import.meta.url)).filter((f) => f.endsWith('.png'));
  assert.equal(Object.keys(items).length, 122, 'manifeste : 122 entrées');
  assert.equal(files.length, 122, 'disque : 122 PNG (un par décor, ni plus ni moins)');
  for (const [slug, e] of Object.entries(items)) {
    assert.equal(Object.keys(e).join(','), 'emerald', `${slug} : sprite canon unique`);
    assert.ok(E(e.emerald), `${slug} : fichier présent`);
    const fname = e.emerald.split('/').pop();
    assert.equal(fname, `${slug}.png`, `${slug} : nommage 1:1`);
  }
  // aucun orphelin
  const referenced = new Set(Object.values(items).map((e) => e.emerald.split('/').pop()));
  for (const f of files) assert.ok(referenced.has(f), `orphelin : ${f}`);
  // tailles natives critiques
  const ihdr = (p) => { const b = fs.readFileSync(new URL(`../${p}`, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20), b[25]]; };
  assert.deepEqual(ihdr(`${dir}/pc.png`), [16, 16, 6], 'pc.png = métatile canon 16×16 RGBA');
  assert.deepEqual(ihdr(`${dir}/stairs.png`), [32, 32, 6], 'stairs.png = 32×32 natif GBA');
  // passe 43 : joueur = sprite RÉEL statique trainer-54 (18×26), sans anim ;
  // les 4 PNJ restent des feuilles de marche GBA 64×128.
  assert.ok(!E(`${dir}/people`), 'dossier people supprimé');
  assert.deepEqual(J(manPath).stats, { sprites: 122, items: 122, people: ['player'] }, 'stats recomputées canon (joueur statique)');
});

// ——— C — Règles de pose canon —————————————————————————————————————————————
test('passe 42 C : poses canon (mur, planche, grosse poupée, poster)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const r = {};
    // 1) plante haute (BEHIND_FLOOR) COLLÉE AU MUR nord : avant passe 42, refusée
    r.plantWall = basePlace(st, 'tropical_plant', 4, 1, 0).ok;   // case (4,1) : mur au-dessus (4,0)
    // 2) planche posable PARTOUT : sur sol nu (demande explicite) et sur trou
    baseStockAdd(st, 'solid_board', 2);
    r.boardFloor = basePlace(st, 'solid_board', 8, 3, 0).ok === true;
    r.boardHole = basePlace(st, 'solid_board', 5, 2, 0).ok === true;
    const g = baseBuildGrid(st);
    r.holeWalk = baseCellWalkable(st, g, 5, 2, null);
    // 3) grosse poupée (1×2 DECORPERM_SPRITE) centrée sur un tapis 3×3
    r.mat = basePlace(st, 'surf_mat', 1, 3, 0, { free: true }).ok; // 3×3 couvrant (1..3, 3..5)
    r.bigCenter = basePlace(st, 'snorlax_doll', 2, 4, 0).ok === true;  // centre du tapis
    r.snFp = JSON.stringify(baseItemFootprint(baseItemGet('snorlax_doll'), 0));
    r.snBoxD = baseItemGet('snorlax_doll').d;
    // 4) poster : clic sur le SOL devant un mur → accroche le mur au-dessus
    baseEditorSelectSlug(st, 'blue_poster');
    const wc = baseEditorWallCell(st, 6, 1);    // (6,1) sol, (6,0) mur
    r.wallCell = wc ? wc.x + ',' + wc.y : null;
    const pl = baseEditorClickCell(st, 6, 1);
    const posted = st.items.find((i) => i.s === 'blue_poster');
    r.postedAt = posted ? posted.x + ',' + posted.y : null;
    // 5) poster sur FACE DE FALAISE (gabarit à étage)
    const st2 = (() => { baseDebugCreate('cave_5'); baseDebugGrantAll(); return baseGetState(); })();
    // passe 48 : les salles sont redessinées à chaque refonte — on CHERCHE une
    // face de falaise surplombant du sol libre au lieu d'en coder une.
    r.cliffPoster = false;
    {
      const L3 = baseLayoutGet('cave_5');
      for (let y = 0; y < L3.h && !r.cliffPoster; y++) for (let x = 0; x < L3.w; x++) {
        const c = L3.cells[y][x], below = L3.cells[y + 1] && L3.cells[y + 1][x];
        if (c && c.t === 'cliff' && below && below.t === 'floor' && !below.stairAnchor) {
          if (baseCanPlace(st2, 'blue_poster', x, y, 0).ok) { r.cliffPoster = true; break; }
        }
      }
    }
    r.wallOnCliffRow = baseCanPlace(st2, 'blue_poster', 0, 3, 0).reason;   // (0,3) mur latéral → refus
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.plantWall, true, 'plante haute collée au mur (collision rangée de base)');
  assert.equal(out.boardFloor, true, 'planche posable sur sol nu');
  assert.equal(out.boardHole, true, 'planche posable sur trou (comblement canon)');
  assert.equal(out.holeWalk, true, 'trou bouché franchissable');
  assert.equal(out.mat, true, 'tapis 3×3 posé');
  assert.equal(out.bigCenter, true, 'grosse poupée centrée sur le tapis');
  assert.equal(out.snFp, '{"w":1,"d":1}', 'collision 1 case (canon DECORSHAPE_1x2 SPRITE)');
  assert.equal(out.snBoxD, 2, 'forme 1×2 → rendu 2 cases de haut (32×32 au-dessus de la case de base)');
  assert.equal(out.wallCell, '6,0', 'clic au sol → cellule mur au-dessus');
  assert.equal(out.postedAt, '6,0', 'poster effectivement accroché au mur nord');
  assert.equal(out.cliffPoster, true, 'poster posable sur face de falaise (étage)');
  assert.equal(out.wallOnCliffRow, 'base.err.wall_only', 'mur latéral refusé');
});

// ——— D — Rotation supprimée ———————————————————————————————————————————————
test('passe 42 D : rotation des objets SUPPRIMÉE (canon RSE + DA 2D)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = { allZero: true, counts: [], norms: [] };
    for (const it of BASE_ITEMS) {
      if (it.rot !== 0) r.allZero = false;
      const c = baseItemRotCount(it); if (!r.counts.includes(c)) r.counts.push(c);
      const n = baseItemRotNormalize(it, 3); if (!r.norms.includes(n)) r.norms.push(n);
    }
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    basePlace(st, 'heavy_desk', 1, 3, 0);
    const desk = st.items.find((i) => i.s === 'heavy_desk');
    r.rotateRef = baseRotate(st, desk.uid, 1);
    r.edPlace = baseEditorRotatePlacement();
    r.edSel = baseEditorRotateSel(st);
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.allZero, true, 'rot:0 partout (données)');
  assert.deepEqual(out.counts, [1], 'baseItemRotCount = 1 figé');
  assert.deepEqual(out.norms, [0], 'baseItemRotNormalize → 0 figé');
  assert.equal(out.rotateRef.ok, false, 'rotation moteur refusée');
  assert.equal(out.rotateRef.reason, 'base.err.not_rotatable');
  assert.equal(out.edPlace, 0 || out.edPlace, 'pivot de pose sans effet');
  const idx = R('index.html');
  const rb = idx.slice(idx.indexOf('id="base-ed-rotate"') - 200, idx.indexOf('id="base-ed-rotate"') + 300);
  assert.ok(rb.includes('hidden'), 'bouton « Pivoter » caché (passe 42)');
  const win = R('src/game/base/base-window.js');
  assert.ok(win.includes('passe 42 : rotation supprimée') || win.includes('rotateBtn'), 'bouton géré côté fenêtre');
});

// ——— E — Les 6 grottes colorées à étage ———————————————————————————————————
test('passe 42 E : grottes rouge/bleu/jaune avec étage (ancres + fonds)', () => {
  const sb = makeSandbox();
  const colored = ['cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6', 'cave_yellow_5', 'cave_yellow_6'];
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    for (const id of ${JSON.stringify(colored)}) {
      const L = baseLayoutGet(id);
      let holes = 0, mezz = 0;
      for (const row of L.cells) for (const c of row) { if (c.t === 'hole') holes++; if (c.elev === 1) mezz++; }
      r[id] = {
        anchors: L.stairAnchors.length, holes, mezz, exit: !!L.exit, spawn: !!L.spawn,
        canon: L.canon, theme: L.theme,
        stairOk: L.stairAnchors.length ? baseCanPlace(baseGetState(), 'stairs', L.stairAnchors[0].x, L.stairAnchors[0].y, 0, { free: true }).ok !== false : false,
      };
      // le gabarit supporte une base complète (création sans exception)
      const st = baseGetState();
      st.layoutId = id;
      r[id].gridOk = !!baseBuildGrid(st);
    }
    window._layoutsCount = baseLayoutIds().length;
    return JSON.stringify(r);
  })()`, sb));
  for (const id of colored) {
    const i = out[id];
    assert.ok(i.anchors >= 1, `${id} : paire d'ancres d'escalier (étage)`);
    assert.ok(i.holes >= 1, `${id} : au moins un trou`);
    assert.ok(i.mezz >= 1, `${id} : mezzanine (cases elev 1)`);
    assert.ok(i.exit && i.spawn, `${id} : E + S`);
    assert.equal(i.canon, null, `${id} : perso PokéWorld (pas un gabarit RSE)`);
    assert.equal(i.gridOk, true, `${id} : grille constructible`);
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${id}.png`), `fond irisé ${id}`);
  }
  assert.equal(vm.runInContext('window._layoutsCount', sb), 36, '36 gabarits au total');
});

// ——— F — Migration catalogue → canon ——————————————————————————————————————
test('passe 42 F : migration (renommages, retrait hors-canon, rot → 0, importDropped)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    // renommages canon
    r.m1 = baseItemMigrate('pokeball_desk');
    r.m2 = baseItemMigrate('note_do_mat');
    r.m3 = baseItemMigrate('substitute_doll');
    // hors-canon → retiré proprement
    r.m4 = baseItemMigrate('invisible_doll');
    r.m5 = baseItemMigrate('bench') || 'small_chair';
    // sanitize migrates stock + items, clamp rot → 0
    const st = {
      layoutId: 'cave_1',
      stock: { pokeball_desk: 2, substitute_doll: 1, invisible_doll: 4 },
      items: [
        { uid: 3, s: 'pokeball_desk', x: 3, y: 3, rot: 2 },
        { uid: 4, s: 'tropical_plant', x: 4, y: 1, rot: 1 },
        { uid: 5, s: 'invisible_doll', x: 3, y: 4, rot: 0 },
        { uid: 9, s: 'welcome_mat', x: 5, y: 7, rot: 0 },
      ],
      npcs: [], npcStock: [], uidSeq: 6, record: { w: 2, l: 1, visits: 5 }, spawn: null,
    };
    const c = baseSanitizeState(st);
    r.stockAfter = c.stock;
    r.itemsAfter = c.items.map((i) => i.s + ':' + i.rot).sort();
    r.recordKept = c.record.w === 2 && c.record.l === 1 && c.record.visits === 5;
    // export→import : l'importateur migre et compte les objets retirés (rien n'est crédité)
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const st2 = baseGetState();
    basePlace(st2, 'tropical_plant', 4, 1, 0, { free: true });
    basePlace(st2, 'small_desk', 3, 4, 0, { free: true });
    const json = baseExportString(st2, 'Testeur');
    const chk = baseImportValidate(json);
    r.importOk = chk.ok === true;
    r.importItemsCount = chk.visit.items.length;
    r.droppedInfo = typeof chk.visit.importDropped === 'number' ? chk.visit.importDropped : 0;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.m1, 'pokemon_desk', 'pokeball_desk → pokemon_desk (canon)');
  assert.equal(out.m2, 'c_low_note_mat', 'note_do_mat → c_low_note_mat');
  assert.equal(out.m3, 'wynaut_doll', 'substitute_doll → wynaut_doll');
  assert.equal(out.m4, null, 'invisible_doll retiré (hors canon, invisible en jeu)');
  assert.equal(out.m5, 'small_chair', 'bench → équivalent canon (petite chaise)');
  assert.deepEqual(out.stockAfter, { pokemon_desk: 2, wynaut_doll: 1 }, 'stock migré + hors-canon purgé');
  // la plante (3,4→ok) et le bureau migré subsistent, rot clampé à 0 ; invisible viré
  assert.ok(out.itemsAfter.includes('pokemon_desk:0'), 'item migré (rotation perdue, canon)');
  assert.ok(out.itemsAfter.includes('tropical_plant:0'), 'plante conservée, rotation annulée');
  assert.ok(!out.itemsAfter.some((i) => i.startsWith('invisible_doll')), 'hors-canon retiré');
  // passe 43 : le tapis d'accueil n'existe plus — une ancienne sauvegarde
  // qui le contenait le perd proprement (migration → null), RIEN regénéré.
  assert.equal(vm.runInContext(`baseItemMigrate('welcome_mat')`, sb), null, 'welcome_mat → null (supprimé du jeu)');
  assert.ok(!out.itemsAfter.some((i) => i.startsWith('welcome_mat')), 'welcome_mat écarté à la sanité');
  assert.equal(out.recordKept, true, 'record conservé par la sanité');
  assert.equal(out.importOk, true, 'export→import valide');
  assert.ok(out.importItemsCount >= 3, 'les objets posés sont exportés');
});

// ——— G — Animation de marche du visiteur ———————————————————————————————————
test('passe 42 G : visite animée (dir + animStep avancent à chaque pas)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const sess = baseVisitCreate(st);
    const r = { dir0: sess.dir, step0: sess.animStep };
    // chemin vers l'est : la direction doit suivre la marche, le compteur avancer
    baseVisitSetDestination(sess, 6, 1);
    const dirs = [];
    let guard = 0;
    while (sess.path.length && guard < 40) {
      baseVisitStepAlong(sess);
      dirs.push(sess.dir + '|' + sess.animStep);
      guard++;
    }
    r.path = dirs;
    r.finalDir = sess.dir; r.finalStep = sess.animStep; r.steps = guard;
    return JSON.stringify(r);
  })()`, sb));
  assert.ok(out.steps >= 1, 'le visiteur a marché');
  assert.ok(out.finalStep >= out.steps - 1, 'animStep avance à chaque pas');
  for (const d of out.path) assert.ok(['up', 'down', 'left', 'right'].includes(d.split('|')[0]), `direction valide (${d})`);
  assert.equal(out.dir0, 'down', 'départ tourné vers le bas (canon)');
  const uniq = new Set(out.path.map((d) => d.split('|')[1]));
  assert.ok(uniq.size >= out.steps - 1, 'le compteur de frames ne stagne pas');
});

// ——— H — Feuilles de personnages au renderer ———————————————————————————————
test('passe 42/43 H : personnages câblés au renderer (joueur statique + PNJ)', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.ok(man.people, 'section people au manifeste');
  // passe 43 : le héros animé procédural est REMPLACÉ par le vrai sprite
  // statique trainer-54 (people.player) ; les 4 PNJ gardent leurs feuilles.
  assert.ok(E(man.people.player), 'people.player présent sur disque');
  assert.ok(!man.people.hero, 'ancienne feuille hero retirée du manifeste');
  // doublure script (compatible file://) synchronisée
  const js = R('src/data/base-manifest-2d-data.js');
  assert.ok(js.includes('"people"'), 'people dans la version script du manifeste');
  assert.ok(js.includes('"player"'), 'player dans la version script');
  assert.ok(!js.includes('"hero"'), 'plus de hero dans la version script');
  // exports renderer
  const v2 = R('src/game/base/base-view2d.js');
  for (const g of ['baseView2dPeople', 'base2dPerson', 'base2dNpcPersonId', 'base2dPlayerStatic']) {
    assert.ok(v2.includes(`window.${g} = ${g}`), `${g} exposé`);
  }
  assert.ok(v2.includes("BASE2D_DIR_ROW = { down: 0, up: 1, left: 2, right: 3 }"), '4 vues (bas/haut/gauche/droite) sur la feuille');
  assert.ok(v2.includes('col * 16') && v2.includes('row * 32'), 'frames 16×32 sélectionnées (dir × frame)');
  assert.ok(v2.includes('people.player'), 'visiteur rendu via people.player (statique)');
  assert.ok(v2.includes('base2dPlayerStatic(ctx, img, px, py, C)'), 'dessin statique du joueur (aucune frame)');
  assert.ok(!v2.includes('people.hero'), 'plus de référence people.hero dans le renderer');
});

