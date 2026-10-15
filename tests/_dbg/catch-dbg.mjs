import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../../tools/harness-bundle.mjs';
import { SAVE_VERSION } from '../../src/data/game-config.js';
import { TYPES, TYPE_CHART, typeEffect } from '../../src/domain/battle/type-system.js';

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
  'src/application/world/puzzle-explorations.js', 'src/application/quests/quest-core.js',
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


const { sb } = bootGame({ catchRoll: null });
sb.G.team[0] = sb.createPoke(25, 14, false);
const me = sb.G.team[0]; const xp0 = me.xp;
const enemy = sb.createPoke(19, 10, false);
sb.startBattle(enemy);
let ticks = 0;
while (sb.battle.active && ticks < 600 && enemy.currentHP > 0) { sb.runBattleTick(); ticks++; }
for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
console.log('ticks', ticks, 'active', sb.battle.active, 'enemyHP', enemy.currentHP, 'xp gain', me.xp - xp0, 'wins', JSON.stringify(sb.G.wildWinsByLoc), 'newEnemy', sb.battle.enemyPoke && sb.battle.enemyPoke.id, sb.battle.enemyPoke === enemy);
console.log(sb.__logs.slice(-6)); console.log(sb.__notifications.slice(-4));
