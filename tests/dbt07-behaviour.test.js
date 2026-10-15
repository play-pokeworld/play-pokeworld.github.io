import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { SAVE_VERSION } from '../src/data/game-config.js';
import { TYPES, TYPE_CHART, typeEffect } from '../src/domain/battle/type-system.js';

// V7 · DBT-07 — tests COMPORTEMENTAUX : le vrai code du jeu (quêtes, combat,
// capture, éclosion, sauvegarde + migrations) s'exécute dans un bac à sable
// jsdom ; seuls l'aléatoire (déterministe), l'i18n et le rendu sont des stubs.

const GAME_FILES = [
  'src/data/game-config.js', 'src/data/moves.js', 'src/data/pd-data.js', 'src/data/forms-data.js', 'src/domain/pokemon/species-key.js',
  'src/data/items-data.js', 'src/data/items-helpers.js', 'src/data/poke-talents.js',
  'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/locations-hoenn.js', 'src/data/route-drops.js', 'src/data/game-helpers.js',
  'src/application/world/team.js', 'src/application/pokemon-factory.js',
  'src/data/champions-data.js', 'src/data/official-teams-data.js', 'src/data/official-teams-hoenn.js',
  'src/data/story-quests.js', 'src/data/story-quests-hoenn.js', 'src/data/side-quests-data.js', 'src/data/legendary-quests.js',
  'src/data/npc-data.js', 'src/data/repeatable-quests-data.js', 'src/data/trainer-sprites-data.js',
  'src/application/economy/currency.js', 'src/application/economy/pokeballs.js', 'src/application/world/collection.js',
  'src/application/world/exploration-actions.js', 'src/application/world/puzzle-explorations.js', 'src/application/quests/quest-core.js',
  'src/application/combat/battle-init.js', 'src/application/combat/battle-attack.js', 'src/application/combat/stat-mods.js',
  'src/application/combat/battle-status.js', 'src/application/combat/battle-flow.js', 'src/application/combat/battle-encounter.js',
  'src/application/combat/catch.js', 'src/application/combat/progression.js',
  // Boucle ECS + système de rencontres : UN seul bundle pour partager le même monde ECS (import commun battle-loop.js).
  ['src/application/battle-loop.js', 'src/application/gameplay-ports.js', 'src/application/encounter-system.js'],
  'src/application/breeding/hatchery.js',
  'src/data/atoll-sets-data.js', 'src/application/world/atoll-core.js',
];

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const BATTLE_DOM = `<!doctype html><html><body>
<div id="battle-idle-screen"></div><div id="battle-active-scene"></div><div id="battle-team-row"></div>
<div id="battle-log"></div><div id="enemy-sprite"></div><div id="battle-enemy-name"></div><div id="battle-msg"></div>
<div id="battle-summary-modal"></div><button id="leave-btn"></button><div id="hatchery-window-body"></div>
</body></html>`;

