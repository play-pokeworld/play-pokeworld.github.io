// ════════════════════════════════════════════════════════════════════════════
// PASSE 39b — NOUVEAUX RETOURS JOUEUR (38e) sur le donjon :
//   R. la case boss doit être ROUGE ; combats et coffres ne doivent PLUS
//      avoir la même couleur ; l'orange (élite) doit se comprendre ;
//   P. la case combat doit utiliser la POKÉBALL de la barre de titre ;
//   B. plus de combat de boss lancé AU HASARD après un combat normal (restes
//      de la chaîne « N combats puis le boss ») ;
//   L. le panneau de butin du donjon = le MÊME que celui des autres combats ;
//      les monnaies s'affichent sprite + chiffre (jamais « × » comme les
//      Pokémon) ; les monnaies paraissent dans le panneau RÉSUMÉ ;
//   A. le butin s'ACCUMULE sur tout le donjon (pas de reset par combat).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

if (!globalThis.window) globalThis.window = globalThis;

// ─── R. COULEURS : BOSS ROUGE, COMBAT ≠ COFFRE, ÉLITE ÉTOILÉE ───────────────
test('39b-R1 — le boss est ROUGE, le coffre est OR, le combat VIOLET, l\'élite ORANGE étoilée', () => {
  const css = read('src/assets/styles/design-system.css');
  const tile = (sel) => css.slice(css.indexOf(sel), css.indexOf(sel) + 420);
  assert.match(tile('.pw-dgn-tile.t-boss:not(.is-fog)'), /var\(--red\)/, 'boss = rouge');
  assert.match(tile('.pw-dgn-tile.t-chest:not(.is-fog)'), /var\(--yellow\)/, 'coffre = or');
  assert.match(tile('.pw-dgn-tile.t-combat:not(.is-fog)'), /var\(--pw-dgn-tint\)/, 'combat = violet');
  assert.match(tile('.pw-dgn-tile.t-elite:not(.is-fog)'), /var\(--orange\)/, 'élite = orange');
  // les trois couleurs sont distinctes
  const boss = tile('.pw-dgn-tile.t-boss:not(.is-fog)');
  const chest = tile('.pw-dgn-tile.t-chest:not(.is-fog)');
  const combat = tile('.pw-dgn-tile.t-combat:not(.is-fog)');
  assert.doesNotMatch(chest, /var\(--pw-dgn-tint\)/, 'coffre ≠ combat');
  assert.doesNotMatch(boss, /var\(--pw-dgn-tint\)/, 'boss ≠ combat');
  assert.doesNotMatch(boss, /var\(--yellow\)/, 'boss ≠ coffre');
  assert.doesNotMatch(chest, /var\(--red\)/, 'coffre ≠ boss');
});

test('39b-R2 — l\'élite porte une ÉTOILE (réponse à « et c\'est quoi les oranges ? »)', () => {
  const js = read('src/application/world/dungeon-run.js');
  const elite = js.slice(js.indexOf("case 'elite':"), js.indexOf("case 'elite':") + 520);
  assert.match(elite, /pw-dgn-elite/, 'l\'élite enveloppe pokéball + étoile');
  assert.match(elite, /pw-dgn-star/, 'étoile superposée');
  assert.match(elite, /dungeon\/star\.svg/, 'asset étoile');
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-tile \.pw-dgn-star[\s\S]{0,300}?mask-image:\s*var\(--ic\)/, 'étoile teintée par masque');
});

// ─── P. POKÉBALL DE LA BARRE DE TITRE ───────────────────────────────────────
test('39b-P1 — la case combat utilise la pokéball de la barre de titre (pokeball.svg)', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.match(js, /_dgGlyph\('src\/assets\/images\/dungeon\/pokeball\.svg'\)/, 'combat → pokeball.svg');
  // plus de « pokéball vide » dessinée sur les cases de combat
  assert.doesNotMatch(js, /case 'combat':[\s\S]{0,120}?encounter\.png/, 'encounter.png n\'est plus l\'icône de combat');
  const svg = read('src/assets/images/dungeon/pokeball.svg');
  assert.match(svg, /<circle cx="12" cy="12" r="10"\/>/, 'icône de la fenêtre « Poké Balls »');
});

// ─── B. PLUS DE BOSS AU HASARD APRÈS UN COMBAT NORMAL ───────────────────────
test('39b-B1 — sur la carte, une victoire rend TOUJOURS la main à la carte (jamais le boss auto)', () => {
  const src = read('src/application/combat/battle-status.js');
  const chain = src.slice(src.indexOf('let _dgStop = false;'), src.indexOf('// PASSE 36 — carte'));
  assert.ok(wsMatch(chain, /if\(_run && _run\.map\)\{\s*_dgStop = true;/), 'victoire sur carte → stop (retour à la carte)'); // V7 · DBT-01
  assert.doesNotMatch(chain, /_run\.map\)[\s\S]{0,80}?pendingDungeonBoss = true/, 'jamais de gardien auto sur carte');
});

test('39b-B2 — le tuning ne déduit plus « palier purgé → boss » quand une carte est en cours', () => {
  const src = read('src/application/encounter-system.js');
  const bloc = src.slice(src.indexOf('const flagged = '), src.indexOf('return applyDungeonBossBuff(wp, run);'));
  assert.match(bloc, /const deduced =\s*!run\.map/, 'déduction interdite en grille'); // V7 · DBT-01
  assert.match(bloc, /flagged \|\| deduced/, 'drapeau de case boss toujours honoré');
});

