import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { ws } from './helpers/ws.js';
import { GAME } from '../src/data/game-config.js';
import { TYPES, TYPE_CHART, typeEffect } from '../src/domain/battle/type-system.js';
import { toHTMLString } from '../src/engine/render/vdom.js';
import { discordLinkVNode } from '../src/ui/components/discord-link.js';
import {
  MOBILE_VIEW_WINS,
  MOBILE_MANAGE_WINS,
  pwMobileViewForWin,
} from '../src/engine/runtime/mobile-views.js';
import {
  tutorialTargetSelectors,
  applyTutorialHighlight,
  TUTO_TARGET_CLASS,
} from '../src/ui/game/tutorial-highlight.js';
import * as DebugAccess from '../src/application/save/debug-access.js';

// V7-R1 — retours joueurs (10 points) : chaque correctif a un garde-fou.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const UI_FR = R('src/localization/fr/ui.js');
const UI_EN = R('src/localization/en/ui.js');
const DISCORD = 'https://discord.gg/DXC48vtGV';

// ── Harnais combat (même recette que DBT-07, réduit au nécessaire) ──────────
const GAME_FILES = [
  'src/data/game-config.js',
  'src/data/moves.js',
  'src/data/pd-data.js',
  'src/data/forms-data.js',
  'src/domain/pokemon/species-key.js',
  'src/data/items-data.js',
  'src/data/items-helpers.js',
  'src/data/poke-talents.js',
  'src/data/locations-data.js',
  'src/data/locations-johto.js',
  'src/data/locations-hoenn.js',
  'src/data/route-drops.js',
  'src/data/game-helpers.js',
  'src/application/world/team.js',
  'src/application/pokemon-factory.js',
  'src/application/economy/currency.js',
  'src/application/economy/pokeballs.js',
  'src/application/world/collection.js',
  'src/application/combat/battle-init.js',
  'src/application/combat/battle-attack.js',
  'src/application/combat/stat-mods.js',
  'src/application/combat/battle-status.js',
  'src/application/combat/battle-flow.js',
  'src/application/combat/battle-encounter.js',
  'src/application/combat/catch.js',
  'src/application/combat/progression.js',
];

function bootGame() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="battle-log"></div><div id="battle-idle-screen"></div><div id="battle-active-scene"></div></body></html>',
    {
      runScripts: 'outside-only',
      url: 'http://localhost/',
    }
  );
  const sb = dom.getInternalVMContext();
  const noop = () => 0;
  const logs = [];
  sb.setInterval = noop;
  sb.setTimeout = (fn) => {
    try {
      if (typeof fn === 'function') fn();
    } catch (_) {}
    return 0;
  };
  sb.clearInterval = noop;
  sb.clearTimeout = noop;
  sb.requestAnimationFrame = noop;
  const battle = { active: false };
  Object.assign(sb, {
    G: {
      team: [],
      teamSlotItems: [],
      collection: {},
      inventory: {},
      unlockedTalents: {},
      pokeballs: { pokeball: 50, greatball: 0, ultraball: 0, masterball: 0 },
      wallet: { questPoints: 0, diamonds: 0, dungeonTokens: 0 },
      lang: 'fr',
      region: 'kanto',
      location: 'route1',
      badges: [],
      activeQuests: [],
      completedQuests: {},
      money: 0,
      pokedex: {},
      wildWinsByLoc: {},
      stats: {},
      automation: {},
      staff: {},
      settings: {},
      mainStep: { kanto: 0 },
      mainProgress: { kanto: 0 },
    },
    battle,
    PokeWorldCore: {
      randomInt: (a, b) => a,
      chancePercent: () => false,
      clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    },
    rand: (a) => a,
    chance: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k,
    tr: (k, p) => `${k}:${JSON.stringify(p || {})}`,
    getPokeName: (id) => 'P' + id,
    getLocName: (id) => id,
    getItemName: (k) => k,
    getMoveName: (k) => k,
    getTalentName: (k) => k,
    currentLang: () => 'fr',
    clearBattleLog: () => {
      battle.log = [];
    },
    notify: noop,
    setMsg: noop,
    addBattleLog: (m) => logs.push(String(m)),
    saveGame: noop,
    autoSave: noop,
    updateHeader: noop,
    renderTeam: noop,
    renderTeamWindow: noop,
    renderBattle: noop,
    updateBattleUI: noop,
    renderMoveButtons: noop,
    renderEnemyMoveBars: noop,
    restoreAllTransformedPokemon: noop,
    renderBattleTeam: noop,
    applyDynamicStyles: noop,
    setMobileView: noop,
    applyLocationBackground: noop,
    renderBgPokemon: noop,
    spawnBattleFloat: noop,
    firstAlive: () => sb.G.team.findIndex((p) => p && p.currentHP > 0),
    aliveCount: () => sb.G.team.filter((p) => p && p.currentHP > 0).length,
    PokeWorldDomain: {
      typeSystem: { TYPES, TYPE_COLORS: {}, TYPE_CHART, typeEffect, effectivenessText: () => '' },
    },
    typeEff: (a, d1, d2) => typeEffect(a, d1, d2),
    effText: () => '',
    EventBus: { on: noop, emit: noop },
    EVENTS: {},
    POKE_NAMES_EN: {},
    POKE_NAMES_FR: {},
    __logs: logs,
  });
  for (const f of GAME_FILES) vm.runInContext(harnessBundleSource([f]), sb, { filename: f });
  return { sb, close: () => dom.window.close() };
}

