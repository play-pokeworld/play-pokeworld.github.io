import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

// ── Passe 45 : retours utilisateur ─────────────────────────────────────────
//  A. ESCALIER : sprite v8 cohérent avec la DA Émeraude (volée en perspective
//     à la palette du seul escalier canon du tileset, 0x263) — plus le motif
//     du présentoir répété.
//  B. TOBOGGAN : empreinte au sol = 6 cases (2×3), la rangée HAUTE devient un
//     surplomb purement visuel → on passe DERRIÈRE et on y pose des objets.
//  C. GABARITS à étage : redessinés façon ROSA (terrasses/baies/atriums), plus
//     de plateau rectangulaire plein.
//  D. PNJ : éditeur complet (créer/éditer/supprimer, équipe 1-6, import d'un
//     preset en instantané GELÉ).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
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
      body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
      head: { dataset: {} },
      documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
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
  for (const f of SANDBOX_FILES) {
    vm.runInContext(fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  return sandbox;
}

const BASE_NPC_FALLBACK = 'trainer-0';

const CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6',
  'cave_red_5', 'cave_red_6', 'cave_blue_5', 'cave_blue_6',
  'cave_yellow_5', 'cave_yellow_6'];

// ——— A — escalier v9 : bois, largeur constante ————————————————————————————
test('passe 46 A : escalier v9 — bois de la planche, largeur CONSTANTE', () => {
  const bake = R('tools/bake-emerald-bgs.py');
  const fn = bake.slice(bake.indexOf('def bake_stairs_sprite'), bake.indexOf('def bake_canon'));
  // ni le collage du motif présentoir (v7), ni le trapèze en perspective (v8)
  assert.ok(!/im\.paste\(SL/.test(fn), 'plus de collage du motif présentoir (v7)');
  assert.ok(!fn.includes('top_half'), 'plus de demi-largeurs variables (v8)');
  for (const cue of ['v9', 'LARGEUR CONSTANTE', 'solid_board', '2 COLONNES']) {
    assert.ok(fn.includes(cue), `baker : ${cue}`);
  }
  // palette bois — exactement celle de la planche solid_board
  for (const c of ['0xb4, 0xa4, 0x62', '0x94, 0x83, 0x41', '0x7b, 0x62, 0x20']) {
    assert.ok(fn.includes(c), `palette bois ${c}`);
  }
  const b = fs.readFileSync(new URL('../src/assets/images/secret-base/emerald/stairs.png', import.meta.url));
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20), b[25]], [32, 32, 6], 'stairs.png 32×32 RGBA');
});

// ——— B — toboggan : 6 cases au sol, surplomb visuel —————————————————————
test('passe 45 B : toboggan — empreinte 2×3 (6 cases) + surplomb visuel', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    const def = baseItemGet('slide');
    r.shape = [def.w, def.d];        // forme canon DESSINÉE : inchangée (2×4)
    r.over = def.over | 0;
    const fp = baseItemFootprint(def, 0);
    r.fp = [fp.w, fp.d];             // empreinte au SOL : 2×3 = 6 cases
    r.cells = fp.w * fp.d;
    r.draw = baseItemDrawOffset(def); // le sprite démarre 1 case plus haut
    // le présentoir, lui, n'a pas de surplomb
    const sfp = baseItemFootprint(baseItemGet('stand'), 0);
    r.standFp = [sfp.w, sfp.d];
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.shape, [2, 4], 'forme canon dessinée conservée (2×4)');
  assert.equal(out.over, 1, 'une rangée de surplomb');
  assert.deepEqual(out.fp, [2, 3], 'empreinte au sol 2×3');
  assert.equal(out.cells, 6, 'SIX cases au sol (retour utilisateur), pas huit');
  assert.deepEqual(out.draw, { dx: 0, dy: -1 }, 'sprite décalé d’une case vers le haut');
  assert.deepEqual(out.standFp, [4, 2], 'présentoir inchangé (pas de surplomb)');
});

test('passe 45 B2 : on marche DERRIÈRE le toboggan et on y pose un objet', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    const r = {};
    const put = basePlace(st, 'slide', 3, 2, 0);   // empreinte y2..y4
    r.placed = put.ok === true;
    const g = baseBuildGrid(st);
    // les deux cases sous le carter (y=1) ne sont PAS occupées
    r.behind = [baseCellWalkable(st, g, 3, 1, null), baseCellWalkable(st, g, 4, 1, null)];
    // …et on peut y POSER un objet (l'effet de hauteur, demande utilisateur)
    r.canPut = baseCanPlace(st, 'small_chair', 3, 1, 0).ok === true;
    // les 6 cases de l'empreinte sont bien prises par le toboggan
    let owned = 0;
    for (let y = 2; y <= 4; y++) for (let x = 3; x <= 4; x++) if (g.occ[y][x] === put.uid) owned++;
    r.owned = owned;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.placed, true, 'toboggan posé');
  assert.deepEqual(out.behind, [true, true], 'les 2 cases derrière restent franchissables');
  assert.equal(out.canPut, true, 'un objet peut être posé DERRIÈRE le toboggan');
  assert.equal(out.owned, 6, 'le toboggan occupe exactement 6 cases');
});

// ——— C — gabarits à étage redessinés façon ROSA ——————————————————————————
test('passe 51 C : deux salles reliées par un couloir, porte épaulée, tuiles qui bouclent', () => {
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  assert.deepEqual(Object.keys(grids).sort(), CUSTOM.slice().sort(), 'les 12 gabarits perso');
  for (const [lid, rows] of Object.entries(grids)) {
    const h = rows.length, w = rows[0].length;
    const at = (x, y) => (rows[y] && rows[y][x]) || '#';
    // (1) UNE seule entrée, sur le bord sud
    assert.equal((rows.join('').match(/E/g) || []).length, 1, `${lid} : une seule entrée`);
    assert.ok(rows[h - 1].includes('E'), `${lid} : porte au sud`);
    // (2) Passe 53 : PLUS d'épaulement étranglé. Le canon (cave_1) garde ses
    // trois dernières rangées DROITES et la porte est un simple trou dans le
    // mur du bas. Les marches simultanées des deux côtés créaient des coins
    // concaves face à face que l'autotiling ne sait pas raccorder.
    const sy = h - 2;
    let lw = 0; while (lw < w && rows[sy][lw] === '#') lw++;
    let rw = 0; while (rw < w && rows[sy][w - 1 - rw] === '#') rw++;
    assert.equal(lw, rw, `${lid} : bords symétriques (${lw} vs ${rw})`);
    const spawnW = [...rows[sy]].filter((c) => c !== '#').length;
    assert.ok(spawnW >= 5, `${lid} : rangée du spawn large (${spawnW})`);
    const prof = [h - 4, h - 3, h - 2].map((y) => {
      const xs = [...rows[y]].map((c, i) => (c === '#' ? -1 : i)).filter((i) => i >= 0);
      return xs[0] + ':' + xs[xs.length - 1];
    });
    assert.equal(new Set(prof).size, 1, `${lid} : 3 rangées droites avant la porte (${prof})`);
    // (3) la pièce n'est PAS un rectangle : au moins 3 largeurs distinctes
    const widths = new Set();
    for (let y = 1; y < h - 1; y++) {
      const n = [...rows[y]].filter((c) => c !== '#').length;
      if (n) widths.add(n);
    }
    assert.ok(widths.size >= 3, `${lid} : vraies formes (largeurs ${[...widths].sort((a, b) => a - b)})`);
    // (4) un COULOIR étroit relie les deux salles
    const maxW = Math.max(...widths), minW = Math.min(...widths);
    assert.ok(minW <= maxW - 3, `${lid} : couloir nettement plus étroit que les salles`);
    // (5) la falaise est bordée par les murs de la salle haute (elle « boucle »)
    let cliffRow = -1;
    for (let y = 0; y < h; y++) if (rows[y].includes('=')) { cliffRow = y; break; }
    assert.ok(cliffRow > 0, `${lid} : falaise présente`);
    // (6) raccords propres : aucun mur isolé, aucune diagonale orpheline
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (rows[y][x] !== '#') continue;
      const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => at(x + dx, y + dy) === '#').length;
      assert.ok(n4 > 0, `${lid} : mur isolé en (${x},${y})`);
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const orphan = at(x + dx, y + dy) === '#' && at(x + dx, y) !== '#' && at(x, y + dy) !== '#';
        assert.ok(!orphan, `${lid} : diagonale orpheline en (${x},${y})`);
      }
    }
    assert.ok(E(`src/assets/images/secret-base/bg/emerald/${lid}.png`), `fond ${lid}`);
  }
});

