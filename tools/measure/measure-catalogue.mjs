/**
 * tools/measure/measure-catalogue.mjs
 * ---------------------------------------------------------------------------
 * Developer tool (not shipped): opens the catalogue, selects one screen, and reads the
 * computed styles of the same elements the game measurement reads, so the two sets of
 * numbers can be compared. Also writes a cropped capture of the simulated game frame.
 *
 * Usage: node tools/measure/measure-catalogue.mjs <screenId> [--shot <dir>]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const screenId = process.argv[2] || 'dashboard';
const shotIndex = process.argv.indexOf('--shot');
const SHOT_DIR = shotIndex > -1 ? process.argv[shotIndex + 1] : null;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:8080/catalogue/CATALOGUE_AFFICHAGES.html');
await page.waitForTimeout(900);

await page.evaluate((id) => {
  const link = document.querySelector(`#side a[data-id="${id}"]`);
  if (link) link.click();
}, screenId);
await page.waitForTimeout(700);

const report = await page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      font: s.fontSize,
      weight: s.fontWeight,
      color: s.color,
      bg: s.backgroundColor,
      border: s.borderTopWidth + ' ' + s.borderTopColor,
      radius: s.borderRadius,
      padding: s.padding,
      gap: s.gap,
      columns: s.gridTemplateColumns
    };
  };
  return {
    title: document.title,
    pokeballs: {
      table: box(document.querySelector('.pbtable')),
      rows: [...document.querySelectorAll('.pbtable tr')].map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10),
      th: box(document.querySelector('.pbtable th')),
      td: box(document.querySelector('.pbtable td')),
      ball: box(document.querySelector('.pbtable td.ball')),
      qte: box(document.querySelector('.pbtable td.qte')),
      img: box(document.querySelector('.pbtable td.ball img'))
    },
    money: {
      row: box(document.querySelector('.moneyrow')),
      cells: [...document.querySelectorAll('.moneyrow .m')].map(box),
      value: box(document.querySelector('.moneyrow .m .v')),
      label: box(document.querySelector('.moneyrow .m .l'))
    }
  };
});
console.log(JSON.stringify(report, null, 2));

if (SHOT_DIR) {
  // The frame is the simulated game viewport; crop it and the single window if there is one.
  const frame = await page.$('.frame');
  if (frame) await frame.screenshot({ path: `${SHOT_DIR}/cat-${screenId}-frame.png` });
  const win = await page.$('.frame .win');
  if (win) await win.screenshot({ path: `${SHOT_DIR}/cat-${screenId}-win.png` });
}
console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
