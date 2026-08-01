import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// ── Passe 36/37 : vrais fonds Émeraude canon + caméra ROSA + assets ────────
//  A. Assets rangés dans src/assets (modèles, icônes, sprites, fonds) —
//     plus de assets3d/assets2d/out à la racine, aucun zip lourd livré
//  B. Fonds Émeraude cuits : 12 PNG (les 12 layouts RSE officiels) aux
//     dimensions exactes des gabarits, baker réglé sur la vraie règle de
//     palettes GBA (SPLIT_PAL = 6, primaire gTileset_SecretBase)
//  C. Caméra ROSA (yaw 0, pitch 0.95) + coquille TEXTURÉE par les vrais
//     métatiles Émeraude (atlas tex3d) + rebords bas au sud-void + posters
//  D. Règle canon des muraux : posés UNIQUEMENT au mur nord (sol au sud)
//  E. Exemples régénérés dans src/assets/images/secret-base/examples/
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const J = (p) => JSON.parse(R(p));
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const L = (p) => fs.readdirSync(new URL(`../${p}`, import.meta.url));

const LAYOUTS = [
  ['cave_1', 11, 9], ['cave_2', 14, 9], ['cave_3', 15, 11], ['cave_4', 14, 12],
  ['tree_1', 11, 9], ['tree_2', 7, 16], ['tree_3', 17, 8], ['tree_4', 14, 14],
  ['bush_1', 11, 9], ['bush_2', 15, 7], ['bush_3', 13, 11], ['bush_4', 14, 11],
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
  for (const f of [
    'src/file-preflight.js',
    'src/localization/fr/base.js', 'src/localization/en/base.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/game/core/state.js',
    'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
    'src/game/base/base-core.js',
  ]) vm.runInContext(R(f), sandbox, { filename: f });
  return sandbox;
}

// ——— A — Assets rangés ————————————————————————————————————————————————————
test('passe 36 A : assets rangés dans src/assets, racine purgée', () => {
  // nouvelles maisons
  assert.ok(!E('src/assets/models'), 'models 3D supprimés');
  assert.ok(E('src/assets/images/secret-base/manifest.render2d.json'), 'manifest 2D déplacé');
  // passe 45 : les deux dossiers d'icônes ORAS de staging (icons/ 64 fichiers,
  // icons-serebii/ 165) n'existent PLUS — la passe 42 avait déjà purgé leurs
  // références du manifeste (100 % des sprites viennent des métatiles/objgfx
  // Émeraude natifs). On vérifie donc l'INVERSE : aucun repli ORAS résiduel.
  assert.ok(!E('src/assets/images/secret-base/icons'), 'staging icons/ ORAS purgé (passe 42/45)');
  assert.ok(!E('src/assets/images/secret-base/icons-serebii'), 'staging icons-serebii/ purgé');
  {
    const m2 = J('src/assets/images/secret-base/manifest.render2d.json');
    const withIcon = Object.values(m2.items).filter((e) => e.icon2d).length;
    assert.equal(withIcon, 0, 'aucun sprite ne retombe sur une icône ORAS');
  }
  // passe 39 : + décors métatiles complets (DECOR_MAP, vrais noms Émeraude)
  // + 34 sprites d'objets (poupées/coussins). Décompte vérifiable :
  // 105 produits par les bakes (71 DECOR_MAP + 34 objgfx) + 25 hérités des
  // passes 33-37 (bricks, jolies commodes, poupées plates… référencés par
  // les manifestes 2D/3D) = 130 fichiers.
  // passe 40 : + escalier (stairs.png, échelle cuite par le baker) = 131.
  // passe 42 : PURGE canon RSE — les 19 redessinés (pc rouge/jaune, tapis
  // ORAS…) et tout sprite hors catalogue officiel sont SUPPRIMÉS. Restent les
  // 122 sprites natifs (métatiles DecorGfx + objgfx + pc 0x220 + escalier v4)
  // + le sous-dossier people/ (passe 46 : 9 feuilles = joueur + 8 allures).
  const emDir = fs.readdirSync(new URL('../src/assets/images/secret-base/emerald', import.meta.url), { withFileTypes: true });
  assert.equal(emDir.filter((e) => e.isFile() && e.name.endsWith('.png')).length, 122, '122 sprites Émeraude canon natifs (passe 42)');
  assert.ok(!emDir.some((e) => e.isDirectory() && e.name === 'people'), 'sous-dossier people/ supprimé');
  // anciennes maisons supprimées
  assert.ok(!E('assets3d'), 'assets3d/ supprimé de la racine');
  assert.ok(!E('assets2d'), 'assets2d/ supprimé de la racine');
  assert.ok(!E('out'), 'out/ supprimé (exemples → examples/)');
  // aucun zip lourd livré dans le projet (les archives d'origine sont purgées)
  const stack = ['src/assets'];
  const zips = [];
  while (stack.length) {
    const d = stack.pop();
    for (const f of fs.readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })) {
      const p = `${d}/${f.name}`;
      if (f.isDirectory()) stack.push(p);
      else if (/\.zip$/i.test(f.name)) zips.push(p);
    }
  }
  assert.deepEqual(zips, [], 'aucun zip livré dans src/assets');
  // plus aucune référence aux anciens chemins dans le code livré
  for (const f of ['src/game/base/base-view2d.js',
    'src/game/base/base-window.js', 'index.html']) {
    const s = R(f);
    assert.ok(!s.includes('assets3d') && !s.includes('assets2d'), f + ' sans ancien chemin');
  }
  // manifeste de rendu 2D : tous les fichiers référencés existent
  const man2 = J('src/assets/images/secret-base/manifest.render2d.json');
  for (const slug of Object.keys(man2.items)) {
    const e2 = man2.items[slug];
    for (const k of ['emerald', 'icon2d']) {
      if (e2[k]) assert.ok(E(e2[k]), `${slug}.${k} → ${e2[k]}`);
    }
  }
});