// ——— D — éditeur de PNJ ———————————————————————————————————————————————————
test('passe 47 D : PNJ — créer, éditer, supprimer, plafonner', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    r.max = BASE_NPC_MAX;
    r.spriteCount = BASE_NPC_SPRITES.length;
    r.allTrainers = BASE_NPC_SPRITES.every((s) => /^trainer-\\d+$/.test(s));
    const c = baseNpcCreate(st, { name: 'Rival Léo', sprite: 'trainer-12',
      team: [{ id: 25, level: 30 }, { id: 6, level: 32 }],
      msgs: { pre: 'En garde !', win: 'Gagné !', lose: 'Perdu…' } });
    r.created = c.ok === true;
    const npc = baseNpcFind(st, c.id);
    r.name = npc.name; r.sprite = npc.sprite; r.team = npc.team.length;
    // passe 47 : un PNJ tout neuf peut être posé SANS équipe (décor tant qu'il
    // n'est pas configuré) — c'est la voie « objet PNJ » du stock.
    r.empty = baseNpcCreate(st, { name: 'Vide', sprite: 'trainer-0', team: [] });
    // édition
    const u = baseNpcUpdate(st, c.id, { name: 'Rival Théo', team: [{ id: 9, level: 40 }] });
    r.updated = u.ok === true;
    const npc2 = baseNpcFind(st, c.id);
    r.newName = npc2.name; r.newTeam = npc2.team.map((p) => p.id + '@' + p.level);
    baseNpcUpdate(st, c.id, { team: [{ id: 25, level: 999 }] });
    r.clamped = baseNpcFind(st, c.id).team[0].level;
    // plafond
    let guard = 0;
    while (baseNpcCreate(st, { name: 'P', sprite: 'trainer-0', team: [] }).ok && guard++ < 50) {}
    r.capped = baseNpcCount(st);
    r.overflow = baseNpcCreate(st, { name: 'trop', sprite: 'trainer-0', team: [] });
    r.deleted = baseNpcDelete(st, c.id);
    r.after = baseNpcCount(st);
    return JSON.stringify(r);
  })()`, sb));
  assert.ok(out.spriteCount >= 30, `beaucoup d'allures disponibles (${out.spriteCount})`);
  assert.equal(out.allTrainers, true, 'les allures sont des sprites images/trainers/profil');
  assert.equal(out.created, true, 'PNJ créé');
  assert.equal(out.name, 'Rival Léo', 'nom conservé');
  assert.equal(out.sprite, 'trainer-12', 'allure conservée');
  assert.equal(out.team, 2, 'équipe de 2');
  assert.equal(out.empty.ok, true, 'PNJ posable sans équipe (configuré ensuite)');
  assert.equal(out.updated, true, 'édition acceptée');
  assert.equal(out.newName, 'Rival Théo', 'nom modifié');
  assert.deepEqual(out.newTeam, ['9@40'], 'équipe remplacée');
  assert.equal(out.clamped, 100, 'niveau borné à 100');
  assert.equal(out.capped, out.max, `plafond ${out.max} PNJ atteint`);
  assert.equal(out.overflow.ok, false, 'création refusée au-delà du plafond');
  assert.equal(out.overflow.reason, 'base.err.npc_max', 'raison plafond');
  assert.equal(out.deleted, true, 'suppression effective');
  assert.equal(out.after, out.max - 1, 'compteur décrémenté');
});

test('passe 45 D2 : import d’un preset = instantané GELÉ (export autosuffisant)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    // équipe active du joueur
    G.team = [{ id: 25, level: 40, moves: [{ id: 'thunderbolt' }], shinyActive: true },
              { id: 3, level: 42, moves: [] }];
    const t1 = baseNpcTeamFromPreset('active');
    r.fromActive = t1.map((p) => p.id + '@' + p.level);
    r.moves = t1[0].moves;
    r.shiny = t1[0].shiny;
    const c = baseNpcCreate(st, { name: 'Garde', sprite: 'boy', team: t1 });
    r.ok = c.ok === true;
    // ► le PNJ ne doit PAS suivre les changements ultérieurs de l'équipe
    G.team[0].level = 99;
    G.team.length = 1;
    const npc = baseNpcFind(st, c.id);
    r.frozen = npc.team.map((p) => p.id + '@' + p.level);
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.fromActive, ['25@40', '3@42'], 'équipe active importée');
  assert.deepEqual(out.moves, ['thunderbolt'], 'attaques copiées');
  assert.equal(out.shiny, true, 'chromatique copié');
  assert.equal(out.ok, true, 'copain créé depuis le preset');
  assert.deepEqual(out.frozen, ['25@40', '3@42'],
    'INSTANTANÉ GELÉ : modifier son équipe ne change pas le copain');
});

test('passe 47 D3 : éditeur câblé — objet PNJ, bouton Modifier, i18n « PNJ »', () => {
  assert.ok(E('src/game/base/base-npc-editor.js'), 'module présent');
  const mod = R('src/game/base/base-npc-editor.js');
  for (const fn of ['openBaseNpcEditor', 'baseNpcEditorSave', 'baseNpcEditorDelete',
    'baseNpcEditorPick', 'baseNpcEditorPickChoose', 'baseNpcEditorPickItem',
    'baseNpcEditorEquipItem', 'baseNpcEditorClearItem', 'baseNpcEditorSetSprite']) {
    assert.ok(mod.includes(`window.${fn} = ${fn};`), `exposé : ${fn}`);
  }
  assert.ok(R('src/loader.js').includes('src/game/base/base-npc-editor.js'), 'chargé par le loader');
  // le PNJ est un OBJET du stock, et « Modifier » n'existe qu'à la sélection
  assert.ok(R('index.html').includes('data-action="base-ed-npc-edit"'), 'bouton Modifier');
  assert.ok(R('src/file-postboot.js').includes("'base-ed-npc-edit'"), 'action Modifier câblée');
  assert.ok(R('src/file-postboot.js').includes("'base-ed-select-npc-new'"), 'objet PNJ du stock câblé');
  assert.ok(R('src/game/base/base-editor.js').includes('baseEditorSelectNpcNew'), 'prise de l’objet PNJ');
  assert.ok(R('src/game/base/base-core.js').includes('baseNpcPlaceNew'), 'pose directe d’un PNJ');
  // plus de « vivier » / roster
  assert.ok(!E('src/data/base-npcs-data.js'), 'fichier roster supprimé');
  assert.ok(!R('src/loader.js').includes('base-npcs-data'), 'roster retiré du loader');
  assert.ok(!R('src/game/base/base-debug.js').includes('baseDebugAddNpcRoster'), 'debug roster retiré');
  // l'éditeur d'équipe réutilise EXACTEMENT les briques des presets
  for (const cue of ['generatePokeCardHTML', 'preset-pick-row', 'preset-pick-list',
    'dict-search', 'pw-drop-zone preset-slot-empty', 'onLeftClickItem']) {
    assert.ok(mod.includes(cue), `brique preset réutilisée : ${cue}`);
  }
  // terminologie : « PNJ » / « NPC », jamais « copain » / « pal »
  const fr = R('src/localization/fr/base.js');
  const en = R('src/localization/en/base.js');
  assert.ok(!/[Cc]opain/.test(fr), 'aucun « copain » en FR');
  assert.ok(!/\bpals?\b|\bPal\b/.test(en.replace(/"pals":/g, '')), 'aucun « pal » en EN');
  // les libellés sont stockés échappés (\u00c9diteur…) : on lit la valeur décodée
  const loadLoc = (p2) => {
    const sbx = { window: {} }; sbx.globalThis = sbx;
    vm.createContext(sbx); vm.runInContext(R(p2), sbx, { filename: p2 });
    return sbx.window[Object.keys(sbx.window)[0]];
  };
  assert.equal(loadLoc('src/localization/fr/base.js').npced.title, 'Éditeur de PNJ', 'titre FR');
  assert.equal(loadLoc('src/localization/en/base.js').npced.title, 'NPC editor', 'titre EN');
  const keys = (p2) => {
    const s2 = R(p2);
    const k = s2.indexOf('"npced":{');
    return [...s2.slice(k, s2.indexOf('\n},', k)).matchAll(/^"(\w+)":/gm)].map((m) => m[1]).sort();
  };
  assert.deepEqual(keys('src/localization/fr/base.js'), keys('src/localization/en/base.js'),
    'FR et EN ont exactement les mêmes clés');
});

