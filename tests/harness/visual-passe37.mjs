/**
 * Harnais visuel PASSE 37 — transition NETTE sol/ciel du paysage et grille
 * quadrillée du donjon (brouillard, coffre, boss → échelle, révélation).
 * Usage : node tests/harness/visual-passe37.mjs   (serveur dev sur :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:5173/';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.setDefaultTimeout(20000);

const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);

// 1) paysage au repos + transition nette (arrêt dur sur la ligne d'herbe)
await page.screenshot({ path: '/home/user/shots/p37-paysage.png' });
const bg = await page.evaluate(() => getComputedStyle(document.body, '::after').backgroundImage);
console.log('fond paysage:', bg);
// Les variables sont résolues en pixels : un arrêt dur = deux bandes de la
// MÊME couleur qui se touchent à la MÊME position (herbe/sol à 88vh).
const stops = [...bg.matchAll(/(rgb\(\d+, \d+, \d+\)) (\d+(?:\.\d+)?px|[\d.]+vh|%)/g)]
  .map((m) => ({ c: m[1], p: m[2] }));
let hard = false;
for (let i = 0; i < stops.length - 1; i++) {
  if (stops[i].p === stops[i + 1].p && /vh|px/.test(stops[i].p)) hard = true;
}
console.log('transition nette (double arrêt à la même position):', hard ? 'OK' : 'A VERIFIER');

// 2) téléporte vers un donjon et ouvre une expédition
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'mtmoon';
  window.markVisited && window.markVisited('mtmoon');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
});
await page.waitForTimeout(800);
await page.evaluate(() => window.startDungeonRun('mtmoon'));
await page.waitForTimeout(800);

const grid0 = await page.evaluate(() => ({
  tuiles: document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile').length,
  brouillard: document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile.is-fog').length,
  ici: document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile.is-here').length,
  pos: G.dungeonRun.pos,
}));
console.log('grille initiale:', JSON.stringify(grid0));
await page.screenshot({ path: '/home/user/shots/p37-grille.png' });

// 3) clavier : la flèche droite déplace le pion et lève le brouillard
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const grid1 = await page.evaluate(() => ({
  pos: G.dungeonRun.pos,
  brouillard: document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile.is-fog').length,
}));
console.log('clavier:', grid0.pos, '->', grid1.pos, 'brouillard', grid0.brouillard, '->', grid1.brouillard,
  grid0.pos !== grid1.pos && grid1.brouillard <= grid0.brouillard ? 'OK' : 'ECHEC');

// 4) clic sur une case voisine (bouton de la grille)
const clicked = await page.evaluate((fn) => {
  const r = G.dungeonRun;
  const m = /^c(\d+)r(\d+)$/.exec(r.pos);
  const c = +m[1]; const rr = +m[2];
  const v = [[c + 1, rr], [c - 1, rr], [c, rr + 1], [c, rr - 1]]
    .filter(([x, y]) => x >= 0 && y >= 0 && x < r.map.cols && y < r.map.rows)
    .map(([x, y]) => 'c' + x + 'r' + y);
  if (!v.length) return 'aucun voisin';
  window.dungeonMoveTo(v[0]);
  return 'ok ' + v[0];
});
console.log('clic case:', clicked);
await page.waitForTimeout(400);

// Solde un combat en cours : victoire immédiate puis clôture de la scène.
const settle = () => page.evaluate(() => {
  let n = 0;
  while (globalThis.battle && globalThis.battle.active && n++ < 12) {
    window.dungeonOnWin();
    if (typeof window.endBattle === 'function') window.endBattle();
    globalThis.battle.active = false;
  }
  window.refreshDungeonPanel && window.refreshDungeonPanel();
  return n;
});
await settle();

// 5) un coffre : se placer à côté, y entrer, vérifier qu'il est soldé
const chest = await page.evaluate(() => {
  const r = G.dungeonRun;
  const c = Object.values(r.map.tiles).find((t) => t.type === 'chest' && !t.done);
  if (!c) return 'aucun coffre';
  const m = /^c(\d+)r(\d+)$/.exec(c.id);
  const x = +m[1]; const y = +m[2];
  const adj = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    .filter(([a, b]) => a >= 0 && b >= 0 && a < r.map.cols && b < r.map.rows)
    .filter(([a, b]) => {
      const t = r.map.tiles['c' + a + 'r' + b];
      return !t.done && t.type !== 'combat' && t.type !== 'elite' && t.type !== 'boss';
    })
    .map(([a, b]) => 'c' + a + 'r' + b)[0];
  if (!adj) return 'voisin engageant uniquement';
  r.pos = adj; // téléportation de test : seul l'effet de la case est visé
  window.dungeonMoveTo(c.id);
  return { case: c.id, done: r.map.tiles[c.id].done };
});
console.log('coffre:', JSON.stringify(chest));
await page.waitForTimeout(400);
await page.screenshot({ path: '/home/user/shots/p37-grille-apres.png' });

await settle();

// 6) boss vaincu → échelle + carte révélée (victoire simulée)
const boss = await page.evaluate(() => {
  const r = G.dungeonRun;
  const b = r.map.tiles[r.bossTile];
  if (!b) return 'pas de bossTile';
  const avantFog = document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile.is-fog').length;
  const m = /^c(\d+)r(\d+)$/.exec(b.id);
  const x = +m[1]; const y = +m[2];
  const adj = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    .filter(([a, c]) => a >= 0 && c >= 0 && a < r.map.cols && c < r.map.rows)
    .filter(([a, c]) => {
      const t = r.map.tiles['c' + a + 'r' + c];
      return t.done || t.type === 'empty' || t.type === 'entrance' || t.type === 'chest' || t.type === 'ladder';
    })
    .map(([a, c]) => 'c' + a + 'r' + c)[0];
  if (!adj) return 'voisin du boss trop risqué';
  r.pos = adj;
  b.revealed = true;
  window.dungeonMoveTo(b.id);            // engage le combat du boss
  window.dungeonOnWin();                 // victoire immédiate
  const t = r.map.tiles[b.id];
  return {
    case: b.id,
    type: t.type,
    bossDefeated: r.bossDefeated,
    fogAvant: avantFog,
    fogApres: document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile.is-fog').length,
  };
});
console.log('boss -> échelle:', JSON.stringify(boss));
await page.waitForTimeout(600);
await page.screenshot({ path: '/home/user/shots/p37-echelle.png' });

// 7) géométrie des frises (ancrées sur la ligne de sol)
const geo = await page.evaluate(() => {
  const a = getComputedStyle(document.documentElement, '::after').maskPosition || getComputedStyle(document.documentElement, '::after').webkitMaskPosition;
  const b = getComputedStyle(document.documentElement, '::before').maskPosition || getComputedStyle(document.documentElement, '::before').webkitMaskPosition;
  return { veg: a, rock: b };
});
console.log('frises:', JSON.stringify(geo));

console.log('erreurs JS:', errs.length ? errs.slice(0, 8) : 'aucune');
await browser.close();