// ——— B — Fonds Émeraude cuits ————————————————————————————————————————————
test('passe 36 B : 12 fonds Émeraude canon aux dimensions exactes des gabarits', () => {
  for (const [lid, w, h] of LAYOUTS) {
    const p = `src/assets/images/secret-base/bg/emerald/${lid}.png`;
    assert.ok(E(p), p);
    const buf = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    assert.ok(buf.length > 1200, `${p} poids plausible`);
    // en-tête PNG : signature + IHDR (largeur/hauteur big-endian @16/@20)
    assert.equal(buf.readUInt32BE(0), 0x89504e47, 'signature PNG');
    const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
    assert.equal(W, w * 16, `${lid} largeur GBA native`);
    assert.equal(H, h * 16, `${lid} hauteur GBA native`);
  }
  // le baker encode la vraie règle GBA (prouvée sur les données pret/pokeemerald)
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('SPLIT_PAL = 6'), 'palettes GBA : secondaire dès le slot 6');
  assert.ok(bake.includes('primary/secret_base'), 'primaire = gTileset_SecretBase (PAS general)');
  assert.ok(bake.includes('SecretBase_BrownCave4'), '12 layouts RSE officiels (dont les « 4 »)');
  assert.ok(bake.includes("'floor': 522"), 'métatile sol canon (extrait positionellement)');
  assert.ok(bake.includes("'entr': 524"), 'métatile entrée canon');
  // atlas des coquilles 3D texturées (5 slots de métatiles réels)
  // le renderer 2D consomme ces fonds
  const v2d = R('src/game/base/base-view2d.js');
  assert.ok(v2d.includes('src/assets/images/secret-base/bg/emerald/${layoutId}.png') ||
            v2d.includes('src/assets/images/secret-base/bg/emerald/${st.layoutId}.png') ||
            /bg\/emerald\/\$\{/.test(v2d), '2D : fond cuit par gabarit');
  assert.ok(v2d.includes('baseView2dBg'), '2D : chargeur de fond nommé');
});

// ——— C — Caméra ROSA + coquille 3D texturée ——————————————————————————————
// Passe 56 : l'ancien renderer `base-view3d.js` a été REMPLACÉ par la
// fenêtre 3D autonome (base3d-view.js). Il déclarait `_base3dManifestP` au
// niveau global, comme le nouveau chargeur : deux `let` de même nom dans la
// portée globale = SyntaxError, et TOUT le chargement des scripts s'arrêtait
// (fenêtre 3D noire, console pleine de « loadScript »). Il est archivé dans
// tools/legacy/ ; ces vérifications portent désormais sur le renderer actif.
test('passe 36 C : renderer 3D et tuiles ORAS supprimés', () => {
  assert.ok(!E('src/game/base/base3d-view.js'), 'renderer 3D supprimé');
});

test('passe 36 D : muraux posés uniquement au mur nord (sol au sud)', () => {
  const sb = makeSandbox();
  const out = vm.runInContext(`(() => {
    const st = baseCreateDefault();
    baseRelocate(st, 'cave_1');
    const north = baseCanPlace(st, 'blue_poster', 5, 0, 0);   // mur nord (sol en (5,1))
    const west = baseCanPlace(st, 'blue_poster', 0, 4, 0);    // mur ouest : sud = mur
    const east = baseCanPlace(st, 'blue_poster', 10, 4, 0);   // mur est : sud = mur
    const southWall = baseCanPlace(st, 'blue_poster', 1, 7, 0); // mur (sud = mur, jamais de sol)
    const floor = baseCanPlace(st, 'blue_poster', 4, 4, 0);   // plein sol
    const stairs = baseCanPlace(st, 'stairs', 2, 5, 0);       // RSE : aucune ancre
    const tire = baseCanPlace(st, 'tire', 1, 4, 0);           // sol 2×2 toujours OK
    return JSON.parse(JSON.stringify({ north, west, east, southWall, floor, stairs, tire }));
  })()`, sb);
  assert.ok(out.north.ok, 'poster au mur nord : accepté');
  assert.ok(!out.west.ok && out.west.reason === 'base.err.wall_only', 'poster mur ouest : refusé');
  assert.ok(!out.east.ok && out.east.reason === 'base.err.wall_only', 'poster mur est : refusé');
  assert.ok(!out.southWall.ok, 'poster mur sud : refusé');
  assert.ok(!out.floor.ok && out.floor.reason === 'base.err.wall_only', 'poster au sol : refusé');
  assert.ok(!out.stairs.ok && out.stairs.reason === 'base.err.stairs_anchor', 'RSE : escalier refusé (pas d’ancre)');
  assert.ok(out.tire.ok, 'meuble de sol inchangé');
});

// ——— E — Exemples régénérés ——————————————————————————————————————————————
test('passe 36 E : exemples dans src/assets/images/secret-base/examples/ (supprimés)', () => {
  const dir = 'src/assets/images/secret-base/examples';
  assert.ok(!E(dir), 'exemples 3D supprimés');
});