test('passe 47 E : allures = VRAIS portraits images/trainers/profil', () => {
  const sb = makeSandbox();
  const sprites = JSON.parse(vm.runInContext('JSON.stringify(BASE_NPC_SPRITES)', sb));
  assert.ok(sprites.length >= 30, `au moins 30 allures (${sprites.length})`);
  for (const s of sprites) {
    assert.match(s, /^trainer-\d+$/, `allure ${s} = sprite de dresseur`);
    assert.ok(E(`src/assets/images/trainers/profil/${s}.png`), `fichier ${s}.png présent`);
  }
  // plus aucune feuille procédurale « people » pour les PNJ
  const core = R('src/game/base/base-core.js');
  assert.ok(core.includes('baseNpcSpriteUrl'), 'helper d’URL de portrait');
  assert.ok(core.includes('images/trainers/profil'), 'chemin des vrais portraits');
  assert.ok(!/'boy', 'girl', 'sailor', 'scholar'/.test(core), 'anciennes feuilles retirées');
  const v2 = R('src/game/base/base-view2d.js');
  assert.ok(v2.includes('base2dNpcPortrait'), 'le renderer charge les portraits');
});

test('passe 46 F : équipe de PNJ = Pokémon RÉELS, niveau repris (aucune saisie)', () => {
  const mod = R('src/game/base/base-npc-editor.js');
  // plus aucun champ de saisie de niveau / d'espèce
  assert.ok(!/data-change-args="\$\{i\}, 'level'/.test(mod), 'plus de champ de niveau');
  assert.ok(!/data-change-args="\$\{i\}, 'id'/.test(mod), 'plus de champ d\u2019espèce');
  assert.ok(!mod.includes('baseNpcEditorSetMon'), 'setter de niveau supprimé');
  // l'UI réutilise EXACTEMENT les briques des presets / de l'Atoll
  for (const cue of ['generatePokeCardHTML', 'preset-pick-row', 'preset-pick-list',
    'dict-search', 'pw-drop-zone preset-slot-empty', 'preset-pick-tag']) {
    assert.ok(mod.includes(cue), `réutilise la brique preset : ${cue}`);
  }
  // le niveau vient du Pokémon choisi
  assert.ok(/level:\s*Math\.min\(100, Math\.max\(1, p\.level/.test(mod), 'niveau copié du Pokémon réel');
  assert.ok(mod.includes('_bnCandidates'), 'candidats = équipe + boîte PC');
});

test('passe 46 G : PNJ posables comme des objets + abordables au clic', () => {
  const ed = R('src/game/base/base-editor.js');
  // pose/déplacement en UN clic, comme les meubles
  assert.ok(ed.includes('moveNpc'), 'copain tenu à la souris');
  assert.ok(ed.includes("type: 'move_npc_start'"), 'prise en main directe');
  assert.ok(ed.includes("type: 'move_npc'"), 'repose sur la case cliquée');
  assert.ok(ed.includes('_baseEd.npcId || _baseEd.moveNpc'), 'fantôme de pose partagé');
  // clic à distance : on marche jusqu'au copain puis on interagit
  assert.ok(ed.includes('visitPending'), 'interaction différée à l\u2019arrivée');
  assert.ok(ed.includes("approach: 'npc'"), 'approche d\u2019un copain');
  assert.ok(R('src/game/base/base-window.js').includes('r.interact'), 'la fenêtre affiche l\u2019interaction');
  // approche par le côté le plus court (devant / derrière / à côté)
  assert.ok(/s\.length < best\.length/.test(ed), 'approche la plus courte parmi les 4 côtés');
});

test('passe 47 H : allure inconnue → repli sûr, allure valide conservée', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    const r = {};
    const c = baseNpcCreate(st, { name: 'Test', sprite: 'trainer-24', team: [{ id: 25, level: 30 }] });
    r.ok = c.ok === true;
    r.sprite = baseNpcFind(st, c.id).sprite;
    const c2 = baseNpcCreate(st, { name: 'T2', sprite: 'pikachu_costume', team: [] });
    r.fallback = baseNpcFind(st, c2.id).sprite;
    baseNpcUpdate(st, c.id, { sprite: 'trainer-45' });
    r.updated = baseNpcFind(st, c.id).sprite;
    r.url = baseNpcSpriteUrl('trainer-45');
    r.urlBad = baseNpcSpriteUrl('nawak');
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.ok, true, 'PNJ créé avec une allure de dresseur');
  assert.equal(out.sprite, 'trainer-24', 'allure conservée');
  assert.equal(out.fallback, BASE_NPC_FALLBACK, 'allure inconnue → repli sûr');
  assert.equal(out.updated, 'trainer-45', 'changement d’allure appliqué');
  assert.equal(out.url, 'src/assets/images/trainers/profil/trainer-45.png', 'URL du portrait');
  assert.equal(out.urlBad, `src/assets/images/trainers/profil/${BASE_NPC_FALLBACK}.png`, 'URL de repli');
});

// ——— I — résolution du clic EN HAUTEUR (retour utilisateur passe 47) ———————
test('passe 51 I : les cases HAUTES du toboggan sont cliquables et sélectionnables', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    // empreinte (3,3)-(4,5) ; le CARTER dessiné occupe (3,2)-(4,2)
    const put = basePlace(st, 'slide', 3, 3, 0);
    const C = 32;
    const r = { uid: put.uid, cells: [], sels: [] };
    // un clic au centre de chaque case ÉCRAN de la colonne 3
    for (let y = 2; y <= 5; y++) {
      const cell = baseEditorCellResolve(st, 3 * C + C / 2, y * C + C / 2);
      r.cells.push(cell.x + ',' + cell.y);
      const sel = baseEditorSelAt(st, cell.x, cell.y);
      r.sels.push(sel ? sel.kind + ':' + sel.uid : null);
    }
    // une case de sol franche reste elle-même
    r.floor = baseEditorCellResolve(st, 8 * C + C / 2, 1 * C + C / 2);
    return JSON.stringify(r);
  })()`, sb));
  // Retour utilisateur : « les deux cases en haut doivent pouvoir être
  // cliquées SANS avoir d'empreinte au sol ». Le clic vise donc la case
  // haute elle-même (3,2), plus la 1re rangée de l'empreinte.
  assert.deepEqual(out.cells, ['3,2', '3,3', '3,4', '3,5'],
    'chaque case écran vise sa propre cellule, surplomb compris');
  assert.deepEqual(out.sels, Array(4).fill('item:' + out.uid),
    'les 4 cases — dont le surplomb — sélectionnent bien le toboggan');
  assert.deepEqual(out.floor, { x: 8, y: 1 }, 'une case de sol reste elle-même');
});

test('passe 50 I2 : on monte SUR les 2 cases hautes du toboggan (hors empreinte)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    // empreinte (3,3)-(4,5) ; le CARTER dessiné occupe (3,2)-(4,2)
    basePlace(st, 'slide', 3, 3, 0);
    const r = {};
    // 1) les deux cases hautes sont des cases PERCHÉES du toboggan
    r.topZone = [!!baseZoneTopAt(st, 3, 2), !!baseZoneTopAt(st, 4, 2)];
    // 2) on y accède réellement depuis le spawn
    const s1 = baseVisitCreate(st);
    r.toLeft = baseVisitSetDestination(s1, 3, 2) ? 1 : 0;
    while (s1.path.length) baseVisitStepAlong(s1);
    r.posLeft = s1.pos; r.elevLeft = s1.subElev;
    // 3) on traverse le haut d'un bord à l'autre
    r.cross = baseVisitSetDestination(s1, 4, 2) ? 1 : 0;
    while (s1.path.length) baseVisitStepAlong(s1);
    r.posRight = s1.pos;
    // 4) de là, la glissière ramène au tapis
    r.toRamp = baseVisitSetDestination(s1, 4, 3) ? 1 : 0;
    while (s1.path.length) baseVisitStepAlong(s1);
    r.after = s1.pos;
    r.slides = s1.log.filter((e) => e.fx === 'slide').length;
    // 5) aucune case morte dans toute la forme dessinée
    r.blocked = [];
    for (let y = 2; y <= 5; y++) for (let x = 3; x <= 4; x++) {
      if (baseZoneBlockedAt(st, x, y)) r.blocked.push(x + ',' + y);
    }
    // 6) jamais de remontée : depuis le tapis (4,5), la glissière (4,4) et le
    //    haut du toboggan (4,2) restent inatteignables à pied.
    r.upRamp = baseVisitSetDestination(s1, 4, 4);
    r.upTop = baseVisitSetDestination(s1, 3, 2) ? 1 : 0;   // via l'escalier
    return JSON.stringify(r);
  })()`, sb));
  assert.deepEqual(out.topZone, [true, true], 'les 2 cases hautes sont perchées sur le toboggan');
  assert.equal(out.toLeft, 1, 'la case haute gauche est ATTEIGNABLE');
  assert.deepEqual(out.posLeft, { x: 3, y: 2 }, 'on monte bien dessus');
  assert.equal(out.elevLeft, 1, 'perché (subElev 1)');
  assert.equal(out.cross, 1, 'on traverse le haut du toboggan');
  assert.deepEqual(out.posRight, { x: 4, y: 2 }, 'case haute droite atteinte');
  assert.equal(out.toRamp, 1, 'la glissière s’aborde depuis le haut');
  assert.deepEqual(out.after, { x: 4, y: 5 }, 'la glissade dépose sur le tapis');
  assert.equal(out.slides, 1, 'un seul événement de glissade');
  assert.deepEqual(out.blocked, [], 'aucune case morte');
  // Depuis le tapis, on ressort par le sol, on reprend l'escalier et on
  // REDESCEND la glissière : le chemin passe donc par le palier (4,3) AVANT
  // (4,4) — jamais l'inverse. C'est le sens unique attendu.
  const path = out.upRamp || [];
  const iLanding = path.findIndex((s2) => s2.x === 4 && s2.y === 3);
  const iRamp = path.findIndex((s2) => s2.x === 4 && s2.y === 4);
  assert.ok(iRamp < 0 || (iLanding >= 0 && iLanding < iRamp),
    'la glissière n’est empruntée que du HAUT vers le bas');
  // (le haut RESTE accessible — par l'escalier intégré : c'est justement ce
  //  que demandait l'utilisateur ; seule la glissière est à sens unique)
  assert.ok(out.upTop, 'le haut du toboggan reste accessible par l’escalier');
});

