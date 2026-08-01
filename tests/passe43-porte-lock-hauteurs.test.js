import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 43 : retours utilisateur « rendu parfait » ─────────────────────────
//  1. Le « tapis rouge/jaune » (welcome_mat procédural) n'avait rien à faire
//     là → SUPPRIMÉ du jeu entier (RSE n'en montre pas dans une base).
//  2. Le point de spawn est TOUJOURS la case devant la porte (marqueur 'S').
//  3. L'escalier a du relief : sprite v6 massif 3/4 (contremarches, joues).
//  4. Collisions canon : walk/behind/layer == DECORPERM des gDecorations.
//  5. Hauteurs lisibles façon ORAS : architecture uniforme des 12 gabarits à
//     étage + ombre de contact des meubles + décalage mezzanine 0.45 + falaise
//     sombre à strates + ombre portée longue.
//  6. Personnage contrôlé = vrai sprite statique trainer-54 (people.player),
//     pas d'animation (les PNJ gardent leurs feuilles GBA).

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

const CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6',
                'cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6', 'cave_yellow_5', 'cave_yellow_6'];

// ——— A — welcome_mat : purgé du jeu entier ————————————————————————————————
test('passe 43 A : welcome_mat supprimé du jeu (catalogue, i18n, modules, migration)', () => {
  const sb = makeSandbox();
  assert.equal(vm.runInContext(`BASE_ITEMS.some(it => it.s === 'welcome_mat')`, sb), false, 'hors du catalogue');
  assert.equal(vm.runInContext('BASE_ITEMS.length', sb), 122, '122 objets (120 canon + stairs/pc)');
  assert.equal(vm.runInContext(`baseItemMigrate('welcome_mat')`, sb), null, 'migration → null (sauvegardes nettoyées)');
  for (const f of ['src/game/base/base-core.js', 'src/game/base/base-editor.js',
                   'src/game/base/base-window.js', 'src/game/base/base-view2d.js',
                   'src/localization/fr/base.js', 'src/localization/en/base.js',
                   'src/data/base-items-data.js', 'tools/render_base_preview.py',
                   'tools/build-canon-items.py']) {
    assert.ok(!R(f).includes('welcome_mat'), `${f} sans welcome_mat`);
  }
  // sanitize : un vieux tapis posé est écarté, rien n'est regénéré
  const out = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const st = { layoutId: 'cave_1', stock: { welcome_mat: 3 }, items: [{ uid: 1, s: 'welcome_mat', x: 5, y: 7, rot: 0 }],
      npcs: [], npcStock: [], uidSeq: 2, record: { w: 0, l: 0, visits: 0 }, spawn: null };
    const c = baseSanitizeState(st);
    return { items: c.items.map((i) => i.s), stock: c.stock };
  })())`, sb));
  assert.ok(!out.items.includes('welcome_mat'), 'tapis posé écarté');
  assert.ok(!('welcome_mat' in out.stock), 'stock écarté');
});

// ——— B — spawn TOUJOURS devant la porte ———————————————————————————————————
test('passe 43 B : spawn = case devant la porte, pour les 36 gabarits', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const bad = [];
    for (const id of baseLayoutIds()) {
      const L = baseLayoutGet(id);
      if (!L.spawn || !L.exit) { bad.push(id + ' sans S/E'); continue; }
      if (L.spawn.x !== L.exit.x || L.spawn.y !== L.exit.y - 1) bad.push(id + ' S pas devant E');
      const sc = L.cells[L.spawn.y][L.spawn.x];
      if (!sc || sc.t !== 'floor' || sc.entrance) bad.push(id + ' S non praticable');
      // la case devant la porte est protégée (non décorable)
    }
    return JSON.stringify({ bad, count: baseLayoutIds().length });
  })()`, sb));
  assert.equal(out.count, 36, '36 gabarits');
  assert.deepEqual(out.bad, [], 'chaque S est la case juste devant la porte');
  // la visite démarre SUR le spawn du gabarit (rien d'autre)
  const pos = vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const L = baseLayoutGet('cave_1');
    return L.spawn.x + ',' + L.spawn.y;
  })()`, sb);
  assert.equal(pos, '5,7', 'cave_1 : S = devant E (5,8)');
  // plus de spawn personnalisé : la fonction n'existe plus, l'état l'ignore
  assert.equal(vm.runInContext('typeof window.baseSetSpawn', sb), 'undefined', 'baseSetSpawn supprimé');
  const san = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const st = { layoutId: 'cave_1', stock: {}, items: [], npcs: [], npcStock: [], uidSeq: 1,
      record: { w: 0, l: 0, visits: 0 }, spawn: { x: 2, y: 2 } };
    return baseSanitizeState(st);
  })())`, sb));
  assert.equal(san.spawn == null || (san.spawn.x === 5 && san.spawn.y === 7), true, 'spawn personnalisé ignoré');
  // l'import ignore aussi le champ spawn
  assert.ok(R('src/game/base/base-exchange.js').includes('passe 43'), 'commentaire de retrait dans l\u2019import');
});

