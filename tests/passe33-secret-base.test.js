import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 33 : moteur de base secrète (sans rendu) ─────────────────────────
//  A. Intégrité du catalogue + gabarits + i18n
//  B. Règles de pose (couches, limites, rotation, anti-blocage, cap 26)
//  C. Stock / ramassage en cascade / déménagement
//  D. Visite : pathfinding, élévation (escalier), pièges ROSA, PNJ
//  E. Échange JSON : export/import strict, rien n'est jamais crédité
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const SANDBOX_FILES = [
  'src/file-preflight.js',
  'src/localization/fr/base.js', 'src/localization/en/base.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/game/core/state.js',
  'src/data/base-layouts-data.js', 'src/data/base-items-data.js',
  'src/game/base/base-core.js',
  'src/game/base/base-visit.js',
  'src/game/base/base-exchange.js',
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
      createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, click() {}, remove() {} }),
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

// ——— A — Catalogue, gabarits, i18n ————————————————————————————————————————
test('passe 33 A : catalogue cohérent + 12 gabarits canon + i18n FR/EN complet', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    const slugs = new Set();
    for (const it of BASE_ITEMS) {
      if (slugs.has(it.s)) throw new Error('doublon ' + it.s);
      slugs.add(it.s);
      if (!BASE_ITEM_CATEGORIES.includes(it.cat)) throw new Error('cat inconnue ' + it.s);
      if (it.rot !== 0) throw new Error('rot doit être 0 (passe 42) ' + it.s);
      if (!['floor', 'wall', 'surface'].includes(it.layer)) throw new Error('layer invalide ' + it.s);
    }
    window._cats = BASE_ITEM_CATEGORIES.length;
    window._n = BASE_ITEMS.length;
    window._layouts = baseLayoutIds().length;
  `, sb);
  assert.equal(vm.runInContext('window._cats', sb), 8, '8 catégories canon RSE (passe 42)');
  assert.equal(vm.runInContext('window._n', sb), 122, '122 objets (120 canon RSE + stairs/pc — passe 43 : tapis d\u2019accueil retiré)');
  assert.equal(vm.runInContext('window._layouts', sb), 36, '36 gabarits (24 canon + 6 perso + 6 grottes colorées à étage, passse 42)');
  // passe 42 : rotation supprimée (canon RSE n'en a pas) — figurée à 1
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('surf_mat'))`, sb), 1, 'tapis : fixe (rotation supprimée)');
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('small_desk'))`, sb), 1, 'bureau : fixe (rotation supprimée)');
  assert.equal(vm.runInContext(`baseItemRotCount(baseItemGet('blue_poster'))`, sb), 1, 'mural : fixe');
  vm.runInContext(`
    for (const it of BASE_ITEMS) {
      for (const lang of ['fr', 'en']) {
        const dict = I18N[lang] && I18N[lang].base && I18N[lang].base.i;
        if (!dict || !dict[it.s]) throw new Error(lang + ' manque nom ' + it.s);
      }
    }
    for (const lang of ['fr', 'en']) {
      const v = I18N[lang].base.visit, e = I18N[lang].base.err;
      for (const k of ['burst','glitter','jump','spin','door_break','note']) if (!v[k]) throw new Error(lang + ' visit.' + k);
      for (const k of ['occupied','needs_surface','wall_only','blocks_spawn','max_placed','import_json']) if (!e[k]) throw new Error(lang + ' err.' + k);
      if (!Array.isArray(I18N[lang].base.notes) || I18N[lang].base.notes.length !== 8) throw new Error(lang + ' notes');
    }
    window._i18n_ok = true;
  `, sb);
  assert.ok(vm.runInContext('window._i18n_ok', sb), 'noms + messages dans les 2 langues');
  // Langue par défaut du jeu = EN ; on vérifie les deux locales explicitement.
  assert.equal(vm.runInContext(`(G.lang='fr', t('base.i.surf_mat'))`, sb), 'Tapis Surf');
  assert.equal(vm.runInContext(`(G.lang='en', t('base.i.surf_mat'))`, sb), 'Surf Mat');
});

// ——— B — Règles de pose ———————————————————————————————————————————————————
test('passe 33 B : couches, limites, trous/planches (gabarit canon cave_1)', () => {
  const sb = makeSandbox();
  const out = JSON.parse(vm.runInContext(`
    const r = {};
    const st = baseGetState();
    baseDebugCreate('cave_1');   // SecretBase_BrownCave1 : 11×9, E(5,8), S(2,2), trou o(5,2)
    baseDebugGrantAll();
    r.pcAuto = st.items.some((i) => i.s === 'pc');
    r.deskOk = basePlace(st, 'small_desk', 1, 5, 0).ok;
    r.deskOccupied = baseCanPlace(st, 'small_desk', 1, 5, 0).reason;
    r.deskOob = baseCanPlace(st, 'small_desk', 40, 40, 0).reason;
    r.deskEntrance = baseCanPlace(st, 'small_desk', 5, 8, 0).reason;
    r.deskSpawn = baseCanPlace(st, 'small_desk', 5, 7, 0).reason;   // point d'arrivée S non décorable (passe 43 : devant la porte)
    r.matOk = basePlace(st, 'surf_mat', 6, 3, 0).ok;   // tapis 3×3 au sud-est
    r.dollFloor = baseCanPlace(st, 'torchic_doll', 4, 5, 0).ok;   // passe 39 : poupée AU SOL admise
    r.dollOnMat = basePlace(st, 'torchic_doll', 6, 3, 0).ok;
    r.dollTaken = baseCanPlace(st, 'azurill_doll', 6, 3, 0).reason;
    r.posterWallOk = baseCanPlace(st, 'blue_poster', 5, 0, 0).ok;   // mur nord, sol au sud
    r.posterFloor = baseCanPlace(st, 'blue_poster', 3, 3, 0).reason;
    r.boardOk = basePlace(st, 'solid_board', 3, 5, 0).ok; // passe 42 : planche posable sur sol nu
    r.stairsWrong = baseCanPlace(st, 'stairs', 1, 3, 0).reason;     // RSE : aucune ancre d'escalier
    JSON.stringify(r);
  `, sb));
  assert.equal(out.pcAuto, true, 'PC automatique (passe 43 : plus de tapis d\u2019accueil visible)');
  assert.equal(out.deskOk, true, 'bureau posé au sol');
  assert.equal(out.deskOccupied, 'base.err.occupied');
  assert.equal(out.deskOob, 'base.err.out_of_bounds');
  assert.equal(out.deskEntrance, 'base.err.entrance', 'l’entrée reste libre');
  assert.equal(out.deskSpawn, 'base.err.entrance', 'le point d’arrivée (métatile 544) reste libre');
  assert.equal(out.matOk, true);
  assert.equal(out.dollFloor, true, 'poupée au sol admise (passe 39, décision utilisateur)');
  assert.equal(out.dollOnMat, true, 'poupée sur le tapis');
  assert.equal(out.dollTaken, 'base.err.surface_taken', 'une seule poupée par cellule');
  assert.equal(out.posterWallOk, true, 'poster au mur près du sol');
  assert.equal(out.posterFloor, 'base.err.wall_only', 'poster interdit au sol');
  assert.equal(out.boardOk, true, 'planche posable sur sol nu (passe 42)');
  assert.equal(out.stairsWrong, 'base.err.stairs_anchor', 'RSE : pas de deuxième niveau → escalier toujours refusé');
  // dimensions canon DECORSHAPE (header.h) — heavy_desk = 3×2 ; passe 42 :
  // rotation supprimée → l'empreinte ne permute JAMAIS (index ignoré).
  assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify(baseItemFootprint(baseItemGet('heavy_desk'), 0))`, sb)), { w: 3, d: 2 });
  assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify(baseItemFootprint(baseItemGet('heavy_desk'), 1))`, sb)), { w: 3, d: 2 }, 'rotation supprimée : empreinte inchangée');
  assert.equal(vm.runInContext(`
    baseStockAdd(baseGetState(), 'solid_board', 1);   // le debug n'en donne qu'une : 1re posée en (3,5)
    basePlace(baseGetState(), 'solid_board', 5, 2, 0).ok
  `, sb), true, 'planche sur le trou canon (5,2)');
  assert.equal(vm.runInContext(`baseCellWalkable(baseGetState(), baseBuildGrid(baseGetState()), 5, 2, null)`, sb), true, 'trou bouché franchissable');
});

test('passe 33 B2 : anti-blocage BFS + plafond canon de 26', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    const st = baseGetState();
    baseDebugCreate('cave_1');   // passe 43 : S fixe devant la porte (5,7) — le
    baseDebugGrantAll();         // rideau y=4 scellerait le nord (9,5 = mur !)
    baseStockAdd(st, 'small_desk', 7);  // le debug n'en donne qu'un : on complète
    const npc = baseNpcAdd(st, { name: 'Rex', team: [{ id: 25, level: 20, moves: ['thunderbolt'] }] });
    window._npcPlace = baseNpcPlace(st, npc.id, 3, 2).ok;  // copain AU NORD
    window._poses = [];
    for (let x = 1; x <= 7; x++) window._poses.push(basePlace(st, 'small_desk', x, 4, 0).ok);
    window._blocking = baseCanPlace(st, 'small_desk', 8, 4, 0).reason;
  `, sb);
  assert.equal(vm.runInContext('window._npcPlace', sb), true, 'copain posé au nord');
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(window._poses)', sb)), [true, true, true, true, true, true, true]);
  // passe 43 : le rideau scelle le copain au nord → blocks_npc (le spawn fixe
  // devant la porte au sud ne peut plus être coupé ; la protection canon
  // passe par les PNJ, toujours joignables depuis l'arrivée).
  assert.equal(vm.runInContext('window._blocking', sb), 'base.err.blocks_npc', 'le rideau complet est refusé (copain scellé)');
  // plafond 26 (synthétique : on compte uniquement les objets posés, canon)
  assert.equal(vm.runInContext(`
    const st2 = baseGetState();
    for (let i = 0; i < 26; i++) st2.items.push({ uid: 1000 + i, s: 'small_desk', x: 1, y: 1, rot: 0 });
    baseCanPlace(st2, 'small_desk', 5, 5, 0).reason;
  `, sb), 'base.err.max_placed', '26 objets max (limite ROSA)');
});