// ——— J — Z-buffer : profondeur entre objets, PNJ et joueur ————————————————
test('passe 47 J : rendu trié en profondeur (PNJ derrière/devant les objets)', () => {
  const v2 = R('src/game/base/base-view2d.js');
  // une SEULE passe fusionnée objets + PNJ + visiteur
  assert.ok(v2.includes('depthOf'), 'clé de profondeur');
  assert.ok(v2.includes('draws.sort((a, b) => a.z - b.z)'), 'tri par profondeur');
  assert.ok(v2.includes("kind: 'npc'") && v2.includes("kind: 'visitor'") && v2.includes("kind: 'item'"),
    'objets, PNJ et visiteur dans la même liste');
  // le visiteur n'est plus dessiné après coup dans l'overlay : la fonction
  // base2dOverlay ne peint plus le joueur (elle ne garde que fantôme/chemin/
  // survol/sélection) — il est peint dans la passe triée, plus haut.
  const ovStart = v2.indexOf('function base2dOverlay');
  const ov = v2.slice(ovStart, v2.indexOf('\nwindow.', ovStart));
  assert.ok(!ov.includes('base2dPlayerStatic'), 'le visiteur n’est plus peint par-dessus tout');
  assert.ok(/passe 47 . il n'est PLUS dessiné ici/.test(v2), 'commentaire explicite');
  // la profondeur d'un objet = sa rangée BASSE (le pied), pas son origine.
  // Passe 52 : une poupée/coussin (couche « surface ») prend le pied de son
  // PORTEUR — sinon elle passait DERRIÈRE un grand tapis 3×3 (retour
  // utilisateur : « les poupées se mettent derrière les tapis »).
  assert.ok(v2.includes('(it.y + fp.d - 1)'), 'profondeur = pied de l’objet');
  assert.ok(v2.includes('carrierFootRow'), 'une poupée est peinte après son porteur');
});

// ——— K — retours passe 48 ————————————————————————————————————————————————
test('passe 48 K : tentes — on ne passe QUE par la colonne du milieu', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_5');
    baseDebugGrantAll();
    st.items = st.items.filter((i) => i.s !== 'pc');
    const L = baseLayoutGet('cave_5');
    let at = null;
    for (let y = 0; y < L.h && !at; y++) for (let x = 0; x < L.w; x++) {
      if (baseCanPlace(st, 'red_tent', x, y, 0).ok) { at = { x, y }; break; }
    }
    basePlace(st, 'red_tent', at.x, at.y, 0);
    const g = baseBuildGrid(st);
    const rows = [];
    for (let dy = 0; dy < 3; dy++) {
      let r = '';
      for (let dx = 0; dx < 3; dx++) r += baseCellWalkable(st, g, at.x + dx, at.y + dy, null) ? '.' : '#';
      rows.push(r);
    }
    return JSON.stringify({ rows });
  })()`, sb));
  // canon RSE : colonnes gauche/droite = toile, colonne centrale = la porte
  assert.deepEqual(out.rows, ['#.#', '#.#', '#.#'],
    'seule la colonne centrale de la tente est franchissable');
});

test('passe 48 K2 : un personnage DEBOUT sur un objet est peint APRÈS lui', () => {
  const v2 = R('src/game/base/base-view2d.js');
  assert.ok(v2.includes('charDepth'), 'profondeur dédiée aux personnages');
  // la profondeur d'un personnage porté remonte au PIED de l'objet porteur
  assert.ok(v2.includes('row = Math.max(row, it.y + fp.d - 1)'),
    'personnage sur un objet marchable → profondeur du porteur');
  assert.ok(v2.includes('charDepth(n.x, n.y)'), 'appliqué aux PNJ');
  assert.ok(v2.includes('charDepth(vis.x, vis.y)'), 'appliqué au visiteur');
});

test('passe 48 K3 : sélecteur de Pokémon = la VRAIE boîte PC (presets ET PNJ)', () => {
  const sel = R('src/game/boxes/box-selector.js');
  assert.ok(sel.includes("startsWith('preset_slot_')"), 'mode preset dans le sélecteur unifié');
  assert.ok(sel.includes("startsWith('basenpc_slot_')"), 'mode PNJ dans le sélecteur unifié');
  const pm = R('src/game/display/preset-manager.js');
  assert.ok(pm.includes("openUnifiedSelectorModal('preset_slot_'"),
    'les presets ouvrent la boîte PC');
  const ne = R('src/game/base/base-npc-editor.js');
  assert.ok(ne.includes("openUnifiedSelectorModal('basenpc_slot_'"),
    'les PNJ ouvrent la boîte PC');
  assert.ok(ne.includes('window.baseNpcEditorAcceptPick'), 'retour du sélecteur câblé');
});

// ——— L — retours passe 49 ————————————————————————————————————————————————
test('passe 49 L : tous les objets du catalogue ont un sprite (plus de 404)', () => {
  // on ÉVALUE le catalogue (le fichier n'a pas un format regex-able fiable)
  const sbx = { window: {}, console, document: { createElement: () => ({}), getElementById: () => null } };
  sbx.globalThis = sbx; vm.createContext(sbx);
  for (const f of ['src/data/items-data.js', 'src/data/items-helpers.js']) {
    try { vm.runInContext(R(f), sbx, { filename: f }); } catch (_) { /* deps UI absentes */ }
  }
  const keys = Object.keys(sbx.window.ITEMS || sbx.ITEMS || {});
  assert.ok(keys.length > 200, `catalogue conséquent (${keys.length})`);
  // Les CT/CS (`ct_*`, `cs_*`, `ct01…`) sont servies par une disquette PAR TYPE
  // (tm_<type>.png) — getItemSpriteUrl les route explicitement, elles n'ont donc
  // pas de PNG propre. Tout le RESTE doit exister sur le disque.
  const isTm = (k) => /^(ct|cs)(\d|_)/.test(k);
  const missing = keys.filter((k) => !isTm(k) && !E(`src/assets/images/items/${k}.png`));
  assert.deepEqual(missing, [], 'aucun objet sans PNG (getItemSpriteUrl fabrique l’URL)');
  // et les 18 disquettes de type sont bien là
  for (const ty of ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
    'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon',
    'dark', 'steel', 'fairy']) {
    assert.ok(E(`src/assets/images/items/tm_${ty}.png`), `disquette tm_${ty}`);
  }
  assert.ok(E('tools/fetch-item-sprites.py'), 'outil de (re)téléchargement présent');
});

test('passe 49 L2 : sélecteur d’objet tenu = le SAC, partout', () => {
  const tu = R('src/game/display/team-ui.js');
  assert.ok(tu.includes('function openHeldItemPickerFor'), 'sélecteur générique');
  assert.ok(tu.includes('window._equipCallback'), 'réutilise le flux du sac');
  assert.ok(R('src/game/display/preset-manager.js').includes('openHeldItemPickerFor'),
    'presets : objet via le sac');
  assert.ok(R('src/game/base/base-npc-editor.js').includes('openHeldItemPickerFor'),
    'PNJ : objet via le sac');
});

test('passe 49 L3 : cartes de preset — les Pokémon de BOÎTE ne sont plus grisés', () => {
  const pm = R('src/game/display/preset-manager.js');
  assert.ok(pm.includes('isFainted: inTeam && found.p.currentHP <= 0'),
    'seuls les membres de l’équipe active peuvent être marqués K.O.');
});

test('passe 50 L4 : glisser-déposer UNIFIÉ (équipe, presets et PNJ)', () => {
  const tu = R('src/game/display/team-ui.js');
  // un SEUL mécanisme : le handler délégué de l'équipe, avec un contexte
  assert.ok(tu.includes('function installMoveDragDrop'), 'handler unique');
  assert.ok(tu.includes('function pwSetMoveDragContext'), 'contexte pluggable');
  assert.ok(tu.includes('_pwDragSwapMoves'), 'échange d’attaques via le contexte');
  assert.ok(tu.includes('_pwDragSwapPokes'), 'échange de Pokémon via le contexte');
  // les PNJ ne réimplémentent RIEN : ils déclarent juste le contexte
  const ne = R('src/game/base/base-npc-editor.js');
  assert.ok(ne.includes('pwSetMoveDragContext('), 'PNJ : contexte déclaré');
  assert.ok(ne.includes('installMoveDragDrop('), 'PNJ : handler unique installé');
  assert.ok(!ne.includes('moveDragAttr'), 'PNJ : plus d’attribut de drag maison');
  assert.ok(ne.includes('pwClearMoveDragContext'), 'PNJ : contexte libéré à la fermeture');
  // idem pour les presets
  const pm = R('src/game/display/preset-manager.js');
  assert.ok(pm.includes('pwSetMoveDragContext('), 'presets : contexte déclaré');
  assert.ok(pm.includes('installMoveDragDrop('), 'presets : handler unique installé');
  assert.ok(pm.includes('presetEditorSwapMove'), 'presets : échange d’attaques');
});

test('passe 49 L5 : on passe SOUS la tente, on monte SUR le toboggan', () => {
  const v2 = R('src/game/base/base-view2d.js');
  assert.ok(v2.includes('WALK_UNDER'), 'objets sous lesquels on passe');
  assert.ok(v2.includes('CLIMB_ON'), 'objets sur lesquels on monte');
  assert.ok(/WALK_UNDER = \{ red_tent: 1, blue_tent: 1 \}/.test(v2), 'les tentes se traversent par-dessous');
  // Passe 52 : solid_board rejoint la liste — debout sur la case HAUTE d'une
  // planche 1×2, le personnage passait DERRIÈRE elle (retour utilisateur).
  assert.ok(/CLIMB_ON = \{ slide: 1, stand: 1, stairs: 1, solid_board: 1 \}/.test(v2),
    'toboggan/présentoir/escalier/planche se montent');
  // …et le test de recouvrement porte sur la forme DESSINÉE (surplomb inclus),
  // sinon le carter du toboggan — où l'on marche — sortait du calcul.
  assert.ok(v2.includes('const top = it.y - over;'), 'le surplomb « over » compte comme du dessus');
});

test('passe 49 L6 : la résolution en hauteur ne gêne plus la POSE', () => {
  const ed = R('src/game/base/base-editor.js');
  assert.ok(ed.includes('const placing ='), 'détection du mode pose');
  assert.ok(ed.includes('if (placing) return { x: base.x, y: base.y };'),
    'en pose, le clic vise la case réellement survolée (plus de refus « mur »)');
});

test('passe 49 L7 : un PNJ se déplace en UN clic, comme un meuble', () => {
  const ed = R('src/game/base/base-editor.js');
  const seg = ed.slice(ed.indexOf("if (sel.kind === 'npc')"), ed.indexOf("if (sel.kind === 'npc')") + 900);
  assert.ok(seg.includes('baseNpcPickup'), 'prise en main immédiate');
  assert.ok(!seg.includes('_baseEd.selNpc === sel.id'), 'plus de double clic requis');
  assert.ok(seg.includes('_baseEd.selNpc = sel.id'), '« Modifier » reste accessible');
});

// ——— M — retours passe 50 ————————————————————————————————————————————————
test('passe 50 M : disquettes CT/CS = vrais sprites PokeChill (plus de pastilles)', () => {
  const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
    'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon',
    'dark', 'steel', 'fairy'];
  for (const ty of TYPES) {
    const p = `src/assets/images/items/tm_${ty}.png`;
    assert.ok(E(p), `disquette ${ty} présente`);
    const b = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    // les placeholders générés faisaient 40×40 ; les vraies disquettes 32×32
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.deepEqual([w, h], [32, 32], `${ty} : vrai sprite PokeChill (32×32), pas une pastille 40×40`);
  }
  assert.ok(E('tools/repair-tm-sprites.py'), 'outil de réparation des disquettes');
  // Passe 55 : sécurité placeholder SUPPRIMÉE à la demande utilisateur — plus de pastilles générées
  // Les vrais sprites PokeChill sont exigés, pas de repli
  const dl = R('tools/download_assets.py');
  assert.ok(dl.includes('download_item_overrides()'), 'téléchargement des disquettes présent');
  // L'ancien code générait une pastille 40×40 si le téléchargement échouait — désormais supprimé
  assert.ok(!dl.includes("make_placeholder(out, 'TM'"), 'plus de génération de pastille TM (sécurité supprimée)');
  assert.ok(dl.includes('[SANS PLACEHOLDER]'), 'log sans placeholder présent');
});

test('passe 50 M2 : les sources d’assets sont toutes déclarées et vérifiables', () => {
  assert.ok(E('tools/check-asset-sources.py'), 'outil de vérification des sources');
  const chk = R('tools/check-asset-sources.py');
  for (const src of ['PokeChill', 'PokeAPI', 'Pokéclicker', 'Poképédia', 'pret/pokeemerald']) {
    assert.ok(chk.includes(src), `source déclarée : ${src}`);
  }
  // la disquette CT fait bien partie des contrôles (c'est ce qui manquait)
  assert.ok(chk.includes('img/items/tmNormal.png'), 'contrôle des disquettes CT');
});

// ——— N — retours passe 51 ————————————————————————————————————————————————
test('passe 51 N : Baie Prine, Améliorator et les 18 pierres Z ont un VRAI sprite', () => {
  const KEYS = ['prine_berry', 'upgrade',
    'normalium_z', 'firium_z', 'waterium_z', 'grassium_z', 'electrium_z', 'icium_z',
    'fightinium_z', 'poisonium_z', 'groundium_z', 'flyinium_z', 'psychium_z',
    'buginium_z', 'rockium_z', 'ghostium_z', 'dragonium_z', 'darkinium_z',
    'steelium_z', 'fairium_z'];
  const sig = new Map();
  for (const k of KEYS) {
    const p = `src/assets/images/items/${k}.png`;
    assert.ok(E(p), `${k} : sprite présent`);
    const b = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    // les placeholders cuits faisaient 40×40 (pastille + initiales)
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.ok(!(w === 40 && h === 40), `${k} : vrai sprite, pas une pastille 40×40`);
    // empreinte du CONTENU (les tailles de fichier peuvent coïncider)
    sig.set(k, crypto.createHash('md5').update(b).digest('hex'));
  }
  // les 18 pierres Z doivent être DISTINCTES (avant : 18 fois la même gemme)
  const zs = KEYS.filter((k) => k.endsWith('_z')).map((k) => sig.get(k));
  assert.equal(new Set(zs).size, 18, 'les 18 pierres Z sont toutes DIFFÉRENTES (avant : 18 gemmes identiques)');
  // les alias PokeAPI sont déclarés dans l'outil
  const fetcher = R('tools/fetch-item-sprites.py');
  assert.ok(fetcher.includes("'prine_berry': 'lum-berry'"), 'alias Baie Prine → Lum Berry');
  assert.ok(fetcher.includes("'upgrade': 'up-grade'"), 'alias Améliorator → up-grade');
  assert.ok(fetcher.includes("-z--held"), 'alias des pierres Z (suffixe --held)');
});

test('passe 51 N2 : dialogue PNJ (phrase de rencontre + choix) et panneau PC', () => {
  assert.ok(E('src/game/base/base-dialog.js'), 'module de dialogues');
  const dlg = R('src/game/base/base-dialog.js');
  for (const fn of ['baseDialogNpc', 'baseDialogNpcFight', 'baseDialogPc', 'closeBaseDialog']) {
    assert.ok(dlg.includes(`window.${fn} = ${fn};`), `exposé : ${fn}`);
  }
  // la phrase d'accueil est TOUJOURS affichée, et le combat est un CHOIX
  assert.ok(dlg.includes('npc.msgs && npc.msgs.pre'), 'réplique de rencontre affichée');
  assert.ok(dlg.includes('base.dlg.fight') && dlg.includes('base.dlg.decline'),
    'boutons Combattre / Passer son chemin');
  // le PC ouvre un panneau réservé
  assert.ok(dlg.includes('base-pc-panel'), 'panneau PC (vide pour l’instant)');
  assert.ok(R('src/loader.js').includes('src/game/base/base-dialog.js'), 'chargé par le loader');
  const win = R('src/game/base/base-window.js');
  assert.ok(win.includes('baseDialogNpc(res)'), 'la visite ouvre le dialogue PNJ');
  assert.ok(win.includes('baseDialogPc(res)'), 'la visite ouvre le panneau PC');
  // i18n complet et à parité
  const keys = (p2) => {
    const s2 = R(p2);
    const i = s2.indexOf('"dlg":{');
    return [...s2.slice(i, s2.indexOf('\n},', i)).matchAll(/^"(\w+)":/gm)].map((m) => m[1]).sort();
  };
  assert.deepEqual(keys('src/localization/fr/base.js'), keys('src/localization/en/base.js'),
    'clés dlg identiques FR/EN');
});

test('passe 51 N3 : le glisser-déposer des CARTES est celui de l’équipe, partout', () => {
  const tu = R('src/game/display/team-ui.js');
  // l'installateur de l'équipe est extrait et réutilisable
  assert.ok(tu.includes('function installCardDragAndDrop'), 'installateur de cartes partagé');
  assert.ok(tu.includes('window.installCardDragAndDrop'), 'exporté');
  assert.ok(tu.includes('addTeamDragAndDrop() {\n  installCardDragAndDrop('),
    'l’équipe utilise le même installateur');
  // l'échange final passe par le contexte (presets / PNJ / Atoll)
  assert.ok(tu.includes('_pwMoveDragCtx.swapPokes(sourceIdx, targetIdx)'),
    'teamDrop délègue au contexte hors équipe active');
  // presets et PNJ n'ont plus AUCUN écouteur de drag maison
  for (const f of ['src/game/display/preset-manager.js', 'src/game/base/base-npc-editor.js']) {
    const src = R(f);
    assert.ok(src.includes('installCardDragAndDrop('), `${f} : réutilise l’installateur`);
    assert.ok(!src.includes("addEventListener('dragstart'"), `${f} : plus de drag maison`);
  }
});

// ——— O — retours passe 52 ————————————————————————————————————————————————
// Cinq retours utilisateur, cinq causes racines distinctes :
//  1. « Sur le dessus du toboggan on passe derrière alors qu'on devrait être
//     dessus » → charDepth() testait l'EMPREINTE, pas la forme dessinée.
//  2. « La partie haute de la planche nous considère comme derrière » →
//     solid_board (1×2, marchable) absent de CLIMB_ON.
//  3. « Les poupées se mettent derrière les tapis » → une poupée prenait sa
//     propre rangée, un tapis 3×3 le pied de son empreinte : sur les deux
//     rangées hautes du tapis, la poupée passait dessous.
//  4. « On doit pouvoir le combattre autant qu'on veut » + « ouvrir son
//     panneau nous considère comme si on l'avait déjà combattu ».
//  5. « Il faudrait un panneau de fin de combat pour voir son message. »

test('passe 52 O1 : Z-buffer — toboggan, planche et poupées', () => {
  const v2 = R('src/game/base/base-view2d.js');
  // 1+2 : le test de recouvrement couvre le surplomb, la planche grimpe
  assert.ok(v2.includes('const over = def.over | 0;') && v2.includes('const top = it.y - over;'),
    'charDepth teste la forme DESSINÉE (surplomb inclus)');
  assert.ok(/CLIMB_ON = \{ slide: 1, stand: 1, stairs: 1, solid_board: 1 \}/.test(v2),
    'la planche se monte comme le toboggan');
  // 3 : la poupée est rattachée au pied de son porteur
  assert.ok(v2.includes('function carrierFootRow') || v2.includes('const carrierFootRow'),
    'helper de rattachement au porteur');
  assert.ok(v2.includes("(def.layer === 'surface')\n      ? carrierFootRow(it.x, it.y)"),
    'une poupée prend la profondeur du pied de son porteur');
});

test('passe 52 O2 : le PNJ est combattable sans limite', () => {
  const vis = R('src/game/base/base-visit.js');
  // le verrou est levé : plus aucun retour anticipé 'npc_talked'
  assert.ok(!vis.includes("if (sess.talkedToday[npc.id]) return { type: 'npc_talked', npc };"),
    'plus de verrou « un combat par visite »');
  assert.ok(!/sess\.talkedToday\[npc\.id\] = true;/.test(vis),
    'ouvrir le dialogue ne consomme plus le combat');
  // le compteur est désormais posé à l'ACCEPTATION du duel
  const ed = R('src/game/base/base-editor.js');
  assert.ok(ed.includes("_baseEd.visit.talkedToday[npc.id] = (_baseEd.visit.talkedToday[npc.id] | 0) + 1"),
    'le duel n’est compté qu’une fois réellement lancé');
  // approcher un PNJ déjà affronté rouvre bien le dialogue
  assert.ok(ed.includes('_baseEd.visitPending = { x, y };'),
    'l’approche est toujours mémorisée (revanche possible)');
});

test('passe 52 O3 : panneau de fin de combat contre un PNJ', () => {
  const dlg = R('src/game/base/base-dialog.js');
  assert.ok(dlg.includes('function baseDialogNpcResult'), 'boîte de fin de combat');
  assert.ok(dlg.includes('window.baseDialogNpcResult'), 'exportée');
  assert.ok(dlg.includes("_bdT('base.dlg.rematch')"), 'bouton Revanche');
  // branchée sur les TROIS sorties de combat : victoire, blackout, abandon
  for (const f of ['src/game/combat/battle-switch.js', 'src/game/combat/battle-encounter.js',
    'src/game/combat/battle-flow.js']) {
    const src = R(f);
    assert.ok(src.includes('baseDialogNpcResult('), `${f} : ouvre le panneau de fin`);
    assert.ok(src.includes('battle.baseNpcRef'), `${f} : garde la référence du PNJ`);
  }
  // le PNJ est mémorisé au lancement du duel
  assert.ok(R('src/game/base/base-editor.js').includes('battle.baseNpcRef = npc;'),
    'référence posée au lancement');
  // i18n à parité
  const keys = (p2) => {
    const s2 = R(p2);
    const i = s2.indexOf('"dlg":{');
    return [...s2.slice(i, s2.indexOf('\n},', i)).matchAll(/^"(\w+)":/gm)].map((m) => m[1]).sort();
  };
  const fr = keys('src/localization/fr/base.js');
  assert.deepEqual(fr, keys('src/localization/en/base.js'), 'clés dlg identiques FR/EN');
  for (const k of ['rematch', 'res_won', 'res_lost']) assert.ok(fr.includes(k), `clé ${k}`);
});

test('passe 52 O4 : salles à étage — raccords de porte au canon', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    const ids = ['cave_5','cave_6','tree_5','tree_6','bush_5','bush_6',
                 'cave_red_5','cave_red_6','cave_blue_5','cave_blue_6',
                 'cave_yellow_5','cave_yellow_6'];
    const bad = [];
    for (const id of ids) {
      const L = baseLayoutGet(id);
      if (!L) { bad.push([id, 'gabarit absent']); continue; }
      const solid = (x, y) => {
        if (!(y >= 0 && y < L.h && x >= 0 && x < L.w)) return true;
        const t = L.cells[y][x].t;
        return t === 'wall' || t === 'void';
      };
      // bords intérieurs rangée par rangée : jamais plus d'UNE case de
      // décrochement (seul motif que l'autotiling canon sait raccorder)
      let prev = null;
      for (let y = 0; y < L.h; y++) {
        const xs = [];
        for (let x = 0; x < L.w; x++) if (!solid(x, y)) xs.push(x);
        if (!xs.length) { prev = null; continue; }
        const cur = [xs[0], xs[xs.length - 1]];
        if (prev && y !== L.h - 1) {
          if (Math.abs(cur[0] - prev[0]) > 1) bad.push([id, 'décrochement gauche y=' + y]);
          if (Math.abs(cur[1] - prev[1]) > 1) bad.push([id, 'décrochement droit y=' + y]);
        }
        prev = cur;
      }
      // la porte débouche sur le spawn, dans un mur du bas qui l'encadre
      const ex = L.exit, sp = L.spawn;
      if (!ex || !sp) { bad.push([id, 'porte/spawn absents']); continue; }
      if (ex.x !== sp.x || ex.y !== sp.y + 1) bad.push([id, 'porte pas au-dessus du spawn']);
      if (!solid(ex.x - 1, ex.y) || !solid(ex.x + 1, ex.y)) bad.push([id, 'porte non encadrée']);
      // rangée du spawn LARGE (pas d'épaulement étranglé — canon cave_1)
      let n = 0;
      for (let x = 0; x < L.w; x++) if (!solid(x, sp.y)) n++;
      if (n < 5) bad.push([id, 'rangée du spawn étranglée (' + n + ')']);
    }
    return JSON.stringify({ bad });
  })()`, sb));
  assert.deepEqual(out.bad, [], 'aucun raccord de porte bâtard');
});

