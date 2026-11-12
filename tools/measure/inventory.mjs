/**
 * @file inventory.mjs
 * @brief Lists the catalogue screens and the screens the game can open, so the two inventories can
 *        be matched in the status document.
 *
 * Usage: node tools/measure/inventory.mjs [outJson]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/inventory.json';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await page.goto('http://127.0.0.1:3000/catalogue/CATALOGUE_AFFICHAGES.html');
await page.waitForTimeout(900);
const catalogue = await page.evaluate(() => SCREENS.map((s) => ({ id: s.id, group: s.group, label: s.label, kind: s.kind })));
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1200);
const game = await page.evaluate(async () => {
  const modals = await import('/src/config/ModalIds.js');
  const layout = await import('/src/config/DashboardLayout.js');
  return { modalIds: Object.keys(modals.ModalIds), windowIds: Object.values(layout.WindowIds ?? {}) };
});
fs.writeFileSync(OUT, JSON.stringify({ catalogue, game }, null, 1));
console.log('catalogue screens:', catalogue.length);
console.log('groups:', [...new Set(catalogue.map((s) => s.group))].join(' | '));
console.log('game modals:', game.modalIds.length, 'windows:', game.windowIds.length);
await browser.close();