// ── #5 / #6 — soin de l'équipe après combat / fin de donjon ────────────────

test('R1-06 · restoreTeamAfterBattle soigne PV + statut de toute l’équipe et journalise', () => {
  const { sb, close } = bootGame();
  try {
    const a = sb.createPoke(25, 40, false);
    const b = sb.createPoke(1, 30, false);
    a.currentHP = 0;
    a.status = 'par';
    a.statusTurns = 2;
    b.currentHP = Math.floor(b.maxHP / 3);
    sb.G.team.push(a, b);
    assert.equal(sb.restoreTeamAfterBattle(), true);
    assert.equal(a.currentHP, a.maxHP);
    assert.equal(a.status, null);
    assert.equal(a.statusTurns, 0);
    assert.equal(b.currentHP, b.maxHP);
    assert.ok(sb.__logs.includes('team_healed_after_battle'), 'ligne de journal (i18n) émise');
    assert.equal(sb.restoreTeamAfterBattle(), false, 'rien à soigner → false');
  } finally {
    close();
  }
});

test('R1-06 · endBattle() soigne l’équipe hors donjon (le joueur voit des Pokémon prêts à repartir)', () => {
  const { sb, close } = bootGame();
  try {
    const a = sb.createPoke(25, 40, false);
    a.currentHP = 0;
    sb.G.team.push(a);
    sb.battle.active = true;
    sb.battle.chill = false;
    sb.battle.timerId = 0;
    sb.endBattle();
    assert.equal(a.currentHP, a.maxHP, 'K.O. soigné à la fin du combat');
  } finally {
    close();
  }
});

test('R1-05 · en expédition de donjon, le soin de fin de combat est suspendu (PV persistants) ; unlessDungeon idem', () => {
  const { sb, close } = bootGame();
  try {
    const a = sb.createPoke(25, 40, false);
    a.currentHP = 1;
    sb.G.team.push(a);
    sb.currentDungeonRun = () => ({ active: true });
    assert.equal(sb.restoreTeamAfterBattle({ unlessDungeon: true }), false);
    assert.equal(a.currentHP, 1, 'pas de soin pendant l’expédition');
    sb.battle.active = true;
    sb.battle.chill = false;
    sb.battle.timerId = 0;
    sb.endBattle();
    assert.equal(a.currentHP, 1, 'endBattle respecte l’expédition en cours');
    sb.currentDungeonRun = () => ({ active: false });
    assert.equal(
      sb.restoreTeamAfterBattle({ unlessDungeon: true }),
      true,
      'hors expédition → soin'
    );
  } finally {
    close();
  }
});

test('R1-05 · fin de donjon : défaite (wipe) ET abandon reposent l’équipe (_dgRestTeam), comme la remontée', () => {
  const src = R('src/application/world/dungeon-run.js');
  const wipe = src.slice(
    src.indexOf('function dungeonOnWipe('),
    src.indexOf('function dungeonAbandon(')
  );
  const abandon = src.slice(src.indexOf('function dungeonAbandon('));
  assert.ok(wipe.length > 0 && abandon.length > 0, 'fonctions trouvées');
  assert.match(wipe, /_dgRestTeam\(\);/, 'wipe → repos');
  assert.match(abandon.slice(0, 1500), /_dgRestTeam\(\);/, 'abandon → repos');
  assert.match(
    ws(R('src/application/save/offline-engine.js')),
    /restoreTeamAfterBattle\(\{silent:true,unlessDungeon:true\}\)/,
    'rattrapage hors-ligne : soin silencieux hors donjon'
  );
});

