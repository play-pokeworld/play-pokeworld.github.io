import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// ── Passe 38 : éditeur de pose 2D + visite interactive + combat de copain ──
//  A. Sélection dans le stock → pose au clic (stock décrémenté, sélection
//     auto relâchée quand épuisé), pose illégale → raison i18n
//  B. Fantôme de pose (vert/rouge + raison) et conversion souris → case
//     (échelle CSS gérée, hors-limites → null)
//  C. Rotation d'un meuble posé (banc 90°) + ramassage qui embarque les
//     objets « surface » orphelins (bureau + poupée)
//  D. Visite : départ du spawn, toucher-pour-marcher vers un copain (case
//     bloquée → case voisine), interaction face-à-face, combat borné
//     (startBattle champ 'base_npc', équipe instanciée, 1× par visite),
//     record propriétaire crédité ; visite d'un fichier d'ami SANS crédit
//  E. Câblage UI/combat : index.html (barre+actions), postboot, loader,
//     styles, hooks battle (victoire/blackout/abandon), getChampName
//  F. Garde WebGL2 : 3D désactivée sans GL, repli 2D, visite forcée en 2D
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const E = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

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

function makeSandbox(withBattleStubs) {
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
  if (withBattleStubs) {
    // Doublures combat : le duel borné est testé SANS le moteur temps réel.
    vm.runInContext(`
      var MOVES = { tackle: { name: 'Charge' }, growl: { name: 'Rugissement' } };
      function createPoke(id, level, shiny) {
        return { id, level, shiny: !!shiny, name: '#' + id, maxHP: 20, currentHP: 20, moves: [{ id: 'tackle' }], talent: null };
      }
      var battle = { active: false };
      var _launches = [];
      function startBattle(enemyPoke, isChamp, champId, team) {
        battle.active = true; battle.isChamp = isChamp; battle.champId = champId; battle.champTeam = team;
        _launches.push({ champId, n: (team || []).length });
        return true;
      }
      function addBattleLog() {}
    `, sandbox);
  }
  return sandbox;
}

// Ameublement de test partagé : trou recouvert, bureau, copain au sud.
const FURNISH = `
  const st = baseGetState();
  baseDebugCreate('cave_1');
  baseDebugGrantAll();
  basePlace(st, 'solid_board', 5, 2, 0);            // trou comblé (canon)
  baseNpcAdd(st, { name: 'Leo', sprite: 'youngster',
    team: [{ id: 25, level: 50, moves: ['tackle', 'growl'], talent: null, shiny: false }],
    msgs: { pre: 'Go !', win: 'Bien joué.', lose: 'Ouch…' } });
  const npcId = st.npcStock[0].id;
  baseNpcPlace(st, npcId, 2, 6);
`;

// ——— A — Stock → pose au clic ————————————————————————————————————————————
test('passe 38 A : sélection stock puis pose au clic, stock décrémenté, auto-relâche', () => {
  const sb = makeSandbox(false);
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const ed = baseEditorGet();
    const r = { sel: null, placeOk: null, selAfter: 'x', reSel: 'x', bad: null, stockLeft: -1 };
    r.sel = baseEditorSelectSlug(st, 'small_desk');
    r.slugInState = ed.slug;
    const p = baseEditorClickCell(st, 1, 3);
    r.placeOk = p.ok === true && p.type === 'place';
    const it = st.items.find((i) => i.s === 'small_desk');
    r.at = it ? it.x + ',' + it.y : null;
    r.selAfter = ed.slug;                 // stock épuisé (1 ex.) → relâché
    r.stockLeft = baseStockCount(st, 'small_desk');
    r.reSel = baseEditorSelectSlug(st, 'small_desk'); // plus rien en stock
    baseEditorSelectSlug(st, 'pokemon_desk');
    const bad = baseEditorClickCell(st, 5, 7);        // S = point d'arrivée (passe 43 : devant la porte)
    r.bad = { ok: bad.ok, reason: bad.reason, kept: ed.slug, stock: baseStockCount(st, 'pokemon_desk') };
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.sel, 'small_desk');
  assert.equal(out.slugInState, 'small_desk');
  assert.equal(out.placeOk, true, 'pose au clic acceptée');
  assert.equal(out.at, '1,3');
  assert.equal(out.selAfter, null, 'sélection relâchée une fois le stock épuisé');
  assert.equal(out.stockLeft, 0);
  assert.equal(out.reSel, null, 'impossible de re-sélectionner un objet épuisé');
  assert.equal(out.bad.ok, false);
  assert.equal(out.bad.reason, 'base.err.entrance', 'raison i18n remontée');
  assert.equal(out.bad.kept, 'pokemon_desk', 'sélection conservée après un refus');
  assert.equal(out.bad.stock, 1, 'stock intact après un refus');
});