// ——— P — retours passe 53 ————————————————————————————————————————————————
test('passe 53 P1 : on monte sur le toboggan même adossé à un mur', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`(() => {
    // On balaie TOUTES les poses légales de toboggan sur plusieurs gabarits.
    // Bug d'origine : le carter (surplomb) n'occupe aucune case au sol ; on
    // testait donc le terrain SOUS lui. Adossé au mur du fond — le placement
    // le plus naturel — ce terrain est un mur, et le sommet devenait
    // inatteignable (40 poses sur 214).
    const bad = []; let tested = 0;
    for (const lid of ['cave_1','cave_2','cave_3','cave_4','cave_5','tree_5']) {
      const L0 = baseLayoutGet(lid); if (!L0) continue;
      for (let y = 0; y < L0.h; y++) for (let x = 0; x < L0.w; x++) {
        const st = baseGetState(); baseDebugCreate(lid); baseDebugGrantAll();
        st.items = st.items.filter((i) => i.s !== 'pc');
        if (!basePlace(st, 'slide', x, y, 0).ok) continue;
        const it = st.items.find((i) => i.s === 'slide');
        const sess = baseVisitCreate(st);
        const seen = new Set(); const q = [{ x: sess.pos.x, y: sess.pos.y, elev: sess.elev }];
        seen.add(q[0].x + ',' + q[0].y);
        while (q.length) { const c = q.shift();
          for (const n of baseVisitNeighbors(sess, c.x, c.y, c.elev)) {
            const k = n.x + ',' + n.y; if (seen.has(k)) continue; seen.add(k); q.push(n); } }
        // on n'analyse que les toboggans dont l'escalier intégré est joignable
        if (!seen.has(it.x + ',' + (it.y + 1))) continue;
        tested++;
        const carter = it.y - 1;
        const ok = seen.has(it.x + ',' + carter) && seen.has((it.x + 1) + ',' + carter)
          && seen.has(it.x + ',' + it.y);
        if (!ok) bad.push([lid, it.x, it.y]);
      }
    }
    return JSON.stringify({ tested, bad: bad.slice(0, 8), nbBad: bad.length });
  })()`, sb));
  assert.ok(out.tested > 100, `échantillon significatif (${out.tested} poses)`);
  assert.equal(out.nbBad, 0, `sommet du toboggan toujours atteignable (${JSON.stringify(out.bad)})`);
});

