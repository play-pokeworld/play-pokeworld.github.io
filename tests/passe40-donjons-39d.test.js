// ════════════════════════════════════════════════════════════════════════════
// PASSE 39d — 5 retours joueur (donjons) :
//   1. BUTIN UNIFIÉ : le butin/résumé du donjon vit SOUS la carte et utilise
//      EXACTEMENT le même balisage que les combats normaux (renderBattleLoot
//      → .loot-item / .loot-money / icône symbole + compteur) — plus aucun
//      rendu parallèle (les sprites dupliqués ont été supprimés).
//   2. GRILLE : plafonnée à 11×8 (88 cases) + colonnes minmax(0,1fr) + scroll
//      interne : plus jamais de débordement de la fenêtre.
//   3. ESPÈCES : Combat normal → commun · Combat corsé → peu commun ·
//      Combat de boss → rare (le seau est forcé par la case engagée).
//   4. ROAMING : uniquement sur les routes — jamais en donjon (roamingId = 0
//      dès que le lieu est un donjon ou qu'un run est actif).
//   5. ÉQUILIBRAGE : grand max 3 paliers, quotas courts (4+palier), péages
//      plafonnés (100 → 1000), récompenses fortement croissantes avec les
//      badges (le donjon avancé paie nettement mieux que le début).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function dgSandbox({ badgeReq = 0, tokens = 100000 } = {}) {
  globalThis.G = {
    money: 0, dungeonsExplored: 0, dungeonRun: null, unlockedLocs: { mtmoon: true },
    team: [{ currentHP: 100, maxHP: 100 }],
  };
  const wallet = { dungeonTokens: tokens };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq });
  globalThis.getLocationBackground = () => 'mountain';
  globalThis.dungeonToll = (b) => 100 + Math.max(0, Math.min(8, Number(b) || 0)) * 100;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.aliveCount = () => 6;
  globalThis.openBattleSummary = () => {};
  globalThis.battle = { active: false, sessionCatches: [], sessionItems: {}, sessionMoney: 0, sessionTokens: 0, dungeonElite: false };
  return wallet;
}

const M = await import('../src/application/world/dungeon-run.js');

// ─── 1. BUTIN UNIFIÉ SOUS LA CARTE ─────────────────────────────────────────
test('39d-U1 — UN SEUL rendu de butin : la réglette commune passe par le modèle UNIFIÉ (aucun rendu parallèle)', () => {
  // la fonction de rendu dupliquée du donjon a été SUPPRIMÉE
  const dg = read('src/application/world/dungeon-run.js');
  assert.doesNotMatch(dg, /_dgLootHtml/, 'la fonction de rendu dupliquée a été supprimée');
  assert.doesNotMatch(dg, /pw-bdg-loot/, 'le panneau parallèle a été supprimé');
  // la réglette commune (combats normaux ET donjons) passe par le modèle unifié
  const combat = read('src/ui/game/battle-team-ui.js');
  const ref = combat.slice(combat.indexOf('function renderBattleLoot'), combat.indexOf('// --- Migrated to ES module'));
  assert.match(ref, /battleSummaryUIModel/, 'renderBattleLoot utilise le MÊME modèle que le résumé');
  assert.match(ref, /SessionSummaryView/, 'renderBattleLoot utilise la MÊME vue que le résumé');
  assert.match(ref, /getBattleSessionSummaryData/, 'repli sur les données unifiées (tout le run)');
  // un seul total d\'argent dans le rendu (pas de doublon « total / dernier combat »)
  const summary = read('src/ui/game/battle-summary.js');
  const data = summary.slice(summary.indexOf('function getBattleSessionSummaryData'), summary.indexOf('// The battle-session summary'));
  assert.match(data, /money = Number\(loot\.money \|\| 0\) \+ Number\(\(b && b\.sessionMoney\) \|\| 0\);/, 'UN SEUL total d\'argent (tout le run)');
  assert.doesNotMatch(data, /bag\.money/, 'plus d\'argent du « sac » séparé');
});

test('39d-U2 — la réglette de butin est SOUS la carte et visible pendant un run (plus de masquage de doublon)', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('id="battle-dungeon-bar"') < html.indexOf('id="battle-loot-row"'),
    'la réglette est placée APRÈS la carte (sous la carte)');
  assert.match(html, /id="battle-loot-inline"/, 'la réglette commune est dans #battle-loot-row');
  const dg = read('src/application/world/dungeon-run.js');
  assert.match(dg, /renderBattleLoot/, 'le bandeau rafraîchit la réglette commune');
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /html\[data-dungeon-run="1"\]\s*#battle-loot-row\s*\{\s*display:\s*flex/, 'la réglette est VISIBLE pendant un run');
  assert.doesNotMatch(css, /#battle-loot-inline\s*\{\s*display:\s*none/, 'plus de masquage de la réglette en donjon');
  assert.doesNotMatch(css, /\.pw-bdg-loot\s*\{/, 'plus d\'habillage du panneau parallèle');
});

// ─── 2. GRILLE QUI NE DÉBORDE PLUS ─────────────────────────────────────────
test('39d-G1 — la grille est plafonnée à 11×8 et respire dans la colonne', () => {
  assert.deepEqual(M._dgGridSizeFor(8), { cols: 11, rows: 8 }, 'max 11×8 = 88 cases');
  assert.deepEqual(M._dgGridSizeFor(0), { cols: 7, rows: 5 }, 'début 7×5');
  for (let b = 0; b <= 8; b++) {
    const { cols, rows } = M._dgGridSizeFor(b);
    assert.ok(cols <= 11 && rows <= 8, `jamais plus grand que 11×8 (badgeReq ${b})`);
  }
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /grid-template-columns:\s*repeat\(var\(--cols[^)]*\),\s*minmax\(0,\s*1fr\)\)/, 'colonnes minmax(0,1fr)');
  assert.match(css, /\.pw-dgn-grid[\s\S]{0,800}?max-height:\s*min\(62vh,\s*520px\)/, 'hauteur maximale');
  assert.match(css, /\.pw-dgn-grid[\s\S]{0,900}?overflow-y:\s*auto/, 'scroll interne si besoin');
});

