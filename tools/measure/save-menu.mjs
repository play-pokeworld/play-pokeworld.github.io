/**
 * @file save-menu.mjs
 * @brief Shoots the save menu with one save in it, and reports the computed colours of the save
 *        card (sprite well, name, id, stat cells) so the card can be compared to the theme.
 *
 * Usage: node tools/measure/save-menu.mjs <outDir>
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/savemenu';
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
await page.reload();
await page.waitForTimeout(1800);

const report = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return `${sel}: ABSENT`;
    const c = getComputedStyle(el);
    return `${sel}: color=${c.color} bg=${c.backgroundColor} border=${c.borderTopColor} font=${c.fontSize}/${c.fontWeight} shadow=${c.textShadow.slice(0, 18)}`;
  };
  return ['.save-slot', '.save-slot-icon', '.save-slot-name', '.save-slot-id, .save-slot-meta',
    '.save-slot-stats span', '.save-slot-stats', '.save-menu-title, .save-menu-logo'].map(pick);
});
console.log(report.join('\n'));
await page.screenshot({ path: `${OUT}/save-menu.png` });
await page.locator('.save-slot').first().screenshot({ path: `${OUT}/save-slot.png` }).catch(() => {});
await browser.close();
