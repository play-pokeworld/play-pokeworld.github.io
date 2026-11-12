/**
 * @file themes.mjs
 * @brief Shoots the game screen under every catalogue theme and every time of day, so the painted
 *        landscape can be checked against the theme it belongs to.
 *
 * Usage: node tools/measure/themes.mjs <outDir> [theme,theme,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/themes';
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const THEMES = ONLY.length ? ONLY : ['dark', 'light', 'gameboy', 'fire', 'ocean', 'forest', 'sakura', 'midnight', 'desert', 'contrast'];
const TIMES = ['dawn', 'day', 'dusk', 'night'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1400);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1100);
await page.evaluate(() => { const i = document.getElementById('starter-name-input'); if (i) { i.value = 'A'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1900);
await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await page.waitForTimeout(700);

for (const theme of THEMES) {
  for (const time of TIMES) {
    const info = await page.evaluate(([th, tm]) => {
      document.documentElement.setAttribute('data-theme', th);
      document.documentElement.setAttribute('data-daytime', tm);
      const cs = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body, '::after');
      return {
        sky: cs.getPropertyValue('--pw-land-sky').trim(),
        grass: cs.getPropertyValue('--pw-land-grass').trim(),
        ground: cs.getPropertyValue('--pw-land-ground').trim(),
        tint: cs.getPropertyValue('--pw-land-tint').trim(),
        afterContent: body.content,
        afterBg: body.backgroundImage.slice(0, 40)
      };
    }, [theme, time]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${theme}-${time}.png` });
    console.log(JSON.stringify({ theme, time, ...info }));
  }
}
await browser.close();
