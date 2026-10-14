// ════════════════════════════════════════════════════════════════════════════
// PASSE 39 — NOUVEAUX RETOURS JOUEUR :
//   A. affichage : la colonne centrale garde la taille d'un 16/9 sur les
//      écrans plus larges (plus de menus étirés) ;
//   B. donjon : entrer dans un donjon n'engage AUCUN combat (première case
//      toujours vide, le joueur choisit sa direction) ;
//   C. donjon : icônes VISIBLES (url absolue dans le masque CSS — la relative
//      était résolue par rapport à la feuille de style → 404) ;
//   D. donjon : le boss est ROUGE (retour : « le boss n'est plus en rouge ») ;
//   E. donjon : les cases résolues redeviennent des cases VIDE (retour :
//      « certaines cases vides sont différentes des autres pour aucune
//      raison ») ;
//   F. donjon : plus de « Victoires : X / Y », plus de barre de progression,
//      plus de « Encore X victoires avant de descendre » (retour : « ils ne
//      servent plus à rien puisque on a une carte maintenant ») ;
//   G. donjon : le bouton « Quitter le combat » disparaît en expédition ;
//   H. donjon : téléportation possible sur n'importe quelle case visible,
//      boss compris (retour : « je me retrouve bloqué avec le message le
//      boss se défie depuis une case voisine ») ;
//   I. donjon : le butin (captures + argent) est visible sous la carte,
//      toujours actif, y compris PENDANT le combat ;
//   J. donjon : les forêts n'ont qu'UN niveau (retour : « c'est une forêt et
//      non une grotte ») ;
//   K. combats normaux ET donjons : les monnaies gagnées PENDANT le combat
//      apparaissent dans le butin (uniquement les gains de combat).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function sandbox({ badgeReq = 0, loc = 'mtmoon', tokens = 100000, clears = 0, bg } = {}) {
  globalThis.G = {
    money: 0, dungeonsExplored: 0, dungeonRun: null,
    dungeonClears: clears ? { mtmoon: clears } : {},
    team: [{ currentHP: 100, maxHP: 100 }], unlockedLocs: { viridianforest: true, mtmoon: true },
  };
  const wallet = { dungeonTokens: tokens };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq });
  // PASSE 39 — le décor du lieu décide du nombre de niveaux (forêt ≠ grotte).
  globalThis.getLocationBackground = (id) => (bg || (id === 'viridianforest' ? 'forest' : 'mountain'));
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.exploreArea = () => {};
  globalThis.aliveCount = () => 6;
  globalThis.openBattleSummary = () => {};
  globalThis.battle = { active: false, sessionCatches: [], sessionItems: {}, sessionMoney: 0, dungeonElite: false };
  return wallet;
}

if (!globalThis.window) globalThis.window = globalThis;

const M = await import('../src/application/world/dungeon-run.js');

// ─── B. ENTRER DANS UN DONJON N'ENGAGE AUCUN COMBAT ─────────────────────────
test('39-B1 — exploreArea ouvre l\'expédition SANS lancer de combat (retour : « lancer le donjon lance un combat directement »)', async () => {
  const E = await import('../src/application/encounter-system.js');
  const G = { location: 'viridianforest', team: [{}], dungeonRun: null };
  globalThis.G = G;
  globalThis.hasActiveTrainingBattle = () => false;
  globalThis.getLocObj = () => ({ type: 'dungeon', wild: [[25, 3, 5, 'common']], badgeReq: 0 });
  globalThis.isDungeonRunAt = (id) => !!(G.dungeonRun && G.dungeonRun.active && G.dungeonRun.loc === id);
  globalThis.startDungeonRun = (id) => { G.dungeonRun = { active: true, loc: id, map: { grid: true } }; return G.dungeonRun; };
  globalThis.startBattle = () => { throw new Error('startBattle ne doit pas être appelé à l\'entrée d\'un donjon'); };
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.setMsg = () => {};
  E.exploreArea();
  assert.ok(G.dungeonRun && G.dungeonRun.active, 'l\'expédition est ouverte');
  assert.equal(!!(globalThis.battle && globalThis.battle.active), false, 'aucun combat n\'a démarré');
});

test('39-B2 — le source d\'exploreArea rend tôt pour les donjons en cours', () => {
  const src = read('src/application/encounter-system.js');
  const bloc = src.slice(src.indexOf('if (loc.type === \'dungeon\')'), src.indexOf('let wp = requestWildSpawn(\'explore\')'));
  assert.match(bloc, /isDungeonRunAt/, 'l\'expédition en cours est reconnue');
  assert.match(bloc, /return;/, 'on ne lance PAS de combat sauvage après l\'ouverture');
});