// ——— B — Fantôme + géométrie souris ——————————————————————————————————————
test('passe 38 B : fantôme vert/rouge + baseEditorCellFromEvent (échelle CSS, bornes)', () => {
  const sb = makeSandbox(false);
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    baseEditorSelectSlug(st, 'red_poster');
    baseEditorSetHover({ x: 5, y: 0 });              // mur nord, sol au sud → canon
    const g1 = baseEditorGhost(st);
    baseEditorSetHover({ x: 5, y: 8 });              // tapis de sortie (sol)
    const g2 = baseEditorGhost(st);
    baseEditorSetHover(null);
    const g3 = baseEditorGhost(st);
    // fantôme copain : case du trou nu → rouge
    baseEditorSelectSlug(st, null);
    baseNpcAdd(st, { name: 'N', sprite: 's', team: [{ id: 1, level: 5, moves: [], talent: null, shiny: false }], msgs: {} });
    baseEditorSelectNpc(st, st.npcStock[0].id);
    baseEditorSetHover({ x: 5, y: 2 });
    const g4 = baseEditorGhost(st);
    // souris : canvas 360×296 (11×9 cases de 32px + marge 4), rect à l'échelle 1 puis 0.5
    const L = baseLayoutGet('cave_1');
    const fake = (rw, rh) => ({ width: L.w * 32 + 8, height: L.h * 32 + 8,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: rw, height: rh, right: 10 + rw, bottom: 20 + rh }) });
    const c1 = baseEditorCellFromEvent(st, fake(360, 296), { clientX: 51, clientY: 61 });
    const c2 = baseEditorCellFromEvent(st, fake(180, 148), { clientX: 10 + 18.5, clientY: 20 + 18.5 });
    const c3 = baseEditorCellFromEvent(st, fake(360, 296), { clientX: 0, clientY: 0 });
    return JSON.stringify({ g1, g2, g3, g4, c1, c2, c3 });
  })()`, sb));
  assert.equal(out.g1.ok, true, 'poster : mur nord avec sol au sud → vert');
  assert.equal(out.g1.slug, 'red_poster');
  assert.equal(out.g1.w >= 1 && out.g1.d >= 1, true);
  assert.equal(out.g2.ok, false, 'poster sur la sortie (sol) → rouge');
  assert.ok(String(out.g2.reason).startsWith('base.err.'), 'raison i18n présente');
  assert.equal(out.g3, null, 'pas de fantôme sans survol');
  assert.equal(out.g4.ok, false, 'copain sur un trou nu → rouge');
  assert.equal(out.g4.npc, true);
  assert.deepEqual(out.c1, { x: 1, y: 1 }, 'échelle 1 : case (1,1)');
  assert.deepEqual(out.c2, { x: 1, y: 1 }, 'échelle 0.5 : même case (mise à l’échelle CSS gérée)');
  assert.equal(out.c3, null, 'hors-limites → null');
});

// ——— C — Rotation posée + ramassage chaîné ———————————————————————————————
test('passe 38 C : pivot d’un meuble posé + ramassage qui embarque la poupée', () => {
  const sb = makeSandbox(false);
  const out = JSON.parse(vm.runInContext(`(() => {
    const st = baseGetState();
    baseDebugCreate('cave_1');
    baseDebugGrantAll();
    const ed = baseEditorGet();
    // Brique rouge 1×2 (canon, remplace l'ancien « banc » ORAS) : UN clic —
    // même sur la 2ᵉ case de l'empreinte — = prise en main directe (passe 41).
    // Passe 42 : ROTATION SUPPRIMÉE → le pivot est refusé proprement,
    // l'objet garde son orientation canon (DA Émeraude 2D).
    basePlace(st, 'red_brick', 2, 4, 0);
    const sel1 = baseEditorClickCell(st, 2, 5);       // seconde case de l'empreinte 1×2
    const r1 = baseEditorRotateSel(st);               // sans effet (rotation supprimée)
    const bench = st.items.find((i) => i.s === 'red_brick');
    const repose = baseEditorClickCell(st, 2, 4);     // reposé tel quel
    // Bureau + poupée « surface » dessus
    basePlace(st, 'small_desk', 4, 4, 0);
    basePlace(st, 'pichu_doll', 4, 4, 0);             // layer surface SUR le bureau
    const pichu = st.items.find((i) => i.s === 'pichu_doll');
    const desk = st.items.find((i) => i.s === 'small_desk');
    const sel2 = baseEditorClickCell(st, 4, 4);       // priorité à la surface
    const held2 = baseEditorGet().moveUid;
    const pk1 = baseEditorPickupSel(st);              // « Ramasser » RANGE la poupée tenue
    const sel3 = baseEditorClickCell(st, 4, 4);       // maintenant : le bureau
    const held3 = baseEditorGet().moveUid;
    const pk2 = baseEditorPickupSel(st);              // range aussi le bureau tenu
    const left = st.items.filter((i) => i.s === 'small_desk' || i.s === 'pichu_doll').length;
    return JSON.stringify({
      sel1: sel1.type,
      rotOk: r1.ok === false, reposeOk: repose.ok === true,
      benchRot: bench.rot,
      fpAfter: baseItemFootprint(baseItemGet('red_brick'), bench.rot),
      sel2: sel2.type, sel2IsPichu: held2 === pichu.uid,
      pk1, sel3: sel3.type, sel3IsDesk: held3 === desk.uid, pk2,
      left,
      stockDesk: baseStockCount(st, 'small_desk'), stockPichu: baseStockCount(st, 'pichu_doll'),
    });
  })()`, sb));
  assert.equal(out.sel1, 'move_start', 'UN clic sur la 2ᵉ case de l’empreinte prend la brique en main');
  assert.equal(out.rotOk, true, 'pivot refusé proprement (rotation supprimée — passe 42)');
  assert.equal(out.reposeOk, true, 'repose au même endroit');
  assert.equal(out.benchRot, 0, 'orientation inchangée (0 — pas de rotation)');
  assert.deepEqual(out.fpAfter, { w: 1, d: 2 }, 'empreinte 1×2 canon fixe');
  assert.equal(out.sel2, 'move_start');
  assert.equal(out.sel2IsPichu, true, 'la poupée (surface) est prise en priorité');
  assert.equal(out.pk1.ok, true, '« Ramasser » range la poupée tenue');
  assert.equal(out.sel3, 'move_start', 'puis le bureau');
  assert.equal(out.sel3IsDesk, true, 'le bureau est bien le meuble tenu');
  assert.equal(out.pk2.ok, true);
  assert.equal(out.left, 0, 'bureau et poupée rangés');
  assert.equal(out.stockDesk, 1);
  assert.equal(out.stockPichu, 1);
});

// ——— D — Visite interactive + combat borné + record ——————————————————————
test('passe 38 D : visite tap-to-move, interaction copain, combat borné, record crédité', () => {
  const sb = makeSandbox(true);
  const out = JSON.parse(vm.runInContext(`(() => {
    ${FURNISH}
    const r = {};
    const rec0 = { ...st.record };
    const start = baseEditorStartVisit(st, { name: '', source: 'own' });
    r.startOk = start.ok === true;
    r.mode = baseEditorGet().mode;
    r.pos0 = baseEditorGet().visit.pos.x + ',' + baseEditorGet().visit.pos.y;
    r.visits = st.record.visits;
    // Clic SUR le copain (2,6) depuis le spawn → trop loin : on s'en approche
    const mv = baseEditorVisitClick(2, 6);
    r.moveType = mv.type;
    r.moveSteps = mv.steps;
    // Passe 46 : cliquer un copain À DISTANCE l'aborde — on marche jusqu'à lui
    // et l'interaction se déclenche TOUTE SEULE à l'arrivée (retour
    // utilisateur : « une interaction de visite quand on clique dessus »).
    let guard = 0, arrival = null;
    while (guard++ < 40) {
      const tk = baseEditorVisitTick();
      if (tk.interact) arrival = tk.interact;
      if (tk.done) break;
    }
    const v = baseEditorGet().visit;
    r.pos1 = v.pos.x + ',' + v.pos.y;
    r.adjacent = Math.abs(v.pos.x - 2) + Math.abs(v.pos.y - 6) === 1;
    r.autoInteract = arrival && arrival.type;
    const it = { type: 'interact', res: arrival };
    r.interact = it.type;
    r.battleType = it.res && it.res.type;
    const launch = baseEditorLaunchNpcBattle(it.res);
    r.launchOk = launch.ok === true;
    r.champId = battle.champId;
    r.isNpcBattle = battle.isBaseNpcBattle === true;
    r.npcName = battle.baseNpcName;
    r.noCatch = battle.noAutoCatch === true;
    r.teamLen = battle.champTeam.length;
    r.teamMoves = battle.champTeam[0].moves.map((m) => m.id);
    r.teamLevel = battle.champTeam[0].level;
    r.teamShiny = !!battle.champTeam[0].shiny;
    r.launches = _launches.length;
    // Victoire du visiteur → record proprio : l++ ; session : battlesWon++
    battle.active = false;
    r.credit = baseEditorCreditBattle(true);
    r.recL = st.record.l; r.recW = st.record.w;
    r.sessW = v.battlesWon;
    // 1 combat par copain et par visite
    // 1 combat par copain et par visite : ré-aborder ne relance rien
    const again = baseEditorVisitClick(2, 6);
    r.again = (again.res && again.res.type)
      || (baseVisitInteract(baseEditorGet().visit, 2, 6).type);
    const sum = baseEditorStopVisit();
    r.sum = sum; r.modeAfter = baseEditorGet().mode;
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.startOk, true);
  assert.equal(out.mode, 'visit');
  assert.equal(out.pos0, '5,7', 'départ au point d’arrivée S (passe 43 : devant la porte)');
  assert.equal(out.visits, 1, 'visite comptée sur le record propriétaire');
  assert.equal(out.moveType, 'move', 'case occupée à distance → approche voisine');
  assert.ok(out.moveSteps >= 2);
  assert.notEqual(out.pos1, '5,7', 'le visiteur a marché');
  assert.equal(out.adjacent, true, 'arrêt face au copain');
  assert.equal(out.interact, 'interact');
  assert.equal(out.battleType, 'npc_battle');
  assert.equal(out.launchOk, true, 'combat borné lancé');
  assert.equal(out.champId, 'base_npc');
  assert.equal(out.isNpcBattle, true);
  assert.equal(out.npcName, 'Leo');
  assert.equal(out.noCatch, true, 'jamais de capture chez un copain');
  assert.equal(out.teamLen, 1);
  assert.deepEqual(out.teamMoves, ['tackle', 'growl'], 'capacités nommées instanciées en objets');
  assert.equal(out.teamLevel, 50);
  assert.equal(out.teamShiny, false);
  assert.equal(out.launches, 1, 'un seul duel lancé');
  assert.equal(out.credit, true);
  assert.equal(out.recL, 1, 'copain battu → l++ (point de vue propriétaire, canon)');
  assert.equal(out.recW, 0);
  assert.equal(out.sessW, 1);
  // Passe 52 (retour utilisateur : « on doit pouvoir le combattre autant
  //    qu'on veut ») : plus de verrou d'un combat par visite. Ouvrir le
  //    dialogue ne consomme plus rien non plus — c'était le second bug :
  //    « passer son chemin » brûlait quand même le duel.
  assert.equal(out.again, 'npc_battle', 'le PNJ reste combattable — revanche possible');
  assert.deepEqual(out.sum, { w: 1, l: 0 });
  assert.equal(out.modeAfter, 'edit');
});

