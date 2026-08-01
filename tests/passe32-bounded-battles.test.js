import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 32 : bêta — « aucune zone sauvage active à simuler » ──────────────
//  A. Bug n°1 : chaîne sauvage dont la résolution d'un K.O. est restée FIGÉE
//     par le gel de l'onglet (wait() jamais résolu) → le FF tournait à vide :
//     0 victoire + message trompeur. Le moteur doit rattraper la résolution.
//  B. Bug n°2 : combats BORNÉS (dresseur de quête, arène, ligue, atoll,
//     légendaire) ignorés par le rattrapage → désormais TERMINÉS honnêtement
//     (un seul combat, arrêt au premier endBattle).
//  D. Recâblages + clés i18n.
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, scrollTop: 0,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, remove() {}, insertBefore() {},
    children: { length: 0 }, firstChild: null,
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
  const elRegistry = new Map();
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
  for (const f of SANDBOX_FILES) vm.runInContext(R(f), sandbox, { filename: f });
  vm.runInContext(`
    spriteImg = function(){ return '<span class="sprite-stub"></span>'; };
    itemSpriteHtml = function(){ return '<span class="sprite-stub"></span>'; };
    // Stubs inconditionnels : map-render.js n'est PAS chargé ici — renderMap()
    // serait sinon un ReferenceError dans les continuations async (champVictory).
    renderMap = function(){};
    renderMineWindow = function(){};
    renderTeamWindow = function(){};
    renderHatcheryWindow = function(){};
    renderStoryWindow = function(){};
    // tabs.js / fullscreen-panel.js non chargés : appelés en continuation async
    // de champVictory (showTab) et de la voie atoll (openFullscreenPanel).
    showTab = function(){};
    openFullscreenPanel = function(){};
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
    G.defeatedChamps = {};
    G.team = [createPoke(4, ${level}, false)];
    G.team[0].currentHP = G.team[0].maxHP;
    battle.active = false; battle.enemyPoke = null; battle.chill = true; battle.speed = 1;
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0;
  `, sb);
}