function bootGame({ seed = 11, catchRoll = 1 } = {}) {
  const dom = new JSDOM(BATTLE_DOM, { runScripts: 'outside-only', url: 'http://localhost/' });
  const sb = dom.getInternalVMContext();
  const rng = seeded(seed);
  const noop = () => 0;
  const logs = [], notifications = [];
  sb.setInterval = noop; sb.setTimeout = (fn) => { try { if (typeof fn === 'function') fn(); } catch (_) {} return 0; };
  sb.clearInterval = noop; sb.clearTimeout = noop; sb.requestAnimationFrame = noop;
  const battle = { active: false };
  Object.assign(sb, {
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [null, null], hatcheryModes: ['breed', 'breed'], training: [], inventory: {}, unlockedTalents: {},
      pokeballs: { pokeball: 50, greatball: 0, ultraball: 0, masterball: 0 }, wallet: { questPoints: 0, diamonds: 0, dungeonTokens: 0 },
      lang: 'fr', region: 'kanto', location: 'route1', badges: [], activeQuests: [], repeatables: [], questTrainerWins: {},
      mainStep: { kanto: 0, johto: 0, hoenn: 0 }, mainProgress: { kanto: 0, johto: 0, hoenn: 0 }, wildWinsByLoc: {}, visitedMaps: {},
      completedQuests: {}, money: 0, pokedex: {}, regionLeagueWon: {}, puzzles: {}, _questIdMigrationV7: 7, shinyUnlocked: {},
      stats: {}, automation: {}, staff: {}, settings: {},
    },
    battle,
    PokeWorldCore: { randomInt: (a, b) => a + Math.floor(rng() * (b - a + 1)), chancePercent: (p) => rng() * 100 < p, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: (a, b) => a + Math.floor(rng() * (b - a + 1)), chance: (p) => (catchRoll != null ? catchRoll * 100 < p : rng() * 100 < p),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k, p) => `${k}:${JSON.stringify(p || {})}`, getPokeName: (id) => 'P' + id, getLocName: (id) => id, getItemName: (k) => k,
    getMoveName: (k) => k, getTalentName: (k) => k, currentLang: () => 'fr',
    clearBattleLog: () => { battle.log = []; },
    notify: (m) => notifications.push(String(m)), setMsg: (m) => notifications.push(String(m)), addBattleLog: (m) => logs.push(String(m)),
    saveGame: () => {}, autoSave: () => {}, updateHeader: () => {}, renderTeam: () => {}, renderTeamWindow: () => {}, renderHatcheryWindow: () => {},
    renderBattle: () => {}, updateBattleUI: () => {}, renderMoveButtons: () => {}, renderEnemyMoveBars: () => {}, restoreAllTransformedPokemon: () => {}, renderBattleTeamRow: () => {}, renderBattleLog: () => {}, updateBattleHeader: () => {}, showBattleSummary: () => {}, hideBattleSummary: () => {}, openBattleSummary: () => {}, playSfx: () => {}, renderStoryWindow: () => {}, refreshMapAndLoc: () => {}, renderLocInfo: () => {},
    applyDynamicStyles: () => {}, setMobileView: () => {}, applyLocationBackground: () => {}, renderBgPokemon: () => {},
    // Deux helpers vivant dans l'UI (team-ui.js) — recopiés à l'identique.
    firstAlive: () => sb.G.team.findIndex((p) => p && p.currentHP > 0), aliveCount: () => sb.G.team.filter((p) => p && p.currentHP > 0).length,
    // Table des types réelle (DBT-05 : une seule), exposée comme le fait classic-bridge.js.
    PokeWorldDomain: { typeSystem: { TYPES, TYPE_COLORS: {}, TYPE_CHART, typeEffect, effectivenessText: () => '' } },
    typeEff: (a, d1, d2) => typeEffect(a, d1, d2), effText: () => '', spawnBattleFloat: () => {},
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: { WILD_DEFEATED: 'a', POKEMON_CAUGHT: 'b', MINE_SELL: 'c', BADGE_EARNED: 'd', LEAGUE_WON: 'e' },
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
    __logs: logs, __notifications: notifications,
  });
  for (const f of GAME_FILES) vm.runInContext(harnessBundleSource([].concat(f)), sb, { filename: [].concat(f).join('+') });
  sb.G.team.push(sb.createPoke(25, 40, false));
  sb.ensureQuestState();
  return { sb, dom, close: () => dom.window.close() };
}

// ── Quêtes ──────────────────────────────────────────────────────────────────

test('DBT-07 · quête annexe SANS rewardPoke : claimQuest paie les PQ (barème réel), donne l’objet et clôt la quête', () => {
  const { sb, close } = bootGame();
  try {
    const def = sb.SIDE_QUESTS.s1; // 10 victoires route1 → 700 ₽ historiques + chople_berry
    assert.ok(def && !def.rewardPoke && def.rewardItems && def.rewardItems.chople_berry === 1);
    sb.G.activeQuests.push({ qid: 's1', cat: 'side', progress: def.target, done: false });
    const pqBefore = sb.G.wallet.questPoints;
    sb.claimQuest('s1', 'side');
    assert.equal(sb.G.wallet.questPoints - pqBefore, sb.pqForMoney(def.rewardMoney), 'les PQ suivent le barème pqForMoney du code');
    assert.equal(sb.G.inventory.chople_berry, 1, 'objet de récompense dans le sac');
    assert.equal(sb.G.completedQuests.side_s1, true);
    assert.ok(!sb.G.activeQuests.some((i) => i.qid === 's1'), 'quête retirée des actives');
    assert.equal(sb.G.team.length, 1, 'aucun Pokémon offert');
  } finally { close(); }
});

test('DBT-07 · quête principale AVEC rewardPoke : claimQuest lance la rencontre réelle (startBattle) au lieu d’offrir le Pokémon', () => {
  const { sb, close } = bootGame();
  try {
    sb.G.inventory.pokeflute = 1;
    const idx = sb.getRegionChain('kanto').findIndex((q) => q.id === 31); // Poké Flute → Ronflex
    assert.ok(idx >= 0);
    sb.G.mainStep.kanto = idx;
    sb.syncActiveMain();
    const def = sb.getMainQuestDef(31);
    assert.ok(def.rewardPoke, 'la quête 31 a un rewardPoke');
    if (def.encounterLoc) sb.G.location = def.encounterLoc;
    sb.claimQuest(31, 'main');
    assert.equal(sb.battle.active, true, 'le vrai startBattle a démarré un combat');
    assert.equal(Number(sb.battle.enemyPoke.id), Number(def.rewardPoke));
    assert.equal(sb.battle.questRewardQuestId, 31);
    assert.equal(sb.G.team.length, 1, 'le Pokémon n’est PAS offert directement (D13)');
    assert.equal(sb.G.completedQuests[31], undefined, 'la quête reste ouverte tant que la rencontre n’est pas gagnée');
  } finally { close(); }
});