test('passe 38 D2 : conversion d’équipe bornée + visite d’un fichier ami SANS crédit', () => {
  const sb = makeSandbox(true);
  const out = JSON.parse(vm.runInContext(`(() => {
    const r = {};
    // Conversion : bornes id/niveau, capacités inconnues filtrées, 4 max, shiny/talent
    const team = baseNpcTeamToChampTeam([
      { id: 9999, level: 0, moves: ['tackle', 'nope', 'growl', 'tackle', 'growl', 'nope2'], talent: 'statik', shiny: true },
      { id: -5, level: 250, moves: null, talent: null, shiny: false },
    ]);
    r.t0 = { id: team[0].id, level: team[0].level, shiny: team[0].shiny, talent: team[0].talent, moves: team[0].moves.map((m) => m.id) };
    r.t1 = { id: team[1].id, level: team[1].level, moves: team[1].moves.map((m) => m.id) };
    r.empty = baseNpcTeamToChampTeam(null).length === 0;
    // Export → visite par fichier : AUCUN crédit sur le record local
    ${FURNISH}
    const txt = baseExportString(st, 'Ami');
    const res = baseVisitFromJson(txt);
    r.importOk = res.ok === true;
    r.adopt = baseEditorAdoptVisit(res.sess, { name: res.meta.name, source: 'import' }).ok === true;
    r.own = baseEditorGet().visitOwn;
    r.winsBefore = res.sess.battlesWon;
    r.recBefore = { w: st.record.w, l: st.record.l, v: st.record.visits };
    baseEditorCreditBattle(true);
    const v = baseEditorGet().visit;
    r.sessW = v.battlesWon;
    r.recAfter = { w: st.record.w, l: st.record.l, v: st.record.visits };
    return JSON.stringify(r);
  })()`, sb));
  assert.equal(out.t0.id, 1025, 'id borné au dex national');
  assert.equal(out.t0.level, 1, 'niveau plancher 1');
  assert.equal(out.t0.shiny, true);
  assert.equal(out.t0.talent, 'statik');
  assert.deepEqual(out.t0.moves, ['tackle', 'growl', 'tackle', 'growl'], 'capacités inconnues filtrées, 4 conservées');
  assert.equal(out.t1.id, 1);
  assert.equal(out.t1.level, 100, 'niveau plafond 100');
  assert.deepEqual(out.t1.moves, ['tackle'], 'pas de noms → moveset naturel conservé');
  assert.equal(out.empty, true);
  assert.equal(out.importOk, true);
  assert.equal(out.adopt, true);
  assert.equal(out.own, false, 'visite d’ami : jamais « own »');
  assert.deepEqual(out.recBefore, out.recAfter, 'aucun crédit sur le record local (anti-triche)');
  assert.equal(out.sessW, 1, 'compteur de session seul');
});