// ── #7 — guide « Capture & IV » + constantes de capture ──────────────────────

test('R1-07 · le gain d’IV à la capture est piloté par GAME.CAPTURE (plus de 10 / 12 en dur)', () => {
  assert.deepEqual(GAME.CAPTURE, { IV_CHANCE_PCT: 10, IV_CAP: 12 });
  for (const f of ['src/application/combat/catch.js', 'src/application/world/collection.js']) {
    const src = ws(R(f));
    assert.doesNotMatch(src, /chance\(10\)/, `${f}: chance(10) remplacé`);
    assert.doesNotMatch(src, /Math\.random\(\) < 0\.1\b/, `${f}: Math.random() < 0.1 remplacé`);
    assert.match(src, /_captureIvChancePct\(\)/, `${f}: lit CAPTURE_IV_CHANCE_PCT`);
    assert.match(src, /_captureIvCap\(\)/, `${f}: lit CAPTURE_IV_CAP`);
  }
});

test('R1-07 · captureGuideValues() cite les VRAIS taux (BALL_DEFS, BALL_SCALE, GAME.CAPTURE)', async () => {
  const balls = await import('../src/application/economy/pokeballs.js');
  globalThis.BALL_DEFS = balls.BALL_DEFS;
  globalThis.BALL_SCALE = balls.BALL_SCALE;
  globalThis.GAME = GAME;
  try {
    const { captureGuideValues, guideSections } = await import('../src/ui/game/guide-sections.js');
    const v = captureGuideValues();
    assert.equal(v.pokeball, balls.BALL_DEFS.pokeball.rate);
    assert.equal(v.greatball, balls.BALL_DEFS.greatball.rate);
    assert.equal(v.ultraball, balls.BALL_DEFS.ultraball.rate);
    assert.equal(v.scaleMax, balls.BALL_SCALE.maxCopies);
    assert.equal(v.pct, GAME.CAPTURE.IV_CHANCE_PCT);
    assert.equal(v.cap, GAME.CAPTURE.IV_CAP);
    globalThis.t = (k) => k;
    globalThis.tr = (k, p) => `${k}:${JSON.stringify(p)}`;
    globalThis.getIcon = (name) => `<i data-icon="${name}"></i>`;
    const hadG = Object.prototype.hasOwnProperty.call(globalThis, 'G');
    const prevG = globalThis.G;
    globalThis.G = { lang: 'fr' };
    let sections;
    try {
      sections = guideSections();
    } finally {
      if (hadG) globalThis.G = prevG;
      else delete globalThis.G;
    }
    const keys = Object.keys(sections);
    assert.ok(
      keys.indexOf('capture') >= 0 && keys.indexOf('capture') < keys.indexOf('pokemon'),
      'rubrique Capture avant Pokémon'
    );
    assert.equal(sections.capture.icon, '<i data-icon="pokeball"></i>');
    assert.equal(sections.capture.title, 'guide_capture_title');
    assert.equal(sections.capture.pages.length, 4);
    assert.ok(
      sections.capture.pages[1][1].includes(`"scaleMax":${balls.BALL_SCALE.maxCopies}`),
      'la page des taux reçoit les valeurs réelles'
    );
    assert.ok(
      sections.capture.pages[2][1].includes(`"pct":${GAME.CAPTURE.IV_CHANCE_PCT}`) &&
        sections.capture.pages[2][1].includes(`"cap":${GAME.CAPTURE.IV_CAP}`)
    );
  } finally {
    delete globalThis.BALL_DEFS;
    delete globalThis.BALL_SCALE;
    delete globalThis.GAME;
    delete globalThis.t;
    delete globalThis.tr;
    delete globalThis.getIcon;
  }
});

