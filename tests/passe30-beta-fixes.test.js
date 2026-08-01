import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 30 : correctifs du retour bêta ─────────────────────────────────────
//  A. AFK/timeskip : le rattrapage ne rejoue QUE ce que le joueur faisait
//     vraiment en partant — idle ou entraînement sur une route = 0 combat
//     sauvage simulé et AUCUN combat lancé au retour. Chaîne sauvage active =
//     rattrapage (onglet vivant) ou reconstruction (jeu relancé, drapeau
//     persisté G.wildSessionActive).
//  B. Argent des routes : un butin n'est converti en ₽ QUE quand sa pile est
//     pleine (25 pour objets de combat/baies) — avant, dès la 2ᵉ copie tout
//     partait en argent.
//  C. Pension : compteur de K.O. partagé (décision : 10 K.O. = 1 niveau de
//     Garderie), alimenté par les routes, les dresseurs ET l'entraînement ;
//     la Garderie n'utilise plus de compteur d'XP.
//  D. Recâblages sources + clés i18n.
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
    if (typeof renderMap === 'function') renderMap = function(){};
    if (typeof renderMineWindow === 'undefined') renderMineWindow = function(){};
    if (typeof renderTeamWindow === 'undefined') renderTeamWindow = function(){};
    if (typeof renderHatcheryWindow === 'undefined') renderHatcheryWindow = function(){};
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

function seedTrainingSlot() {
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

// ————————————————— A — AFK : uniquement ce que le joueur faisait ————————————
test('passe 30 A : INACTIF sur une route = aucun combat simulé ET aucun combat lancé au retour', async () => {
  const sb = makeSandbox({ seed: 11 });
  seedGame(sb, { location: 'route1', level: 30 });
  // ni chaîne active, ni drapeau persisté : le joueur était simplement là.
  const result = await vm.runInContext(`offlineSimulate(120000, 'return')`, sb);
  assert.ok(result, 'résultat produit');
  assert.equal(result.wins, 0, 'zéro victoire : le joueur n’était PAS en combat');
  assert.equal(result.captures, 0, 'aucune capture fantôme');
  assert.equal(result.lost, false, 'aucune défaite imaginaire');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'aucun combat relancé au retour');
  assert.equal(vm.runInContext(`battle.enemyPoke`, sb), null, 'aucun ennemi matérialisé sur la route');
  assert.equal(vm.runInContext(`battle.sessionWins || 0`, sb), 0, 'aucune session d’exploration improvisée');
});

