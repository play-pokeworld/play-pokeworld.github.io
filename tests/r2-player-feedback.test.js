// V7-R2 — retours joueurs (7.4.0) : Entraînement en direct invisible, donjon
// ignoré par le rattrapage AFK, rattrapage muet au relancement du jeu.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const FR = R('src/localization/fr/ui.js');
const EN = R('src/localization/en/ui.js');
const hasKey = (src, key) => new RegExp(`^"${key}":`, 'm').test(src);

// ─── Harnais jsdom générique : un bundle esbuild + des stubs globaux ─────────
function makeDomSandbox(html, stubs) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const sandbox = {
    console,
    window: w,
    document: w.document,
    localStorage: w.localStorage,
    navigator: { language: 'fr' },
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval() {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
  };
  Object.assign(sandbox, stubs);
  sandbox.globalThis = sandbox;
  // le code du jeu lit `window.x` ET les identifiants nus : miroir des stubs
  for (const k of Object.keys(stubs)) w[k] = stubs[k];
  vm.createContext(sandbox);
  return { sandbox, dom };
}

// ════════════════════════════════════════════════════════════════════════════
// 1) ENTRAÎNEMENT — « Entraînement fonctionne pas »
//    Cause : design-system.css §32.6 masque #battle-active-scene:not(.is-live)
//    (display:none !important) et montre #battle-idle-screen !important ; le
//    duel d'entraînement posait display:flex en ligne → invisible, l'écran
//    « Exploration au repos » restait affiché.
// ════════════════════════════════════════════════════════════════════════════
const TRAINING_DOM = `
  <div id="battle-idle-screen"></div>
  <div id="battle-active-scene"><div class="pw-static-038"><button id="leave-btn"></button></div></div>
  <div id="battle-team-row"></div>
  <div id="training-battle-live-panel"></div>`;

function bootTraining({ active }) {
  const trainee = {
    uid: 'u1',
    id: 25,
    name: 'Pikachu',
    level: 10,
    maxHP: 40,
    currentHP: 40,
    moves: [],
  };
  const G = {
    team: [trainee],
    collection: {},
    trainingSlots: [
      {
        uid: 'u1',
        loc: 'team',
        idStr: '0',
        active: true,
        mode: 'level',
        battle: active
          ? { active: true, stage: 0, champTeam: [{ name: 'Rattata', maxHP: 30, currentHP: 20 }] }
          : null,
      },
    ],
    badges: ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'],
    inventory: {},
  };
  const stubs = {
    G,
    battle: { active: false },
    t: (k) => k,
    tr: (k) => k,
    notify() {},
    saveGame() {},
    _pwSetHtmlSafe(el, html) {
      el.innerHTML = html;
    },
    spriteImg: () => '<span class="sprite"></span>',
    getMoveName: () => 'Charge',
    escHtml: (s) => String(s),
    formatNumber: (n) => String(n),
  };
  const { sandbox, dom } = makeDomSandbox(TRAINING_DOM, stubs);
  vm.runInContext(harnessBundleSource(['src/application/combat/training.js']), sandbox, {
    filename: 'training.js',
  });
  return { sandbox, dom, G };
}

test('R2-01 · duel d’entraînement actif → #battle-active-scene reçoit .is-live et l’écran de repos se cache', () => {
  const { sandbox, dom } = bootTraining({ active: true });
  vm.runInContext(`renderTrainingBattlePanel()`, sandbox);
  const doc = dom.window.document;
  const scene = doc.getElementById('battle-active-scene');
  assert.ok(
    scene.classList.contains('is-live'),
    'la scène porte la classe is-live (contrat CSS §32.6)'
  );
  assert.equal(
    doc.getElementById('battle-idle-screen').style.display,
    'none',
    'écran de repos masqué'
  );
  assert.ok(
    doc.getElementById('training-battle-live-panel').classList.contains('open'),
    'le panneau « Combats d’entraînement en direct » est ouvert'
  );
});

test('R2-01b · plus aucun duel → .is-live retirée (le repos revient)', () => {
  const { sandbox, dom } = bootTraining({ active: false });
  const doc = dom.window.document;
  doc.getElementById('battle-active-scene').classList.add('is-live');
  vm.runInContext(`renderTrainingBattlePanel()`, sandbox);
  assert.ok(
    !doc.getElementById('battle-active-scene').classList.contains('is-live'),
    'is-live retirée hors duel'
  );
  assert.ok(!doc.getElementById('training-battle-live-panel').classList.contains('open'));
});

test('R2-01c · modèle de mode : un slot occupé garde la vraie description (plus de « Niveau 100 atteint » pendant le duel)', () => {
  const { sandbox } = bootTraining({ active: true });
  const m = vm.runInContext(
    `(() => { const m = trainingModeModel('level', true, 0, true); return { desc: m.descHtml, clickable: !!m.clickable }; })()`,
    sandbox
  );
  assert.ok(m.desc && !/training_slot_busy/.test(m.desc), 'description réelle du mode conservée');
  assert.equal(m.clickable, false, 'pas cliquable tant que le slot combat');
  const free = vm.runInContext(`trainingModeModel('level', true, 0, false).clickable`, sandbox);
  assert.equal(free, true, 'slot libre → cliquable');
});