test('R1-07 · ballEffectiveRate suit BALL_SCALE (paliers 5 → +2 %/palier, plafond 25 ex.)', async () => {
  const balls = await import('../src/application/economy/pokeballs.js');
  const special = Object.keys(balls.BALL_DEFS).find((k) => balls.BALL_DEFS[k].scaling);
  assert.ok(special, 'au moins une ball spéciale à échelle');
  const base = balls.BALL_DEFS[special].rate;
  const saveG = globalThis.G;
  try {
    for (const [qty, extra] of [
      [0, 0],
      [4, 0],
      [5, 2],
      [12, 4],
      [25, 10],
      [99, 10],
    ]) {
      globalThis.G = { pokeballs: { [special]: qty } };
      assert.equal(balls.ballEffectiveRate(special), base + extra, `${qty} ex. → +${extra} %`);
    }
  } finally {
    if (saveG === undefined) delete globalThis.G;
    else globalThis.G = saveG;
  }
});

test('R1-07 · textes du guide Capture présents FR + EN, paramétrés (aucun % en dur) ; fenêtre Poké Balls → rubrique capture', () => {
  for (const k of [
    'guide_capture_title',
    'guide_capture_how',
    'guide_capture_how_desc',
    'guide_capture_rates',
    'guide_capture_rates_desc',
    'guide_capture_iv',
    'guide_capture_iv_desc',
    'guide_capture_dupes',
    'guide_capture_dupes_desc',
  ]) {
    assert.ok(UI_FR.includes(`"${k}"`), `fr: ${k}`);
    assert.ok(UI_EN.includes(`"${k}"`), `en: ${k}`);
  }
  for (const src of [UI_FR, UI_EN]) {
    const rates = src.match(/"guide_capture_rates_desc":"([^"]*)"/)[1];
    for (const ph of ['{pokeball}', '{greatball}', '{ultraball}', '{bonus}', '{scaleMax}'])
      assert.ok(rates.includes(ph), `rates_desc porte ${ph}`);
    const iv = src.match(/"guide_capture_iv_desc":"([^"]*)"/)[1];
    assert.ok(iv.includes('{pct}') && iv.includes('{cap}'), 'iv_desc porte {pct} et {cap}');
  }
  assert.match(R('src/ui/game/dashboard.js'), /'win-pokeballs': 'capture'/);
});

// ── #8 — mode debug masqué, déverrouillage par code / console ───────────────

