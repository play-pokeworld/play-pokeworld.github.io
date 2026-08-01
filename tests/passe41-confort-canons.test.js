import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 41 : confort d'édition, hauteur visuelle, objets canon ───────────
// Retours utilisateur traités :
//  A. « Je ne peux pas cliquer sur un objet pour le redéplacer » → UN clic =
//     prise en main directe (la sélection en 2 temps était invisible) ;
//     « Ramasser » RANGE le meuble tenu ; un clic sur le rendu 3D rappelle
//     que l'édition se fait en 2D (need2d).
//  B. « Les nouvelles maps sont mal faites… la porte donne sur un mur » →
//     les 6 gabarits perso sont regrillés : porte E avec case NORD libre,
//     BFS plaine-pied complet, ancres d'escalier par PAIRES (2 de large),
//     mezzanine ≥ 6 cases. Invariants vérifiés sur les 30 gabarits.
//  C. « L'escalier est gigantesque, inspire-toi de ROSA (2 de large) » →
//     escalier = empreinte canon 2×2, rot 90, sprite 32×32 cuit DA Émeraude.
//  D. « Rotation : tu réduis la largeur au lieu de pivoter » + « objets de
//     2 cases de haut réduits » → base2dSpriteBox autorise +1 case de haut
//     visuelle (collision = case basse seule), base2dDrawSprite PIVOTE le
//     bitmap (échelle uniforme, jamais étiré). Dimensions catalogue =
//     DECORSHAPE canon (header.h du désassemblage pokeemerald).
//  E. « Objets sans sprites (mélange ROSA/Émeraude) » → 19 sprites
//     redessinés DA Émeraude (pc rouge à barres jaunes inclus), 150 PNG,
//     invisible_doll retiré du catalogue ; seul welcome_mat reste procédural.
//  F. i18n : need2d/select_hint/move_hint présents FR+EN, zéro chaîne en dur.
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
  'src/game/base/base-view2d.js',
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

// ——— A — Clic direct = prise en main (code + boutons) ————————————————————
test('passe 41 A : édition directe câblée (clic unique, Ramasser le tenu, hint 3D)', () => {
  const ed = R('src/game/base/base-editor.js');
  const win = R('src/game/base/base-window.js');
  // le clic sur un meuble posé appelle DIRECTEMENT baseEditorMoveStart
  const clickIdx = ed.indexOf('function baseEditorClickCell');
  const mvIdx = ed.indexOf('baseEditorMoveStart(st, sel.uid)', clickIdx);
  assert.ok(mvIdx > clickIdx, 'baseEditorClickCell → baseEditorMoveStart direct');
  assert.ok(ed.includes('UN clic sur un meuble posé'), 'commentaire passe 41 (traçabilité du choix UX)');
  // « Ramasser » accepte le meuble TENU (hors automatiques)
  assert.ok(win.includes('Ramasser » range aussi le meuble TENU'), 'toolbar : pickup gère le tenu');
  // préfixe de fonctions banni (convention du projet)
  for (const f of ['src/game/base/base-editor.js', 'src/game/base/base-window.js', 'src/game/base/base-view2d.js', 'src/game/base/base-core.js']) {
    assert.ok(!R(f).includes('baseWindowToggle'), `pas de baseWindowToggle* dans ${f}`);
  }
  // helpers 2D exportés (tests + outils)
  assert.ok(R('src/game/base/base-view2d.js').includes('window.base2dSpriteBox = base2dSpriteBox'), 'base2dSpriteBox exporté');
  assert.ok(R('src/game/base/base-view2d.js').includes('window.base2dDrawSprite = base2dDrawSprite'), 'base2dDrawSprite exporté');
});