// ─── J. FORÊT = 1 NIVEAU, GROTTE = PALIERS ──────────────────────────────────
test('39-J1 — la profondeur dépend du décor : forêt → 1, grotte → paliers', () => {
  sandbox({ bg: 'forest' });
  assert.equal(M.dungeonDepthFor(0, 'viridianforest'), 1, 'Forêt de Jade : un seul niveau');
  assert.equal(M.dungeonDepthFor(8, 'viridianforest'), 1, 'même avec 8 badges, une forêt reste à un niveau');
  assert.equal(M._dgIsCaveLike('viridianforest'), false, 'forêt ≠ grotte');
  sandbox({ bg: 'mountain' });
  // PASSE 39d — grand max 3 paliers (les PV ne remontent plus entre combats).
  assert.equal(M.dungeonDepthFor(0, 'mtmoon'), 2, 'Mont Sélénite (montagne/grotte) : paliers');
  assert.equal(M.dungeonDepthFor(8, 'mtmoon'), 3, 'Caverne Azurée : 3 paliers (max)');
  assert.equal(M._dgIsCaveLike('mtmoon'), true, 'montagne = cavité (paliers)');
});

test('39-J2 — une expédition dans une forêt démarre avec depth = 1', () => {
  sandbox({ badgeReq: 0, loc: 'viridianforest', bg: 'forest' });
  const run = M.startDungeonRun('viridianforest');
  assert.equal(run.depth, 1, 'la Forêt de Jade n\'a pas de paliers');
  assert.equal(M.dungeonIsBossFloor(), true, 'le boss est sur l\'unique niveau');
  M.dungeonAbandon();
  sandbox({ badgeReq: 0, loc: 'mtmoon', bg: 'mountain' });
  const run2 = M.startDungeonRun('mtmoon');
  assert.ok(run2.depth > 1, 'une grotte descend en paliers');
  M.dungeonAbandon();
});

test('39-J3 — le libellé de palier disparaît pour un donjon à un seul niveau', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.match(js, /sum\.depth > 1/, 'le bandeau conditionne l\'affichage du palier');
});

// ─── C. ICÔNES VISIBLES (URL ABSOLUE DANS LE MASQUE CSS) ────────────────────
test('39-C1 — le sprite des tuiles est passé en URL absolue dans --ic', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.match(js, /new URL\(src, location\.href\)/, 'l\'url absolue échappe à la résolution par la feuille de style');
  assert.match(js, /--ic:url\(\\'/, 'la propriété custom porte toujours l\'icône');
});

// ─── D. BOSS ROUGE + E. CASES RÉSOLUES = VIDE ───────────────────────────────
test('39-D1 — le boss est ROUGE, et chaque type de case a SA couleur (retour 38e : « le boss n\'est plus rouge », « combats et coffres ont les mêmes couleurs »)', () => {
  const css = read('src/assets/styles/design-system.css');
  const boss = css.slice(css.indexOf('.pw-dgn-tile.t-boss:not(.is-fog)'), css.indexOf('.pw-dgn-tile.t-boss:not(.is-fog)') + 500);
  assert.match(boss, /var\(--red\)/, 'le boss est ROUGE');
  assert.doesNotMatch(boss, /var\(--pw-dgn-tint\)/, 'le boss n\'est plus dans la teinte du combat');
  const combat = css.slice(css.indexOf('.pw-dgn-tile.t-combat:not(.is-fog)'), css.indexOf('.pw-dgn-tile.t-combat:not(.is-fog)') + 400);
  assert.match(combat, /var\(--pw-dgn-tint\)/, 'combat (pokéball) = violet');
  const chest = css.slice(css.indexOf('.pw-dgn-tile.t-chest:not(.is-fog)'), css.indexOf('.pw-dgn-tile.t-chest:not(.is-fog)') + 300);
  assert.match(chest, /var\(--yellow\)/, 'coffre = or, DIFFÉRENT du combat');
  assert.doesNotMatch(chest, /var\(--pw-dgn-tint\)/, 'coffre ≠ combat (plus de couleur partagée)');
});

test('39-D2 — les cases résolues (combat battu, coffre vidé) redeviennent des cases VIDE', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-tile\.is-done:not\(\.is-here\)[\s\S]{0,600}?background:\s*var\(--dark1\)\s*!important/, 'une case résolue a le sol VIDE');
  assert.match(css, /\.pw-dgn-tile\.is-done:not\(\.is-here\)[\s\S]{0,600}?border-style:\s*dashed\s*!important/, 'bordure pointillée comme le vide');
});

// ─── F. QUOTA SUPPRIMÉ DU BANDEAU ───────────────────────────────────────────
test('39-F1 — plus de quota ni de barre de progression dans le bandeau', () => {
  const js = read('src/application/world/dungeon-run.js');
  const bar = js.slice(js.indexOf('function renderBattleDungeonBar'), js.indexOf('function refreshDungeonPanel'));
  assert.doesNotMatch(bar, /dungeon_quota_label/, '« Victoires : X / Y » supprimé');
  assert.doesNotMatch(bar, /dungeon_descend_locked/, '« Encore X victoires avant de descendre » supprimé');
  assert.doesNotMatch(bar, /pw-bdg-bar/, 'barre de progression supprimée');
  assert.doesNotMatch(bar, /pw-bdg-stats/, 'rangée d\'état supprimée');
});

// ─── G. QUITTER LE COMBAT MASQUÉ EN DONJON ──────────────────────────────────
test('39-G1 — le bouton « Quitter le combat » est masqué en expédition', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /html\[data-dungeon-run="1"\]\s+#leave-btn\s*\{\s*display:\s*none\s*!important;?\s*\}/, 'leave-btn caché pendant l\'expédition');
});