test('passe 53 P2 : le dessus d’un objet perché ignore le terrain du dessous', () => {
  const core = R('src/game/base/base-core.js');
  const i = core.indexOf('function baseCellWalkable');
  const seg = core.slice(i, i + 1600);
  assert.ok(seg.includes('baseZoneTopAt(st, x, y)'), 'court-circuit « je suis sur un toit »');
  assert.ok(seg.indexOf('baseZoneTopAt') < seg.indexOf("cell.t === 'floor'"),
    'le test du perchoir précède celui du terrain');
  assert.ok(seg.includes('baseZoneBlockedAt'), 'les cases mortes de l’objet restent bloquées');
});

test('passe 53 P3 : l’étage n’est plus décalé — la falaise fait une tuile', () => {
  const v2 = R('src/game/base/base-view2d.js');
  assert.ok(v2.includes('const ELEV_PX = 0;'), 'mezzanine alignée sur ses tuiles');
  assert.ok(v2.includes('const PERCH_PX = Math.round(C * 0.45);'), 'perchoir sur meuble conservé');
  assert.ok(!/py -= ELEV_PX/.test(v2), 'plus aucun décalage résiduel de mezzanine');
  // l'éditeur suit le renderer, sinon les clics visent la mauvaise case
  const ed = R('src/game/base/base-editor.js');
  assert.ok(ed.includes('const ELEV_PX = 0;'), 'résolution de clic alignée');
  // l'ombre portée du fond ne déborde plus d'une tuile
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes('for yy in range(4):'), 'ombre de falaise courte (4 px)');
  assert.ok(!bake.includes('for yy in range(13):'), 'plus d’ombre de 13 px');
});

