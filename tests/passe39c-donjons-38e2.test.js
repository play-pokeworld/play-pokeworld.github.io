// ════════════════════════════════════════════════════════════════════════════
// PASSE 38e (2e retour) — 4 corrections joueur :
//   S. le butin d'un donjon repart de ZÉRO à l'ouverture (on ne voit plus
//      celui d'un combat ou donjon précédent) ;
//   T. un combat NORMAL ne déclenche jamais le boss (plus d'ancien compteur
//      « N combats puis le boss ») : seul le clic sur la case boss l'engage ;
//   H. AUCUN soin automatique pendant toute la durée du donjon (l'équipe
//      garde ses PV d'un engagement à l'autre) ;
//   G. le guide donjon est rédigé pour un joueur : aucune phrase technique,
//      pas de noms de lieux précis, « Lire la carte » = légende des couleurs.
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

if (!globalThis.window) globalThis.window = globalThis;

function dgSandbox() {
  globalThis.G = {
    money: 0, dungeonsExplored: 0, dungeonRun: null, unlockedLocs: { mtmoon: true },
    team: [{ currentHP: 100, maxHP: 100 }],
  };
  const wallet = { dungeonTokens: 5000 };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq: 0 });
  globalThis.getLocationBackground = () => 'mountain';
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.aliveCount = () => 6;
  globalThis.openBattleSummary = () => {};
  globalThis.currentDungeonRun = () => (globalThis.G && globalThis.G.dungeonRun && globalThis.G.dungeonRun.active ? globalThis.G.dungeonRun : null);
  globalThis.isDungeonRunAt = (id) => !!(globalThis.G && globalThis.G.dungeonRun && globalThis.G.dungeonRun.active && globalThis.G.dungeonRun.loc === id);
  return wallet;
}

// ─── S. BUTIN REMIS À ZÉRO À L'OUVERTURE D'UN DONJON ────────────────────────
test('38e-S1 — ouvrir un donjon vide la session de combat (le butin du combat/donjon précédent disparaît)', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  // un combat précédent a laissé des captures + argent + objets + jetons
  globalThis.battle = {
    active: false,
    sessionCatches: [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }],
    sessionItems: { potion: 2 }, sessionMoney: 150, sessionTokens: 99,
  };
  M.startDungeonRun('mtmoon');
  assert.equal(globalThis.battle.sessionCatches.length, 0, 'captures vidées');
  assert.deepEqual(globalThis.battle.sessionItems, {}, 'objets vidés');
  assert.equal(globalThis.battle.sessionMoney, 0, 'argent vidé');
  assert.equal(globalThis.battle.sessionTokens, 0, 'jetons vidés');
  // et la source UNIFIÉE (ce que montre la réglette sous la carte) n'affiche
  // plus rien du combat précédent
  const BS = await import('../src/ui/game/battle-summary.js');
  const data = BS.getBattleSessionSummaryData();
  assert.equal(data.totalCaptures, 0, 'pas de capture du combat précédent');
  assert.equal(data.money, 0, 'pas d\'argent du combat précédent');
  assert.equal(data.tokens, 0, 'pas de jetons du combat précédent');
  M.dungeonAbandon();
});

// ─── T. UN COMBAT NORMAL NE DÉCLENCHE JAMAIS LE BOSS ────────────────────────
test('38e-T1 — dungeonFight n\'arme PLUS le boss quand une carte est en cours', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  const run = M.startDungeonRun('mtmoon');
  // quota atteint (8 victoires) + palier final : l'ancien compteur armant le
  // boss était déclenché par cette combinaison.
  run.wins = 8;
  run.floor = run.depth;
  globalThis.battle.pendingDungeonBoss = false;
  M.dungeonFight();
  assert.equal(globalThis.battle.pendingDungeonBoss, false,
    'engager un combat normal sur la carte n\'arme pas le boss');
  M.dungeonAbandon();
});

test('38e-T2 — seul le clic sur la case BOSS arme le gardien', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  const run = M.startDungeonRun('mtmoon');
  run.floor = run.depth;                    // palier du boss actif
  run.map.tiles[run.bossTile].revealed = true;
  M.dungeonMoveTo(run.bossTile);
  assert.equal(globalThis.battle.pendingDungeonBoss, true,
    'le clic sur la case boss arme le gardien');
  M.dungeonAbandon();
});

