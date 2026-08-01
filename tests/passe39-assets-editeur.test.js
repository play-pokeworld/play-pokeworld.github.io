import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 39 : vrais assets partout + pages du stock + règles corrigées ────
//  A. Couverture assets : 106 slugs du catalogue ont un sprite Émeraude
//     (métatiles DECOR_MAP + 34 sprites d'objets poupées/coussins) ; seuls
//     les objets SANS équivalent RSE restent en pastille (liste exhaustive)
//  B. Planche 1×2 (DECORSHAPE_1x2 canon) : comble les creux jumeaux des
//     salles « 4 » (546/547 reclassés en trous) OU un trou isolé (planche
//     prolongée sur le sol) ; entrée/spawn/case occupée refusés
//  C. Poupées/coussins AU SOL admis (décision utilisateur) : 1 objet surface
//     par cellule, entrée refusée, ramassage du porteur laisse la poupée
//  D. Éditeur : désélection après CHAQUE pose (un par un), stock paginé par
//     catégories (onglets) + vignettes sur les boutons
//  E. Grilles : 546/547 reclassés 'o' — cohérence moteur + baker persisté
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

// Objets sans sprite dédié : passe 41, les 20 ex-sans-RSE ont été REDESSINÉS
// dans la DA Émeraude (tools/bake-missing-sprites.py) ou retirés du catalogue
// (invisible_doll, invisible en jeu). Reste le tapis de bienvenue, art
// procédural rouge/or voulu depuis toujours (acquisition automatique).
const NO_RSE_SPRITE = []; // passe 43 : welcome_mat supprimé du catalogue

// ——— A — Couverture des assets ————————————————————————————————————————————
test('passe 39 A : les 122 slugs ont TOUS un sprite Émeraude (passe 43)', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json').items;
  const bake = R('tools/bake-emerald-bgs.py');
  const catalogue = [...R('src/data/base-items-data.js').matchAll(/s:'([a-z0-9_]+)'/g)].map((m) => m[1]);
  const withSprite = catalogue.filter((s) => man[s] && man[s].emerald);
  const without = catalogue.filter((s) => !(man[s] && man[s].emerald));
  assert.equal(catalogue.length, 122, 'catalogue 122 objets = 120 canon RSE + stairs + pc (passe 43 : tapis d\u2019accueil retiré)');
  assert.deepEqual(without.sort(), [], 'passe 43 : TOUS les slugs ont un sprite (tapis d\u2019accueil supprimé)');
  assert.equal(withSprite.length, 122, '122 slugs cuisinés (métatiles canon + 45 objgfx + escalier + 11 poupées téléchargées)');
  for (const s of withSprite) {
    assert.ok(E(man[s].emerald), `fichier présent ${s}`);
  }
  // sprites d'objets stagés offline (régénérables sans réseau)
  const sources = J('tools/emerald-ref/objgfx/sources.json');
  assert.equal(Object.keys(sources.files).length, 45, '45 objgfx stagés (34 + 11 poupées canon téléchargées passe 42)');
  for (const slug of Object.keys(sources.files)) {
    assert.ok(E(`tools/emerald-ref/objgfx/${slug}.png`), `staging ${slug}`);
  }
  // le baker mappe CAMP_DESK/CHAIR (log) et RED_PLANT (fleur) — vrais noms RSE
  assert.ok(bake.includes('CAMP_DESK') && bake.includes('CAMP_CHAIR') && bake.includes('RED_PLANT'), 'noms DECOR Émeraude exacts');
});