// ——— B — Invariants des 30 gabarits (porte libre, BFS, ancres, mezzanine) —
test('passe 41 B : les 30 gabarits respectent les invariants d’aménagement', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const report = [];
    const ids = baseLayoutIds();
    for (const id of ids) {
      const L = baseLayoutGet(id);
      const at = (x, y) => (L.cells[y] || [])[x] || { t: 'wall' };
      const floors = []; let E = null, S = null;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const c = at(x, y);
        if (c.t === 'floor' || c.t === 'hole') floors.push([x, y]);
        if (c.entrance) { if (E) report.push(id + ': 2e entrée'); E = [x, y]; }
        if (c.spawnPt) { if (S) report.push(id + ': 2e spawn'); S = [x, y]; }
      }
      if (!E) { report.push(id + ': pas de porte'); continue; }
      if (!S) { report.push(id + ': pas de spawn'); continue; }
      // la PORTE ne donne jamais sur un mur : la case au NORD est du sol libre
      const nE = at(E[0], E[1] - 1);
      if (!(nE.t === 'floor' && !nE.entrance)) report.push(id + ': case NORD de la porte = ' + nE.t);
      if (at(S[0], S[1]).t !== 'floor') report.push(id + ': spawn hors sol');
      // BFS plaine-pied depuis le spawn : TOUT le rez-de-chaussée est atteint
      const seen = new Set([S[0] + ',' + S[1]]);
      const q = [S];
      while (q.length) {
        const cur = q.shift();
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cur[0] + d[0], ny = cur[1] + d[1], k = nx + ',' + ny;
          if (seen.has(k)) continue;
          const c = at(nx, ny);
          if ((c.t === 'floor' || c.t === 'hole') && !c.elev) { seen.add(k); q.push([nx, ny]); }
        }
      }
      for (const f of floors) {
        const c = at(f[0], f[1]);
        if (c.elev) continue;
        if (!seen.has(f[0] + ',' + f[1])) { report.push(id + ': case plaine-pied inaccessible ' + f); break; }
      }
      if (!seen.has(E[0] + ',' + (E[1] - 1))) report.push(id + ': porte non atteignable à pied');
      // gabarits 2 niveaux : ancres par PAIRES (escalier 2 de large), falaise
      // au N, mezzanine au N-2, ≥ 6 cases surélevées
      if (id.endsWith('_5') || id.endsWith('_6')) {
        if (!L.stairAnchors.length) report.push(id + ': aucune ancre');
        if (L.stairAnchors.length % 2) report.push(id + ': ancres impaires (paires requises)');
        for (const a of L.stairAnchors) {
          const N = at(a.x, a.y - 1), NN = at(a.x, a.y - 2);
          const right = at(a.x + 1, a.y), rightN = at(a.x + 1, a.y - 1);
          const leftIsAnchor = !!at(a.x - 1, a.y).stairAnchor;
          if (N.t !== 'cliff') report.push(id + ': ancre ' + a.x + ',' + a.y + ' sans falaise au N');
          if (NN.elev !== 1) report.push(id + ': ancre ' + a.x + ',' + a.y + ' sans mezzanine au N-2');
          if (!leftIsAnchor && !(right.stairAnchor && rightN.t === 'cliff')) report.push(id + ': ancre ' + a.x + ',' + a.y + ' sans PAIRE à droite');
        }
        let mezz = 0;
        for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (at(x, y).elev === 1) mezz++;
        if (mezz < 6) report.push(id + ': mezzanine ' + mezz + ' < 6');
      }
    }
    return JSON.stringify({ n: ids.length, report });
  })()`, sb));
  assert.equal(out.n, 36, '36 gabarits (24 canon + 6 perso + 6 grottes colorées à étage, passe 42)');
  assert.deepEqual(out.report, [], 'porte dégagée + BFS complet + ancres par paires + mezzanine ≥ 6');
});

// ——— C — Escalier canon ROSA : 2×2, paire d'ancres, exclusion chevauche ——
test('passe 51 C : escalier 2×2 style ROSA — dims, paire d’ancres, exclusion', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const def = baseItemGet('stairs');
    r.def = { w: def.w, d: def.d, rot: def.rot, acq: def.acq, walk: !!def.walk, fx: def.fx };
    // Passe 51 : chaque gabarit à étage est DEUX salles reliées par un couloir
    // et UN escalier — on vérifie donc la paire d'ancres et le refus du
    // chevauchement sur cette même paire.
    const st = baseGetState();
    baseDebugCreate('bush_6');
    st.items = []; st.stock = {}; st.npcs = []; st.npcStock = []; st.uidSeq = 1;
    baseStockAdd(st, 'stairs', 2);
    const anchors = baseLayoutGet('bush_6').stairAnchors;
    r.pairs = anchors.length;
    const p1 = basePlace(st, 'stairs', anchors[0].x, anchors[0].y, 0);
    const s1 = st.items.find((i) => i.s === 'stairs');
    r.first = p1.ok === true && s1.x === anchors[0].x && s1.y === anchors[0].y - 1;
    // la 2e ancre de la MÊME paire chevauche l'escalier posé → refusée
    r.overlapReason = baseCanPlace(st, 'stairs', anchors[1].x, anchors[1].y, 0).reason;
    r.stairsCount = st.items.filter((i) => i.s === 'stairs').length;
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.def, { w: 2, d: 2, rot: 0, acq: 'fortree', walk: true, fx: 'stairs' }, 'escalier canon : 2×2 (deux de large comme ROSA), SANS rotation (passe 42), marchable');
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('stairs'))`, sb), 1, 'escalier : orientation unique');
  assert.equal(out.pairs, 2, 'une paire d’ancres (2 cases) par gabarit à étage');
  assert.equal(out.first, true, 'escalier posé, empreinte normalisée ancre-1');
  assert.equal(out.overlapReason, 'base.err.occupied', '2e ancre de la même paire = chevauchement refusé');
  assert.equal(out.stairsCount, 1, 'un seul escalier tient dans la niche');
});