// ── Combat ──────────────────────────────────────────────────────────────────

test('DBT-07 · combat : startBattle(ennemi) ouvre un combat cohérent, endBattle() le referme', () => {
  const { sb, close } = bootGame();
  try {
    const enemy = sb.createPoke(16, 5, false); // Roucool
    sb.startBattle(enemy);
    assert.equal(sb.battle.active, true);
    assert.equal(sb.battle.enemyPoke, enemy);
    assert.equal(sb.battle.playerPokeIdx, 0, 'premier Pokémon vivant sélectionné');
    assert.ok(enemy.currentHP > 0 && enemy.maxHP === enemy.currentHP);
    sb.endBattle();
    assert.equal(sb.battle.active, false);
  } finally { close(); }
});

test('DBT-07 · capture : attemptAutoCatch consomme une Poké Ball, enregistre le Pokédex et range le Pokémon', () => {
  const { sb, close } = bootGame({ catchRoll: 0 }); // le jet de capture réussit toujours
  try {
    // Comme le joueur dans l'onglet Poké Balls : le filtre « nouveaux » (none → pokeball) est armé via le vrai cycle.
    sb.ensurePokeballs();
    assert.equal(sb.ballForEnemy(sb.createPoke(19, 4, false)), null, 'par défaut aucun filtre n’envoie de Ball');
    sb.cycleFilterBall('new');
    const enemy = sb.createPoke(19, 4, false); // Rattata
    sb.startBattle(enemy);
    assert.equal(sb.ballForEnemy(enemy), 'pokeball', 'le filtre « nouveaux » cible le Rattata inconnu');
    const balls = sb.G.pokeballs.pokeball;
    const caught = sb.attemptAutoCatch(enemy);
    assert.equal(caught, true, 'capture réussie');
    assert.equal(sb.G.pokeballs.pokeball, balls - 1, 'une Poké Ball consommée');
    assert.ok(sb.G.pokedex[19] && sb.G.pokedex[19].caught, 'Pokédex : capturé');
    const owned = sb.G.team.some((p) => Number(p.id) === 19) || Object.values(sb.G.collection).some((p) => p && Number(p.id) === 19);
    assert.equal(owned, true, 'le Pokémon est dans l’équipe ou la boîte');
  } finally { close(); }
});

test('DBT-07 · capture : sans Poké Ball, aucune capture ni entrée Pokédex « capturé »', () => {
  const { sb, close } = bootGame({ catchRoll: 0 });
  try {
    sb.ensurePokeballs();
    sb.cycleFilterBall('new');
    sb.G.pokeballs.pokeball = 0;
    const enemy = sb.createPoke(19, 4, false);
    sb.startBattle(enemy);
    assert.equal(sb.ballForEnemy(enemy), null, 'filtre armé mais stock vide → aucune Ball lancée');
    const caught = sb.attemptAutoCatch(enemy);
    assert.notEqual(caught, true);
    assert.ok(!(sb.G.pokedex[19] && sb.G.pokedex[19].caught));
  } finally { close(); }
});

test('DBT-07 · combat : la boucle réelle (runBattleTick → ECS → domaine) met K.O. le sauvage, crédite l’XP et referme le combat', async () => {
  const { sb, close } = bootGame({ catchRoll: null }); // aléatoire déterministe (seed)
  const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
  try {
    sb.G.team[0] = sb.createPoke(25, 14, false); // niveaux proches : la règle « adversaire trop faible » ne coupe pas l'XP
    const me = sb.G.team[0];
    const xp0 = me.xp;
    const enemy = sb.createPoke(19, 10, false); // Rattata niv. 10 face à Pikachu niv. 14
    sb.startBattle(enemy);
    let ticks = 0;
    while (sb.battle.active && ticks < 600 && enemy.currentHP > 0) { sb.runBattleTick(); ticks++; }
    await flush(); // la suite du K.O. est enchaînée par des `await wait(...)`
    assert.ok(enemy.currentHP <= 0, 'le sauvage est K.O. (en ' + ticks + ' ticks)');
    assert.ok(me.xp > xp0, 'XP créditée par le vrai barème');
    assert.equal(sb.G.wildWinsByLoc.route1, 1, 'victoire sauvage comptée sur le lieu courant');
    // Mode PokéChill : la chaîne continue d'elle-même (encounter-system.js réel) — un NOUVEAU sauvage est en face.
    assert.equal(sb.battle.active, true, 'la chaîne sauvage enchaîne un nouvel adversaire');
    assert.notEqual(sb.battle.enemyPoke, enemy);
    assert.ok(sb.battle.enemyPoke && sb.battle.enemyPoke.currentHP > 0);
    sb.endBattle();
    assert.equal(sb.battle.active, false, 'endBattle() referme la chaîne');
  } finally { close(); }
});