test('passe 30 A : ENTRAÎNEMENT pendant l’absence = l’entraînement progresse, AUCUN combat de route', async () => {
  const sb = makeSandbox({ seed: 21 });
  vm.runInContext(seedTrainingSlot(), sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  const enemyIndex = vm.runInContext(`(() => { const s = G.trainingSlots[0]; return s.battle ? s.battle.enemyIndex : 999; })()`, sb);
  assert.ok(enemyIndex > 3, `rounds d’entraînement réellement rejoués hors-ligne (enemyIndex=${enemyIndex})`);
  assert.equal(result.wins, 0, 'aucun combat sauvage simulé pendant l’entraînement');
  assert.equal(vm.runInContext(`battle.active`, sb), false, 'aucun combat de route lancé au retour');
  assert.equal(vm.runInContext(`battle.enemyPoke`, sb), null, 'aucun ennemi sur la route');
  const hpTrainee = vm.runInContext(`G.team[0].currentHP`, sb);
  assert.ok(hpTrainee === null || hpTrainee >= 0, 'pensionnaire intact (pas de combat sauvage subi)');
});

test('passe 30 A : chaîne d’exploration ACTIVE à la fermeture = rattrapée, chaîne reprise au retour', async () => {
  const sb = makeSandbox({ seed: 31 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location)); // le joueur combat réellement
    battle.paused = true; // onglet masqué : offlineSuspendBattle a mis la chaîne en pause
  `, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb); // 5 min
  assert.ok(result.wins > 5, `victoires rattrapées (obtenu : ${result.wins})`);
  assert.equal(vm.runInContext(`battle.active && !battle.paused`, sb), true, 'chaîne reprise à l’écran');
  assert.ok(vm.runInContext(`battle.timerId`, sb), 'ticker relancé');
});

test('passe 30 A : jeu RELANCÉ — drapeau persisté = chaîne reconstruite ; drapeau entretenu par saveGame/endBattle', async () => {
  // 1) jeu relancé (battle réinitialisé au boot) mais drapeau présent → rattrapage quand même
  const sb = makeSandbox({ seed: 41 });
  seedGame(sb, { location: 'route1', level: 35 });
  vm.runInContext(`battle.active = false; battle.enemyPoke = null; G.wildSessionActive = true;`, sb);
  const result = await vm.runInContext(`offlineSimulate(300000, 'return')`, sb);
  assert.ok(result.wins > 5, `chaîne reconstruite depuis le drapeau persisté (obtenu : ${result.wins})`);

  // 2) le drapeau reflète la réalité : vrai en pleine chaîne (persisté disque), faux après endBattle
  const sb2 = makeSandbox({ seed: 42 });
  seedGame(sb2, { location: 'route1', level: 35 });
  vm.runInContext(`
    offlineStartWildSession(getLocObj(G.location));
    battle.paused = false;
    window._saveOk = saveGame(true);
  `, sb2);
  assert.equal(vm.runInContext(`window._saveOk`, sb2), true, 'sauvegarde écrite en pleine chaîne');
  assert.equal(vm.runInContext(`G.wildSessionActive`, sb2), true, 'drapeau vrai en mémoire');
  assert.equal(vm.runInContext(`(readSlot(currentSaveId) || {}).G ? readSlot(currentSaveId).G.wildSessionActive : null`, sb2), true, 'drapeau vrai sur disque');
  vm.runInContext(`endBattle();`, sb2);
  assert.equal(vm.runInContext(`G.wildSessionActive`, sb2), false, 'drapeau effacé dès la fin du combat');
});

// ————————————————— B — Argent des routes : pile pleine uniquement ————————————
test('passe 30 B : butin converti en argent SEULEMENT quand la pile est pleine (25)', () => {
  const sb = makeSandbox();
  vm.runInContext(`currentSaveId = 'PW-TEST'; G.starter = true; G.money = 0; G.inventory = {};`, sb);
  // 1re copie puis suivantes : en sac, PAS d'argent (c'était le bug bêta)
  let r = vm.runInContext(`grantRewardItem('occa_berry', 1)`, sb);
  assert.equal(r.added, 1, 'première copie → objet en sac');
  assert.equal(r.money, 0, 'aucun argent tant que la pile n’est pas pleine');
  // pile à 24 + 5 : 1 place en sac, 4 convertis (25 % de 45 000₽ = 11 250₽/u)
  vm.runInContext(`G.inventory['occa_berry'] = 24;`, sb);
  r = vm.runInContext(`grantRewardItem('occa_berry', 5)`, sb);
  assert.equal(r.added, 1, 'la place restante est remplie');
  assert.equal(r.money, 11250 * 4, 'seul l’excédent au-delà de 25 est converti');
  assert.equal(vm.runInContext(`G.inventory['occa_berry']`, sb), 25, 'pile plafonnée à 25');
  // pile déjà pleine : conversion intégrale
  r = vm.runInContext(`grantRewardItem('occa_berry', 1)`, sb);
  assert.equal(r.added, 0);
  assert.equal(r.money, 11250, 'pile pleine → argent');
  assert.equal(vm.runInContext(`G.money`, sb), 11250 * 5, 'total exact cumulé');
  // trésor : jamais converti, toujours stocké
  r = vm.runInContext(`grantRewardItem('nugget', 3)`, sb);
  assert.equal(r.added, 3, 'pépite : toujours en sac');
  assert.equal(r.money, 0);
});

// ————————————————— C — Pension : compteur de K.O. partagé ————————————————————
test('passe 30 C : Garderie = 10 K.O. / niveau (décision), plus d’XP au goutte-à-goutte, incubation préservée', () => {
  const sb = makeSandbox();
  vm.runInContext(`
    currentSaveId = 'PW-TEST'; G.starter = true; G.money = 1000000; G.inventory = {};
    G.team = [createPoke(4, 40, false)];
    const petit = createPoke(1, 20, false);
    ensurePokemonUid(petit);
    G.hatcheryModes = ['exp', 'breed'];
    G.hatchery = [
      { poke: petit, steps: 0, stepsReq: 25, queuedUid: petit.uid, paid: false, mode: 'exp' },
      { poke: createPoke(3, 100, false), steps: 24, stepsReq: 25, paid: false, mode: 'breed' },
    ];
    G.automation = { autoHatch: true, autoSeedHatchery: false };
    window._petit = petit;
  `, sb);
  // 10 K.O. : +1 niveau de Garderie (et PAS d'éclosion du slot exp malgré autoHatch)
  const gained1 = vm.runInContext(`hatcheryRegisterBattleKills(10)`, sb);
  assert.equal(gained1, 1, '1 niveau de Garderie gagné');
  assert.equal(vm.runInContext(`window._petit.level`, sb), 21, 'niv. 20 → 21 (PAS de remise à 1 : le vieux bug autoHatch est mort)');
  assert.equal(vm.runInContext(`G.hatchery[0].steps`, sb), 0, 'compteur consommé');
  // le slot incubation a lui pris 10 K.O. → 24+10 ≥ 25 → éclosion auto
  assert.equal(vm.runInContext(`G.hatchery[1]`, sb), null, 'éclosion déclenchée sur le slot incubation');
  assert.ok(vm.runInContext(`Object.values(G.collection).some(p => p && p.level === 1)`, sb), 'pensionnaire incubé recréé niveau 1');
  // 25 K.O. de plus : +2 niveaux, reste 5 au compteur
  const gained2 = vm.runInContext(`hatcheryRegisterBattleKills(25)`, sb);
  assert.equal(gained2, 2);
  assert.equal(vm.runInContext(`window._petit.level`, sb), 23, 'niv. 21 → 23');
  assert.equal(vm.runInContext(`G.hatchery[0].steps`, sb), 5, 'le reste est conservé');
  // l'XP ne pilote PLUS la Garderie : gainXP ne la touche pas
  const lvlAvant = vm.runInContext(`window._petit.level`, sb);
  vm.runInContext(`gainXP(createPoke(19, 30, false));`, sb);
  assert.equal(vm.runInContext(`window._petit.level`, sb), lvlAvant, 'gainXP ne nourrit plus la Garderie');
  // frais conservés : impayé → le pensionnaire garde ses niveaux mais sort au PC
  vm.runInContext(`
    getHatcheryLevelUpFee = function(){ return 1000000; }; // stub : sandbox sans automation.js
    G.money = 500000;
  `, sb);
  const gained3 = vm.runInContext(`hatcheryRegisterBattleKills(20)`, sb);
  assert.equal(gained3, 2);
  assert.equal(vm.runInContext(`window._petit.level`, sb), 25, 'niveaux conservés malgré l’impayé');
  assert.equal(vm.runInContext(`G.hatchery[0]`, sb), null, 'impayé → sort de la Garderie');
  assert.equal(vm.runInContext(`G.collection['1'] === window._petit`, sb), true, 'retourné au PC (collection)');
  assert.equal(vm.runInContext(`G.money`, sb), 500000, 'aucun débit partiel');
});

test('passe 30 C : les K.O. d’entraînement nourrissent aussi la pension (live ET fast-forward)', async () => {
  const sb = makeSandbox({ seed: 77 });
  vm.runInContext(seedTrainingSlot(), sb);
  vm.runInContext(`
    const petit = createPoke(2, 18, false);
    ensurePokemonUid(petit);
    G.hatcheryModes = ['exp'];
    G.hatchery = [{ poke: petit, steps: 0, stepsReq: 25, queuedUid: petit.uid, paid: false, mode: 'exp' }];
    window._petit = petit;
  `, sb);
  // live : la vraie boucle tournée à la main
  vm.runInContext(`for (let i = 0; i < 200; i++) { updateTrainingSlots(); }`, sb);
  const progressionLive = vm.runInContext(`G.hatchery[0].steps + (window._petit.level - 18) * 10`, sb);
  assert.ok(progressionLive > 0, `les K.O. d’entraînement ont nourri la pension en live (progression=${progressionLive})`);
  // fast-forward hors-ligne : même alimentation
  const lvlAvant = vm.runInContext(`window._petit.level`, sb);
  const stepsAvant = vm.runInContext(`G.hatchery[0] ? G.hatchery[0].steps : -1`, sb);
  await vm.runInContext(`(async () => { await offlineFastForwardTraining(60); })()`, sb);
  const lvlApres = vm.runInContext(`window._petit.level`, sb);
  const stepsApres = vm.runInContext(`G.hatchery[0] ? G.hatchery[0].steps : -1`, sb);
  assert.ok(lvlApres > lvlAvant || stepsApres > stepsAvant,
    `le FF d’entraînement nourrit aussi la pension (niv ${lvlAvant}→${lvlApres}, compteur ${stepsAvant}→${stepsApres})`);
});

// ————————————————— D — Recâblages & décisions ————————————————————————————————
test('passe 30 D : recâblages présents, anciens blocs supprimés, clés i18n', () => {
  const oe = R('src/game/save/offline-engine.js');
  assert.ok(oe.includes('if(!(G && G.wildSessionActive)) return res;'), 'FF sauvage verrouillé par la session réelle');
  assert.ok(oe.includes('afk_panel_daycare_levels'), 'récap : ligne niveaux de garderie');
  assert.ok(R('src/game/save/save.js').includes('G.wildSessionActive = (typeof isWildChillChainActive'), 'saveGame persiste le drapeau');
  assert.ok(R('src/game/combat/battle-flow.js').includes('G.wildSessionActive = false'), 'endBattle efface le drapeau');
  const hj = R('src/game/breeding/hatchery.js');
  assert.ok(hj.includes('const DAYCARE_KOS_PER_LEVEL = 10;'), 'décision utilisateur : 10 K.O. = 1 niveau');
  assert.ok(hj.includes('function hatcheryRegisterBattleKills'), 'fonction partagée pension');
  assert.ok(R('src/game/combat/battle-status.js').includes('hatcheryRegisterBattleKills'), 'routes/dresseurs → pension');
  assert.ok(R('src/game/combat/training.js').includes('hatcheryRegisterBattleKills'), 'entraînement → pension');
  assert.ok(!R('src/game/combat/progression.js').includes('daycareShare'), 'goutte-à-goutte XP de Garderie supprimé');
  assert.ok(!R('src/game/combat/battle-switch.js').includes('Daycare passive EXP'), 'bloc XP sur champion supprimé (les K.O. suffisent)');
  assert.ok(R('src/data/game-helpers.js').includes('function getItemStackLimit'), 'limite de pile factorisée');
  assert.ok(R('src/game/breeding/hatchery-ui.js').includes('getDaycareKosPerLevel'), 'UI : compteur K.O. de Garderie');
  assert.ok(R('src/localization/fr/ui.js').includes('"afk_panel_daycare_levels"'), 'clé FR récap garderie');
  assert.ok(R('src/localization/en/ui.js').includes('"afk_panel_daycare_levels"'), 'clé EN récap garderie');
});