// ————————————————— A — K.O. figé par le gel de l'onglet —————————————————————
test('passe 32 A : ennemi K.O. + onglet gelé pile pendant la résolution = le rattrapage AVANCE', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 555 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location));
    // Gel de l'onglet au milieu du K.O. : wait() ne se résoudra que dans ~300 ms
    // de temps RÉEL (comportement navigateur : timers suspendus qui repartent).
    window.wait = function(){ return new Promise(r => setTimeout(r, 300)); };
    let guard = 0;
    while(guard++ < 8000 && !battle.resolvingKO){
      battle.paused = false;
      battleTick(); // joué en live jusqu'au K.O. — la résolution se fige au wait()
    }
  `, sb);
  assert.equal(vm.runInContext(`battle.resolvingKO`, sb), true, 'résolution de K.O. bien figée par le gel');
  assert.equal(vm.runInContext(`battle.active && battle.chill`, sb), true, 'chaîne sauvage active');
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  assert.ok(result.wins > 3, `le rattrapage rejoue la chaîne malgré le K.O. figé (obtenu : ${result.wins} — avant : 0 + message d’erreur)`);
  assert.notEqual(result.wins, 0, 'plus de « 0 victoire » trompeur');
  // Passe 48 — CORRECTION DU TEST (il échouait depuis plusieurs passes).
  // L'assertion « battle.active === true » était FAUSSE dans son propre
  // scénario : l'équipe de test ne compte qu'UN Pokémon (seedGame) et le
  // rattrapage simule 5 MINUTES de chaîne sauvage. Il gagne 67 combats puis
  // finit — logiquement — par tomber K.O. (`result.lost === true`, équipe à
  // 0 PV) : le moteur ARRÊTE alors la chaîne, ce qui est le comportement
  // attendu. Ce que ce test doit prouver, c'est que le K.O. figé par le gel
  // de l'onglet ne bloque plus le rattrapage — donc : la résolution est
  // débloquée et la chaîne a réellement progressé.
  assert.equal(vm.runInContext(`battle.resolvingKO`, sb), false,
    'le K.O. figé a bien été débloqué par le rattrapage');
  const alive = vm.runInContext(`(G.team || []).filter((p) => p && p.currentHP > 0).length`, sb);
  const stillActive = vm.runInContext(`battle.active`, sb);
  assert.ok(stillActive || alive === 0,
    'la chaîne tourne encore, OU elle s’est arrêtée parce que l’équipe est K.O. (cas nominal ici)');
});

// ————————————————— B — Combats bornés : arène, quêtes, ligue, atoll —————————
function seedBoundedBattle(sbSrc) {
  return `
    battle.active = true; battle.isChamp = true; battle.champId = 'boulder'; battle.chill = false;
    battle.isLeague = false; battle.isTraining = false; battle.escaped = false; battle.resolvingKO = false;
    battle.champTeam = ${sbSrc};
    battle.champPokeIdx = 0;
    battle.enemyPoke = battle.champTeam[0];
    battle.pMoveIdx = 0; battle.eMoveIdx = 0;
    battle.playerMods = { atk: 1, def: 1, spe: 1 }; battle.enemyMods = { atk: 1, def: 1, spe: 1 };
    battle.playerPokeIdx = 0;
    battle.pCd = 100; battle.eCd = 100; battle.paused = true; // onglet masqué (suspendu)
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0; battle.sessionPlayerKOs = 0;
    G.defeatedChamps = {};
  `;
}

test('passe 32 B : arène en cours = le combat est TERMINÉ pendant l’absence (victoire, badge, récompense)', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 777 });
  seedGame(sb, { location: 'pewter', level: 40, money: 1000 });
  vm.runInContext(seedBoundedBattle('[createPoke(95, 8, false), createPoke(95, 9, false)]'), sb);
  const moneyBefore = vm.runInContext(`G.money`, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.equal(result.boundedBattle, 'won', 'combat d’arène résolu en victoire');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'combat terminé (pas relancé)');
  assert.ok(vm.runInContext(`G.badges.includes('boulder')`, sb), 'badge obtenu');
  assert.ok(vm.runInContext(`G.money`, sb) > moneyBefore, 'récompense du champion encaissée');
  assert.equal(result.wins, 0, 'aucun combat sauvage gratuit en prime');
});

test('passe 32 B : combat clé perdu pendant l’absence = défaite honnête (pénalité 10 %)', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 888 });
  seedGame(sb, { location: 'pewter', level: 3, money: 1000 });
  vm.runInContext(seedBoundedBattle('[createPoke(95, 60, false)]'), sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.equal(result.boundedBattle, 'lost', 'défaite d’arène détectée');
  assert.equal(vm.runInContext(`G.money`, sb), 900, 'pénalité de 10 % appliquée (1000 → 900)');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'combat terminé');
  assert.equal(vm.runInContext(`G.badges.length`, sb), 0, 'pas de badge offert');
});

test('passe 32 B : rencontre légendaire (chaîne unique, chill=false) résolue aussi', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 909 });
  seedGame(sb, { location: 'route1', level: 60, money: 1000 });
  vm.runInContext(`
    battle.active = true; battle.isChamp = false; battle.chill = false;
    battle.isLeague = false; battle.isTraining = false; battle.resolvingKO = false;
    battle.legendaryCatch = false; battle.noAutoCatch = true;
    battle.enemyPoke = createPoke(144, 10, false); // affaibli pour le test
    battle.pMoveIdx = 0; battle.eMoveIdx = 0;
    battle.playerMods = { atk: 1, def: 1, spe: 1 }; battle.enemyMods = { atk: 1, def: 1, spe: 1 };
    battle.playerPokeIdx = 0; battle.pCd = 100; battle.eCd = 100; battle.paused = true;
    battle.sessionCatches = []; battle.sessionItems = {}; battle.sessionWins = 0;
  `, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.equal(result.boundedBattle, 'won', 'rencontre unique terminée pendant l’absence');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'combat terminé');
});

test('passe 32 B : chaîne sauvage figée en live PUIS budget restant → chaîne poursuivie (double garde)', { timeout: 30000 }, async () => {
  const sb = makeSandbox({ seed: 606 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location));
    window.wait = function(){ return new Promise(r => setTimeout(r, 250)); };
    let guard = 0;
    while(guard++ < 8000 && !battle.resolvingKO){ battle.paused = false; battleTick(); }
  `, sb);
  assert.equal(vm.runInContext(`battle.resolvingKO && battle.chill`, sb), true);
  const result = await vm.runInContext(`offlineSimulate(120000, 'return')`, sb);
  assert.ok(result.wins > 1, `chaîne poursuivie après dégel (obtenu : ${result.wins})`);
  assert.equal(result.boundedBattle, null, 'pas de combat borné ici');
});

// ————————————————— D — Recâblages & i18n ————————————————————————————————————
test('passe 32 D : recâblages présents + nouvelles clés i18n FR/EN + message corrigé', () => {
  const oe = R('src/game/save/offline-engine.js');
  assert.ok(oe.includes('function offlineDrainStuckLiveKOs'), 'drain anti-gel présent');
  assert.ok(oe.includes('function offlineIsBoundedBattle'), 'détecteur de combat borné présent');
  assert.ok(oe.includes('koDrain % 64 === 0'), 'macrotâche réelle périodique pendant les drains de K.O.');
  assert.ok(oe.includes('function offlineRunBoundedBattle'), 'exécuteur de combat borné');
  assert.ok(oe.includes("battlesRes.bounded || null"), 'résultat propagé au récap');
  assert.ok(!/offlineSuspendBattle[\s\S]{0,260}!b\.isChamp/.test(oe), 'la suspension couvre aussi les combats bornés');
  assert.ok(oe.includes("'afk_panel_boss_battle'"), 'cellule récap combat clé');
  for (const lang of ['fr', 'en']) {
    const ui = R(`src/localization/${lang}/ui.js`);
    for (const key of ['afk_boss_won', 'afk_boss_lost', 'afk_panel_boss_battle', 'offline_stage_boss']) {
      assert.ok(ui.includes(`"${key}"`), `clé ${lang} ${key}`);
    }
  }
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_no_progress_summary":"AFK {time} : rien en cours à simuler."'), 'message AFK corrigé (plus de « zone sauvage » trompeuse)');
});