// ── Éclosion ────────────────────────────────────────────────────────────────

test('DBT-07 · éclosion : hatchEgg produit un niveau 1 (+1 IV) dans la boîte et libère l’emplacement', () => {
  const { sb, close } = bootGame();
  try {
    const parent = sb.createPoke(4, 30, false); // Salamèche
    parent.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    sb.G.hatchery[0] = { poke: parent, steps: 100, stepsReq: 100 };
    const before = Object.keys(sb.G.collection).length;
    sb.hatchEgg(0);
    assert.equal(sb.G.hatchery[0], null, 'emplacement libéré');
    assert.equal(Object.keys(sb.G.collection).length, before + 1, 'un Pokémon de plus en boîte');
    const hatched = Object.values(sb.G.collection).find((p) => p && Number(p.id) === 4);
    assert.ok(hatched);
    assert.equal(hatched.level, 1);
    assert.equal(hatched.currentHP, hatched.maxHP);
    assert.equal(Object.values(hatched.ivs).reduce((a, b) => a + b, 0), 1, 'exactement +1 IV');
  } finally { close(); }
});

// ── Sauvegarde ──────────────────────────────────────────────────────────────

function bootSave() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  const sb = dom.getInternalVMContext();
  const noop = () => 0;
  sb.setInterval = noop; sb.setTimeout = noop; sb.requestAnimationFrame = noop;
  sb.G = {}; sb.battle = {};
  sb.t = (k) => k; sb.tr = (k) => k; sb.notify = () => {};
  // main.js charge les migrations (src/main.js → ./application/save/migrations/index.js) : même chose ici.
  vm.runInContext(harnessBundleSource(['src/application/save/migrations/index.js']), sb, { filename: 'migrations [iife]' });
  vm.runInContext(harnessBundleSource(['src/application/save/save.js']), sb, { filename: 'save.js [iife]' });
  return { sb, close: () => dom.window.close() };
}

test('DBT-07 · sauvegarde : writeSlot → readSlot restitue le même état (localStorage réel de jsdom)', () => {
  const { sb, close } = bootSave();
  try {
    const G = sb.createFreshGameState();
    G.team.push({ id: 25, level: 7, name: 'Pika', ivs: { hp: 1 } });
    G.money = 1234; G.inventory.potion = 3;
    const data = { version: SAVE_VERSION, timestamp: 1, saveId: 'slot_test', G };
    assert.equal(sb.writeSlot('slot_test', data, false), true);
    const back = sb.readSlot('slot_test');
    assert.ok(back && sb.isCompatibleSaveData(back));
    assert.equal(back.version, SAVE_VERSION);
    assert.deepEqual(JSON.parse(JSON.stringify(back.G)), JSON.parse(JSON.stringify(G)));
  } finally { close(); }
});

test('DBT-07 · migrations : un slot v3 (ids 387–392) est migré à la lecture vers le schéma v4 (formes), jamais supprimé', () => {
  const { sb, close } = bootSave();
  try {
    const G = sb.createFreshGameState();
    G.team.push({ id: 387, level: 20, name: 'Castform soleil', currentHP: 10, maxHP: 10 });
    G.collection['387'] = { id: 387, level: 12, name: 'Castform soleil' };
    G.pokedex[387] = { seen: true, caught: true };
    assert.equal(sb.writeSlot('slot_v3', { version: 3, timestamp: 1, saveId: 'slot_v3', G }, false), true);
    const back = sb.readSlot('slot_v3');
    assert.ok(back, 'le slot est lu');
    assert.equal(Number(back.version), SAVE_VERSION, 'version relevée à la lecture');
    assert.equal(sb.isCompatibleSaveData(back), true);
    assert.equal(Number(back.G.team[0].id), 351, 'id hérité 387 → espèce de base 351');
    assert.equal(Number(back.G.team[0].form), 1, '… forme 1 (Castform soleil)');
    assert.ok(!back.G.collection['387'], 'clé de boîte héritée réécrite');
    assert.ok(back.G.collection['351-1'], 'clé de boîte « 351-1 »');
  } finally { close(); }
});