// ─── H. AUCUN SOIN PENDANT LE DONJON ────────────────────────────────────────
test('38e-H1 — startBattle ne SOIGNE PAS l\'équipe pendant un donjon', async () => {
  const init = read('src/application/combat/battle-init.js');
  const bloc = init.slice(init.indexOf('let _dgRunNow = null;'), init.indexOf('battle.active=true;'));
  assert.match(bloc, /currentDungeonRun/, 'le soin est conditionné à l\'absence d\'expédition');
  assert.match(bloc, /if \(!\(_dgRunNow && _dgRunNow\.active\)\)/, 'pas de soin quand un donjon est actif');
  assert.ok(wsMatch(bloc, /mp\.currentHP=mp\.maxHP;/), 'le soin complet reste hors donjon'); // V7 · DBT-01
});

test('38e-H2 — endBattle ne soigne pas (naturalcure / régénérateur) pendant un donjon', () => {
  const flow = read('src/application/combat/battle-flow.js');
  const bloc = flow.slice(flow.indexOf('function endBattle'), flow.indexOf('clearInterval(battle.timerId);'));
  assert.match(bloc, /let _dgRunActive = false;/, 'le drapeau expédition est calculé');
  assert.match(bloc, /if \(_dgRunActive\) return;/, 'aucun soin en fin de combat en expédition');
  assert.match(bloc, /hasTal\('regenerator'\)/, 'le soin régénérateur reste hors donjon');
});

test('38e-H3 — les PV persistent entre deux combats de donjon (le K.O. général reste l\'issue)', () => {
  const enc = read('src/application/combat/battle-encounter.js');
  assert.match(enc, /dungeonOnWipe/, 'l\'équipe à terre clôt le run (half du sac gardée)');
  const dg = read('src/application/world/dungeon-run.js');
  assert.match(dg, /wipeKeepRatio: 0\.5/, 'le wipe garde la moitié du sac, pas toute la team');
});

// ─── G. GUIDE RÉDIGÉ POUR UN JOUEUR ─────────────────────────────────────────
test('38e-G1 — le guide donjon ne contient AUCUNE phrase technique ni nom de lieu', () => {
  for (const lang of ['fr', 'en']) {
    const ui = read(`src/localization/${lang}/ui.js`);
    const sec = ui.slice(ui.indexOf('guide_dungeon_title'), ui.indexOf('guide_dungeon_title') + 2600);
    // phrases techniques / hors-sujet interdites
    assert.doesNotMatch(sec, /barre de titre/, 'pas de « (celle de la barre de titre) »');
    assert.doesNotMatch(sec, /Forêt de Jade|Mont Sélénite|Caverne Azurée/, 'pas de noms de lieux précis');
    assert.doesNotMatch(sec, /Chaque case a sa couleur/, 'pas de redite « chaque case a sa couleur »');
    assert.doesNotMatch(sec, /monnaies paraissent avec leur icône/, 'pas de détail technique du butin');
    assert.doesNotMatch(sec, /Re-clique sur le mode actif/, 'pas de consigne « re-clique sur le bouton »');
    assert.doesNotMatch(sec, /(jetons et argent) et l\\'argent gagné/, 'pas de détail technique des récompenses');
  }
});

test('38e-G2 — « Lire la carte » est une LÉGENDE des couleurs, l\'auto reste bref', () => {
  const fr = read('src/localization/fr/ui.js');
  const mapDesc = fr.match(/"guide_dungeon_map_desc":"([^"]*)"/)[1];
  // légende : chaque type a sa couleur ET sa fonction, sans jargon
  assert.match(mapDesc, /pokéball violette est un combat/, 'combat = violet');
  assert.match(mapDesc, /étoilée orange un combat corsé/, 'élite = orange étoilée');
  assert.match(mapDesc, /coffre doré un trésor/, 'coffre = or');
  assert.match(mapDesc, /boss rouge le gardien/, 'boss = rouge');
  assert.match(mapDesc, /échelle bleue la sortie/, 'échelle = bleue');
  assert.match(mapDesc, /brouillard cache/, 'brouillard mentionné');
  const auto = fr.match(/"guide_dungeon_auto_desc":"([^"]*)"/)[1];
  assert.match(auto, /mode auto se débloque avec trois options/, 'auto = déblocage + 3 options');
  assert.doesNotMatch(auto, /Re-clique/, 'pas de consigne bouton');
  const goal = fr.match(/"guide_dungeon_goal_desc":"([^"]*)"/)[1];
  assert.doesNotMatch(goal, /Forêt de Jade/, 'objectif sans lieu précis');
  assert.match(goal, /Une forêt n.a qu.un niveau/, 'forêt = un niveau (immersion)');
});
