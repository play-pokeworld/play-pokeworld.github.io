/**
 * tools/measure/audit-windows.mjs
 * ---------------------------------------------------------------------------
 * Developer tool (not shipped): dumps, for every dashboard window, the computed
 * typography and box metrics of its first meaningful elements, so the remaining
 * gaps against the catalogue can be listed on measured values.
 */

import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3000/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE);
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
await page.waitForTimeout(300);

const out = await page.evaluate(() => {
  const rows = [];
  const seen = new Set();
  const skip = /^(pw-element|pw-text|pw-icon|pw-container|is-hidden|pw-button|pw-image|pw-progress|pw-panel)$/;
  for (const id of ['win-achievements', 'win-story', 'win-battle', 'win-map', 'win-tabs', 'win-team', 'win-shortcuts']) {
    const win = document.getElementById(id);
    if (!win) continue;
    const body = win.querySelector('.win-body') || win;
    const nodes = [...body.querySelectorAll('*')].slice(0, 90);
    for (const el of nodes) {
      const cls = [...el.classList].filter((c) => !skip.test(c)).join('.');
      if (!cls || seen.has(id + cls)) continue;
      seen.add(id + cls);
      const s = getComputedStyle(el);
      if (!el.textContent?.trim() && !el.querySelector('img')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      rows.push({
        win: id,
        cls,
        h: Math.round(r.height),
        font: s.fontSize,
        weight: s.fontWeight,
        color: s.color,
        bg: s.backgroundColor,
        radius: s.borderRadius,
        border: s.borderTopWidth + ' ' + s.borderTopColor,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      });
      if (rows.length > 160) break;
    }
  }
  return rows;
});
console.log(JSON.stringify(out, null, 1));
console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