// ——— B — Planche 1×2 ——————————————————————————————————————————————————————
test('passe 39 B : planche 1×2 canon — creux jumeaux, trou isolé, refus', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    r.fp = baseItemFootprint(baseItemGet('solid_board'), 0);
    // salle « 4 » : paire de creux tree_4 (11,7)/(11,8)
    {
      const st = baseGetState();
      baseDebugCreate('tree_4');
      baseDebugGrantAll();
      r.pairOk = basePlace(st, 'solid_board', 11, 7, 0).ok === true;
      const g = baseBuildGrid(st);
      r.w7 = baseCellWalkable(st, g, 11, 7, null);
      r.w8 = baseCellWalkable(st, g, 11, 8, null);
      r.bottomTaken = baseCanPlace(st, 'solid_board', 11, 6, 0).reason; // chevauche la planche posée
      // passe 42 : planche posable PARTOUT (trou OU sol nu), mais jamais sur
      // un mur / la bordure / une case occupée
      r.wallRefusal = baseCanPlace(st, 'solid_board', 0, 0, 0).reason;
    }
    // trou isolé (526) : la planche continue sur le sol en dessous
    {
      const st2 = baseGetState();
      baseDebugCreate('tree_2');
      st2.items = []; st2.stock = {}; st2.npcs = []; st2.npcStock = [];
      st2.uidSeq = 1;
      baseStockAdd(st2, 'solid_board', 2);
      r.singleOk = basePlace(st2, 'solid_board', 3, 1, 0).ok === true;  // bas (3,2) = sol libre
      baseStockAdd(st2, 'small_desk', 1);
      basePlace(st2, 'small_desk', 3, 2, 0);                            // sous le trou : bureau
      r.bottomOccupied = baseCanPlace(st2, 'solid_board', 3, 1, 0).reason; // (il y a déjà une planche…)
    }
    // le HAUT doit être un trou : refus sur le sol
    r.ghostFp = (() => {
      const st3 = baseGetState();
      baseDebugCreate('bush_4');
      const st4 = { ...st3, items: [], stock: {}, npcs: [], npcStock: [], uidSeq: 1 };
      baseStockAdd(st4, 'solid_board', 1);
      baseEditorSelectSlug(st4, 'solid_board');
      baseEditorSetHover({ x: 3, y: 1 });  // paire (3,1)/(3,2) de bush_4
      const gh = baseEditorGhost(st4);
      return gh ? { w: gh.w, d: gh.d, ok: gh.ok } : null;
    })();
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.fp, { w: 1, d: 2 }, 'planche 1×2 (canon DECORSHAPE_1x2)');
  assert.equal(out.pairOk, true, 'creux jumeaux des salles « 4 » comblés');
  assert.equal(out.w7, true, 'haut du creux franchissable une fois comblé');
  assert.equal(out.w8, true, 'bas du creux franchissable une fois comblé');
    assert.equal(out.bottomTaken, 'base.err.occupied', 'cellule déjà comblée → refus');
    assert.equal(out.wallRefusal, 'base.err.floor_only', 'mur → refus (passe 42)');
  assert.equal(out.singleOk, true, 'trou isolé : planche prolongée sur le sol');
  assert.equal(out.bottomOccupied, 'base.err.occupied');
  assert.deepEqual(out.ghostFp, { w: 1, d: 2, ok: true }, 'fantôme 1×2 sur la paire bush_4');
});

// ——— C — Surface assouplie ————————————————————————————————————————————————
test('passe 39 C : poupées/coussins au sol, 1 par cellule, entrée refusée, porteur ramassé', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const r = {};
    r.floorDoll = basePlace(st, 'pichu_doll', 4, 4, 0).ok === true;     // au sol
    r.floorCushion = basePlace(st, 'pika_cushion', 6, 4, 0).ok === true; // coussin au sol
    r.secondSame = baseCanPlace(st, 'azurill_doll', 4, 4, 0).reason;    // 1 par cellule
    r.onSpawn = baseCanPlace(st, 'azurill_doll', 5, 7, 0).reason;       // S refusé (passe 43 : devant la porte)
    r.onEntrance = baseCanPlace(st, 'azurill_doll', 5, 8, 0).reason;    // E refusé
    r.onOccupied = baseCanPlace(st, 'azurill_doll', 6, 4, 0).reason;    // coussin déjà là
    // porteur + poupée : ramasser le porteur LAISSE la poupée (sol légal)
    basePlace(st, 'small_desk', 3, 5, 0);
    basePlace(st, 'clefairy_doll', 3, 5, 0);
    const desk = st.items.find((i) => i.s === 'small_desk');
    const n = basePickup(st, desk.uid);
    r.pickupChain = n;                                                   // bureau seul (poupée reste)
    r.dollLeft = st.items.some((i) => i.s === 'clefairy_doll' && i.x === 3 && i.y === 5);
    r.deskLeft = st.items.some((i) => i.s === 'small_desk');
    // mais sur une case occupée par un meuble non porteur : refus
    // (passe 42 : pokeball_chair n'existe plus — la barrière canon n'a pas surf:true)
    basePlace(st, 'fence_length', 8, 5, 0);
    r.onOtherItem = baseCanPlace(st, 'azurill_doll', 8, 5, 0).reason;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.floorDoll, true, 'poupée au sol');
  assert.equal(out.floorCushion, true, 'coussin au sol');
  assert.equal(out.secondSame, 'base.err.surface_taken', 'une seule surface par cellule');
  assert.equal(out.onSpawn, 'base.err.entrance');
  assert.equal(out.onEntrance, 'base.err.entrance');
  assert.equal(out.onOccupied, 'base.err.surface_taken');
  assert.equal(out.pickupChain, 1, 'le bureau seul est ramassé');
  assert.equal(out.dollLeft, true, 'la poupée reste au sol (règle assouplie)');
  assert.equal(out.deskLeft, false);
  assert.equal(out.onOtherItem, 'base.err.occupied', 'pas de poupée sur un meuble non porteur');
});

