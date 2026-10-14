/**
 * Harnais visuel PASSE 36 — paysage (dégradé + frises au sol) et carte du
 * donjon (lisibilité, clavier, auto). Usage :
 *   node tests/harness/visual-passe36.mjs   (serveur dev sur :5173)
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

// 1) paysage au repos
await page.screenshot({ path: '/home/user/shots/p36-paysage.png' });

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
await page.screenshot({ path: '/home/user/shots/p36-carte.png' });

// 3) clavier : la flèche droite déplace le joueur
const pos0 = await page.evaluate(() => G.dungeonRun.pos);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const pos1 = await page.evaluate(() => G.dungeonRun.pos);
console.log('clavier:', pos0, '->', pos1, pos0 !== pos1 ? 'OK' : 'ECHEC');

// 4) un clic sur une case jouable fonctionne
const clicked = await page.evaluate(() => {
  const r = G.dungeonRun;
  const fwd = r.map.edges[r.pos].map((id) => r.map.nodes[id]).filter((n) => !n.done && n.type !== 'combat' && n.type !== 'elite' && n.type !== 'boss');
  if (!fwd.length) return 'aucune case douce';
  window.dungeonMoveTo(fwd[0].id);
  return 'ok ' + fwd[0].id;
});
console.log('clic case:', clicked);
await page.waitForTimeout(400);
await page.screenshot({ path: '/home/user/shots/p36-carte-apres.png' });

// 5) géométrie du paysage : les deux frises sur la même ligne
const geo = await page.evaluate(() => {
  const a = getComputedStyle(document.documentElement, '::after').maskPosition || getComputedStyle(document.documentElement, '::after').webkitMaskPosition;
  const b = getComputedStyle(document.documentElement, '::before').maskPosition || getComputedStyle(document.documentElement, '::before').webkitMaskPosition;
  return { veg: a, rock: b };
});
console.log('frises:', JSON.stringify(geo));

console.log('erreurs JS:', errs.length ? errs.slice(0, 8) : 'aucune');
await browser.close();
