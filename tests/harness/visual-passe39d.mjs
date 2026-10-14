/**
 * Harnais visuel PASSE 39d — 5 retours joueur donjons :
 *   1. BUTIN UNIFIÉ : la réglette COMMUNE #battle-loot-inline vit SOUS la
 *      carte (visible pendant le run) ; un seul affichage, un seul total
 *      d'argent, et le résumé montre TOUT le run.
 *   2. GRILLE : ne déborde plus de la fenêtre (≤ 11×8, scroll interne si
 *      besoin) — testé sur la Caverne Azurée (badgeReq 8).
 *   3. ESPÈCES : boss → rare (Pikachu #25), élite → peu commun, combat → commun.
 *   4. ROAMING : aucun errant en donjon.
 *   5. ÉQUILIBRAGE : grand max 3 paliers, quotas courts.
 * Usage : node tests/harness/visual-passe39d.mjs   (serveur dev sur :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:5173/';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(25000);

const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const ok = (label, cond) => console.log((cond ? '  ✔ ' : '  ✘ ') + label);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);

// ── PRÉPARATION : entrer à la Forêt de Jade (rare = Pikachu #25) ────────────
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'viridianforest';
  window.markVisited && window.markVisited('viridianforest');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
});
await page.waitForTimeout(800);

// ── 4) ROAMING : un donjon n'accueille aucun errant ─────────────────────────
const roam = await page.evaluate(() => ({
  inDungeon: (typeof window.getRoamingLegendaryForRoute === 'function')
    ? window.getRoamingLegendaryForRoute('viridianforest') : 'fn-missing',
}));
ok('PASSE 39d : aucun errant en donjon', roam.inDungeon === null);

// ── 1) BUTIN SOUS LA CARTE, RÉGLETTE MASQUÉE ────────────────────────────────
await page.evaluate(() => window.startDungeonRun('viridianforest'));
await page.waitForTimeout(800);
// remplit le sac d'une victoire pour que le bandeau affiche des puces
await page.evaluate(() => {
  const run = G.dungeonRun;
  if (run) {
    run.bag.tokens = 24;
    run.bag.money = 300;
    run.loot.money = 150;
    run.loot.catches = [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }];
    window.refreshDungeonPanel && window.refreshDungeonPanel();
  }
});
await page.waitForTimeout(400);
const lootLayout = await page.evaluate(() => {
  const bar = document.getElementById('battle-dungeon-bar');
  const map = bar && bar.querySelector('.pw-bdg-map');
  const row = document.getElementById('battle-loot-row');
  const inline = document.getElementById('battle-loot-inline');
  const mr = map && map.getBoundingClientRect();
  const rr = row && row.getBoundingClientRect();
  const lootChips = inline ? inline.querySelectorAll('.loot-item') : [];
  return {
    hasMap: !!map,
    hasRow: !!row,
    lootBelowMap: !!(mr && rr && rr.top >= mr.bottom - 2),
    rowVisible: row ? getComputedStyle(row).display !== 'none' : false,
    lootItemClass: lootChips.length > 0,
    moneyChips: inline ? inline.querySelectorAll('.loot-currency').length : 0,
  };
});
console.log('  butin:', JSON.stringify(lootLayout));
ok('PASSE 39e : le butin est SOUS la carte (réglette commune)', lootLayout.hasMap && lootLayout.hasRow && lootLayout.lootBelowMap);
ok('PASSE 39e : la réglette est VISIBLE pendant le run', lootLayout.rowVisible);
ok('PASSE 39e : puces .loot-item comme les combats normaux', lootLayout.lootItemClass);
ok('PASSE 39e : UN SEUL total d\'argent (pas de doublon)', lootLayout.moneyChips <= 2);

// ── 3) ESPÈCES : boss = rare (#25), élite = peu commun, combat = commun ─────
async function fightTile(type, allowed) {
  const tid = await page.evaluate((t) => {
    const run = G.dungeonRun;
    if (!run || !run.map) return null;
    const tile = Object.values(run.map.tiles).find((x) => x.type === t && !x.done);
    if (!tile) return null;
    tile.revealed = true;
    window.dungeonMoveTo(tile.id);
    return tile.id;
  }, type);
  await page.waitForTimeout(1400);
  return page.evaluate(() => {
    const b = globalThis.battle;
    return b && b.enemyPoke ? { id: b.enemyPoke.id, name: b.enemyPoke.name } : null;
  });
}
const bossId = await page.evaluate(() => G.dungeonRun && G.dungeonRun.bossTile);
await page.evaluate((id) => {
  const run = G.dungeonRun;
  run.map.tiles[id].revealed = true;
  window.dungeonMoveTo(id);
}, bossId);
await page.waitForTimeout(1500);
const bossEnemy = await page.evaluate(() => {
  const b = globalThis.battle;
  return b && b.enemyPoke ? { id: b.enemyPoke.id, name: b.enemyPoke.name } : null;
});
console.log('  boss:', JSON.stringify(bossEnemy));
ok('PASSE 39d : le boss est le RARE (Pikachu #25)', bossEnemy && bossEnemy.id === 25);
ok('PASSE 39d : jamais Raichu (#26)', bossEnemy && bossEnemy.id !== 26);
await page.evaluate(() => {
  try { window.endBattle(); } catch (_) {}
  const b = globalThis.battle;
  if (b) { b.active = false; b.pendingDungeonBoss = false; }
  G.dungeonRun = null;
});
await page.waitForTimeout(300);

await page.evaluate(() => window.startDungeonRun('viridianforest'));
await page.waitForTimeout(700);
const elite = await fightTile('elite');
console.log('  élite:', JSON.stringify(elite));
ok('PASSE 39d : élite → PEU COMMUN (#11/#14)', elite && [11, 14].includes(elite.id));
await page.evaluate(() => {
  try { window.endBattle(); } catch (_) {}
  const b = globalThis.battle;
  if (b) { b.active = false; b.pendingDungeonBoss = false; }
  G.dungeonRun = null;
});
await page.waitForTimeout(300);

await page.evaluate(() => window.startDungeonRun('viridianforest'));
await page.waitForTimeout(700);
const combat = await fightTile('combat');
console.log('  combat:', JSON.stringify(combat));
ok('PASSE 39d : combat → COMMUN (#10/#13)', combat && [10, 13].includes(combat.id));
await page.evaluate(() => {
  try { window.endBattle(); } catch (_) {}
  const b = globalThis.battle;
  if (b) { b.active = false; b.pendingDungeonBoss = false; }
  G.dungeonRun = null;
});
await page.waitForTimeout(300);

// ── 2) GRILLE MAX (Caverne Azurée, badgeReq 8) : pas de débordement ────────
await page.evaluate(() => {
  G.location = 'ceruleancave';
  window.markVisited && window.markVisited('ceruleancave');
  window.renderMap && window.renderMap();
  window.startDungeonRun('ceruleancave');
});
await page.waitForTimeout(800);
const grid = await page.evaluate(() => {
  const run = G.dungeonRun;
  const mapEl = document.querySelector('.pw-bdg-map .pw-dgn-grid');
  const bar = document.getElementById('battle-dungeon-bar');
  const winBody = document.getElementById('battle-center-panel');
  const mr = mapEl && mapEl.getBoundingClientRect();
  const wr = winBody && winBody.getBoundingClientRect();
  return {
    cols: run && run.map ? run.map.cols : 0,
    rows: run && run.map ? run.map.rows : 0,
    gridW: mr ? Math.round(mr.width) : 0,
    gridH: mr ? Math.round(mr.height) : 0,
    winW: wr ? Math.round(wr.width) : 0,
    winH: wr ? Math.round(wr.height) : 0,
    scrollable: mapEl ? mapEl.scrollHeight > mapEl.clientHeight : false,
  };
});
console.log('  grille max:', JSON.stringify(grid));
ok('PASSE 39d : grille plafonnée (≤ 11×8)', grid.cols <= 11 && grid.rows <= 8);
ok('PASSE 39d : la grille ne déborde pas en largeur', grid.gridW <= grid.winW);
ok('PASSE 39d : la grille ne déborde pas en hauteur (scroll interne si besoin)', grid.gridH <= grid.winH || grid.scrollable);

// ── 5) ÉQUILIBRAGE : profondeur ≤ 3, quota court ───────────────────────────
const bal = await page.evaluate(() => {
  const run = G.dungeonRun;
  return {
    depth: run ? run.depth : 0,
    quota: (typeof window.dungeonQuotaFor === 'function' || typeof globalThis.dungeonQuotaFor === 'function')
      ? ((typeof globalThis.dungeonQuotaFor === 'function' ? globalThis.dungeonQuotaFor : window.dungeonQuotaFor)(1)) : 'na',
    toll8: (typeof globalThis.dungeonToll === 'function') ? globalThis.dungeonToll(8) : 'na',
  };
});
console.log('  équilibrage:', JSON.stringify(bal));
ok('PASSE 39d : Caverne Azurée = 3 paliers max', bal.depth <= 3);
ok('PASSE 39d : quota court (4 au premier palier)', bal.quota === 4);
ok('PASSE 39d : péage 8 badges ≤ 1000', typeof bal.toll8 === 'number' && bal.toll8 <= 1000);

await page.screenshot({ path: '/home/user/shots/p39d-donjons.png' });
await browser.close();

const bad = errs.filter((e) => !/favicon/i.test(e));
console.log('erreurs JS:', bad.length ? bad.join(' | ') : 'aucune');
process.exit(bad.length ? 1 : 0);