// ——— D — Dimensions canon DECORSHAPE + hauteur visuelle ———————————————————
test('passe 41 D : dims catalogue = header.h canon, hauteur visuelle débordante', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const CANON = {
      heavy_desk: [3, 2], ragged_desk: [3, 2], comfort_desk: [3, 2], // bureaux canon
      pretty_desk: [3, 3], brick_desk: [3, 3], camp_desk: [3, 3], hard_desk: [3, 3],
      blue_tent: [3, 3], red_tent: [3, 3], // passe 42 : 3×3 canon (était 3×2)
      tv: [1, 1], round_tv: [1, 1], cute_tv: [1, 1], pc: [1, 1],
      breakable_door: [1, 2], stairs: [2, 2], tropical_plant: [1, 2],
      // passe 42 : objets canon ajoutés (banner demande « il manque des assets »)
      pika_poster: [2, 1], kiss_poster: [2, 1], gate_poster_none: null,
    };
    delete CANON.gate_poster_none; // garde-fou local (hors catalogue)
    Object.assign(CANON, { stand: [4, 2], slide: [2, 4], colorful_plant: [2, 2],
      surf_mat: [3, 3], fissure_mat: [3, 3], c_low_note_mat: [1, 1] });
    const dims = {}, fp0 = {};
    for (const s of Object.keys(CANON)) {
      const d = baseItemGet(s);
      dims[s] = d ? [d.w, d.d] : null;
      fp0[s] = d ? baseItemFootprint(d, 0) : null;
    }
    // hauteur visuelle : une plante tropicale (sprite 16×32) déborde d'une
    // case vers le haut mais ne bloque QUE sa case basse (empreinte 1×1).
    const C = 16;
    const plant = baseItemGet('tropical_plant');
    const plantImg = { width: 16, height: 32 };
    const boxPlant = base2dSpriteBox(plant, baseItemFootprint(plant, 0), plantImg, C);
    // un poster MURAL (layer wall) ne déborde PAS vers le haut (collé au mur)
    const poster = baseItemGet('blue_poster');
    const boxBoard = base2dSpriteBox(poster, baseItemFootprint(poster, 0), { width: 16, height: 16 }, C);
    // rotation BITMAP : l'angle est imposé par rotIdx × def.rot (90° bureau)
    const desk = baseItemGet('heavy_desk');
    const turns = [0, 1, 2, 3].map((i) => (((i * desk.rot) % 360) + 360) % 360);
    return JSON.stringify({ dims, fp0plant: fp0.tropical_plant, boxPlant, boxBoard, turns, rotDesk: desk.rot, rotPlant: plant.rot });
  })()`, sb));
  const CANON = {
    heavy_desk: [3, 2], ragged_desk: [3, 2], comfort_desk: [3, 2],
    pretty_desk: [3, 3], brick_desk: [3, 3], camp_desk: [3, 3], hard_desk: [3, 3],
    blue_tent: [3, 3], red_tent: [3, 3],
    tv: [1, 1], round_tv: [1, 1], cute_tv: [1, 1], pc: [1, 1],
    breakable_door: [1, 2], stairs: [2, 2], tropical_plant: [1, 2],
    pika_poster: [2, 1], kiss_poster: [2, 1],
    stand: [4, 2], slide: [2, 4], colorful_plant: [2, 2],
    surf_mat: [3, 3], fissure_mat: [3, 3], c_low_note_mat: [1, 1],
  };
  for (const [s, wd] of Object.entries(CANON)) {
    assert.deepEqual(out.dims[s], wd, `${s} = ${wd[0]}×${wd[1]} (DECORSHAPE canon)`);
  }
  assert.deepEqual(out.fp0plant, { w: 1, d: 1 }, 'collision = case basse seule (empreinte 1×1)');
  assert.equal(out.boxPlant.maxH, 32, 'visu 2 cases de haut (16×32 natif) : maxH = h + C');
  assert.equal(out.boxPlant.h, 16, 'empreinte au sol inchangée');
  assert.equal(out.boxBoard.maxH, 16, 'objet mural : pas de débord (collé au mur)');
  assert.equal(out.rotDesk, 0, 'passe 42 : rotation SUPPRIMÉE (canon RSE)');
  assert.equal(out.rotPlant, 0, 'objet sans rotation');
  assert.deepEqual(out.turns, [0, 0, 0, 0], 'aucun pivot possible (orientation unique)');
});

// ——— E — Sprites : 150 PNG, 19 redessinés, PC 16×32, manifeste cohérent ———
test('passe 41 E : sprites canon RSE complets (122 PNG natifs, ORAS purgés)', () => {
  const dir = 'src/assets/images/secret-base/emerald';
  const files = fs.readdirSync(new URL(`../${dir}`, import.meta.url)).filter((f) => f.endsWith('.png'));
  assert.equal(files.length, 122, '122 PNG Émeraude canon natifs (passe 42)');
  // Passe 42 : les 19 « redessinés » (pc rouge/jaune, tapis ORAS, blackboard,
  // vending_machine, lit, proclamation…) étaient HORS DA → supprimés du jeu,
  // leurs fichiers purgés. Tout sprite du repo = métatile/objgfx officiel.
  const FORMER_ORAS = ['bench', 'green_mat', 'red_mat', 'blue_mat', 'flat_mat',
    'proclamation', 'blackboard', 'confetti_ball', 'poke_flute', 'berry_blender',
    'comfortable_bed', 'substitute_doll', 'vending_machine', 'tall_grass',
    'pitfall_mat', 'square_one_mat', 'blue_warp_panel', 'red_warp_panel'];
  for (const s of FORMER_ORAS) {
    assert.ok(!E(`${dir}/${s}.png`), `purgé : ${s}.png (pas dans le diverticule Émeraude)`);
  }
  // PC authentique : métatile 0x220 du tileset SecretBase (gris-bleu, 16×16)
  const man = J('src/assets/images/secret-base/manifest.render2d.json').items;
  const ihdr = (p) => { const b = fs.readFileSync(new URL(`../${p}`, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  assert.ok(man.pc && man.pc.emerald, 'pc au manifeste');
  assert.deepEqual(ihdr(`${dir}/pc.png`), [16, 16], 'pc.png = métatile canon 16×16');
  assert.deepEqual(ihdr(`${dir}/stairs.png`), [32, 32], 'stairs.png 32×32 (2×2 natif GBA)');
  // catalogue canon : 123 objets (120 RSE + welcome_mat + stairs + pc)
  const catalogue = [...R('src/data/base-items-data.js').matchAll(/s:'([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.equal(catalogue.length, 122, '122 objets au catalogue (passe 43 : welcome_mat retiré)');
  const without = catalogue.filter((s) => !(man[s] && man[s].emerald));
  assert.deepEqual(without, [], 'passe 43 : plus AUCUN sprite procédural (tapis d\u2019accueil supprimé)');
  // les 11 poupées téléchargées (ditto, meowth, pikachu…) + 5 personnages
  for (const s of ['ditto_doll', 'meowth_doll', 'pikachu_doll', 'gulpin_doll', 'kecleon_doll', 'seedot_doll', 'lotad_doll', 'duskull_doll', 'snoothum_doll'.replace('snoothum', 'smoochum'), 'snorlax_doll', 'rhydon_doll']) {
    assert.ok(E(`${dir}/${s}.png`), `poupée téléchargée ${s}`);
  }
  assert.ok(!E(`${dir}/people`), 'dossier people supprimé');
});

test('passe 41 F : i18n need2d + hints édition FR/EN, listener 3D branché', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`JSON.stringify({
    fr: { need2d: I18N.fr.base.edit.need2d, sel: I18N.fr.base.edit.select_hint, mv: I18N.fr.base.edit.move_hint },
    en: { need2d: I18N.en.base.edit.need2d, sel: I18N.en.base.edit.select_hint, mv: I18N.en.base.edit.move_hint },
  })`, sb));
  for (const lang of ['fr', 'en']) {
    assert.equal(typeof out[lang].need2d, 'string', `${lang} : need2d présent`);
    assert.ok(out[lang].need2d.length > 10, `${lang} : need2d explicite`);
    assert.equal(typeof out[lang].sel, 'string', `${lang} : select_hint présent`);
    assert.equal(typeof out[lang].mv, 'string', `${lang} : move_hint présent`);
  }
  assert.ok(out.fr.sel.includes('prendre en main'), 'FR select_hint : UN clic = prendre en main');
  assert.ok(out.en.sel.includes('pick it up'), 'EN select_hint : one click = pick up');
  assert.ok(out.fr.mv.includes('Ramasser'), 'FR move_hint : « Ramasser » range le tenu');
  assert.ok(out.en.mv.includes('Pick up'), 'EN move_hint : Pick up stashes the held item');
  // le canvas 3D rappelle que l'édition = 2D (notification, pas d'alert en dur)
  const win = R('src/game/base/base-window.js');
  assert.ok(win.includes("_baseWin.c3d.addEventListener('click'"), 'listener clic sur canvas 3D');
  assert.ok(win.includes("t('base.edit.need2d')"), 'notification i18n need2d (zéro chaîne en dur)');
});