test('passe 53 P4 : autotiling — aucun mur sur la tuile de repli', () => {
  // Le vrai critère : un voisinage absent de la table fait tomber le baker
  // sur sa roche pleine, et le mur « ne boucle pas » à l'écran.
  const at = JSON.parse(R('tools/emerald-ref/autotile-walls.json'));
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  const bad = [];
  for (const [lid, rows] of Object.entries(grids)) {
    const h = rows.length, w = rows[0].length;
    const ch = (x, y) => ((y >= 0 && y < h && x >= 0 && x < w) ? rows[y][x] : '#');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (rows[y][x] !== '#') continue;
      let mask = 0;
      N8.forEach(([dx, dy], i) => { if (ch(x + dx, y + dy) === '#') mask |= (1 << i); });
      if (at[String(mask)] == null) bad.push(`${lid}(${x},${y})`);
    }
  }
  assert.deepEqual(bad, [], 'tous les murs ont un motif canon');
  assert.ok(E('tools/extend-autotile-mirror.py'), 'outil de complétion par symétrie');
});

test('passe 53 P5 : quêtes — zéro poussière, une seule baie, textes synchro', () => {
  // sandbox dédié : ce fichier ne charge que la base secrète, pas les quêtes
  const qs = { window: {}, console };
  qs.globalThis = qs; vm.createContext(qs);
  vm.runInContext(R('src/data/story-quests.js'), qs);
  vm.runInContext(R('src/data/side-quests-data.js'), qs);
  const out = JSON.parse(vm.runInContext(`(() => {
    const all = [...STORY_QUESTS, ...Object.values(SIDE_QUESTS)];
    let dust = 0, withBerry = 0, moneyOnly = 0;
    const kinds = {}; const bad = [];
    for (const q of all) {
      const ri = q.rewardItems || {};
      const berries = Object.keys(ri).filter((k) => /_berry$/.test(k));
      if (ri.stardust) dust++;
      if (berries.length > 1) bad.push([q.id, 'plusieurs baies']);
      for (const b of berries) {
        if (ri[b] !== 1) bad.push([q.id, b, ri[b]]);
        kinds[b] = (kinds[b] || 0) + 1;
      }
      if (berries.length) withBerry++; else if (q.rewardMoney) moneyOnly++;
    }
    return JSON.stringify({ total: all.length, dust, withBerry, moneyOnly,
      distinct: Object.keys(kinds).length, bad });
  })()`, qs));
  assert.equal(out.dust, 0, 'plus aucune Poussière Étoile en récompense');
  assert.deepEqual(out.bad, [], 'une seule baie, en un seul exemplaire');
  assert.ok(out.withBerry > 20 && out.withBerry < out.total * 0.5,
    `certaines quêtes seulement (${out.withBerry}/${out.total})`);
  assert.ok(out.moneyOnly > 20, 'beaucoup de quêtes restent à l’argent seul');
  assert.ok(out.distinct >= 15, `baies variées (${out.distinct} espèces distinctes)`);
  // les textes annoncent la baie RÉELLEMENT donnée
  assert.ok(!R('src/localization/fr/quests.js').includes('Poussière'), 'FR : plus de poussière annoncée');
  assert.ok(!R('src/localization/en/quests.js').includes('Stardust'), 'EN : plus de poussière annoncée');
  assert.ok(E('tools/rework-quest-berries.py') && E('tools/sync-quest-reward-text.py'), 'outils traçables');
});