// ——— E — Câblage UI + hooks combat ———————————————————————————————————————
test('passe 38 E : index/postboot/loader/styles + hooks victoire/blackout/abandon', () => {
  const html = R('index.html');
  for (const id of ['base-toolbar', 'base-stock', 'base-ed-hint', 'base-ed-visit', 'base-ed-export', 'base-ed-import']) {
    assert.ok(html.includes(`id="${id}"`), `index.html #${id}`);
  }
  for (const act of ['base-ed-rotate', 'base-ed-pickup', 'base-ed-visit', 'base-ed-export', 'base-ed-import', 'base-ed-select']) {
    assert.ok(html.includes(`data-action="${act}"`) || act === 'base-ed-select', `action ${act}`);
  }
  const post = R('src/file-postboot.js');
  for (const act of ['base-ed-select', 'base-ed-select-npc', 'base-ed-rotate', 'base-ed-pickup', 'base-ed-visit', 'base-ed-export', 'base-ed-import', 'debug-base-add-npc']) {
    assert.ok(post.includes(`'${act}'`), `postboot ${act}`);
  }
  const loader = R('src/loader.js');
  assert.ok(loader.indexOf('base-editor.js') > -1 && loader.indexOf('base-editor.js') < loader.indexOf('base-window.js'), 'base-editor chargé avant base-window');
  const css = R('src/assets/css/style.css');
  for (const sel of ['.base-stock-item', '#base-ed-hint', '#base-toolbar']) assert.ok(css.includes(sel), `style ${sel}`);
  // Renderer : overlay optionnel dessiné Après PNJ
  const v2d = R('src/game/base/base-view2d.js');
  assert.ok(/baseView2dDraw\(canvas, st, sprites, overlay\)/.test(v2d), 'signature overlay');
  assert.ok(v2d.includes('base2dOverlay') && v2d.includes('overlay.ghost') && v2d.includes('overlay.visitor') && v2d.includes('overlay.select') && v2d.includes('overlay.path'), 'surcouche complète');
  // Hooks combat du duel borné (3 issues : victoire, blackout, abandon)
  assert.ok(R('src/game/combat/battle-switch.js').includes('battle.isBaseNpcBattle'), 'champVictory hook');
  assert.ok(R('src/game/combat/battle-encounter.js').includes('battle.isBaseNpcBattle'), 'blackout hook');
  assert.ok(R('src/game/combat/battle-flow.js').includes('battle.isBaseNpcBattle'), 'abandon hook');
  for (const f of ['battle-switch.js', 'battle-encounter.js', 'battle-flow.js']) {
    assert.ok(R(`src/game/combat/${f}`).includes('baseEditorCreditBattle'), `crédit dans ${f}`);
  }
  const i18n = R('src/localization/i18n.js');
  assert.ok(i18n.includes("id==='base_npc'"), 'getChampName : nom dynamique du copain');
  // Parité i18n fr/en des nouvelles clés
  const fr = R('src/localization/fr/base.js'), en = R('src/localization/en/base.js');
  const keys = (src, re) => [...src.matchAll(re)].map((m) => m[1]);
  const editFr = keys(fr, /"([a-z_0-9]+)":"/g);
  for (const k of ['"visit_start_own"', '"battle_done"', '"battle_challenge"', '"picked_up"', '"npc_placed"', '"visit_end"', '"blocked"', '"heal"']) {
    assert.ok(fr.includes(k + ':'), `fr ${k}`);
    assert.ok(en.includes(k + ':'), `en ${k}`);
  }
  assert.ok(R('src/localization/fr/ui.js').includes('"debug_base_npc"') && R('src/localization/en/ui.js').includes('"debug_base_npc"'), 'clé debug_base_npc fr+en');
  assert.ok(R('index.html').includes('data-action="debug-base-add-npc"'), 'bouton debug copain');
});

// ——— F — Garde WebGL2 ————————————————————————————————————————————————————
test('passe 38 F : sans WebGL2 la 3D est désactivée, repli 2D, visite forcée 2D', () => {
  // Passe 55 : la fenêtre « Base Secrète » est PUREMENT 2D — la 3D a la
  // sienne (win-base3d), avec son propre gameplay. La garde WebGL2 a donc
  // déménagé : c'est la fenêtre 3D qui affiche le message si le contexte
  // n'est pas disponible, et la 2D n'a plus rien à replier.
  const win = R('src/game/base/base-window.js');
  assert.ok(win.includes("_baseWin.c2d.addEventListener('click', baseWindowCanvasClick)"), 'interactions éditeur UNIQUEMENT sur le canvas 2D');
  // drawSt = état du propriétaire OU de la session de visite (alcôve vide / base d'ami)
  assert.ok(win.includes('baseView2dDraw(_baseWin.c2d, drawSt, _baseWin.sprites2d, overlay)'), 'overlay passé au renderer 2D');
  assert.ok(!win.includes("modeSel.value = hasGl"), 'plus de bascule de mode dans la fenêtre 2D');

  assert.ok(!E('src/game/base/base3d-window.js'), 'fenêtre 3D supprimée');
  assert.ok(!E('src/game/base/base3d-view.js'), 'renderer 3D supprimé');
});