test('R2-01d · training.js exporte sa surface classique via un seul Object.assign (budget de taille)', () => {
  const src = R('src/application/combat/training.js');
  assert.match(src, /const _trainingGlobals = \{/);
  assert.match(src, /Object\.assign\(window, _trainingGlobals\)/);
  assert.ok(
    !/if \(typeof renderTrainingBattlePanel !== 'undefined'\) \{/.test(src),
    'plus de blocs d’export unitaires'
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2) DONJON PENDANT L’AFK — « Donjon pas compris dans le AFK »
// ════════════════════════════════════════════════════════════════════════════
function makeRun({ auto = null, pendingNode = null, floor = 1, depth = 2 } = {}) {
  const tiles = {
    c0r0: { id: 'c0r0', col: 0, row: 0, type: 'empty', revealed: true, done: true },
    c1r0: { id: 'c1r0', col: 1, row: 0, type: 'combat', revealed: true, done: false },
    c2r0: { id: 'c2r0', col: 2, row: 0, type: 'boss', revealed: true, done: false },
  };
  return {
    loc: 'mtmoon',
    floor,
    depth,
    auto,
    pos: 'c0r0',
    pendingNode,
    bossTile: 'c2r0',
    wins: 0,
    totalWins: 0,
    bag: { tokens: 0, money: 0 },
    map: { grid: true, tiles },
  };
}

/** Charge dungeon-offline.js dans un contexte vm avec un moteur de combat factice. */
async function bootDungeonOffline(opts = {}) {
  const calls = {
    steps: 0,
    moveTo: [],
    fights: 0,
    ffLoops: 0,
    labels: 0,
    registered: null,
    afterKick: 0,
  };
  const G = {
    location: 'mtmoon',
    team: [{ currentHP: 10, maxHP: 10 }],
    dungeonRun: makeRun(opts.run),
  };
  const battle = { active: !!opts.battleActive, playerPokeIdx: 0 };
  const wallet = { dungeonTokens: 100 };
  let handlers = {};
  const stubs = {
    G,
    battle,
    OfflineEngine: {
      register(name, fn) {
        handlers[name] = fn;
        calls.registered = name;
      },
      handler(name) {
        return handlers[name] || null;
      },
    },
    currentDungeonRun: () => G.dungeonRun,
    aliveCount: () => G.team.filter((p) => p.currentHP > 0).length,
    firstAlive: () => 0,
    ensureWallet: () => wallet,
    tr: (k, p) => k + JSON.stringify(p || {}),
    offlineSetStageLabel() {
      calls.labels++;
    },
    offlineDrainStuckLiveKOs: async () => {},
    offlineStopWildBattleTimer() {},
    refreshDungeonPanel() {},
    // Le vrai `dungeonOnWin` incrémente le sac ; ici il sert de crochet compté.
    dungeonOnWin() {
      const run = G.dungeonRun;
      if (!run) return null;
      run.wins++;
      run.totalWins++;
      run.bag.tokens += 10;
      if (run.pendingNode) {
        run.map.tiles[run.pendingNode].done = true;
        run.pendingNode = null;
      }
      return run;
    },
    dungeonOnBossDefeated() {
      const run = G.dungeonRun;
      if (!run) return null;
      wallet.dungeonTokens += run.bag.tokens + 50;
      G.dungeonRun = null;
      return { outcome: 'cleared' };
    },
    dungeonOnWipe() {
      G.dungeonRun = null;
      return { outcome: 'wipe' };
    },
    // Pilote factice : engage la prochaine case non soldée (combat puis boss).
    _dgAutoStep(o) {
      calls.steps++;
      if (!(o && o.offline)) return null;
      const run = G.dungeonRun;
      if (!run || !run.auto || battle.active) return null;
      if (opts.stall) return null;
      const next = Object.values(run.map.tiles).find((t) => !t.done && t.type !== 'empty');
      if (!next) return null;
      return stubs.dungeonMoveTo(next.id);
    },
    dungeonMoveTo(id) {
      calls.moveTo.push(id);
      const run = G.dungeonRun;
      run.pos = id;
      run.pendingNode = id;
      battle.active = true;
      battle.isDungeonBoss = run.map.tiles[id].type === 'boss';
      return run;
    },
  };
  const { sandbox } = makeDomSandbox('', stubs);
  vm.runInContext(harnessBundleSource(['src/application/save/dungeon-offline.js']), sandbox, {
    filename: 'dungeon-offline.js',
  });
  // Boucle accélérée factice : consomme `fightMs` simulées puis résout le
  // combat via les crochets GLOBAUX (enveloppés par le module pour compter).
  const ffLoop = async function (budgetMs, stopFn) {
    calls.ffLoops++;
    assert.equal(typeof stopFn, 'function');
    const cost = opts.fightMs || 30000;
    if (budgetMs < cost) return { simMs: budgetMs, ticks: 1 }; // budget épuisé en plein combat
    if (opts.wipeOnFight && calls.ffLoops >= opts.wipeOnFight) {
      G.team.forEach((p) => (p.currentHP = 0));
      sandbox.dungeonOnWipe();
      battle.active = false;
      return { simMs: cost, ticks: 1 };
    }
    if (battle.isDungeonBoss) sandbox.dungeonOnBossDefeated();
    else sandbox.dungeonOnWin();
    battle.active = false;
    return { simMs: cost, ticks: 1 };
  };
  sandbox.offlineRunBattleFfLoop = ffLoop;
  sandbox.window.offlineRunBattleFfLoop = ffLoop;
  return { sandbox, calls, G, battle, wallet, handlers };
}

test('R2-02 · l’étape « dungeon » s’enregistre auprès du moteur hors-ligne et expose son API', async () => {
  const { sandbox, calls, handlers } = await bootDungeonOffline();
  assert.equal(calls.registered, 'dungeon');
  assert.equal(typeof handlers.dungeon, 'function');
  assert.equal(typeof sandbox.offlineFastForwardDungeon, 'function');
  assert.equal(typeof sandbox.DUNGEON_OFFLINE_STEP_MS, 'number');
});

test('R2-02a · sans pilote réglé, l’expédition avance en mode plateau et le gardien clôt la session (sac encaissé)', async () => {
  const { sandbox, calls, G, wallet } = await bootDungeonOffline({ run: { auto: null } });
  const res = await sandbox.offlineFastForwardDungeon(3600);
  assert.equal(res.pilot, false, 'le joueur n’avait pas réglé le pilote');
  assert.equal(res.mode, 'farm');
  assert.equal(res.fights, 2, 'un combat de case + le gardien');
  assert.equal(res.cleared, true);
  assert.equal(res.wiped, false);
  assert.equal(G.dungeonRun, null, 'expédition soldée');
  assert.equal(wallet.dungeonTokens, 100 + 10 + 50, 'jetons du sac encaissés');
  assert.equal(res.tokens, 60, 'le bilan compte les jetons gagnés (sac + bonus)');
  assert.deepEqual(calls.moveTo, ['c1r0', 'c2r0']);
  assert.ok(calls.ffLoops === 2, 'chaque combat passe par la boucle accélérée partagée');
  assert.ok(res.secondsUsed >= 60, 'le temps simulé compte les combats et les pas');
});

test('R2-02b · pilote du joueur conservé ; budget épuisé en plein combat → expédition « en cours », combat repris à l’écran', async () => {
  const { sandbox, G, battle } = await bootDungeonOffline({
    run: { auto: 'boss' },
    fightMs: 30000,
  });
  const res = await sandbox.offlineFastForwardDungeon(40); // 40 s : 1 pas (0,6 s) + 1 combat (30 s) + 1 pas + combat tronqué
  assert.equal(res.pilot, true);
  assert.equal(res.mode, 'boss');
  assert.equal(res.cleared, false);
  assert.equal(res.fights, 1);
  assert.ok(G.dungeonRun, 'l’expédition continue');
  assert.equal(G.dungeonRun.auto, 'boss', 'le réglage du joueur n’est pas touché');
  assert.equal(battle.active, true, 'le combat tronqué reste actif pour reprendre en direct');
  assert.equal(res.floor, 1);
});

test('R2-02c · pilote d’absence retiré à la fin quand le joueur n’en avait pas réglé', async () => {
  const { sandbox, G } = await bootDungeonOffline({ run: { auto: null }, fightMs: 30000 });
  await sandbox.offlineFastForwardDungeon(40);
  assert.ok(G.dungeonRun, 'expédition toujours en cours (budget court)');
  assert.equal(
    G.dungeonRun.auto,
    null,
    'run.auto rendu à null : le pilote d’absence n’est pas un déverrouillage'
  );
});

test('R2-02d · case engagée avant un rechargement (pendingNode) → ré-engagée en premier', async () => {
  const { sandbox, calls } = await bootDungeonOffline({
    run: { auto: 'farm', pendingNode: 'c1r0' },
  });
  await sandbox.offlineFastForwardDungeon(3600);
  assert.equal(calls.moveTo[0], 'c1r0', 'dungeonMoveTo(pendingNode) avant tout pas du pilote');
});

test('R2-02e · équipe K.O. hors-ligne → dungeonOnWipe compté, expédition soldée en défaite', async () => {
  const { sandbox, G } = await bootDungeonOffline({ run: { auto: 'farm' }, wipeOnFight: 1 });
  const res = await sandbox.offlineFastForwardDungeon(3600);
  assert.equal(res.wiped, true);
  assert.equal(res.cleared, false);
  assert.equal(G.dungeonRun, null);
});

test('R2-02f · pilote qui cale (aucun changement d’état) → l’étape s’arrête au lieu de boucler', async () => {
  const { sandbox, calls } = await bootDungeonOffline({ run: { auto: 'farm' }, stall: true });
  const res = await sandbox.offlineFastForwardDungeon(3600);
  assert.equal(res.fights, 0);
  assert.equal(res.steps, 1, 'un seul pas tenté');
  assert.ok(calls.steps <= 2);
});

test('R2-02g · hors donjon (pas d’expédition) : bilan vide, rien n’est touché', async () => {
  const { sandbox, G, calls } = await bootDungeonOffline();
  G.dungeonRun = null;
  const res = await sandbox.offlineFastForwardDungeon(3600);
  assert.equal(res.fights, 0);
  assert.equal(calls.steps, 0);
});

test('R2-02h · câblage : étape « dungeon » jouée en premier, donjon exclu de la chaîne sauvage, bilan + récap', () => {
  const eng = R('src/application/save/offline-engine.js');
  assert.match(eng, /dungeon: 'offline_stage_dungeon'/, 'libellé de l’étape');
  assert.match(eng, /a === 'dungeon' \? 0 : 1/, 'l’expédition se rejoue avant la chaîne sauvage');
  assert.match(
    eng,
    /if \(loc && loc\.type === 'dungeon'\) return false;/,
    'offlineCanWildBattle refuse les donjons'
  );
  assert.match(
    eng,
    /wins: Number\(battlesRes\.won \|\| 0\) \+ Number\(dungeonRes\.fights \|\| 0\)/
  );
  assert.match(eng, /afk_panel_dungeon_fights/);
  assert.match(eng, /afk_dungeon_ongoing_pilot/);
  const main = R('src/main.js');
  const iEngine = main.indexOf("import './application/save/offline-engine.js'");
  const iDungeon = main.indexOf("import './application/save/dungeon-offline.js'");
  assert.ok(iEngine > 0 && iDungeon > iEngine, 'dungeon-offline importé juste après le moteur');
  const dg = R('src/application/world/dungeon-run.js');
  assert.match(
    dg,
    /globalThis\.PW_FF === true && !\(opts && opts\.offline\)/,
    '_dgAutoStep se tait pendant le rattrapage sauf pour le moteur'
  );
  assert.match(
    dg,
    /\['combat', 'elite', 'boss', 'chest'\]\.includes\(here\.type\)/,
    'le pilote ré-engage la case où il se tient'
  );
  for (const k of [
    'offline_stage_dungeon',
    'offline_stage_dungeon_progress',
    'afk_panel_dungeon_fights',
    'afk_panel_dungeon_floors',
    'afk_panel_dungeon_tokens',
    'afk_dungeon_cleared',
    'afk_dungeon_wiped',
    'afk_dungeon_ongoing',
    'afk_dungeon_ongoing_pilot',
  ]) {
    assert.ok(hasKey(FR, k), `clé FR ${k}`);
    assert.ok(hasKey(EN, k), `clé EN ${k}`);
  }
  assert.ok(
    !/\d{2,}/.test(FR.match(/"afk_dungeon_cleared":"([^"]*)"/)[1]),
    'TXT-01 : aucun nombre en dur'
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3) RATTRAPAGE AU RELANCEMENT — l’horodatage « vu » et G.wildSessionActive
//    étaient écrasés par les sauvegardes de normalizeLoadedState() avant le
//    premier battement : aucun rattrapage après avoir fermé le jeu.
// ════════════════════════════════════════════════════════════════════════════
function bootOfflineEngine({ startBattleOnSpawn = true } = {}) {
  const calls = { spawn: 0, simulate: [] };
  const store = new Map();
  const G = {
    starter: true,
    team: [{ id: 4, currentHP: 20, maxHP: 20 }],
    location: 'route1',
    region: 'kanto',
    money: 0,
    inventory: {},
    wildSessionActive: false,
    afk: {},
  };
  const battle = {
    active: false,
    chill: true,
    sessionWins: 0,
    sessionCatches: [],
    sessionItems: {},
  };
  const stubs = {
    G,
    battle,
    saveNow: () => Date.now(),
    storageGet: (k) => (store.has(k) ? store.get(k) : null),
    storageSet: (k, v) => store.set(k, v),
    afkStorageKey: () => 'afk_test',
    hasStarterInState: (s) => !!(s && s.starter),
    t: (k) => k,
    tr: (k) => k,
    formatNumber: (n) => String(n),
    formatPlayTime: (ms) => String(ms),
    notify() {},
    addBattleLog() {},
    appTimer: () => 1,
    stopBattleTimer() {},
    runBattleTick() {
      battle.active = false;
    },
    getLocObj: () => ({ wild: [[16, 2, 4, 'common']] }),
    aliveCount: () => 1,
    firstAlive: () => 0,
    spawnNextWild() {
      calls.spawn++;
      if (startBattleOnSpawn) battle.enemyPoke = { id: 16, name: 'Roucool' };
    },
    updateHeader() {},
    renderBattleLoot() {},
    renderBattleSummary() {},
    renderTeamWindow() {},
    renderMap() {},
    saveGame() {},
    markAfkSeen() {},
    updateBattleUI() {},
    renderMoveButtons() {},
    renderEnemyMoveBars() {},
    renderBattleTeamRow() {},
    PokeWorldGameStarted: true,
    PokeUI: {
      views: {
        AfkRecapView: Object.assign(function AfkRecapView() {}, { toHTML: () => '<div></div>' }),
      },
    },
    _pwSetHtmlSafe(el, html) {
      el.innerHTML = html;
    },
  };
  const { sandbox } = makeDomSandbox('', stubs);
  vm.runInContext(harnessBundleSource(['src/application/save/offline-engine.js']), sandbox, {
    filename: 'offline-engine.js',
  });
  // Étapes lourdes neutralisées : on observe l’orchestration, pas le moteur de combat.
  sandbox.OfflineEngine.register('training', async () => ({}));
  sandbox.OfflineEngine.register('mine', async () => ({}));
  return { sandbox, calls, G, battle, store };
}

test('R2-03 · offlineNoteBootSeen : l’absence mesurée AVANT les sauvegardes de chargement déclenche le rattrapage', async () => {
  const { sandbox, store } = bootOfflineEngine();
  const simulated = [];
  sandbox.OfflineEngine.register('wild-battles', async (seconds) => {
    simulated.push(seconds);
    return { won: 0 };
  });
  // Les sauvegardes de chargement ont déjà ré-estampillé « vu » à l'instant…
  store.set('afk_test', JSON.stringify({ ts: Date.now() }));
  // …mais loadGame a relevé le vrai horodatage : 2 h plus tôt.
  sandbox.offlineNoteBootSeen(Date.now() - 2 * 3600 * 1000, false);
  sandbox.offlinePollHeartbeat();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(simulated.length, 1, 'une simulation déclenchée au relancement');
  assert.ok(
    simulated[0] >= 2 * 3600 - 5 && simulated[0] <= 2 * 3600 + 5,
    `budget ≈ 2 h (reçu ${simulated[0]} s)`
  );
  // Consommé : le battement suivant ne rejoue pas l'absence.
  sandbox.offlinePollHeartbeat();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(simulated.length, 1, 'l’indicateur de relancement ne sert qu’une fois');
});

test('R2-03b · sans indicateur de relancement, un horodatage frais ne déclenche rien (comportement inchangé)', async () => {
  const { sandbox, store } = bootOfflineEngine();
  const simulated = [];
  sandbox.OfflineEngine.register('wild-battles', async (seconds) => {
    simulated.push(seconds);
    return { won: 0 };
  });
  store.set('afk_test', JSON.stringify({ ts: Date.now() }));
  sandbox.offlinePollHeartbeat();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(simulated.length, 0);
});

test('R2-03c · G.wildSessionActive relevé au chargement : la chaîne sauvage reprend bien au relancement', async () => {
  const { sandbox, calls, G } = bootOfflineEngine();
  G.wildSessionActive = false; // écrasé par la sauvegarde de normalizeLoadedState (combat inactif au boot)
  sandbox.offlineNoteBootSeen(Date.now() - 3600 * 1000, true); // …mais la sauvegarde disait « en exploration »
  const res = await sandbox.offlineFastForwardWildBattles(60);
  assert.equal(
    calls.spawn,
    1,
    'une session sauvage est ouverte grâce à l’indicateur de relancement'
  );
  assert.equal(typeof res.won, 'number');
});

test('R2-03d · indicateur à false → pas de session sauvage sortie de nulle part (règle phase 30 conservée)', async () => {
  const { sandbox, calls, G } = bootOfflineEngine();
  G.wildSessionActive = false;
  sandbox.offlineNoteBootSeen(Date.now() - 3600 * 1000, false);
  await sandbox.offlineFastForwardWildBattles(60);
  assert.equal(calls.spawn, 0);
});

test('R2-03e · un donjon n’est jamais une zone de chaîne sauvage hors-ligne', () => {
  const { sandbox } = bootOfflineEngine();
  assert.equal(
    sandbox.offlineCanWildBattle({ type: 'dungeon', wild: [[41, 7, 10, 'common']] }),
    false
  );
  assert.equal(sandbox.offlineCanWildBattle({ type: 'route', wild: [[16, 2, 4, 'common']] }), true);
});

test('R2-03f · save.js relève « vu » et wildSessionActive AVANT normalizeLoadedState, puis les transmet au moteur', () => {
  const src = R('src/application/save/save.js');
  const iPrev = src.indexOf('const prevSeen =');
  const iWild = src.indexOf('const prevWild =');
  const iNorm = src.indexOf('normalizeLoadedState();', iPrev);
  const iNote = src.indexOf('globalThis.offlineNoteBootSeen(prevSeen, prevWild)');
  assert.ok(iPrev > 0 && iWild > iPrev && iNorm > iWild, 'lecture avant la normalisation');
  assert.ok(iNote > iNorm, 'transmission après la normalisation (et avant activateCurrentSave)');
  assert.ok(src.indexOf('activateCurrentSave(manual);', iNote) > iNote);
  const eng = R('src/application/save/offline-engine.js');
  const iLock = eng.indexOf('if (!offlineAcquireLock())');
  const iBoot = eng.indexOf('const bootGap = offlineBootSeenTs');
  assert.ok(
    iLock > 0 && iBoot > iLock,
    'l’indicateur n’est consommé qu’une fois le verrou d’onglet acquis'
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4) AUTO-01 — RELANCE AUTOMATIQUE (décision joueur : vendue en boutique,
//    2 500 PQ lus depuis AUTOMATION_UPGRADE_COSTS, AUCUN coût par relance).
// ════════════════════════════════════════════════════════════════════════════
const AR_DOM = `<div id="battle-idle-screen"><div id="battle-auto-relaunch" hidden></div></div>`;

function bootAutoRelaunch(opts = {}) {
  const timers = [];
  const calls = { explore: 0, closeSummary: 0, saves: 0, notifies: [], logs: [] };
  const G = {
    location: opts.location || 'route1',
    team: opts.team || [{ currentHP: 10, maxHP: 10 }],
    automation: opts.automation || {},
    automationUpgrades: opts.owned === false ? {} : { autoRelaunch: true },
  };
  const locs = {
    route1: { wild: [{ id: 16 }], type: 'route' },
    pallet: { wild: [], type: 'town' },
    mtmoon: { wild: [{ id: 41 }], type: 'dungeon' },
  };
  const stubs = {
    G,
    battle: { active: false },
    PW_FF: !!opts.ff,
    isAutomationPurchased: (k) => !!G.automationUpgrades[k],
    getLocObj: (id) => locs[id] || null,
    currentDungeonRun: () => opts.run || null,
    exploreArea: () => {
      calls.explore++;
    },
    closeBattleSummary: () => {
      calls.closeSummary++;
    },
    addBattleLog: (m) => calls.logs.push(m),
    notify: (m) => calls.notifies.push(m),
    saveGame: () => {
      calls.saves++;
    },
    t: (k) => k,
    tr: (k, p) => k + ':' + JSON.stringify(p),
    _pwSetHtmlSafe: (el, html) => {
      el.innerHTML = html;
    },
  };
  const { sandbox } = makeDomSandbox(AR_DOM, stubs);
  // Minuteries contrôlées : le module passe par globalThis.setTimeout/Interval.
  sandbox.setTimeout = (cb, ms) => {
    timers.push({ cb, ms });
    return timers.length;
  };
  sandbox.clearTimeout = (id) => {
    if (timers[id - 1]) timers[id - 1].cleared = true;
  };
  sandbox.setInterval = () => 99;
  sandbox.clearInterval = () => {};
  vm.runInContext(harnessBundleSource(['src/application/automation/auto-relaunch.js']), sandbox, {
    filename: 'auto-relaunch-bundle.js',
  });
  const host = () => sandbox.document.getElementById('battle-auto-relaunch');
  return { sandbox, G, calls, timers, host };
}

test('R2-04 · prix lu depuis la constante : AUTOMATION_UPGRADE_COSTS.autoRelaunch = 2 500 PQ, sans coût par relance', () => {
  const src = R('src/application/automation/automation.js');
  assert.match(src, /autoRelaunch:\s*2500/);
  const ar = R('src/application/automation/auto-relaunch.js');
  assert.doesNotMatch(
    ar,
    /spendQuestPoints|spendMoney|G\.money\s*-=/,
    'aucun prélèvement par relance'
  );
  assert.match(ar, /AUTO_RELAUNCH_DELAY_MS = 5000/);
  // economy-sim additionne toutes les améliorations PQ (dont autoRelaunch).
  assert.match(R('tools/economy-sim.mjs'), /Object\.values\(C\.AUTOMATION_UPGRADE_COSTS\)/);
});

test('R2-04a · boutique : entrée « upgrade » payée en points de quête, achat unique, « Acheté » ensuite', () => {
  const shop = R('src/ui/game/shop-panel.js');
  // V7-R3 · R3-06 — boucle générique ['autoRelaunch','autoDungeonRelaunch'] ;
  // une amélioration déjà achetée disparaît du rayon (plus de « Acheté »).
  assert.match(shop, /for \(const upKey of \['autoRelaunch', 'autoDungeonRelaunch'\]\)/);
  assert.match(
    shop,
    /key: upKey,\s*kind: 'upgrade',\s*currency: 'questPoints',\s*price: arCosts\[upKey\]/
  );
  assert.match(shop, /if \(owned\) continue;/);
  assert.match(shop, /entry\.kind === 'staff' \|\| entry\.kind === 'upgrade'\) return 1/);
  assert.match(shop, /purchaseAutomationIfNeeded\(entry\.key\)/);
  for (const k of [
    'automation_autoRelaunch',
    'auto_relaunch_shop_desc',
    'auto_relaunch_countdown',
    'auto_relaunch_cancel',
    'auto_relaunch_on',
    'auto_relaunch_off',
    'auto_relaunch_toggle_on',
    'auto_relaunch_toggle_off',
    'auto_relaunch_fired',
    'auto_relaunch_need',
    'guide_auto_relaunch',
    'guide_auto_relaunch_desc',
  ]) {
    assert.ok(hasKey(FR, k), `clé FR ${k}`);
    assert.ok(hasKey(EN, k), `clé EN ${k}`);
  }
  assert.match(R('src/ui/game/guide-sections.js'), /guide_auto_relaunch_desc/);
  assert.match(R('index.html'), /id="battle-auto-relaunch"/);
});

test('R2-04b · défaite d’une chaîne sauvage → compte à rebours armé, puis exploreArea() relancée sans frais', () => {
  const { sandbox, calls, timers, host } = bootAutoRelaunch();
  assert.equal(sandbox.isAutoRelaunchEnabled(), true, 'activée par défaut une fois achetée');
  assert.equal(sandbox.scheduleAutoRelaunch(), true);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 5000);
  assert.ok(sandbox.autoRelaunchRemainingMs() > 4000);
  assert.equal(host().hidden, false);
  assert.match(host().innerHTML, /auto_relaunch_countdown/);
  assert.match(host().innerHTML, /data-call="cancelAutoRelaunch"/);
  timers[0].cb(); // la minuterie expire
  assert.equal(calls.explore, 1, 'Explorer relancé');
  assert.equal(calls.closeSummary, 1, 'résumé de session refermé avant la relance');
  assert.equal(sandbox.autoRelaunchRemainingMs(), 0);
  assert.ok(calls.logs.some((m) => /auto_relaunch_fired/.test(m)));
});

test('R2-04c · « Annuler » stoppe le compte à rebours ; interrupteur désactivé → aucune relance', () => {
  const { sandbox, calls, timers, host, G } = bootAutoRelaunch();
  sandbox.scheduleAutoRelaunch();
  sandbox.cancelAutoRelaunch();
  assert.equal(timers[0].cleared, true);
  timers[0].cb(); // une minuterie déjà annulée ne doit rien faire même si elle tire
  assert.equal(calls.explore, 0);
  assert.match(host().innerHTML, /auto_relaunch_on/);
  assert.equal(sandbox.toggleAutoRelaunch(), true);
  assert.equal(G.automation.autoRelaunch, false);
  assert.equal(calls.saves, 1, 'l’interrupteur est sauvegardé');
  assert.match(host().innerHTML, /auto_relaunch_off/);
  assert.equal(sandbox.scheduleAutoRelaunch(), false, 'désactivée → rien n’est armé');
  assert.equal(timers.length, 1);
});

test('R2-04d · jamais sans l’amélioration, en donjon, pendant le rattrapage hors-ligne, en combat ou sans table sauvage', () => {
  const notOwned = bootAutoRelaunch({ owned: false });
  assert.equal(notOwned.sandbox.scheduleAutoRelaunch(), false);
  assert.equal(notOwned.host().hidden, true, 'bandeau masqué tant que non achetée');
  assert.equal(notOwned.sandbox.setAutoRelaunchEnabled(true), false);
  assert.ok(notOwned.calls.notifies.some((m) => /auto_relaunch_need/.test(m)));
  const inRun = bootAutoRelaunch({ run: { active: true }, location: 'route1' });
  assert.equal(inRun.sandbox.autoRelaunchAllowedHere(), false, 'expédition active');
  const dungeonLoc = bootAutoRelaunch({ location: 'mtmoon' });
  assert.equal(dungeonLoc.sandbox.autoRelaunchAllowedHere(), false, 'lieu de type donjon');
  const ff = bootAutoRelaunch({ ff: true });
  assert.equal(ff.sandbox.scheduleAutoRelaunch(), false, 'PW_FF');
  const town = bootAutoRelaunch({ location: 'pallet' });
  assert.equal(town.sandbox.scheduleAutoRelaunch(), false, 'pas de table sauvage');
  const fighting = bootAutoRelaunch();
  fighting.sandbox.battle.active = true;
  fighting.sandbox.window.battle.active = true;
  assert.equal(fighting.sandbox.scheduleAutoRelaunch(), false, 'combat déjà actif');
  // Conditions devenues fausses PENDANT le compte à rebours → pas de relance.
  const late = bootAutoRelaunch();
  late.sandbox.scheduleAutoRelaunch();
  late.sandbox.battle.active = true;
  late.timers[0].cb();
  assert.equal(late.calls.explore, 0);
});

test('R2-04e · endBattle() relève la défaite AVANT le soin R1-06 et n’arme la relance qu’hors donjon', () => {
  const src = R('src/application/combat/battle-flow.js');
  const iDefeat = src.indexOf('_arDefeat =');
  const iHeal = src.indexOf('restoreTeamAfterBattle()', src.indexOf('function endBattle()'));
  const iSchedule = src.indexOf('globalThis.scheduleAutoRelaunch()');
  assert.ok(iDefeat > 0 && iHeal > iDefeat, 'défaite relevée avant le soin');
  assert.ok(iSchedule > iHeal, 'relance armée en fin de endBattle');
  assert.match(
    src,
    /_arDefeat && !_dgRunActive && typeof globalThis\.scheduleAutoRelaunch === 'function'/
  );
  assert.match(
    src,
    /isWildChillChainActive\(\) &&[\s\S]{0,200}!G\.team\.some\(\(p\) => p && Number\(p\.currentHP\) > 0\)/
  );
  // Rattrapage hors-ligne : chaîne perdue → même relance différée, hors donjon.
  const off = R('src/application/save/offline-engine.js');
  assert.match(
    off,
    /battlesRes\.lost &&\s*!dungeonActive &&\s*typeof globalThis\.scheduleAutoRelaunch === 'function'/
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5) SND-01..03 — SON ET MUSIQUE (décisions joueur : CC0, effets ON, musique
//    ON à 40 %, jamais de musique onglet caché, son brillant apparu + capturé).
// ════════════════════════════════════════════════════════════════════════════
function bootAudio(opts = {}) {
  const made = []; // instances Audio (pistes)
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.volume = 1;
      this.paused = true;
      this.plays = 0;
      made.push(this);
    }
    play() {
      this.paused = false;
      this.plays++;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  let contexts = 0;
  const node = () => ({
    gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    type: 'sine',
    buffer: null,
    connect() {},
    start() {},
    stop() {},
  });
  class FakeAudioContext {
    constructor() {
      contexts++;
      this.currentTime = 0;
      this.sampleRate = 8000;
      this.state = 'running';
      this.destination = {};
    }
    createGain() {
      return node();
    }
    createOscillator() {
      return node();
    }
    createBiquadFilter() {
      return node();
    }
    createBufferSource() {
      return node();
    }
    createBuffer(ch, len) {
      return { getChannelData: () => new Float32Array(len) };
    }
    resume() {
      return Promise.resolve();
    }
  }
  const stubs = Object.assign(
    { Audio: FakeAudio, AudioContext: FakeAudioContext },
    opts.stubs || {}
  );
  const { sandbox, dom } = makeDomSandbox('<div></div>', stubs);
  sandbox.setInterval = setInterval;
  sandbox.clearInterval = clearInterval;
  if (opts.prefs)
    dom.window.localStorage.setItem('pokeworld_audio_prefs', JSON.stringify(opts.prefs));
  vm.runInContext(harnessBundleSource(['src/core/audio.js']), sandbox, {
    filename: 'audio-bundle.js',
  });
  return { sandbox, dom, made, contexts: () => contexts };
}

test('R2-05 · SND-01 : muet et sans réseau tant qu’aucun geste ; déverrouillage au premier geste', () => {
  const { sandbox, made, contexts } = bootAudio();
  const st = sandbox.audioState();
  assert.equal(st.unlocked, false);
  assert.equal(contexts(), 0, 'aucun AudioContext au boot');
  assert.deepEqual(JSON.parse(JSON.stringify(st.prefs)), {
    sfxOn: true,
    sfxVol: 0.8,
    musicOn: true,
    musicVol: 0.4,
    criesOn: true, // V7-R3c — bus « cris » séparé
    criesVol: 0.6,
  });
  assert.equal(sandbox.audioPlaySfx('click'), false, 'effet ignoré avant le geste');
  assert.equal(sandbox.audioSetMusicContext('menu'), false, 'demande mémorisée, pas jouée');
  assert.equal(made.length, 0, 'aucune piste chargée avant le geste');
  assert.equal(sandbox.audioState().pendingKey, 'menu');
  // Premier geste (écouteur capture installé par audioInstall)
  sandbox.document.dispatchEvent(new sandbox.window.Event('pointerdown', { bubbles: true }));
  assert.equal(sandbox.audioState().unlocked, true);
  assert.equal(contexts(), 1, 'un seul AudioContext');
  assert.equal(made.length, 1, 'la piste en attente démarre');
  assert.equal(made[0].src, 'src/assets/audio/music/menu.mp3');
  assert.equal(made[0].loop, true);
  assert.equal(made[0].plays, 1);
  assert.equal(sandbox.audioPlaySfx('click'), true, 'effet joué après le geste');
  assert.equal(sandbox.audioPlaySfx('inconnu'), false);
  sandbox.audioStopMusic();
});

test('R2-05a · préférences persistées hors sauvegarde (localStorage) ; coupure et volume par bus', () => {
  const { sandbox, dom, made } = bootAudio({ prefs: { musicVol: 0.7, sfxOn: false } });
  const p = sandbox.audioPrefs();
  assert.equal(p.musicVol, 0.7);
  assert.equal(p.sfxOn, false);
  assert.equal(p.musicOn, true, 'fusion avec les défauts');
  sandbox.audioUnlock();
  assert.equal(sandbox.audioPlaySfx('click'), false, 'bus effets coupé');
  sandbox.audioToggle('sfx');
  assert.equal(sandbox.audioPlaySfx('click'), true);
  assert.equal(
    sandbox.audioSetVolume('music', 55, { percent: true }),
    0.55,
    'curseur 0–100 accepté'
  );
  assert.equal(
    sandbox.audioSetVolume('music', 0.01),
    0.01,
    "V7-R3c — 1 % n'est plus confondu avec 100 %"
  );
  assert.equal(sandbox.audioSetVolume('music', 55, { percent: true }), 0.55);
  const saved = JSON.parse(dom.window.localStorage.getItem('pokeworld_audio_prefs'));
  assert.equal(saved.musicVol, 0.55);
  assert.equal(saved.sfxOn, true);
  sandbox.audioSetMusicContext('map_kanto');
  assert.equal(made.length, 1);
  sandbox.audioSetEnabled('music', false);
  assert.equal(made[0].paused, true, 'musique coupée → piste en pause');
  sandbox.audioSetEnabled('music', true);
  assert.equal(made[0].paused, false, 'réactivée → reprise de la même piste (position conservée)');
  sandbox.audioStopMusic();
});

test('R2-05b · onglet caché : musique en pause, effets ignorés ; reprise au retour (décision joueur)', () => {
  const { sandbox, made } = bootAudio();
  sandbox.audioUnlock();
  sandbox.audioSetMusicContext('battle_wild');
  assert.equal(made[0].paused, false);
  sandbox.audioSetHidden(true);
  assert.equal(made[0].paused, true, 'caché → pause');
  assert.equal(sandbox.audioPlaySfx('ko'), false, 'caché → aucun effet');
  assert.equal(sandbox.audioSetMusicContext('dungeon'), true, 'changement mémorisé…');
  assert.equal(made.length, 1, '…mais aucune piste démarrée tant que caché');
  sandbox.audioSetHidden(false);
  assert.equal(made.length, 2, 'retour visible → la piste du contexte courant démarre');
  assert.equal(made[1].src, 'src/assets/audio/music/dungeon.mp3');
  assert.equal(made[1].paused, false);
  sandbox.audioStopMusic();
});

test('R2-05c · SND-03 : contexte → piste (8 boucles CC0), reprise de position par piste, fondu 1 s', async () => {
  const { sandbox, made } = bootAudio();
  const f = sandbox.audioMusicTrackFor;
  for (const k of [
    'menu',
    'map_kanto',
    'map_johto',
    'map_hoenn',
    'battle_wild',
    'battle_trainer',
    'dungeon',
    'battle_boss',
  ])
    assert.equal(f(k), k);
  assert.equal(f('map_sinnoh'), 'map_hoenn', 'région future → piste la plus récente');
  assert.equal(f(null), null);
  assert.equal(f('inconnu'), null);
  assert.equal(sandbox.AUDIO_FADE_MS, 1000);
  sandbox.audioUnlock();
  sandbox.audioSetMusicContext('map_kanto');
  sandbox.audioSetMusicContext('battle_wild');
  assert.equal(made.length, 2);
  assert.equal(sandbox.audioSetMusicContext('battle_wild'), false, 'même contexte : rien à faire');
  await new Promise((r) => setTimeout(r, 1300));
  assert.equal(made[0].paused, true, 'ancienne piste en pause après le fondu');
  assert.ok(Math.abs(made[1].volume - 0.4) < 0.01, 'nouvelle piste au volume musique (40 %)');
  sandbox.audioSetMusicContext('map_kanto');
  assert.equal(made.length, 2, 'retour carte : la MÊME instance reprend (position conservée)');
  assert.equal(made[0].plays, 2);
  sandbox.audioStopMusic();
});

function bootBindings(state = {}) {
  const handlers = new Map();
  const played = [];
  const musicCalls = [];
  const bus = {
    on(name, fn) {
      handlers.set(name, fn);
    },
    emit(name, payload) {
      const h = handlers.get(name);
      if (h) h(payload);
    },
  };
  const stubs = Object.assign(
    {
      EventBus: bus,
      G: { location: 'route1', region: 'kanto' },
      battle: { active: false },
      PokeWorldGameStarted: true,
      PW_FF: false,
      regionOfLoc: (id) => (/^j_/.test(id) ? 'johto' : /^h_/.test(id) ? 'hoenn' : 'kanto'),
      currentDungeonRun: () => null,
      audioPlaySfx: (n) => {
        played.push(n);
        return true;
      },
      audioSetMusicContext: (c) => {
        musicCalls.push(c);
        return true;
      },
    },
    state
  );
  const { sandbox } = makeDomSandbox('<button id="b">x</button>', stubs);
  vm.runInContext(harnessBundleSource(['src/application/audio-bindings.js']), sandbox, {
    filename: 'audio-bindings-bundle.js',
  });
  return { sandbox, bus, played, musicCalls, handlers };
}

test('R2-05d · contexte musical déduit de l’état : menu, carte par région, sauvage, dresseur, boss, donjon ; rien en rattrapage', () => {
  const { sandbox, musicCalls } = bootBindings();
  // V7-R3 · SND-04 — contextes COMPOSÉS (le moteur descend la chaîne de repli).
  const ctx = () => sandbox.audioCurrentContext();
  assert.ok(musicCalls.includes('map:kanto:route1'), 'contexte appliqué dès la liaison');
  sandbox.PokeWorldGameStarted = false;
  assert.equal(ctx(), 'menu');
  sandbox.PokeWorldGameStarted = true;
  sandbox.G.location = 'j_route29';
  // V7-R3d · SND-07 — une route sur deux porte le suffixe `:alt` (seconde piste de région)
  assert.match(ctx(), /^map:johto:j_route29(:alt)?$/);
  sandbox.G.location = 'h_route101';
  assert.match(ctx(), /^map:hoenn:h_route101(:alt)?$/);
  sandbox.battle = { active: true, enemyPoke: {} };
  assert.equal(ctx(), 'battle:wild:hoenn', 'V7-R3d — combat sauvage régionalisé');
  sandbox.battle.isChamp = true;
  sandbox.battle.champId = 'brock';
  assert.equal(ctx(), 'battle:gym:brock');
  sandbox.battle.isLeague = true;
  assert.equal(ctx(), 'battle:league');
  sandbox.battle = { active: true, enemyPoke: { _isRoaming: true } };
  assert.equal(ctx(), 'battle:roaming', 'errant → piste errant, repli boss');
  sandbox.battle = { active: true, enemyPoke: { isDungeonBoss: true } };
  assert.equal(ctx(), 'battle:boss', 'gardien de donjon');
  sandbox.battle = { active: false };
  sandbox.currentDungeonRun = () => ({ active: true, loc: 'mtmoon' });
  assert.equal(ctx(), 'dungeon:mtmoon:cave');
  sandbox.PW_FF = true;
  assert.equal(ctx(), null, 'rattrapage hors-ligne : aucun changement');
  assert.equal(sandbox.audioRefreshContext(), null);
});

test('R2-05e · SND-02 : chaque effet est un abonnement au bus ; brillant apparu / capturé ; silence pendant PW_FF', () => {
  const { sandbox, bus, played, handlers } = bootBindings();
  for (const name of [
    'pokemonCaught',
    'badgeEarned',
    'leagueWon',
    'bossDefeated',
    'pokemonEvolved',
    'pokemonHatched',
    'battle:enemy',
    'catch:throw',
    'catch:fail',
    'combat:enemy-fainted',
    'combat:player-fainted',
    'pokemon:level-up',
    'ui:notify',
    'ui:window-open',
    'dungeon:chest',
    'quest:completed',
    'mine:treasure',
    'economy:item-bought',
  ])
    assert.ok(handlers.has(name), `abonnement ${name}`);
  assert.ok(Object.keys(sandbox.AUDIO_EVENT_SFX).length >= 20, '≈ 20 effets');
  bus.emit('battle:enemy', { shiny: true });
  bus.emit('battle:enemy', { shiny: false });
  bus.emit('battle:enemy', { shiny: false, roaming: true });
  bus.emit('pokemonCaught', { shiny: true });
  bus.emit('pokemonCaught', { shiny: false });
  bus.emit('ui:notify', { kind: 'danger' });
  bus.emit('ui:notify', { kind: 'success' });
  bus.emit('combat:enemy-fainted', { boss: true });
  bus.emit('combat:enemy-fainted', {});
  bus.emit('catch:throw', {});
  bus.emit('catch:fail', {});
  assert.deepEqual(played, [
    'shiny',
    'roamer',
    'shiny_catch',
    'catch',
    'error',
    'notify',
    'boss',
    'ko',
    'throw',
    'catch_fail',
  ]);
  played.length = 0;
  sandbox.PW_FF = true;
  bus.emit('pokemonCaught', { shiny: true });
  bus.emit('combat:enemy-fainted', {});
  assert.deepEqual(played, [], 'parité hors-ligne : le rattrapage ne joue rien');
  sandbox.PW_FF = false;
  // Clic sur un bouton → effet « click » (écouteur DOM, pas le bus)
  sandbox.document
    .getElementById('b')
    .dispatchEvent(new sandbox.window.Event('click', { bubbles: true }));
  assert.deepEqual(played, ['click']);
});

test('R2-05f · contrats de source : combat/ sans audio, événements émis aux bons endroits, crédits CC0, assets copiés', () => {
  const combat = fs.readdirSync(new URL('../src/application/combat/', import.meta.url));
  for (const f of combat) {
    const src = R('src/application/combat/' + f);
    assert.doesNotMatch(src, /audioPlaySfx|audioSetMusicContext|core\/audio\.js/, `${f} : 0 audio`);
  }
  const catchSrc = R('src/application/combat/catch.js');
  assert.match(catchSrc, /pwEmit\('catch:throw'/);
  assert.match(catchSrc, /pwEmit\('catch:fail'/);
  assert.match(catchSrc, /EVENTS\.POKEMON_CAUGHT, \{[\s\S]{0,120}shiny: wasShiny/);
  assert.match(R('src/application/combat/battle-init.js'), /pwEmit\('battle:enemy'/);
  assert.match(R('src/application/encounter-system.js'), /pwEmit\('battle:enemy'/);
  assert.match(R('src/application/combat/battle-flow.js'), /pwEmit\('battle:end'/);
  assert.match(R('src/application/combat/battle-status.js'), /pwEmit\('combat:enemy-fainted'/);
  assert.match(R('src/application/combat/battle-encounter.js'), /pwEmit\('combat:player-fainted'/);
  assert.match(R('src/application/combat/progression.js'), /pwEmit\('pokemon:level-up'/);
  assert.match(R('src/application/combat/progression.js'), /pwEmit\('pokemonEvolved'/);
  assert.match(R('src/application/breeding/hatchery.js'), /pwEmit\('pokemonHatched'/);
  assert.match(R('src/application/world/dungeon-run.js'), /pwEmit\('bossDefeated'/);
  assert.match(R('src/application/world/dungeon-run.js'), /pwEmit\('dungeon:chest'/);
  assert.match(R('src/application/quests/quest-core.js'), /pwEmit\('quest:completed'/);
  assert.match(R('src/core/game-utils.js'), /pwEmit\('ui:notify'/);
  assert.match(R('src/engine/runtime/classic-bridge.js'), /window\.pwEmit = pwEmit/);
  // Crédits : chaque piste a sa ligne ; licence CC0 ; budget ≤ 40 Mo (V7-R3d : 42 pistes)
  const credits = R('docs/CREDITS.md');
  const dir = new URL('../src/assets/audio/music/', import.meta.url);
  const tracks = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3'));
  assert.equal(tracks.length, 42);
  let bytes = 0;
  for (const f of tracks) {
    assert.ok(credits.includes('`' + f + '`'), `crédit ${f}`);
    bytes += fs.statSync(new URL(f, dir)).size;
  }
  assert.ok(bytes <= 40 * 1024 * 1024);
  assert.match(credits, /CC0/);
  assert.match(R('tools/copy-runtime-assets.mjs'), /src\/assets\/audio/);
  assert.match(R('tools/validate-project.mjs'), /SND-03/);
  // Réglages → Son (modèle + vue + i18n)
  assert.match(R('src/application/save/settings.js'), /sound: \(function \(\)/);
  assert.match(R('src/ui/views/SettingsModalView.js'), /toggleAudioBus/);
  for (const k of [
    'settings_sound_title',
    'settings_sfx',
    'settings_music',
    'settings_volume',
    'settings_cries', // V7-R3c — bus « cris » séparé
  ]) {
    assert.ok(hasKey(FR, k), `FR ${k}`);
    assert.ok(hasKey(EN, k), `EN ${k}`);
  }
  // Toute minuterie du moteur audio est unref() (règle projet)
  const audio = R('src/core/audio.js');
  assert.match(audio, /typeof id\.unref === 'function'\) id\.unref\(\)/);
  assert.match(R('src/application/audio-bindings.js'), /_audioPoll\.unref/);
});