test('39b-B3 — endBattle purge pendingDungeonBoss et compte l\'argent comme butin', () => {
  const src = read('src/application/combat/battle-flow.js');
  assert.match(src, /battle\.pendingDungeonBoss = false;/, 'le drapeau « gardien » ne survit pas à la fin du combat');
  assert.ok(wsMatch(src, /Number\(battle\.sessionMoney\|\|0\)>0/), 'l\'argent gagné en combat compte comme du butin'); // V7 · DBT-01
});

// ─── L. PANNEAU DE BUTIN = UN SEUL RENDU (celui des combats normaux) ────────
test('39b-L1 — le butin du donjon est la réglette COMMUNE : plus AUCUN rendu parallèle (_dgLootHtml supprimé)', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.doesNotMatch(js, /_dgLootHtml/, 'la fonction de rendu dupliquée a été supprimée');
  assert.doesNotMatch(js, /pw-bdg-loot/, 'le panneau de butin parallèle a été supprimé');
  assert.match(js, /renderBattleLoot/, 'le bandeau rafraîchit la réglette commune sous la carte');
  // la réglette commune passe par le MÊME modèle que le résumé modal
  const team = read('src/ui/game/battle-team-ui.js');
  const loot = team.slice(team.indexOf('function renderBattleLoot'), team.indexOf('// --- Migrated to ES module'));
  assert.match(loot, /battleSummaryUIModel/, 'renderBattleLoot utilise le modèle UNIFIÉ du résumé');
  assert.match(loot, /SessionSummaryView/, 'renderBattleLoot utilise la MÊME vue que le résumé modal');
  assert.match(loot, /getBattleSessionSummaryData/, 'repli sur les données unifiées (tout le run)');
  // plus de doublon d\'argent : un seul total (money) + jetons
  assert.doesNotMatch(loot, /sessionMoney.*sessionMoney/, 'pas de double lecture de l\'argent');
});

test('39b-L2 — le résumé de session affiche les monnaies avec leur sprite et leur chiffre (données UNIFIÉES)', () => {
  const summary = read('src/ui/game/battle-summary.js');
  // PASSE 39e — en donjon, un SEUL total : money = tout le run, tokens = sac.
  assert.match(summary, /money = Number\(loot\.money \|\| 0\) \+ Number\(\(b && b\.sessionMoney\) \|\| 0\);/, 'UN SEUL total d\'argent (tout le run)');
  assert.match(summary, /tokens = Number\(bag\.tokens\) \|\| 0;/, 'jetons = sac du run');
  assert.match(summary, /currency\/money\.svg/, 'sprite pièce dans le résumé');
  assert.match(summary, /currency\/dungeonToken\.svg/, 'sprite jeton dans le résumé');
  assert.ok(wsMatch(summary, /amount: data\.money, prefix: '\+'/), 'argent = +N (sprite + chiffre)'); // V7 · DBT-01
  assert.ok(wsMatch(summary, /amount: data\.tokens, currency: true/), 'jetons = N (sprite + chiffre)');
  const view = read('src/ui/components/session-summary.js');
  assert.match(view, /c\.currency/, 'la vue gère les puces monnaies');
  assert.match(view, /c\.prefix \|\| ''/, 'préfixe + pour l\'argent de combat');
});

test('39b-L3 — sessionTokens : zéro en combat, posé à la sortie du donjon', () => {
  const init = read('src/application/combat/battle-init.js');
  assert.ok(wsMatch(init, /battle\.sessionTokens=0;/), 'init combat : zéro jeton'); // V7 · DBT-01
  const off = read('src/application/save/offline-engine.js');
  assert.match(off, /b\.sessionTokens = 0;/, 'init offline : zéro jeton');
  const dg = read('src/application/world/dungeon-run.js');
  assert.match(dg, /b\.sessionTokens = \(bag && bag\.tokens\) \|\| 0;/, 'à la remontée : jetons encaissés vers le résumé');
});

// ─── A. LE BUTIN S'ACCUMULE SUR TOUT LE DONJON ───────────────────────────────
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
  globalThis.battle = { active: false, sessionCatches: [], sessionItems: {}, sessionMoney: 0, sessionTokens: 0, dungeonElite: false };
  return wallet;
}

test('39b-A1 — deux victoires consécutives ACCUMULENT captures, objets et argent dans le butin du run', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  const run = M.startDungeonRun('mtmoon');
  // combat 1 : capture + argent + objet
  globalThis.battle.sessionCatches.push({ id: 25, name: 'Pikachu', emoji: '', shiny: false });
  globalThis.battle.sessionMoney = 150;
  globalThis.battle.sessionItems = { potion: 2 };
  M.dungeonOnWin();
  assert.equal(run.loot.catches.length, 1, 'capture 1 dans le run');
  assert.equal(run.loot.money, 150, 'argent 1 dans le run');
  assert.equal(run.loot.items.potion, 2, 'objets 1 dans le run');
  // combat 2 : capture + argent
  globalThis.battle.sessionCatches.push({ id: 133, name: 'Évoli', emoji: '', shiny: false });
  globalThis.battle.sessionMoney = 40;
  M.dungeonOnWin();
  assert.equal(run.loot.catches.length, 2, 'capture 2 s\'AJOUTE (pas de reset)');
  assert.equal(run.loot.money, 190, 'argent s\'AJOUTE (150 + 40)');
  assert.equal(run.loot.items.potion, 2, 'objets conservés');
  // la source UNIFIÉE montre tout le run : les deux captures, un seul total
  const BS = await import('../src/ui/game/battle-summary.js');
  const data = BS.getBattleSessionSummaryData();
  assert.ok(data.catches.some((c) => c.id === 25), 'Pikachu affiché (tout le run)');
  assert.ok(data.catches.some((c) => c.id === 133), 'Évoli affiché (tout le run)');
  assert.equal(data.money, 190, 'un seul total d\'argent (190, tout le run)');
  M.dungeonAbandon();
});