// ——— Q — retours passe 54 ————————————————————————————————————————————————
test('passe 54 Q1 : la porte est un TROU dans un mur plat, pas une échancrure', () => {
  // Retour utilisateur (capture à l'appui) : « les cases autour des portes
  // devraient être plates mais elles sont courbées vers le bas ».
  // Cause : l'entrée était traitée comme un VIDE par l'autotiling, donc les
  // deux murs qui l'encadrent choisissaient un coin concave (0x207/0x205).
  // Mesuré sur les 24 maps canon : « E = solide » donne le mur plat 0x212
  // dans 38 cas sur 38 ; « E = vide », 0 fois.
  const bake = R('tools/bake-emerald-bgs.py');
  assert.ok(bake.includes("atc(R, xx, yy) in ('#', 'x', 'E')"),
    'l’entrée compte comme solide pour l’autotiling de ses voisins');

  // Vérification sur les données : le masque des voisins de la porte doit
  // donner le mur plat, pas un coin.
  const at = JSON.parse(R('tools/emerald-ref/autotile-walls.json'));
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const src = R('src/data/base-layouts-data.js');
  const grids = {};
  for (const m of src.matchAll(/  (\w+): \{\n\s*canon: null,[\s\S]*?rows: \[\n([\s\S]*?)\n    \],/g)) {
    grids[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((r) => r[1]);
  }
  const bad = [];
  for (const [lid, rows] of Object.entries(grids)) {
    const h = rows.length, w = rows[0].length;
    const solid = (x, y) => {
      if (!(y >= 0 && y < h && x >= 0 && x < w)) return true;
      const c = rows[y][x];
      return c === '#' || c === 'E';
    };
    const ey = h - 1, ex = rows[ey].indexOf('E');
    for (const dx of [-1, 1]) {
      const x = ex + dx;
      if (x < 0 || x >= w || rows[ey][x] !== '#') continue;
      let mask = 0;
      N8.forEach(([ddx, ddy], i) => { if (solid(x + ddx, ey + ddy)) mask |= (1 << i); });
      const mt = at[String(mask)];
      if (mt !== 0x212) bad.push(`${lid} dx=${dx} → ${mt ? '0x' + mt.toString(16) : 'repli'}`);
    }
  }
  assert.deepEqual(bad, [], 'murs plats (0x212) de part et d’autre de chaque porte');
});

test('passe 54 Q2 : le tutoriel ne repaie jamais ses récompenses', () => {
  // Retour utilisateur : « les quêtes de tuto donnent beaucoup trop de baies,
  // elles m'ont donné le max directement ». Cause : le verrou anti-doublon
  // vivait dans G.tutorial.rewards, recréé à vide dès que G.tutorial manquait
  // (état absent de l'état initial). L'inventaire, lui, persistait → chaque
  // session repayait les étapes déjà validées jusqu'au plafond de pile (25).
  const tut = R('src/game/display/tutorial.js');
  assert.ok(tut.includes('function tutorialRewardAlreadyPaid'),
    'verrou adossé à l’inventaire, pas au seul drapeau');
  assert.ok(/const give = Math\.max\(0, want - have\)/.test(tut),
    'on ne verse jamais plus que la quantité prévue');
  // la cause racine est supprimée : l'état du tutoriel EXISTE dès la création
  for (const f of ['src/file-preflight.js', 'src/game/save/save.js']) {
    assert.ok(R(f).includes('tutorial:{ enabled:true'),
      `${f} : l’état du tutoriel fait partie de l’état initial (donc sauvegardé)`);
  }

  // simulation : 30 sessions où l'état du tutoriel repart à vide
  const s = {
    console, setTimeout: () => 0, clearTimeout() {}, window: {},
    G: { inventory: {}, money: 0, tutorial: null, badges: ['brock'],
      wildWinsByLoc: { route1: 50 }, team: [] },
    notify() {}, updateHeader() {}, saveGame() {}, renderStoryWindow() {},
    t: (k) => k, tr: (k) => k, navigator: { maxTouchPoints: 0 },
    document: { getElementById: () => null, querySelector: () => null },
  };
  s.window = s; s.globalThis = s; vm.createContext(s);
  vm.runInContext('0;' + R('src/data/items-data.js').replace('const ITEMS', 'var ITEMS'), s);
  vm.runInContext(R('src/game/display/exploration.js').replace(/function exploreArea[\s\S]*?\n}\n/, ''), s);
  vm.runInContext(R('src/game/display/tutorial.js'), s);
  for (let i = 0; i < 30; i++) vm.runInContext('G.tutorial=null; updateTutorialProgress();', s);
  const inv = s.G.inventory;
  for (const k of Object.keys(inv)) {
    assert.equal(inv[k], 1, `${k} : une seule unité malgré 30 réinitialisations (reçu ${inv[k]})`);
  }
});