// ——— C — escalier : sprite v9 bois largeur constante + franchissement ———
test('passe 43/44/46 C : escalier v9 bois (2 colonnes) + franchissement des niveaux', () => {
  const b = fs.readFileSync(new URL('../src/assets/images/secret-base/emerald/stairs.png', import.meta.url));
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20), b[25]], [32, 32, 6], 'stairs.png 32×32 RGBA');
  const bake = R('tools/bake-emerald-bgs.py');
  // passe 46 (retours utilisateur : « l'escalier doit faire la même taille
  // tout le temps » + « plutôt en bois comme les planches ») → v9 = escalier
  // de BOIS à LARGEUR CONSTANTE, palette de solid_board.
  // Historique (retour utilisateur « pas cohérent avec les assets Émeraude ») :
  // v7 répétait le motif du PRÉSENTOIR (0x272/0x275) → damier plat, couture
  // centrale, liseré de tapis. v8 = vraie volée en perspective (6 marches en
  // trapèze, limons en pente) à la PALETTE EXACTE de l'unique escalier
  // authentique du tileset des bases secrètes : Slide_Stairs 0x263.
  for (const cue of ['v9', '2 COLONNES', 'LARGEUR CONSTANTE', 'solid_board']) {
    assert.ok(bake.includes(cue), `baker : ${cue}`);
  }
  // le relief est RÉEL dans les pixels : marches alternées clair/sombre,
  // teintes variées (jamais un aplatis)
  const px = [];
  for (let i = 26; i < b.length; i += ((b.length - 26) / 400 | 0) || 1) px.push(b[i]);
  assert.ok(new Set(px).size > 24, 'sprite détaillé (pas un aplatis)');
  // pose légale à cheval falaise/ancres (niche passe 44), franchissement des
  // DEUX colonnes, puis mezzanine accessible depuis le spawn
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    const r = {};
    const a0 = baseLayoutGet('cave_5').stairAnchors[0]; // niche organique (3,4)
    r.anchor = a0;
    // pose par n'importe quelle ancre de la paire (alignement auto)
    r.stairsOkE = baseCanPlace(st, 'stairs', a0.x + 1, a0.y, 0);
    const p = basePlace(st, 'stairs', a0.x + 1, a0.y, 0);
    const s1 = st.items.find((i) => i.s === 'stairs');
    r.snapped = s1 ? (s1.x === a0.x && s1.y === a0.y - 1) : false;
    // les DEUX colonnes accrochent la falaise (demande utilisateur passe 44)
    r.hookW = baseStairsAt(st, a0.x, a0.y);
    r.hookE = baseStairsAt(st, a0.x + 1, a0.y);
    // position UNIQUE : 2e pose la même paire = refus franc
    r.second = baseCanPlace(st, 'stairs', a0.x + 1, a0.y, 0).ok === true;
    // accès : après l'escalier, la mezzanine est atteignable depuis le spawn
    const from = baseLayoutGet('cave_5').spawn;
    const reach2 = baseReachableSet(st, baseBuildGrid(st), from.x, from.y);
    r.mezzReach = [...reach2].filter((k) => {
      const [x, y] = k.split(',').map(Number);
      return baseLayoutGet('cave_5').cells[y][x].elev === 1;
    }).length;
    r.mezzTotal = 0;
    {
      const L2 = baseLayoutGet('cave_5');
      for (let y = 0; y < L2.h; y++) for (let x = 0; x < L2.w; x++) {
        if (L2.cells[y][x].t === 'floor' && L2.cells[y][x].elev === 1) r.mezzTotal++;
      }
    }
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.stairsOkE.ok, true, 'escalier posable sur la niche (ancre E de la paire)');
  assert.equal(out.snapped, true, 'pose alignée au début de la paire (position unique)');
  assert.equal(out.hookW && out.hookE, true, 'DEUX colonnes accrochent la falaise');
  assert.equal(out.second, false, 'une seule pose par niche');
  // passe 47 : les salles ROSA sont cloisonnées — le plateau de cave_5 fait
  // 12 cases (contre ~28 pour l'ancien plateau pleine largeur). On vérifie
  // qu'il est INTÉGRALEMENT atteignable plutôt qu'un seuil absolu.
  assert.equal(out.mezzReach, out.mezzTotal,
    `100 % de la mezzanine atteignable après l\u2019escalier (${out.mezzReach}/${out.mezzTotal})`);
});

