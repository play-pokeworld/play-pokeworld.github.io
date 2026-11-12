/**
 * @file daytime.mjs
 * @brief Shoots the game screen at the four moments of the day, so the painted background can be
 *        checked against the time and the theme it is drawn for.
 *
 * Usage: node tools/measure/daytime.mjs <outDir> [theme]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/daytime';
const THEME = process.argv[3] || 'dark';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1400);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1000);
await page.evaluate(() => { const i = document.getElementById('starter-name-input'); if (i) { i.value = 'A'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1800);
await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await page.waitForTimeout(800);
await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), THEME);

for (const time of ['dawn', 'day', 'dusk', 'night']) {
  await page.evaluate((tm) => document.documentElement.setAttribute('data-daytime', tm), time);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${THEME}-${time}.png` });
}
await browser.close();
console.log('shots in', OUT);