test('R1-08 · widget debug masqué par défaut (CSS) et visible seulement avec body.pw-debug-on', () => {
  assert.match(CSS, /#debug-widget\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(CSS, /body\.pw-debug-on #debug-widget\s*\{\s*display:\s*flex;?\s*\}/);
});

test('R1-08 · tryDebugCode : code exact → bascule mémorisée ; mauvais code refusé ; pwDebug.on/off/status', () => {
  const store = new Map();
  globalThis.safeStorage = {
    get: (k) => (store.has(k) ? store.get(k) : null),
    set: (k, v) => store.set(k, v),
    remove: (k) => store.delete(k),
  };
  try {
    assert.equal(DebugAccess.isDebugUnlocked(), false, 'verrouillé par défaut');
    assert.equal(DebugAccess.tryDebugCode('nope'), false);
    assert.equal(DebugAccess.isDebugUnlocked(), false);
    assert.equal(DebugAccess.tryDebugCode(' pwdebug '), true, 'insensible casse/espaces');
    assert.equal(DebugAccess.isDebugUnlocked(), true);
    assert.equal(store.get('pokeworld_debug'), '1', 'mémorisé hors sauvegarde de partie');
    assert.equal(DebugAccess.tryDebugCode('PWDEBUG'), true, 'le même code masque à nouveau');
    assert.equal(DebugAccess.isDebugUnlocked(), false);
    assert.match(globalThis.pwDebug.on(), /ON/);
    assert.equal(globalThis.pwDebug.status(), 'ON');
    assert.match(globalThis.pwDebug.off(), /OFF/);
    assert.equal(globalThis.pwDebug.status(), 'OFF');
    DebugAccess.hideDebugMode();
    assert.equal(DebugAccess.isDebugUnlocked(), false);
  } finally {
    delete globalThis.safeStorage;
  }
});

test('R1-08 · Réglages → Avancé : champ code + bouton, libellés FR/EN ; applyDebugAccess branché au démarrage', () => {
  const view = R('src/ui/views/SettingsModalView.js');
  assert.ok(
    view.includes('debug-code-input') &&
      view.includes('submitDebugCode') &&
      view.includes('hideDebugMode')
  );
  const settings = R('src/application/save/settings.js');
  assert.ok(settings.includes('applyDebugAccess()'), 'état restauré au boot (applySavedTheme)');
  assert.ok(settings.includes('settings_debug_code_label'));
  for (const k of [
    'settings_advanced_title',
    'settings_debug_code_label',
    'settings_debug_code_submit',
    'settings_debug_hide_btn',
    'debug_mode_enabled',
    'debug_mode_disabled',
    'debug_code_wrong',
  ]) {
    assert.ok(UI_FR.includes(`"${k}"`) && UI_EN.includes(`"${k}"`), k);
  }
});

// ── #4 — Discord dans les Réglages ET le menu des sauvegardes ───────────────

test('R1-04 · lien Discord : URL unique dans game-config, bouton sûr (nouvel onglet, noopener) dans les deux écrans', () => {
  assert.equal(GAME.COMMUNITY.DISCORD_URL, DISCORD);
  const html = toHTMLString(discordLinkVNode(DISCORD, 'Rejoindre le Discord'));
  assert.ok(html.includes(`href="${DISCORD}"`));
  assert.ok(html.includes('target="_blank"') && html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('pw-discord-btn') && html.includes('<svg'), 'bouton stylé + glyphe');
  assert.ok(
    R('src/ui/views/SettingsModalView.js').includes('discordLinkVNode'),
    'Réglages → Communauté'
  );
  assert.ok(
    R('src/ui/views/SaveMenuView.js').includes('discordLinkVNode'),
    'Menu principal (sauvegardes)'
  );
  assert.match(
    ws(R('src/application/save/save.js')),
    /discordUrl:typeofDISCORD_URL==='string'\?DISCORD_URL:''/
  );
  assert.match(R('src/application/save/settings.js'), /discordUrl:/);
  assert.ok(UI_FR.includes('"discord_join_btn"') && UI_EN.includes('"discord_join_btn"'));
  assert.doesNotMatch(
    R('src/localization/fr/ui.js') + R('src/localization/en/ui.js'),
    /discord\.gg/,
    'pas d’URL en dur dans les textes'
  );
});

// ── #1 — mobile : titres de fenêtre qui chevauchent le contenu ─────────────

test('R1-01 · .pw-win-hdr-title : plus de !important ; en mobile le titre redevient dans le flux (plus de chevauchement)', () => {
  const rule = CSS.match(/\.pw-win-hdr-title\s*\{[^}]*\}/g) || [];
  assert.ok(rule.length >= 1, 'règle présente');
  for (const r of rule)
    assert.doesNotMatch(r, /!important/, 'aucun !important sur le titre de fenêtre');
  assert.match(CSS, /body\.mobile-mode \.pw-win-hdr-title\s*\{[^}]*position:\s*static/);
  assert.match(CSS, /#map-region-select\s*\{[^}]*max-width/);
});

// ── #9 — mobile : fenêtres introuvables (Poké Balls, Monnaies) ──────────────

test('R1-09 · chaque fenêtre du tableau de bord appartient à une vue mobile ; Poké Balls sous Combat, Monnaies sous Raccourcis', () => {
  const ids = [...R('index.html').matchAll(/id="(win-[a-z]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 12, 'fenêtres détectées dans index.html');
  for (const id of ids) assert.ok(pwMobileViewForWin(id), `${id} est atteignable sur mobile`);
  assert.deepEqual(pwMobileViewForWin('win-pokeballs'), { view: 'combat' });
  assert.deepEqual(pwMobileViewForWin('win-currency'), { view: 'shortcuts' });
  assert.deepEqual(pwMobileViewForWin('win-mine'), { view: 'manage', manage: 'mine' });
  assert.equal(pwMobileViewForWin('nope'), null);
  assert.ok(
    MOBILE_VIEW_WINS.combat.includes('win-pokeballs') &&
      MOBILE_MANAGE_WINS.base.includes('win-base')
  );
  const bridge = ws(R('src/engine/runtime/classic-bridge.js'));
  assert.match(bridge, /MOBILE_VIEW_WINS\[view\]/, 'applyMobileView lit la source unique');
  assert.match(
    ws(R('src/ui/game/dashboard.js')),
    /pwMobileViewForWin\(winId\)/,
    'scrollToWin bascule de vue sur mobile'
  );
});

// ── #10 — tutoriel : surbrillance des cibles ────────────────────────────────

test('R1-10 · tutorialTargetSelectors déduit la cible de l’action de l’étape (+ cibles explicites)', () => {
  assert.deepEqual(
    tutorialTargetSelectors({ actionCall: 'scrollToWin', actionArgs: "'win-pokeballs'" }),
    ['#win-pokeballs']
  );
  assert.deepEqual(
    tutorialTargetSelectors({
      actionCall: 'clickLocation',
      actionArgs: "'route1'",
      targets: ['#x'],
    }),
    ['#nodes g.loc-node[data-call-args="\'route1\'"]', '#x']
  );
  assert.deepEqual(
    tutorialTargetSelectors({ actionCall: 'openFullscreenPanel', actionArgs: "'pokedex'" }),
    [
      '.shortcut-action-btn[data-panel="pokedex"]',
      '#win-tabs [data-call="openFullscreenPanel"][data-call-args="\'pokedex\'"]',
    ]
  );
  assert.deepEqual(tutorialTargetSelectors({ actionCall: 'showTab', actionArgs: "'team'" }), [
    '#win-team',
  ]);
  assert.deepEqual(tutorialTargetSelectors(null), []);
});

test('R1-10 · applyTutorialHighlight pose/retire pw-tuto-target ; sur mobile l’onglet de la vue clignote aussi', () => {
  const dom = new JSDOM(`<!doctype html><html><body class="game-started mobile-mode">
    <div class="mobile-nav-bar"><button data-mobile-view="adventure"></button><button data-mobile-view="combat"></button></div>
    <div id="main-dashboard"><div class="dash-win mobile-visible" id="win-map"></div><div class="dash-win" id="win-pokeballs"></div></div>
  </body></html>`);
  const prev = { document: globalThis.document, window: globalThis.window };
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  const st = { enabled: true, completed: {} };
  globalThis.ensureTutorialState = () => st;
  globalThis.tutorialSteps = () => [
    { id: 'a', actionCall: 'scrollToWin', actionArgs: "'win-map'" },
    { id: 'b', actionCall: 'scrollToWin', actionArgs: "'win-pokeballs'" },
  ];
  globalThis.pwMobileViewForWin = pwMobileViewForWin;
  try {
    const d = dom.window.document;
    assert.equal(applyTutorialHighlight(), 1, 'étape a : la carte (visible) seule');
    assert.ok(d.getElementById('win-map').classList.contains(TUTO_TARGET_CLASS));
    st.completed.a = true;
    assert.equal(applyTutorialHighlight(), 2, 'étape b : fenêtre masquée + onglet Combat');
    assert.ok(
      !d.getElementById('win-map').classList.contains(TUTO_TARGET_CLASS),
      'ancienne cible nettoyée'
    );
    assert.ok(d.getElementById('win-pokeballs').classList.contains(TUTO_TARGET_CLASS));
    assert.ok(d.querySelector('[data-mobile-view="combat"]').classList.contains(TUTO_TARGET_CLASS));
    st.enabled = false;
    assert.equal(applyTutorialHighlight(), 0, 'tuto désactivé → plus rien');
    assert.equal(d.querySelectorAll('.' + TUTO_TARGET_CLASS).length, 0);
  } finally {
    globalThis.document = prev.document;
    globalThis.window = prev.window;
    delete globalThis.ensureTutorialState;
    delete globalThis.tutorialSteps;
    delete globalThis.pwMobileViewForWin;
    dom.window.close();
  }
});

test('R1-10 · tutorial.js branche la surbrillance (hooks + carte Quêtes) et les étapes clés ont une cible', () => {
  const src = ws(R('src/ui/game/tutorial.js'));
  assert.match(src, /installTutorialHighlight\(\);/);
  assert.match(src, /setTimeout\(applyTutorialHighlight,0\)/);
  assert.ok((src.match(/targets:\[/g) || []).length >= 3, 'cibles explicites (Explorer, donjon)');
  assert.match(CSS, /\.pw-tuto-target\s*\{/);
  assert.match(CSS, /@keyframes pw-tuto-pulse/);
  assert.match(CSS, /prefers-reduced-motion[^}]*\{[^}]*\.pw-tuto-target/s);
});
