import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 28 : OfflineEngine — rattrapage hors-ligne par fast-forward ─────────
//  A. Orchestrateur unique (registre) + détection par trou de heartbeat (>15 s,
//     quelle que soit la visibilité) + verrou d'onglet + plafond 12 h.
//  B. Fast-forward des combats sauvages : le VRAI moteur battleTick() rejoué en
//     accéléré (test différentiel live vs FF sur RNG semée).
//  C. Budget TEMPS par système : plafonds cachés supprimés (720 victoires /
//     120 ticks d'entraînement / 500 pas de mine) — régénération d'énergie
//     intercalée pour la mine auto (fidélité live).
//  D. Timeskip debug 30 min recâblé sur OfflineEngine.simulate (API prête pour
//     les futurs objets de saut de temps).
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, scrollTop: 0,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
  };
}

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    _map: m,
  };
}

const SANDBOX_FILES = [
  'src/file-preflight.js',
  'src/game/core/event-bus.js',
  'src/data/moves.js', 'src/data/pd-data.js',
  'src/data/items-data.js', 'src/data/items-helpers.js',
  'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js', 'src/data/talents-full.js',
  'src/data/locations-data.js', 'src/data/locations-johto.js',
  'src/data/shops-data.js', 'src/data/route-drops.js', 'src/data/ctcs-shop-data.js',
  'src/data/game-helpers.js',
  'src/localization/fr/types.js', 'src/localization/en/types.js',
  'src/localization/fr/talents.js', 'src/localization/en/talents.js',
  'src/localization/fr/move-descs.js',
  'src/localization/fr/ui.js', 'src/localization/en/ui.js',
  'src/localization/fr/items.js', 'src/localization/en/items.js',
  'src/localization/fr/messages.js', 'src/localization/en/messages.js',
  'src/localization/fr/combat.js', 'src/localization/en/combat.js',
  'src/localization/data.js', 'src/localization/i18n.js',
  'src/engine/data/badge-helper.js',
  'src/game/core/util.js', 'src/game/core/state.js', 'src/game/core/pokemon-factory.js',
  'src/game/world/world.js', 'src/game/world/collection.js', 'src/game/world/team.js',
  'src/game/economy/mine.js', 'src/game/economy/inventory.js',
  'src/game/combat/battle-init.js', 'src/game/combat/battle-encounter.js',
  'src/game/combat/battle-tick.js', 'src/game/combat/battle-attack.js',
  'src/game/combat/battle-status.js', 'src/game/combat/battle-ui.js',
  'src/game/combat/battle-team-ui.js', 'src/game/combat/battle-flow.js',
  'src/game/combat/battle-switch.js', 'src/game/combat/battle-summary.js',
  'src/game/combat/progression.js', 'src/game/combat/catch.js',
  'src/game/combat/training.js', 'src/game/combat/move-learning.js',
  'src/game/breeding/hatchery.js',
  'src/game/display/sprite-helpers.js',
  'src/game/display/team-ui.js',
  'src/game/display/exploration.js',
  'src/game/save/save.js',
  'src/game/save/offline-engine.js',
];

function makeLcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function makeSandbox({ seed } = {}) {
  const store = makeStorage();
  const elRegistry = new Map(); // auto-vivification : simule le vrai DOM complet du jeu
  const getEl = (id) => { if (!elRegistry.has(id)) elRegistry.set(id, makeEl()); return elRegistry.get(id); };
  const sandbox = {
    console, window: {},
    document: {
      visibilityState: 'visible',
      body: makeEl(), head: makeEl(), documentElement: makeEl(),
      getElementById: (id) => getEl(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => makeEl(),
      createTextNode: () => ({}),
      addEventListener() {}, removeEventListener() {},
    },
    localStorage: store,
    navigator: { language: 'fr' },
    location: { href: 'http://localhost/', reload() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    setInterval: () => 1, clearInterval: () => {},
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    PokeWorldGameStarted: false,
    _storage: store,
  };
  if (seed != null) {
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = makeLcg(seed);
  }
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  sandbox.runInContextAsync = (code) => {
    const r = vm.runInContext(code, sandbox);
    return (r && typeof r.then === 'function') ? r : Promise.resolve(r);
  };
  for (const f of SANDBOX_FILES) vm.runInContext(R(f), sandbox, { filename: f });
  // Stubs légers (écrasent les vraies versions DOM-dépendantes)
  vm.runInContext(`
    spriteImg = function(){ return '<span class="sprite-stub"></span>'; };
    itemSpriteHtml = function(){ return '<span class="sprite-stub"></span>'; };
    if (typeof renderMap === 'function') renderMap = function(){};
    if (typeof renderMineWindow === 'undefined') renderMineWindow = function(){}; // mine-ui.js hors bac à sable
    window.PokeWorldGameStarted = true;
  `, sandbox);
  return sandbox;
}

function seedGame(sb, { location = 'route1', level = 12, money = 1000 } = {}) {
  vm.runInContext(`
    currentSaveId = 'PW-TEST';
    G.starter = true;
    G.location = '${location}';
    G.region = 'kanto';
    G.money = ${money};
    G.inventory = {};
    G.pokedex = {};
    G.hatchery = [];
    G.badges = [];
    G.team = [createPoke(4, ${level}, false)];
    G.team[0].currentHP = G.team[0].maxHP;
    battle.active = false; battle.enemyPoke = null; battle.chill = true; battle.speed = 1;
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0;
  `, sb);
}

// projection comparable de l'état (ignore les clés Date.now des boîtes)
function projectState(sb) {
  return JSON.parse(JSON.stringify(vm.runInContext(`({
    team: G.team.map(p => ({ id: p.id, lvl: p.level, xp: p.xp, hp: p.currentHP, max: p.maxHP, moves: (p.moves||[]).map(m=>m.id), status: p.status })),
    money: G.money,
    inv: G.inventory,
    dex: G.pokedex,
    dupe: G.dupeCatches,
    collection: Object.keys(G.collection).sort().map(k => { const p = G.collection[k]; return { id: p.id, lvl: p.level, sh: !!p.shiny }; }),
  })`, sb)));
}

// ————————————————————————— A — Orchestrateur & détection —————————————————————
test('passe 28 A : OfflineEngine exposé, 3 handlers par défaut, plafond 12 h', () => {
  const sb = makeSandbox();
  assert.ok(sb.OfflineEngine, 'OfflineEngine existe');
  assert.ok(sb.OfflineEngine.handler('wild-battles'), 'handler combats enregistré');
  assert.ok(sb.OfflineEngine.handler('training'), 'handler entraînement enregistré');
  assert.ok(sb.OfflineEngine.handler('mine'), 'handler mine enregistré');
  assert.equal(sb.OfflineEngine.MAX_MS, 12 * 3600 * 1000, 'plafond 12 h (décision utilisateur)');
  const src = R('src/game/save/offline-engine.js');
  assert.ok(src.includes('const OFFLINE_MIN_GAP_MS = 15000;'), 'seuil de trou de heartbeat 15 s');
  assert.ok(src.includes("appTimer('offline-heartbeat', offlinePollHeartbeat, 2000)"), 'heartbeat 2 s installé');
  assert.ok(R('src/loader.js').includes('"src/game/save/offline-engine.js"'), 'loader charge le moteur');
});

test('passe 28 A : verrou d\u2019onglet anti double-rattrapage', () => {
  const sb = makeSandbox();
  vm.runInContext(`currentSaveId = 'PW-TEST';`, sb);
  const key = 'pokeworld_ff_lock_PW-TEST';
  // verrou frais d'un autre onglet → refus
  sb._storage.setItem(key, JSON.stringify({ tabId: 'tab-other', ts: Date.now() }));
  assert.equal(sb.offlineAcquireLock(), false, 'onglet étranger frais = refus');
  // verrou expiré → acquisition
  sb._storage.setItem(key, JSON.stringify({ tabId: 'tab-other', ts: Date.now() - 30000 }));
  assert.equal(sb.offlineAcquireLock(), true, 'verrou expiré = acquisition');
  // notre propre verrou → ok
  assert.equal(sb.offlineAcquireLock(), true, 'propre verrou = ok');
});

test('passe 28 A : trou de heartbeat déclenche le rattrapage, pas de double déclenchement', async () => {
  const sb = makeSandbox({ seed: 42 });
  seedGame(sb);
  // dernier signe de vie il y a 30 min → trou → simulate
  vm.runInContext(`
    storageSet(afkStorageKey(), JSON.stringify({ ts: Date.now() - 30 * 60 * 1000 }));
    offlinePollHeartbeat();
  `, sb);
  const sim = vm.runInContext(`_offlineGetLastSim()`, sb);
  assert.ok(sim, 'le trou de heartbeat a lancé une simulation');
  const result = await sim;
  assert.ok(result, 'résultat produit');
  assert.equal(result.timeMs, 30 * 60 * 1000, 'durée = 30 min comprises dans le trou');
  // poll suivant immédiat : horodatage frais → AUCUNE nouvelle simulation
  vm.runInContext(`window._lastSimBefore = _offlineGetLastSim(); offlinePollHeartbeat();`, sb);
  const sim2 = vm.runInContext(`_offlineGetLastSim()`, sb);
  assert.equal(sim2, vm.runInContext(`window._lastSimBefore`, sb), 'pas de second rattrapage avec un horodatage frais');
  assert.equal(sim2, sim, 'toujours la même promesse (idempotent)');
});

test('passe 28 A : onglet masqué = signe de vie figé puis rattrapage de la durée totale', async () => {
  const sb = makeSandbox({ seed: 7 });
  seedGame(sb);
  // passage en hidden : fige l'horodatage au moment du masquage…
  vm.runInContext(`
    document.visibilityState = 'hidden';
    offlinePollHeartbeat(); // capture le masquage à t0 — ne doit rien déclencher
  `, sb);
  assert.equal(vm.runInContext(`_offlineGetLastSim()`, sb), null, 'rien ne se déclenche pendant que l\u2019onglet est masqué');
  // …puis 2 h passent réellement (heartbeat throttlé) : backdatage des deux marqueurs
  vm.runInContext(`
    offlineHiddenSince = Date.now() - 2 * 3600 * 1000;
    storageSet(afkStorageKey(), JSON.stringify({ ts: Date.now() - 2 * 3600 * 1000 }));
    document.visibilityState = 'visible';
    offlinePollHeartbeat();
  `, sb);
  const result = await vm.runInContext(`_offlineGetLastSim()`, sb);
  assert.equal(result.timeMs, 2 * 3600 * 1000, 'les 2 h masquées sont rattrapées au retour');
});

// ————————————————————————— B — Fidélité du fast-forward ——————————————————————
test('passe 28 B : DIFFÉRENTIEL — 60 s de fast-forward ≡ 600 ticks live (même RNG)', async () => {
  const build = (seed) => {
    const sb = makeSandbox({ seed });
    seedGame(sb, { location: 'route1', level: 12 });
    // passe 30 : le FF ne rejoue des combats sauvages QUE si le joueur était en
    // pleine exploration au moment du départ (drapeau persisté ici).
    vm.runInContext(`G.wildSessionActive = true;`, sb);
    // attendu par le test : la session FF et la session live partent du même point
    return sb;
  };
  // — A : fast-forward offline
  const sbA = build(1337);
  await sbA.runInContextAsync(`(async () => { window._r = await offlineSimulate(60000, 'debug'); })()`); // 60 s
  // — B : live manuel (même session, vrai battleTick, wait instantané = seul raccourci partagé)
  const sbB = build(1337);
  await vm.runInContext(`(async () => {
    window.wait = function(){ return Promise.resolve(); };
    offlineStartWildSession(getLocObj(G.location));
    let simMsB = 0;
    for (let i = 0; i < 600 && simMsB < 60000; i++) {
      if (!battle.active) break;
      if (battle.resolvingKO) { await Promise.resolve(); i--; continue; }
      battle.paused = false;
      battleTick();
      simMsB += 100 * (battle.speed || 1);
    }
    window._simMsB = simMsB;
  })()`, sbB);
  const winsA = vm.runInContext(`battle.sessionWins`, sbA);
  const winsB = vm.runInContext(`battle.sessionWins + ' (' + window._simMsB + ' ms)'`, sbB);
  console.log('  [diff] winsA(sim 60s)=%s winsB(live)=%s', winsA, winsB);
  assert.deepEqual(projectState(sbA), projectState(sbB),
    'le fast-forward produit EXACTEMENT l\u2019état du jeu réel (équipe, XP, PV, captures, pokedex, argent, inventaire) — winsA=' + winsA + ' winsB=' + winsB);
});

test('passe 28 B : le fast-forward récompense une équipe forte (victoires, XP, captures honnêtes)', async () => {
  const sb = makeSandbox({ seed: 2024 });
  seedGame(sb, { location: 'route1', level: 30 });
  vm.runInContext(`G.wildSessionActive = true;`, sb); // passe 30 : chaîne sauvage active au départ
  const before = projectState(sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  assert.equal(result.lost, false, 'pas de K.O.');
  assert.ok(result.wins > 10, `des victoires significatives sur 5 min (obtenu : ${result.wins})`);
  const after = projectState(sb);
  assert.ok(after.team[0].xp >= before.team[0].xp || after.team[0].lvl > before.team[0].lvl, 'XP gagnée');
  // UI restaurée après le fast-forward
  assert.notEqual(String(sb.notify), 'function (){}', 'notify restaurée après le FF');
  assert.equal(vm.runInContext(`window.PW_FF`, sb), false, 'drapeau FF retombé');
  // la chaîne continue : battle actif, timer relancé
  assert.equal(vm.runInContext(`battle.active && !battle.paused`, sb), true, 'chaîne de combats relancée');
  assert.ok(vm.runInContext(`battle.timerId`, sb), 'ticker battleTick relancé');
});

test('passe 28 B : équipe faible = K.O. d\u2019équipe, pénalité d\u2019argent, fin propre (pas de boucle)', async () => {
  const sb = makeSandbox({ seed: 99 });
  seedGame(sb, { location: 'route1', level: 3, money: 1000 });
  vm.runInContext(`
    LOCS.deathtest = { name: 'Route test', wild: [[249, 60, 65, 'common']] };
    G.location = 'deathtest';
    G.deadTestActive = true;
    G.wildSessionActive = true; // passe 30 : le joueur explorait cette route mortelle
  `, sb);
  const result = await vm.runInContext(`offlineSimulate(600000, 'return')`, sb); // 10 min
  assert.equal(result.lost, true, 'défaite détectée');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'combat terminé');
  assert.equal(vm.runInContext(`G.money`, sb), 900, 'pénalité de 10 % appliquée (1000 → 900)');
  assert.ok(result.fainted >= 1, 'au moins 1 K.O. comptabilisé');
});

// ————————————————————————— C — Budget temps par système ——————————————————————
test('passe 28 C : mine auto déplafonnée (12 h ≠ 10 min) ET régénération intercalée', () => {
  const sb = makeSandbox({ seed: 5 });
  vm.runInContext(`
    currentSaveId = 'PW-TEST';
    G.starter = true; G.badges = []; G.money = 1000000;
    initMineIfNeeded();
    G.mine.automation = { enabled: true, purchased: true };
    G.mine.energy = 0;
    window._digs = simulateAfkMineAutomation(3600); // 1 h = 3000 pas (ancien plafond : 500)
  `, sb);
  const digs = vm.runInContext(`window._digs`, sb);
  assert.ok(digs > 500, `> 500 excavations en 1 h (plafond historique pulvérisé, obtenu : ${digs})`);
  const src = R('src/game/economy/mine.js');
  assert.ok(src.includes('Math.min(40000'), 'plafond 500 supprimé (garde-fou perf 40000)');
  assert.ok(src.includes('regenPerStep'), 'régénération intercalée documentée');
});

function seedTrainingSlot(sbScript) {
  return `
    currentSaveId = 'PW-TEST';
    G.starter = true; G.location = 'route1'; G.region = 'kanto';
    G.badges = ['boulder'];
    G.team = [createPoke(4, 30, false)];
    ensureTrainingSlots();
    const slot = G.trainingSlots[0];
    slot.active = true; slot.mode = 'ev';
    slot.uid = G.team[0].uid;
    const enemies = [];
    for (let i = 0; i < 400; i++) enemies.push(createPoke(19, 3, false));
    slot.battle = {
      enemies: enemies, enemyIndex: 0, enemy: enemies[0], mode: 'ev',
      pMoveIdx: 0, eMoveIdx: 0, logs: [],
      pCd: trainingCalcCd(G.team[0]), eCd: trainingCalcCd(enemies[0]),
      pCdMax: trainingCalcCd(G.team[0]), eCdMax: trainingCalcCd(enemies[0]),
    };
  `;
}

test('passe 29 C : DIFFÉRENTIEL entraînement — 60 s de FF ≡ 600 ticks live (même RNG)', async () => {
  // — A : fast-forward offline de la vraie boucle updateTrainingSlots
  const sbA = makeSandbox({ seed: 4242 });
  vm.runInContext(seedTrainingSlot(), sbA);
  await vm.runInContext(`(async () => { await offlineFastForwardTraining(60); })()`, sbA);
  // — B : live manuel, appel par appel comme le ticker
  const sbB = makeSandbox({ seed: 4242 });
  vm.runInContext(seedTrainingSlot(), sbB);
  await vm.runInContext(`(async () => {
    let simMs = 0;
    for (let i = 0; i < 600 && simMs < 60000; i++) {
      updateTrainingSlots();
      simMs += 100 * (battle.speed || 1);
    }
  })()`, sbB);
  const projA = JSON.parse(JSON.stringify(vm.runInContext(`(() => { const s = G.trainingSlots[0]; const tb = s.battle; return {
    active: s.active, eidx: tb ? tb.enemyIndex : null, ehp: tb && tb.enemy ? tb.enemy.currentHP : null,
    pCd: tb ? Math.round(tb.pCd) : null, eCd: tb ? Math.round(tb.eCd) : null,
    trainee: { hp: G.team[0].currentHP, lvl: G.team[0].level, evs: G.team[0].evs },
    lastResult: s.lastResult,
  }; })()`, sbA)));
  const projB = JSON.parse(JSON.stringify(vm.runInContext(`(() => { const s = G.trainingSlots[0]; const tb = s.battle; return {
    active: s.active, eidx: tb ? tb.enemyIndex : null, ehp: tb && tb.enemy ? tb.enemy.currentHP : null,
    pCd: tb ? Math.round(tb.pCd) : null, eCd: tb ? Math.round(tb.eCd) : null,
    trainee: { hp: G.team[0].currentHP, lvl: G.team[0].level, evs: G.team[0].evs },
    lastResult: s.lastResult,
  }; })()`, sbB)));
  assert.deepEqual(projA, projB, 'l\u2019entraînement en fast-forward reproduit EXACTEMENT la boucle live (rounds, PV, EV, cooldowns)');
  assert.ok(projA.eidx === null || projA.eidx > 10, `des rounds ont bien été joués (enemyIndex=${projA.eidx})`);
});

test('passe 29 C : entraînement FF au-delà de l\u2019ancien plafond (12 h ≠ 50 min / 120 ticks)', async () => {
  const sb = makeSandbox({ seed: 55 });
  vm.runInContext(seedTrainingSlot(), sb);
  const res = await vm.runInContext(`offlineFastForwardTraining(3600)`, sb); // 1 h
  const idx = vm.runInContext(`(() => { const s = G.trainingSlots[0]; return s.battle ? s.battle.enemyIndex : 999; })()`, sb);
  assert.ok(idx > 120, `plus de 120 rounds en 1 h (ancien plafond pulvérisé, obtenu : ${idx})`);
  assert.ok(res.sessions >= 1 || res.secondsUsed > 0, 'sessions/activité comptabilisées');
  assert.ok(!R('src/game/combat/training.js').includes('simulateAfkTrainingProgress'), 'ancien simulateur d\u2019entraînement supprimé');
});

// ————————————————————————— D — Timeskip 30 min + purge ———————————————————————
test('passe 28 D : timeskip debug 30 min câblé partout', async () => {
  assert.ok(R('index.html').includes('data-call="debugTimeSkip30Minutes"'), 'bouton debug → 30 min');
  assert.ok(R('src/game/save/settings.js').includes('debugTimeSkipAfk30Minutes'), 'wrapper settings renommé');
  assert.ok(R('src/file-postboot.js').includes("'debug-timeskip-30m'"), 'action postboot renommée');
  assert.ok(R('src/file-preflight.js').includes("'debug-timeskip-30m'"), 'mapping preflight renommé');
  assert.ok(R('src/localization/fr/ui.js').includes('"debug_afk":"AFK +30 min"'), 'libellé FR 30 min');
  assert.ok(R('src/localization/en/ui.js').includes('"debug_afk":"AFK +30 min"'), 'libellé EN 30 min');
  const sb = makeSandbox({ seed: 3 });
  seedGame(sb, { location: 'route1', level: 25 });
  await vm.runInContext(`(async () => { await debugTimeSkip30Minutes(); })()`, sb);
  const result = sb.OfflineEngine._lastResult;
  assert.equal(result.timeMs, 30 * 60 * 1000, '30 minutes simulées');
  assert.equal(result.debug, true, 'marqueur debug');
});

test('passe 28 D : ancien estimateur AFK purgé (une seule source de vérité)', () => {
  for (const dead of ['estimateAfkMoveDamage', 'simulateAfkWildWin', 'simulateAfkFight', 'applyAfkProgress', 'applyAfkReturn', 'AFK_MAX_WINS', 'debugTimeSkip10Minutes', 'debugTimeskip10m']) {
    assert.ok(!R('src/game/save/save.js').includes(dead), `save.js ne référence plus ${dead}`);
  }
  for (const f of ['src/file-postboot.js', 'src/file-preflight.js', 'src/game/save/settings.js', 'index.html']) {
    assert.ok(!R(f).includes('debugTimeSkip10Minutes') && !R(f).includes('debugTimeSkipAfk10Minutes'), `${f} ne référence plus le timeskip 10 min`);
  }
  // saveGame protégé pendant un fast-forward
  assert.ok(R('src/game/save/save.js').includes("if(typeof afkApplying !== 'undefined' && afkApplying) return false;"), 'saveGame saute pendant le FF');
  // shim de compat conservé (saveGame/activateCurrentSave l'utilisent)
  assert.ok(R('src/game/save/save.js').includes('function markAfkSeen(force)'), 'markAfkSeen conservé');
  assert.ok(R('src/game/save/save.js').includes('function scheduleAfkCatchup(reason)'), 'scheduleAfkCatchup → offlineScheduleCatchup');
});

test('passe 28 D : modale récap = 8 mesures (entraînement + minages ajoutés), seuil 60 s', () => {
  const src = R('src/game/save/offline-engine.js');
  assert.ok(src.includes("'afk_panel_training'") && src.includes("'afk_panel_mine_digs'"), 'lignes entraînement/minages dans la grille');
  assert.ok(src.includes('const OFFLINE_RECAP_MIN_MS = 60000;'), 'modale silencieuse sous 60 s');
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_panel_training":"Entraînement"'), 'clé FR entraînement');
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_panel_mine_digs":"Minages auto"'), 'clé FR minages');
  assert.ok(R('src/localization/en/ui.js').includes('"afk_ff_progress"'), 'clé EN progression FF');
});

// ———————————————————— E — passe 29 : barre de progression vivante —————————————
test('passe 29 E : la progression se PEIND (barre croissante + étapes), puis le récap', async () => {
  const sb = makeSandbox({ seed: 314 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`G.wildSessionActive = true;`, sb); // passe 30 : chaîne active pour avoir de l'activité à résumer
  // capture de chaque écriture innerHTML sur la modale
  const paints = [];
  const el = sb.document.getElementById('afk-result-modal');
  let _html = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _html; },
    set(v) { _html = String(v); if (_html) paints.push(_html); },
    configurable: true,
  });
  await vm.runInContext(`(async () => { await debugTimeSkip30Minutes(); })()`, sb);
  const withBar = paints.filter(h => h.includes('afk-ff-bar'));
  assert.ok(withBar.length >= 2, `au moins 2 peintures de la barre (obtenu : ${withBar.length})`);
  const pcts = withBar.map(h => { const m = h.match(/width:(\d+)%/); return m ? Number(m[1]) : -1; });
  assert.ok(pcts.every(p => p >= 0), 'pourcentages extraits');
  for (let i = 1; i < pcts.length; i++) assert.ok(pcts[i] >= pcts[i - 1], `barre croissante (${pcts.join('→')})`);
  assert.ok(pcts[pcts.length - 1] >= 90, `barre atteint la fin (${pcts[pcts.length - 1]} %)`);
  assert.ok(paints.some(h => h.includes(t => t) || h.includes('Combats sauvages')), 'étape « Combats sauvages » affichée');
  assert.ok(paints.some(h => h.includes('offline_ff_title') || h.includes('Calcul du temps écoulé')), 'titre de calcul affiché');
  // à la fin : le récapitulatif remplace la barre
  assert.ok(paints[paints.length - 1].includes('afk-result-grid'), 'dernier rendu = récapitulatif');
  assert.ok(paints[paints.length - 1].includes('Entraînement') && paints[paints.length - 1].includes('Minages auto'), 'récap comporte les lignes entraînement/mine');
});

test('passe 29 E : titre/étapes localisés FR+EN', () => {
  for (const key of ['offline_ff_title', 'offline_stage_battles', 'offline_stage_battles_wins', 'offline_stage_training', 'offline_stage_training_sessions', 'offline_stage_mine']) {
    assert.ok(R('src/localization/fr/ui.js').includes(`"${key}"`), `clé FR ${key}`);
    assert.ok(R('src/localization/en/ui.js').includes(`"${key}"`), `clé EN ${key}`);
  }
  assert.ok(R('src/assets/styles/cleaned-components.css').includes('.afk-ff-stage'), 'style de la ligne d\u2019étape');
});
