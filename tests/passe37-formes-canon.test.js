import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// ── Passe 37 : formes GBA officielles (12 layouts RSE) + DA unifiée ────────
//  A. Les 12 grilles de base-layouts-data.js == classification CANON re-calculée
//     depuis les map.bin officiels (bits de collision + métatiles) du
//     désassemblage pret/pokeemerald, présenté par tools/bake-emerald-bgs.py
//  B. Chaque gabarit : spawn S unique, sortie E unique, trou 'o' présent ;
//     alias legacy (square_a/wide_b/twolevel_a → 1/2/3) conservés pour les
//     vieilles sauvegardes ; S et E non décorables
//  C. DA : pitch caméra assoupli + coquille 3D texturée (tex3d) + 2D 100 %
//     sprites Émeraude (plus jamais d'icône serebii 2.5D en 2D)
//  D. 33 sprites de décorations cuits depuis les VRAIS métatiles du tileset
//     secret_base (couche haute, palettes primaires) + manifeste à jour
//  E. Les scènes meublées de tools/render_base_preview.py sont LÉGALES au
//     sens du moteur (chaque pose acceptée par baseCanPlace, dans l'ordre)
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const SANDBOX_FILES = [
  'src/file-preflight.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/game/core/state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/game/base/base-core.js',
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

function jsGrids(src) {
  const out = {};
  for (const m of src.matchAll(/(cave(?:_(?:red|blue|yellow))?_[1-4]|tree_[1-4]|bush_[1-4]): \{\s*canon: '([^']+)',\s*rows: \[(.*?)\]/gs)) {
    out[m[1]] = { canon: m[2], rows: [...m[3].matchAll(/'([^']*)'/g)].map((r) => r[1]) };
  }
  return out;
}

// ——— A — Grilles == canon recalculé ———————————————————————————————————————
test('passe 37 A : 24 grilles canon JS == classification canon des map.bin officiels', () => {
  // tools/emerald-ref/canon-grids.json = sortie COMMITÉE de
  // `python3 tools/bake-emerald-bgs.py --dump-grids` (classification bits de
  // collision + métatiles des map.bin pret/pokeemerald — voir test D)
  const canon = JSON.parse(R('tools/emerald-ref/canon-grids.json'));
  const grids = jsGrids(R('src/data/base-layouts-data.js'));
  assert.deepEqual(Object.keys(grids).sort(), Object.keys(canon).sort(), 'les 24 ids canon correspondent');
  // passe 43 : 'S' normalisé des deux côtés — sa position (devant la porte)
  // est une règle de gamepley (demande utilisateur), hors topologie canon.
  const norm = (rows) => rows.map((r) => r.split('S').join('.'));
  for (const id of Object.keys(canon)) {
    assert.deepEqual(norm(grids[id].rows), norm(canon[id]),
      `${id} : grille (hors 'S') == collision/métatiles de ${grids[id].canon}`);
  }
  // la référence canon est bien nommée : 16 grottes (4 couleurs × 4) + 4 arbres + 4 buissons
  const src = R('src/data/base-layouts-data.js');
  for (const n of ['BrownCave1', 'BrownCave2', 'BrownCave3', 'BrownCave4',
    'RedCave1', 'RedCave2', 'RedCave3', 'RedCave4',
    'BlueCave1', 'BlueCave2', 'BlueCave3', 'BlueCave4',
    'YellowCave1', 'YellowCave2', 'YellowCave3', 'YellowCave4',
    'Tree1', 'Tree2', 'Tree3', 'Tree4', 'Shrub1', 'Shrub2', 'Shrub3', 'Shrub4']) {
    assert.ok(src.includes(`SecretBase_${n}`), `canon SecretBase_${n}`);
  }
});

// ——— B — Structure des gabarits + alias + cellules protégées ——————————————
test('passe 37 B : S/E uniques, trou présent, alias legacy, protection S/E', () => {
  const sb = makeSandbox();
  const info = vm.runInContext(`(() => {
    const out = {};
    for (const id of baseLayoutIds()) {
      const L = baseLayoutGet(id);
      let s = 0, e = 0, o = 0;
      for (const row of L.cells) for (const c of row) {
        if (c.spawnPt) s++;
        if (c.entrance) e++;
        if (c.t === 'hole') o++;
      }
      out[id] = { w: L.w, h: L.h, s, e, o, theme: L.theme, canon: L.canon,
                  spawn: L.spawn, exit: L.exit, anchors: L.stairAnchors.length };
    }
    return JSON.parse(JSON.stringify(out));
  })()`, sb);
  // 24 gabarits canon (RSE) + 12 perso à deux niveaux (mezzanine + escalier)
  assert.equal(Object.keys(info).length, 36, '36 gabarits (24 canon + 12 perso à étage, passe 42)');
  const CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6',
                  'cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6', 'cave_yellow_5', 'cave_yellow_6'];
  for (const [id, i] of Object.entries(info)) {
    assert.equal(i.s, 1, `${id} : un seul point d'arrivée S`);
    assert.equal(i.e, 1, `${id} : un seul tapis de sortie E`);
    assert.ok(i.o >= 1, `${id} : au moins un trou/rocher comblable`);
    if (CUSTOM.includes(id)) assert.ok(i.anchors >= 1, `${id} : ancre(s) d'escalier (perso 2 niveaux)`);
    else assert.equal(i.anchors, 0, `${id} : RSE n'a pas d'ancre d'escalier`);
    assert.ok(['cave', 'tree', 'bush'].includes(i.theme));
  }
  // alias legacy des anciennes sauvegardes (passe 33-36)
  const alias = vm.runInContext(`({
    a: baseLayoutGet('cave_square_a') && baseLayoutGet('cave_square_a').id,
    b: baseLayoutGet('tree_wide_b') && baseLayoutGet('tree_wide_b').id,
    c: baseLayoutGet('bush_twolevel_a') && baseLayoutGet('bush_twolevel_a').id,
    d: baseLayoutGet('nope_1'),
  })`, sb);
  assert.equal(alias.a, 'cave_1');
  assert.equal(alias.b, 'tree_2');
  assert.equal(alias.c, 'bush_3');
  assert.equal(alias.d, null, 'id inconnu → null');
  // S et E non décorables (métatiles 544/524 protégés)
  const prot = vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    return {
      s: baseCanPlace(st, 'small_desk', 5, 7, 0).reason,   // S(5,7) — passe 43 : devant la porte
      e: baseCanPlace(st, 'small_desk', 5, 8, 0).reason,   // E(5,8)
      hole: baseCanPlace(st, 'small_desk', 5, 2, 0).reason, // trou sans planche
      ok: baseCanPlace(st, 'small_desk', 4, 4, 0).ok,
    };
  })()`, sb);
  assert.equal(prot.s, 'base.err.entrance', 'point d’arrivée non décorable');
  assert.equal(prot.e, 'base.err.entrance', 'tapis de sortie non décorable');
  assert.equal(prot.hole, 'base.err.floor_only', 'le trou nu n’accepte rien');
  assert.equal(prot.ok, true, 'sol libre OK');
});

// ——— C — DA : caméra + coquille texturée + 2D 100 % GBA ———————————————————
// Passe 56 : l'ancien renderer `base-view3d.js` a été REMPLACÉ par la
// fenêtre 3D autonome (base3d-view.js). Il déclarait `_base3dManifestP` au
// niveau global, comme le nouveau chargeur : deux `let` de même nom dans la
// portée globale = SyntaxError, et TOUT le chargement des scripts s'arrêtait
// (fenêtre 3D noire, console pleine de « loadScript »). Il est archivé dans
// tools/legacy/ ; ces vérifications portent désormais sur le renderer actif.
test('passe 37 C : renderer 3D supprimé, 2D sans icône 2.5D', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), 'renderer 3D supprimé');
  const v2d = R('src/game/base/base-view2d.js');
  assert.ok(v2d.includes('e.emerald'), '2D : sprite Émeraude');
  assert.ok(!v2d.includes('e.icon2d'), '2D : AUCUNE icône serebii (DA GBA pure)');
  assert.ok(v2d.includes('Émeraude UNIQUEMENT'), 'choix DA documenté dans le code');
});

function bakedSlugs() {
  const bake = R('tools/bake-emerald-bgs.py');
  const meta = [...bake.matchAll(/\('([a-z0-9_]+)', '[A-Z_0-9]+'\)/g)].map((m) => m[1]);
  const obj = Object.keys(JSON.parse(R('tools/emerald-ref/objgfx/sources.json')).files);
  return { meta: [...new Set(meta)], obj };
}

test('passe 37 D : sprites RSE cuits (métatiles + objets) + manifeste à jour', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json').items;
  const { meta, obj } = bakedSlugs();
  assert.ok(meta.length >= 55, `${meta.length} décors métatiles dans DECOR_MAP (passe 39)`);
  assert.equal(obj.length, 45, '45 sprites objets (27 poupées + 8 grosses + 10 coussins, passe 42)');
  for (const slug of meta.concat(obj)) {
    const p = `src/assets/images/secret-base/emerald/${slug}.png`;
    assert.ok(E(p), p);
    const buf = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    assert.equal(buf.readUInt32BE(0), 0x89504e47, `${slug} PNG`);
    assert.equal(buf[25], 6, `${slug} RGBA (transparence pour la pose sur le fond)`);
    assert.equal(man[slug] && man[slug].emerald, p, `${slug} référencé dans le manifeste`);
  }
  // le mode objgfx est câblé et stagé offline
  const bake2 = R('tools/bake-emerald-bgs.py');
  assert.ok(bake2.includes('--bake-decor-all') && bake2.includes('DECOR_MAP'), 'cuisson complète métatiles');
  assert.ok(bake2.includes('--bake-objgfx'), 'cuisson sprites d\u2019objets');
  // le baker sait les régénérer depuis les références du désassemblage
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('--bake-decor') && bake.includes('decor_refs'), 'cuisson décor câblée');
  assert.ok(bake.includes('tiles.h') || bake.includes('DECOR_TILE'), 'références DecorGfx du désassemblage');
  for (const f of ['metatile_labels.h', 'decorations.h', 'tiles.h', 'header.h']) {
    assert.ok(E(`tools/emerald-ref/decor/${f}`), `référence persistée ${f}`);
  }
  assert.ok(E('tools/emerald-ref/data/tilesets/primary/secret_base/tiles.png'), 'tileset primaire secret_base');
  assert.ok(E('tools/emerald-ref/data/tilesets/primary/secret_base/palettes/01.pal'), 'palettes primaires');
});

// ——— E — Légalité des scènes d'exemple meublées ———————————————————————————
test('passe 37 E : les scènes meublées des exemples sont toutes légales', () => {
  const py = R('tools/render_base_preview.py');
  const scenes = {};
  for (const m of py.matchAll(/'(cave_\d|tree_\d|bush_\d)': \{\s*'items': \[(.*?)\],\s*'npcs': \[(.*?)\],/gs)) {
    const items = [...m[2].matchAll(/\('([a-z0-9_]+)', (\d+), (\d+), (\d+)\)/g)]
      .map((t) => [t[1], +t[2], +t[3], +t[4]]);
    const npcs = [...m[3].matchAll(/\((\d+), (\d+)\)/g)].map((t) => [+t[1], +t[2]]);
    scenes[m[1]] = { items, npcs };
  }
  assert.deepEqual(Object.keys(scenes).sort(), ['cave_1', 'cave_3', 'tree_2'], 'les 3 scènes attendues');
  for (const [lid, sc] of Object.entries(scenes)) {
    assert.ok(sc.items.length >= 5, `${lid} : au moins 5 objets`);
    const sb = makeSandbox();
    const resJson = vm.runInContext(`(() => {
      const st = baseGetState();
      baseDebugCreate(${JSON.stringify(lid)});
      const fails = [];
      const L = baseLayoutGet(${JSON.stringify(lid)});
      baseDebugGrantAll();
      const note = (slug, x, y, rot) => {
        const c = baseCanPlace(st, slug, x, y, rot);
        if (!c.ok) fails.push(slug + '@' + x + ',' + y + ' → ' + c.reason);
        else basePlace(st, slug, x, y, rot);
      };
      (${JSON.stringify(sc.items)}).forEach(([s, x, y, rot]) => note(s, x, y, rot));
      // PNJ sur sol praticable et non spawn/trou
      const npcBad = [];
      for (const [nx, ny] of ${JSON.stringify(sc.npcs)}) {
        const cell = L.cells[ny][nx];
        if (cell.t !== 'floor' || cell.entrance || cell.spawnPt) npcBad.push(nx + ',' + ny);
      }
      return JSON.stringify({ fails, npcBad, placed: st.items.length });
    })()`, sb);
    const res = JSON.parse(resJson);
    assert.deepEqual(res.fails, [], `${lid} : chaque pose est légale (${res.fails.join('; ') || 'OK'})`);
    assert.deepEqual(res.npcBad, [], `${lid} : PNJ sur cases valides`);
  }
});