// ─── 3. ESPÈCES PAR SEau ───────────────────────────────────────────────────
test('39d-S1 — le seau est forcé par la case : combat → commun, élite → peu commun, boss → rare', () => {
  const ecs = read('src/application/ecs-gameplay-systems.js');
  const bloc = ecs.slice(ecs.indexOf('let bucketHint = null;'), ecs.indexOf('const pick = pickWildFromTable'));
  assert.ok(wsMatch(bloc, /pn\.type === 'elite'\s*\?\s*'uncommon'/), 'élite → peu commun'); // V7 · DBT-01
  assert.ok(wsMatch(bloc, /pn\.type === 'combat'\s*\?\s*'common'/), 'combat → commun');
  assert.ok(wsMatch(bloc, /pn\.type === 'boss' \? 'rare'/), 'boss → rare (PASSE 39d)'); // V7 · DBT-01
  assert.match(bloc, /currentDungeonRun/, 'le seau ne s\'applique qu\'en expédition');
});

test('39d-S2 — le gardien est le RARE du lieu, pris tel quel (jamais d\'évolution hors zone)', () => {
  const src = read('src/application/encounter-system.js');
  const bloc = src.slice(src.indexOf('function _dgBossSpecies'), src.indexOf('function applyDungeonBossBuff'));
  assert.match(bloc, /for \(const bucket of \['rare', 'uncommon', 'common'\]\)/, 'repli par palier rare → peu commun → commun');
  assert.match(bloc, /t\.bucket === bucket/, 'l\'espèce est choisie dans le seau étiqueté du lieu');
});

// ─── 4. ROAMING JAMAIS EN DONJON ───────────────────────────────────────────
test('39d-R1 — roamingId est forcé à 0 en donjon (lieu dungeon OU run actif)', () => {
  const src = read('src/application/encounter-system.js');
  const bloc = src.slice(src.indexOf('let inDungeon'), src.indexOf('table.roamingId'));
  assert.match(bloc, /loc && loc\.type === 'dungeon'/, 'lieu de type dungeon → roaming désactivé');
  assert.match(bloc, /currentDungeonRun/, 'run actif → roaming désactivé');
  const assign = src.slice(src.indexOf('table.roamingId ='), src.indexOf('table.roamingId =') + 140);
  assert.ok(wsMatch(assign, /inDungeon \? 0/), 'roamingId = 0 en donjon'); // V7 · DBT-01
});

test('39d-R2 — getRoamingLegendaryForRoute renvoie null pour un donjon', () => {
  const roam = read('src/application/world/roaming.js');
  assert.match(roam, /loc\.type === 'dungeon'\) return null;/, 'aucun errant en donjon');
});

// ─── 5. ÉQUILIBRAGE ────────────────────────────────────────────────────────
test('39d-E1 — grand max 3 paliers (PV persistants obligent)', () => {
  assert.equal(M.dungeonDepthFor(8, 'mtmoon'), 3, 'Caverne Azurée : 3 paliers max');
  assert.ok(M.dungeonDepthFor(0, 'mtmoon') >= 1, 'au moins un palier');
  for (let b = 0; b <= 8; b++) assert.ok(M.dungeonDepthFor(b, 'mtmoon') <= 3, `≤ 3 paliers (badgeReq ${b})`);
  // une forêt reste à 1 niveau (décor non-grotte)
  globalThis.getLocationBackground = () => 'forest';
  assert.equal(M.dungeonDepthFor(0, 'viridianforest'), 1, 'une forêt reste à 1 niveau');
  globalThis.getLocationBackground = () => 'mountain';
});

test('39d-E2 — quotas courts : 4 + palier (la difficulté vient de la descente, pas de la répétition)', () => {
  assert.equal(M.dungeonQuotaFor(1), 4, 'palier 1 : 4 victoires');
  assert.equal(M.dungeonQuotaFor(3), 6, 'palier 3 : 6 victoires');
  assert.ok(M.dungeonQuotaFor(3) <= 8, 'jamais une corvée');
});

test('39d-E3 — les donjons avancés paient nettement mieux (récompense croissante avec les badges)', () => {
  const low = M.dungeonWinLoot(0);
  const high = M.dungeonWinLoot(8);
  assert.ok(high.tokens >= 4 * low.tokens, `jetons : ${high.tokens} ≥ 4×${low.tokens}`);
  assert.ok(high.money >= 5 * low.money, `argent : ${high.money} ≥ 5×${low.money}`);
  // avec le multiplicateur de palier, un run profond rapporte encore plus
  assert.ok(M.dungeonMultFor(3) > M.dungeonMultFor(1), 'descendre paie mieux');
});

test('39d-E4 — le péage est plafonné : 8 badges → 1000 JD (plus 50 000)', () => {
  const cur = read('src/application/economy/currency.js');
  assert.match(cur, /DUNGEON_TOLLS = \[100, 150, 250, 350, 500, 650, 800, 900, 1000\]/, 'péages plafonnés');
  assert.doesNotMatch(cur, /50000/, 'plus de péage à 50 000');
  assert.match(cur, /péages PLAFONNÉS/, 'la raison est documentée');
});
