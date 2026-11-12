/**
 * @file _pair.mjs
 * @brief Shoots the live dashboard and the catalogue's dashboard frame at the same width so the
 *        two can be laid side by side.
 *
 * Usage: node tools/measure/_pair.mjs <outDir>
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/pair';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// the game
const game = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
game.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await game.goto('http://127.0.0.1:3000/');
await game.waitForTimeout(1500);
await game.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await game.waitForTimeout(1100);
await game.evaluate(() => {
  const input = document.getElementById('starter-name-input');
  if (input) { input.value = 'A'; input.dispatchEvent(new Event('input', { bubbles: true })); }
});
await game.evaluate(() => document.querySelector('.starter-card')?.click());
await game.waitForTimeout(2000);
await game.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await game.waitForTimeout(600);
await game.screenshot({ path: `${OUT}/game-dashboard.png` });
const typo = await game.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { sel, font: c.fontFamily.slice(0, 40), size: c.fontSize, weight: c.fontWeight, color: c.color, bg: c.backgroundColor, radius: c.borderRadius, shadow: c.textShadow };
  };
  return ['body', '.pw-win-hdr', '#win-monneyes', '.shortcut-action-btn', '.pw-loc-action-btn'].map(pick).filter(Boolean);
});
console.log('GAME TYPO', JSON.stringify(typo, null, 1));

// the catalogue
const cat = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await cat.goto('http://127.0.0.1:3000/catalogue/CATALOGUE_AFFICHAGES.html');
await cat.waitForTimeout(900);
await cat.evaluate(() => {
  const a = [...document.querySelectorAll('#side a')].find((x) => x.textContent.trim().startsWith('Tableau de bord'));
  a?.click();
});
await cat.waitForTimeout(700);
const frame = await cat.$('.frame, #stage .frame, body > div[style]');
const box = await cat.evaluate(() => {
  const f = [...document.querySelectorAll('div')].find((d) => d.className === 'frame' && d.offsetWidth > 800);
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
console.log('CAT FRAME', JSON.stringify(box));
if (box) await cat.screenshot({ path: `${OUT}/cat-dashboard.png`, clip: { x: box.x, y: box.y, width: Math.min(box.width, 1280), height: Math.min(box.height, 860) } });
const ctypo = await cat.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { sel, font: c.fontFamily.slice(0, 40), size: c.fontSize, weight: c.fontWeight, color: c.color, bg: c.backgroundColor, radius: c.borderRadius };
  };
  return ['body', '.win-h', '.win', '.row', '.mon'].map(pick).filter(Boolean);
});
console.log('CAT TYPO', JSON.stringify(ctypo, null, 1));
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