// ─── H. TÉLÉPORTATION AU BOSS ───────────────────────────────────────────────
test('39-H1 — dungeonMoveTo ne bloque plus le boss : toute case visible est atteignable', () => {
  sandbox({ badgeReq: 0 });
  const run = M.startDungeonRun('mtmoon');
  for (const t of Object.values(run.map.tiles)) t.revealed = true;
  M.dungeonMoveTo(run.bossTile);
  assert.equal(run.pos, run.bossTile, 'téléportation vers le boss depuis une case éloignée');
  M.dungeonAbandon();
});

test('39-H2 — le pilote auto téléporte sur le boss visible (plus de restriction d\'adjacence)', () => {
  const js = read('src/application/world/dungeon-run.js');
  const step = js.slice(js.indexOf('function _dgAutoStep'), js.indexOf('function _dgAutoStep') + 1200);
  assert.doesNotMatch(step, /target\.type !== 'boss'/, 'le pilote ne s\'interdit plus le boss');
});

// ─── I + K. BUTIN SOUS LA CARTE, MONNAIES DE COMBAT ─────────────────────────
test('39-K1 — _dgHarvestRunLoot récolte aussi l\'argent de combat (session → run.loot.money)', () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  globalThis.battle.sessionMoney = 150;
  globalThis.battle.sessionCatches = [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }];
  M.dungeonOnWin();
  assert.equal(run.loot.money, 150, 'l\'argent de combat est cumulé dans le butin du run');
  assert.equal(globalThis.battle.sessionMoney, 0, 'la session repart à zéro');
  // deuxième victoire : l\'argent s\'ajoute, jamais perdu
  globalThis.battle.sessionMoney = 40;
  M.dungeonOnWin();
  assert.equal(run.loot.money, 190, 'l\'argent de combat s\'accumule');
  M.dungeonAbandon();
});

test('39-K2 — la source UNIFIÉE agrège l\'argent de tout le run (UN SEUL total, jamais ×) + captures live', async () => {
  const BS = await import('../src/ui/game/battle-summary.js');
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  run.bag.tokens = 10;
  run.loot.money = 150;
  run.loot.catches = [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }];
  let data = BS.getBattleSessionSummaryData();
  // PASSE 39e — un SEUL total d\'argent (150, tout le run) ; les jetons du sac.
  assert.equal(data.money, 150, 'UN SEUL total d\'argent (150)');
  assert.equal(data.tokens, 10, 'les jetons du sac');
  assert.equal(data.totalCaptures, 1, 'Pikachu listé');
  // la récolte LIVE de la session (pendant le combat) s\'ajoute au total
  globalThis.battle.sessionMoney = 30;
  globalThis.battle.sessionCatches = [{ id: 133, name: 'Évoli', emoji: '', shiny: false }];
  data = BS.getBattleSessionSummaryData();
  assert.equal(data.money, 180, 'un seul total qui inclut le combat en cours (150 + 30)');
  assert.equal(data.totalCaptures, 2, 'Pikachu + Évoli (tout le run)');
  M.dungeonAbandon();
});

test('39-K3 — le combat normal enregistre l\'argent gagné (sessionMoney) et le montre dans le butin', () => {
  const init = read('src/application/combat/battle-init.js');
  assert.match(init, /battle\.sessionMoney\s*=\s*0/, 'la session part à zéro argent');
  const status = read('src/application/combat/battle-status.js');
  assert.match(status, /awardWildVictoryMoney\(\)\s*\|\|\s*0/, 'la victoire sauvage est mémorisée');
  assert.match(status, /battle\.sessionMoney\s*=\s*\(battle\.sessionMoney\s*\|\|\s*0\)\s*\+\s*Number\(reward\.money\|\|0\)/, 'l\'argent des doublons est mémorisé');
  const loot = read('src/ui/game/battle-team-ui.js');
  assert.match(loot, /loot-money/, 'le butin de combat affiche l\'argent');
});

// ─── A. COLONNE CENTRALE PLAFONNÉE À LA TAILLE 16/9 ─────────────────────────
test('39-A1 — le tableau de bord est plafonné à la largeur d\'un 16/9 et centré', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /@media \(min-width:\s*1440px\)\s*\{[\s\S]{0,300}?#main-dashboard\s*\{\s*max-width:\s*1600px;\s*margin-inline:\s*auto;\s*\}/,
    'max-width 1600 centré (largeur 16/9 de référence) : le milieu garde sa taille');
  assert.doesNotMatch(css, /width:\s*max\(1600px,\s*calc\(100%\s*-\s*320px\)\)/, 'le tableau de bord ne grossit plus avec l\'écran');
});

test('39-A2 — plus aucune règle qui étire la centrale sur très grand écran', () => {
  const css = read('src/assets/styles/design-system.css');
  // l\'ancienne étape « toutes les colonnes égales » a disparu
  assert.doesNotMatch(css, /all three columns equal/, 'l\'égalisation des colonnes a été retirée');
});
