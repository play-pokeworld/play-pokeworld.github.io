/**
 * @file catalogue-frames.mjs
 * @brief Shoots the frame of each requested catalogue screen at its own size, one file per screen,
 *        so it can be laid next to the same screen of the game.
 *
 * Usage: node tools/measure/catalogue-frames.mjs <outDir> [id,id,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/catframes';
const IDS = (process.argv[3] || 'sac,boite,pokedex,marche,boutique,badges,dictionnaire,guide').split(',');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto('http://127.0.0.1:3000/catalogue/CATALOGUE_AFFICHAGES.html');
await page.waitForTimeout(900);
for (const id of IDS) {
  const ok = await page.evaluate((target) => {
    if (typeof SCREENS === 'undefined') return false;
    if (!SCREENS.some((s) => s.id === target)) return false;
    current = target;
    render();
    return true;
  }, id);
  if (!ok) { console.log('missing', id); continue; }
  await page.waitForTimeout(600);
  // A modal is drawn as a sheet under the dashboard frame, outside the frame clip: shoot the sheet.
  const kind = await page.evaluate((target) => SCREENS.find((s) => s.id === target)?.kind, id);
  const sheet = page.locator('.frame .sh.pcmodal, .sh.pcmodal').first();
  if (kind === 'modal' && (await sheet.count()) > 0) {
    const box = await sheet.boundingBox();
    await sheet.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/${id}.png`, clip: await sheet.boundingBox() });
    console.log(id, 'modal', Math.round(box.width), 'x', Math.round(box.height));
    continue;
  }
  const box = await page.evaluate(() => {
    const f = [...document.querySelectorAll('.frame')].find((el) => el.getBoundingClientRect().width > 300);
    if (!f) return null;
    const r = f.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box) { console.log('no frame', id); continue; }
  await page.screenshot({ path: `${OUT}/${id}.png`, clip: box });
  console.log(id, Math.round(box.width), 'x', Math.round(box.height));
}
await browser.close();
