/**
 * @file landscape.mjs
 * @brief Shoots the painted landscape alone (dashboard and header hidden) for every theme, so the
 *        sky, the grass, the trees and the rocks can be judged against the palette of the theme.
 *
 * Usage: node tools/measure/landscape.mjs <outDir> [theme,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/land';
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const THEMES = ONLY.length ? ONLY : ['dark', 'light', 'gameboy', 'fire', 'ocean', 'forest', 'sakura', 'midnight', 'desert', 'contrast'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1400);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1100);
await page.evaluate(() => { const i = document.getElementById('starter-name-input'); if (i) { i.value = 'A'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1900);
await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await page.waitForTimeout(700);
await page.evaluate(() => {
  for (const sel of ['#main-dashboard', '#header', '#pw-notification-container', '#nav-menu']) {
    const el = document.querySelector(sel);
    if (el) el.style.display = 'none';
  }
});

for (const theme of THEMES) {
  const info = await page.evaluate((th) => {
    document.documentElement.setAttribute('data-theme', th);
    document.documentElement.setAttribute('data-daytime', 'day');
    const cs = getComputedStyle(document.documentElement);
    return {
      surface: cs.getPropertyValue('--pw-bg-surface').trim(),
      page: cs.getPropertyValue('--pw-bg-page').trim(),
      sky: cs.getPropertyValue('--pw-land-sky').trim(),
      grass: cs.getPropertyValue('--pw-land-grass').trim(),
      ground: cs.getPropertyValue('--pw-land-ground').trim(),
      tree: cs.getPropertyValue('--pw-land-tree').trim(),
      rock: cs.getPropertyValue('--pw-land-rock').trim()
    };
  }, theme);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${theme}.png` });
  console.log(theme, JSON.stringify(info));
}
await browser.close();