// ——— D — Désélection après pose + stock paginé ————————————————————————————
test('passe 39 D : un par un après chaque pose + stock en pages + vignettes', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const ed = baseEditorGet();
    baseStockAdd(st, 'small_desk', 2);      // stock ≥ 2 : l'ancien code gardait la main
    baseEditorSelectSlug(st, 'small_desk');
    const r = { before: ed.slug };
    const p1 = baseEditorClickCell(st, 1, 3);
    r.p1 = p1.ok === true;
    r.after1 = ed.slug;                     // DOIT être null (décision : un par un)
    r.stock1 = baseStockCount(st, 'small_desk');
    r.reSel = baseEditorSelectSlug(st, 'small_desk');  // re-clic possible
    const p2 = baseEditorClickCell(st, 2, 3);
    r.p2 = p2.ok === true;
    r.after2 = ed.slug;
    r.stock2 = baseStockCount(st, 'small_desk');
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.before, 'small_desk');
  assert.equal(out.p1, true);
  assert.equal(out.after1, null, 'main relâchée après CHAQUE pose');
  assert.equal(out.stock1, 1);
  assert.equal(out.reSel, 'small_desk', 'on peut re-sélectionner pour la suivante');
  assert.equal(out.p2, true);
  assert.equal(out.after2, null);
  assert.equal(out.stock2, 0);
  // Stock paginé : onglets par catégorie + page unique + vignettes
  const win = R('src/game/base/base-window.js');
  assert.ok(win.includes('base-stock-tabs'), 'barre d’onglets');
  assert.ok(win.includes("_baseWin.stockTab"), 'page courante mémorisée');
  assert.ok(win.includes("data-action = 'base-ed-tab'") || win.includes("'base-ed-tab'") || win.includes('base-ed-tab'), 'onglet cliquable');
  assert.ok(win.includes('base-stock-page'), 'page unique rendue');
  assert.ok(win.includes('baseWindowManifest') && win.includes('e.emerald || e.icon2d'), 'vignette emerald→icon2d sur les boutons');
  assert.ok(win.includes('__pals'), 'page Copains');
  const post = R('src/file-postboot.js');
  assert.ok(post.includes("'base-ed-tab'"), 'action postboot');
  const css = R('src/assets/css/style.css');
  for (const sel of ['.base-stock-tabs', '.base-stock-tab', '.base-stock-page']) assert.ok(css.includes(sel), `style ${sel}`);
  // Le CANVAS reste 100 % Émeraude (l'icône 2.5D n'est que pour les boutons)
  const v2d = R('src/game/base/base-view2d.js');
  assert.ok(!v2d.includes('icon2d'), 'canvas : toujours aucune icône boutique');
});

// ——— E — Reclassement des creux ———————————————————————————————————————————
test('passe 39 E : creux 546/547 reclassés en trous (moteur + référence + baker)', () => {
  const canon = J('tools/emerald-ref/canon-grids.json');
  const pairs = { tree_4: [[11, 7], [11, 8]], cave_4: [[10, 1], [10, 2]], bush_4: [[3, 1], [3, 2]] };
  for (const [lid, cells] of Object.entries(pairs)) {
    for (const [x, y] of cells) {
      assert.equal(canon[lid][y][x], 'o', `${lid} (${x},${y}) = trou dans la référence`);
    }
  }
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    for (const [lid, cells] of Object.entries({ tree_4: [[11, 7], [11, 8]], cave_4: [[10, 1], [10, 2]], bush_4: [[3, 1], [3, 2]] })) {
      const L = baseLayoutGet(lid);
      for (const [x, y] of cells) {
        r[lid + ':' + x + ',' + y] = L.cells[y][x].t;
        const st = baseGetState();
        baseDebugCreate(lid);
        st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
        const g = baseBuildGrid ? baseBuildGrid(st) : null;
        r[lid + ':walk:' + x + ',' + y] = baseCellWalkable(st, g, x, y, null);
      }
    }
    // un meuble de sol sur un creux est toujours refusé (seule la planche y va)
    const st = baseGetState();
    baseDebugCreate('tree_4');
    st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
    r.floorRefused = baseCanPlace(st, 'small_desk', 11, 7, 0).reason;
    return JSON.stringify(r);
  })()`, sb));
  for (const [lid, cells] of Object.entries(pairs)) {
    for (const [x, y] of cells) {
      assert.equal(out[`${lid}:${x},${y}`], 'hole', `${lid} (${x},${y}) trou côté moteur`);
      assert.equal(out[`${lid}:walk:${x},${y}`], false, 'creux infranchissable sans planche');
    }
  }
  assert.equal(out.floorRefused, 'base.err.floor_only', 'meuble de sol refusé sur le creux');
  // baker : classification persistée (régénération déterministe)
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('546, 547'), 'creux jumeaux reconnus par le baker');
});