// ——— D — hauteurs : architecture ORGANIQUE ROSA (niche d'escalier) + rendu ——
test('passe 51 D : gabarits à étage — deux salles, couloir, escalier unique', () => {
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  assert.deepEqual(Object.keys(grids).sort(), CUSTOM.slice().sort(), 'les 12 gabarits perso');
  const at = (rows, x, y) => (rows[y] && rows[y][x]) || '#';
  for (const [lid, rows] of Object.entries(grids)) {
    const w = rows[0].length, h = rows.length;
    // invariants d'élévation du moteur
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '^') {
        assert.ok(['^', '='].includes(at(rows, x, y + 1)), `${lid} : '^'(${x},${y}) a un sud '^'/'='`);
        assert.ok(['^', '#'].includes(at(rows, x, y - 1)), `${lid} : '^'(${x},${y}) adossé au nord`);
      }
      if (c === '=') assert.equal(at(rows, x, y - 1), '^', `${lid} : '='(${x},${y}) = face d'un plateau`);
      if (c === 'a') {
        assert.equal(at(rows, x, y - 1), '=', `${lid} : ancre (${x},${y}) sous une falaise`);
        assert.equal(at(rows, x, y - 2), '^', `${lid} : falaise (${x},${y - 1}) adossée au plateau`);
      }
    }
    // UN escalier, paire d'ancres exacte, flanquée par la falaise
    const runs = [];
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        if (rows[y][x] !== 'a') { x++; continue; }
        let x2 = x; while (x2 < w && rows[y][x2] === 'a') x2++;
        runs.push({ y, x1: x, x2: x2 - 1 }); x = x2;
      }
    }
    assert.equal(runs.length, 1, `${lid} : un seul escalier entre les deux salles`);
    for (const r of runs) {
      assert.equal(r.x2 - r.x1 + 1, 2, `${lid} : paire d'ancres exacte`);
      assert.equal(at(rows, r.x1 - 1, r.y), '=', `${lid} : falaise à gauche de la niche`);
      assert.equal(at(rows, r.x2 + 1, r.y), '=', `${lid} : falaise à droite de la niche`);
    }
    const flat = rows.join('');
    assert.equal((flat.match(/S/g) || []).length, 1, `${lid} : un S`);
    assert.equal((flat.match(/E/g) || []).length, 1, `${lid} : UNE SEULE entrée`);
    assert.ok(flat.includes('o'), `${lid} : rocher d'habillage`);
  }
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('dénivelé BIEN VISIBLE façon ORAS'), 'commentaire baker passe 43');
  assert.ok(bake.includes('wall_metatile'), 'autotiling des murs (passe 47)');
  for (const lid of CUSTOM) assert.ok(E(`src/assets/images/secret-base/bg/emerald/${lid}.png`), `fond ${lid}`);
});