// ——— C — Stock, ramassage en cascade, déménagement ————————————————————————
test('passe 33 C : pickup en cascade + relocate conserve meubles et PNJ', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    const st = baseGetState();
    baseDebugCreate('bush_1');
    baseDebugGrantAll();
    basePlace(st, 'surf_mat', 1, 3, 0);
    basePlace(st, 'charizard_doll', 1, 3, 0);
    const matUid = st.items.find((i) => i.s === 'surf_mat').uid;
    window._picked = basePickup(st, matUid);
    window._dollBack = baseStockCount(st, 'charizard_doll');
    window._matBack = baseStockCount(st, 'surf_mat');
    // passe 39 : la poupée sur un porteur ramassé RESTE au sol (sol admis)
    const doll = st.items.find((i) => i.s === 'charizard_doll');
    window._dollStayed = !!(doll && doll.x === 1 && doll.y === 3);
    const npc = baseNpcAdd(st, { name: 'Léo', sprite: 'camper', team: [{ id: 25, level: 50, moves: ['thunderbolt'], talent: 'static' }], msgs: { pre: 'Go !', win: 'Bravo !', lose: 'Bien joué !' } });
    window._npcOk = npc.ok;
    window._npcPlaced = baseNpcPlace(st, npc.id, 5, 4).ok;
    window._reloc = baseRelocate(st, 'tree_2');
    window._npcInStock = st.npcStock.length;
    window._npcsLeft = st.npcs.length;
    window._stockLeft = Object.keys(st.stock).length;
    window._layout = st.layoutId;
  `, sb);
  // passe 39 (décision utilisateur) : poupée/coussin au sol = légal → le
  // ramassage du porteur laisse la poupée posée au sol (re-validation), il
  // ne repart au stock que le tapis seul.
  assert.equal(vm.runInContext('window._picked', sb), 1, 'le tapis seul repart au stock');
  assert.equal(vm.runInContext('window._dollBack', sb), 0, 'poupée NON ramassée');
  assert.equal(vm.runInContext('window._matBack', sb), 1, 'tapis récupéré');
  assert.equal(vm.runInContext('window._dollStayed', sb), true, 'la poupée reste au sol à sa place');
  assert.equal(vm.runInContext('window._npcOk', sb), true);
  assert.equal(vm.runInContext('window._npcPlaced', sb), true);
  assert.equal(vm.runInContext('window._reloc.ok', sb), true);
  assert.equal(vm.runInContext('window._npcsLeft', sb), 0, 'PNJ retiré de la base');
  assert.equal(vm.runInContext('window._npcInStock', sb), 0, 'PNJ supprimé au déménagement (fix demandé : pas de banque invisible)');
  assert.equal(vm.runInContext('window._layout', sb), 'tree_2');
  assert.ok(vm.runInContext('window._stockLeft', sb) >= 2, 'meubles conservés au déménagement');
});

// ——— D — Visite : déplacement, élévation, pièges, PNJ —————————————————————
test('passe 33 D : visite, planche sur trou et pièges ROSA (gabarit canon cave_1)', () => {
  const sb = makeSandbox();
  vm.runInContext(`{
    const st = baseGetState();
    baseDebugCreate('cave_1');   // S(2,2), E(5,8), trou o(5,2) — RSE : plain-pied, pas d'escalier
    baseDebugGrantAll();
    // Phase A : planche SEULEMENT — les pièges viennent après, sinon le trajet
    // vers le trou passerait sur le square-one.
    basePlace(st, 'solid_board', 5, 2, 0);   // planche sur le trou canon
    const sessA = baseVisitCreate(st);       // la visite clone l'état ! départ = point d'arrivée S
    // 1) chemin spawn → trou (praticable uniquement grâce à la planche)
    window._pathLen = (baseVisitSetDestination(sessA, 5, 2) || []).length;
    while (sessA.path.length) baseVisitStepAlong(sessA);
    window._posTop = JSON.stringify([sessA.pos.x, sessA.pos.y]);
    window._elevTop = sessA.elev;            // RSE : pas de deuxième niveau → toujours 0
    // Phase B : pièges canon posés, nouvelle session clonée depuis le spawn
    basePlace(st, 'spin_mat', 6, 6, 0);      // tapis tournant : repousse en arrière
    basePlace(st, 'd_note_mat', 7, 6, 0);    // tapis-note ré (note 1, fixe)
    const sessB = baseVisitCreate(st);
    // 2) spin : le visiteur est REPoussé à la case précédente (jamais sur 6,6)
    baseVisitSetDestination(sessB, 6, 6);
    let before = JSON.stringify([sessB.pos.x, sessB.pos.y]);
    const seq = [];
    while (sessB.path.length) {
      before = JSON.stringify([sessB.pos.x, sessB.pos.y]);
      const stepR = baseVisitStepAlong(sessB);
      if (stepR.ev && stepR.ev.msg === 'base.visit.spin') seq.push('push');
    }
    window._spinPushed = seq.length ? seq[seq.length - 1] : null;
    window._afterSpin = JSON.stringify([sessB.pos.x, sessB.pos.y]);
    window._beforeSpin = before;
    // 3) tapis-note canon : ré = note 1 (rotation supprimée → fixe)
    baseVisitSetDestination(sessB, 7, 6);
    window._note = null;
    while (sessB.path.length) { const r = baseVisitStepAlong(sessB); if (r.ev && r.ev.msg === 'base.visit.note') window._note = r.ev.note; }
  }`, sb);
  assert.ok(vm.runInContext('window._pathLen', sb) > 0, 'chemin vers le trou via la planche');
  assert.equal(vm.runInContext('window._posTop', sb), '[5,2]');
  assert.equal(vm.runInContext('window._elevTop', sb), 0, 'RSE : tout est de plain-pied (pas d’étage)');
  assert.equal(vm.runInContext('window._spinPushed', sb), 'push', 'spin : visiteur repoussé');
  assert.equal(vm.runInContext('window._afterSpin', sb), vm.runInContext('window._beforeSpin', sb), 'spin : retour à la case précédente');
  assert.equal(vm.runInContext('window._note', sb), 1, 'tapis-note ré = note 1 (fixe)');

  // 4) tapis saut canon (passe 42 : les panneaux warp ORAS n'existent plus)
  const jump = JSON.parse(vm.runInContext(`{
    const stw = baseGetState();
    baseStockAdd(stw, 'jump_mat', 1);   // le debug n'en donne qu'un
    basePlace(stw, 'jump_mat', 5, 5, 0);
    const sess2 = baseVisitCreate(stw);
    baseVisitSetDestination(sess2, 5, 5);
    let ev = null;
    while (sess2.path.length) { const r = baseVisitStepAlong(sess2); if (r.ev) ev = r.ev; }
    JSON.stringify({ ev: ev && ev.msg, pos: [sess2.pos.x, sess2.pos.y] });
  }`, sb));
  assert.equal(jump.ev, 'base.visit.jump', 'tapis saut : message canon');
  assert.deepEqual(jump.pos, [5, 5], 'le visiteur atteint le tapis');

  // 5) PNJ : parler → combat borné, une seule fois par visite
  const n = JSON.parse(vm.runInContext(`{
    const st3 = baseGetState();
    const added = baseNpcAdd(st3, { name: 'Léo', sprite: 'camper', team: [{ id: 25, level: 50, moves: ['thunderbolt'], talent: 'static' }] });
    baseNpcPlace(st3, added.id, 1, 5);
    const sess3 = baseVisitCreate(st3);
    const first = baseVisitInteract(sess3, 1, 5);
    const second = baseVisitInteract(sess3, 1, 5);
    JSON.stringify({ t1: first.type, kind: first.battle && first.battle.kind, team: first.battle && first.battle.team.length, t2: second.type });
  }`, sb));
  assert.equal(n.t1, 'npc_battle', 'parler au PNJ propose le combat');
  assert.equal(n.kind, 'base_npc');
  assert.equal(n.team, 1);
  // Passe 52 (retour utilisateur : « on doit pouvoir le combattre autant
  //    qu'on veut ») : plus de verrou d'un combat par visite. Ouvrir le
  //    dialogue ne consomme plus rien non plus — c'était le second bug :
  //    « passer son chemin » brûlait quand même le duel.
  assert.equal(n.t2, 'npc_battle', 'le PNJ reste combattable autant de fois qu’on veut');

  // 6) ballon canon (fx burst) : éclate UNE seule fois par visite (base
  //    remise à plat pour isoler le piège des autres mécanismes déjà posés)
  const pit = JSON.parse(vm.runInContext(`{
    const st4 = baseGetState();
    baseRelocate(st4, 'cave_1');
    baseStockAdd(st4, 'yellow_balloon', 1);
    basePlace(st4, 'yellow_balloon', 3, 3, 0);
    const sess4 = baseVisitCreate(st4);
    baseVisitSetDestination(sess4, 3, 3);
    let first = null, second = null;
    while (sess4.path.length) { const r = baseVisitStepAlong(sess4); if (r.ev) first = r.ev; }
    baseVisitSetDestination(sess4, 3, 6);
    while (sess4.path.length) baseVisitStepAlong(sess4);
    baseVisitSetDestination(sess4, 3, 3);
    while (sess4.path.length) { const r = baseVisitStepAlong(sess4); if (r.ev) second = r.ev; }
    JSON.stringify({ first: first && first.msg, second: second && second.msg, stopped: sess4.pos.x + ',' + sess4.pos.y });
  }`, sb));
  assert.equal(pit.first, 'base.visit.burst', 'ballon éclaté au passage');
  assert.equal(pit.second, null, 'le même ballon ne se regonfle pas pendant la visite');
});

// ——— E — Échange JSON —————————————————————————————————————————————————————
test('passe 33 E : export/import strict — visite seule, rien n’est crédité', () => {
  const sb = makeSandbox();
  vm.runInContext(`{
    const st = baseGetState();
    baseDebugCreate('tree_1');
    baseDebugGrantAll();
    basePlace(st, 'small_desk', 3, 3, 0);
    basePlace(st, 'surf_mat', 4, 3, 0);
    basePlace(st, 'blastoise_doll', 4, 3, 0);
    const npc = baseNpcAdd(st, { name: 'Élise<b>', team: [{ id: 6, level: 256, moves: ['flamethrower', 'wing', 'x5', 'y6', 'z7'] }] });
    baseNpcPlace(st, npc.id, 2, 4);
    st.record.w = 7;
    window._json = baseExportString(st, 'Dresseur');
    window._stockBefore = JSON.stringify(Object.keys(st.stock).sort());
  }`, sb);
  assert.ok(vm.runInContext('window._json', sb).includes('pw-secret-base'), 'marqueur de type présent');

  const imp = JSON.parse(vm.runInContext(`{
    const chk = baseImportValidate(window._json);
    JSON.stringify({ ok: chk.ok, items: chk.visit.items.length, npcs: chk.visit.npcs.length,
      npcLvl: chk.visit.npcs[0].team[0].level, npcMoves: chk.visit.npcs[0].team[0].moves.length,
      npcName: chk.visit.npcs[0].name, recW: chk.meta.record.w });
  }`, sb));
  assert.equal(imp.ok, true, 'import accepté');
  assert.equal(imp.items, 4, '3 objets + PC (auto — passe 43 : plus de tapis d\u2019accueil)');
  assert.equal(imp.npcs, 1);
  assert.equal(imp.npcLvl, 100, 'niveau borné à 100');
  assert.equal(imp.npcMoves, 4, '4 coups max');
  assert.equal(imp.npcName.includes('<'), false, 'HTML nettoyé des noms');
  assert.equal(imp.recW, 7, 'record transporté');

  // rien n'est crédité au joueur par la visite
  assert.equal(vm.runInContext(`
    baseVisitFromJson(window._json);
    JSON.stringify(Object.keys(baseGetState().stock).sort());
  `, sb), vm.runInContext('window._stockBefore', sb), 'aucun objet offert à l’import');

  // rejets stricts
  assert.equal(vm.runInContext(`baseImportValidate('pas du json').reason`, sb), 'base.err.import_json');
  assert.equal(vm.runInContext(`baseImportValidate('{"kind":"autre"}').reason`, sb), 'base.err.import_kind');
  assert.equal(vm.runInContext(`baseImportValidate(JSON.stringify({kind:'pw-secret-base', v:99})).reason`, sb), 'base.err.import_version');
  assert.equal(vm.runInContext(`
    const dr = JSON.parse(window._json);
    dr.items = new Array(40).fill(dr.items[1]);
    baseImportValidate(JSON.stringify(dr)).reason;
  `, sb), 'base.err.import_items', 'trop d’objets rejeté');

  // objet trafiqué hors limites → écarté proprement
  const t2 = JSON.parse(vm.runInContext(`{
    const d = JSON.parse(window._json);
    d.items[0].x = 99;
    const chk2 = baseImportValidate(JSON.stringify(d));
    JSON.stringify({ ok: chk2.ok, items: chk2.visit.items.length });
  }`, sb));
  assert.equal(t2.ok, true, 'fichier partiellement valide accepté');
  assert.equal(t2.items, 3, 'objet trafiqué (items[0]) écarté, les 3 autres conservés (+ PC passe 40)');

  // et la visite de la base de l'ami démarre
  assert.equal(vm.runInContext(`baseVisitFromJson(window._json).ok`, sb), true);
});

