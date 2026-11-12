/**
 * tools/measure/check-achievements-fullscreen.mjs
 * ---------------------------------------------------------------------------
 * Developer tool (not shipped): opens the full-screen Succès panel (it shares
 * `.pw-ach-title`, `.pw-ach-progress-row` and `.pw-rank-chip` with the tracker
 * window) and reports the metrics, so a change made for the dashboard window is
 * proven not to break the full-screen list.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = '/home/user/pokeworld/PASSATION/shots-after/';
mkdirSync(SHOT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const i = document.getElementById('starter-name-input');
  if (i) { i.value = 'Ash'; i.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1800);
await page.evaluate(() => document.querySelectorAll('.pw-modal-backdrop,.pw-modal,.pw-toast-card').forEach((e) => e.remove()));

await page.evaluate(() => document.querySelector('#win-achievements .pw-ach-tracker-card')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelectorAll('.pw-toast-card').forEach((e) => e.remove()));
await page.waitForTimeout(300);

const out = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width), font: s.fontSize, weight: s.fontWeight, color: s.color, bg: s.backgroundColor, radius: s.borderRadius };
  };
  return {
    panelOpen: !!document.querySelector('.pw-fs-panel, .pw-modal, [id*="achievement"]'),
    card: pick('[class*="ach"] .pw-ach-card, .pw-ach-card'),
    title: pick('.pw-ach-title'),
    progressRow: pick('.pw-ach-progress-row'),
    stats: pick('.pw-ach-stats-text'),
    rankChip: pick('.pw-rank-chip'),
    cards: document.querySelectorAll('.pw-ach-card').length,
    overflow: [...document.querySelectorAll('.pw-ach-card')].filter((c) => c.scrollWidth > c.clientWidth + 1).length
  };
});
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: `${SHOT}game-achievements-fullscreen.png`, fullPage: false });
console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