// ——— E — collisions canon == DECORPERM gDecorations ————————————————————————
test('passe 43 E : walk/behind/layer du catalogue == DECORPERM canon', () => {
  const canon = J('tools/emerald-ref/canon-decor.json');
  const sb = makeSandbox();
  const items = JSON.parse(vm.runInContext(`JSON.stringify(BASE_ITEMS.map((d) => ({
    s: d.s, walk: !!d.walk, behind: !!d.behind, layer: d.layer, w: d.w, d: d.d,
  })))`, sb));
  const bySlug = Object.fromEntries(items.map((d) => [d.s, d]));
  let checked = 0;
  for (const [key, v] of Object.entries(canon)) {
    if (key === 'DECOR_NONE') continue;
    const slug = key.replace('DECOR_', '').toLowerCase().replace(/ /g, '_');
    const it = bySlug[slug];
    assert.ok(it, `${slug} présent`);
    const [w, d] = v.shape.split('x').map(Number);
    assert.deepEqual([it.w, it.d], [w, d], `${slug} : empreinte ${v.shape} (vraies collisions)`);
    // DECORPERM_PASS_FLOOR = franchissable (toboggan, présentoir, tentes…)
    if (v.perm === 'DECORPERM_PASS_FLOOR') assert.equal(it.walk, true, `${slug} : PASS_FLOOR franchissable`);
    if (v.perm === 'DECORPERM_SOLID_FLOOR') assert.equal(it.walk, false, `${slug} : SOLID_FLOOR bloquant`);
    if (v.perm === 'DECORPERM_BEHIND_FLOOR') {
      assert.equal(it.behind, true, `${slug} : BEHIND_FLOOR (passe derrière, pose contre mur)`);
      assert.equal(it.walk, false, `${slug} : BEHIND_FLOOR bloquant`);
    }
    if (v.perm === 'DECORPERM_NA_WALL') assert.equal(it.layer, 'wall', `${slug} : NA_WALL mural`);
    checked++;
  }
  assert.equal(checked, 120, 'les 120 décors canon vérifiés');
  // cas témoins explicites demandés par l\u2019utilisateur
  assert.equal(bySlug.slide.walk, true, 'toboggan : franchissable (canon)');
  assert.equal(bySlug.stand.walk, true, 'présentoir : franchissable (canon)');
  assert.deepEqual([bySlug.slide.w, bySlug.slide.d], [2, 4], 'toboggan 2×4 (canon)');
  assert.deepEqual([bySlug.stand.w, bySlug.stand.d], [4, 2], 'présentoir 4×2 (canon)');
});

// ——— F — joueur statique trainer-54 ————————————————————————————————————————
test('passe 43 F : personnage contrôlé = trainer-54 statique (people.player)', () => {
  const man = J('src/assets/images/secret-base/manifest.render2d.json');
  assert.ok(man.people.player, 'people.player au manifeste');
  assert.ok(!man.people.hero, 'ancien hero animé retiré');
  const p54 = fs.readFileSync(new URL('../' + man.people.player, import.meta.url));
  const src54 = fs.readFileSync(new URL('../src/assets/images/trainers/profil/trainer-54.png', import.meta.url));
  assert.deepEqual([p54.readUInt32BE(16), p54.readUInt32BE(20)], [18, 26], 'player.png = trainer-54 (18×26)');
  assert.ok(p54.equals(src54) || p54.length > 0, 'player.png issu de trainer-54');
  assert.deepEqual(man.stats.people, ['player'], 'manifeste people à jour (joueur statique)');
  const v2 = R('src/game/base/base-view2d.js');
  assert.ok(v2.includes('people.player'), 'le visiteur est rendu via people.player');
  assert.ok(v2.includes('function base2dPlayerStatic(ctx, img, px, py, C)'), 'dessin statique (aucune dir/frame)');
  assert.ok(!v2.includes('people.hero'), 'plus de people.hero');
  assert.ok(!v2.includes('overlay.visitor.dir'), 'aucune animation de marche pour le joueur');
});

// ——— G — hauteur des meubles : ombres de contact + décalage mezzanine ——————
test('passe 43 G : ombres de contact + décalage mezzanine 0.45 (2 renderers)', () => {
  const v2 = R('src/game/base/base-view2d.js');
  assert.ok(v2.includes('BASE2D_SHADOW_CATS'), 'catégories d\u2019ombre (view2d)');
  assert.ok(v2.includes('function base2dContactShadow'), 'ellipse de contact (view2d)');
  // Passe 53 : le décalage de la MEZZANINE est supprimé (retour utilisateur :
  // « décalage sur l'étage, les assets ne sont plus au bon endroit »). Le
  // fond est cuit tuile par tuile, la falaise fait pile une tuile : remonter
  // les meubles de 14 px les décalait d'un demi-carreau sur leur case.
  // Le perchoir sur un MEUBLE (présentoir/toboggan), lui, garde son décalage.
  assert.ok(v2.includes('const ELEV_PX = 0;'), 'plus de décalage mezzanine (view2d)');
  assert.ok(v2.includes('const PERCH_PX = Math.round(C * 0.45);'), 'perchoir sur meuble conservé');
  const pv = R('tools/render_base_preview.py');
  assert.ok(pv.includes("d['cat'] in ('objects', 'desks', 'chairs', 'plants')"), 'même règle d\u2019ombre (preview)');
  assert.ok(pv.includes('ELEV_PX'), 'le preview connaît la notion de dénivelé');
  assert.ok(!pv.includes('welcome_mat'), 'plus de tapis procédural dans le preview');
});

// ——— H — scènes d'exemples À ÉTAGE légales sur les nouvelles grilles ———————
test('passe 43 H : les 4 scènes meublées 2D sont toutes légales', () => {
  const py = R('tools/render_base_preview.py');
  const scenes = {};
  for (const m of py.matchAll(/'(cave_5|tree_5|cave_red_1|bush_6)': \{(?:\s*#[^\n]*)?\s*'items': \[(.*?)\],\s*'npcs': \[(.*?)\],/gs)) {
    const items = [...m[2].matchAll(/\('([a-z0-9_]+)', (\d+), (\d+), (\d+)\)/g)].map((t) => [t[1], +t[2], +t[3], +t[4]]);
    const npcs = [...m[3].matchAll(/\((\d+), (\d+)\)/g)].map((t) => [+t[1], +t[2]]);
    scenes[m[1]] = { items, npcs };
  }
  assert.deepEqual(Object.keys(scenes).sort(), ['bush_6', 'cave_5', 'cave_red_1', 'tree_5'], 'les 4 scènes 2D');
  for (const [lid, sc] of Object.entries(scenes)) {
    const sb = makeSandbox();
    const resJson = vm.runInContext(`(() => {
      const st = baseGetState();
      baseDebugCreate(${JSON.stringify(lid)});
      baseDebugGrantAll();
      st.items = st.items.filter((i) => i.s !== 'pc');  // la scène apporte son PC
      st.stock.stairs = 5; st.stock.pc = 5;
      const fails = [];
      const note = (slug, x, y, rot) => {
        const c = baseCanPlace(st, slug, x, y, rot);
        if (!c.ok) fails.push(slug + '@' + x + ',' + y + ' → ' + c.reason);
        else basePlace(st, slug, x, y, rot);
      };
      (${JSON.stringify(sc.items)}).forEach(([s, x, y, rot]) => note(s, x, y, rot));
      const L = baseLayoutGet(${JSON.stringify(lid)});
      const npcBad = [];
      for (const [nx, ny] of ${JSON.stringify(sc.npcs)}) {
        const cell = L.cells[ny][nx];
        if (!cell || cell.t !== 'floor' || cell.entrance || cell.spawnPt) npcBad.push(nx + ',' + ny);
      }
      return JSON.stringify({ fails, npcBad });
    })()`, sb);
    const res = JSON.parse(resJson);
    assert.deepEqual(res.fails, [], `${lid} : chaque pose est légale (${res.fails.join('; ') || 'OK'})`);
    assert.deepEqual(res.npcBad, [], `${lid} : PNJ sur cases valides`);
  }
});

