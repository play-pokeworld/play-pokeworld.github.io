/**
 * @file presence.mjs
 * @brief Answers one question per catalogue screen: does the game have this screen at all, and what
 *        does it open? Used to fill the "present in the game" column of the status document.
 *
 * Usage: node tools/measure/presence.mjs [outJson]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/presence.json';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

async function boot() {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const input = document.getElementById('starter-name-input');
    if (input) { input.value = 'A'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.evaluate(() => document.querySelector('.starter-card')?.click());
  await page.waitForTimeout(700);
  // The catalogue's confirmation step: the pick is only committed on "Confirmer".
  await page.evaluate(() => { const b = [...document.querySelectorAll('.pw-sheet-btn.is-primary')].pop(); if (b) b.click(); });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
  await page.waitForTimeout(700);
}

await boot();

const ids = await page.evaluate(async () => {
  const mod = await import('/src/config/ModalIds.js');
  return Object.keys(mod.ModalIds);
});

const result = {};
for (const name of ids) {
  await boot();
  const dispatched = await page.evaluate(async (id) => {
    const bus = await import('/src/core/EventBus.js');
    const ev = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const m = await import('/src/config/ModalIds.js');
    try {
      bus.EventBus.getInstance().dispatch(new ev.ModalOpenRequestedEvent(m.ModalIds[id], {}));
      return 'ok';
    } catch (e) { return String(e).slice(0, 100); }
  }, name);
  await page.waitForTimeout(800);
  const opened = await page.evaluate(() => {
    const layers = [...document.querySelectorAll('.pw-modal-backdrop:not(.is-hidden), .pw-fullscreen-overlay.is-open')]
      .filter((layer) => { const r = layer.getBoundingClientRect(); return r.width > 200 && r.height > 200; });
    if (!layers.length) return null;
    const layer = layers[layers.length - 1];
    const title = layer.querySelector('.modal-title, .pw-win-hdr-label, h2, h3');
    return { title: (title?.textContent || '').trim().slice(0, 46), cls: (layer.className || '').toString().slice(0, 40) };
  });
  result[name] = { dispatched, opened };
}

// the thirteen dashboard windows are mounted with the page
const windows = await page.evaluate(() => [...document.querySelectorAll('#main-dashboard .dash-win')]
  .map((el) => ({ id: el.id, title: (el.querySelector('.pw-win-hdr-label')?.textContent || '').trim() })));

fs.writeFileSync(OUT, JSON.stringify({ result, windows }, null, 1));
for (const [name, info] of Object.entries(result)) {
  console.log(`${name.padEnd(24)} ${info.opened ? `OPEN  ${info.opened.title || info.opened.cls}` : `none  (${info.dispatched})`}`);
}
console.log('windows:', windows.map((w) => w.id).join(' '));
console.log('page errors:', errors.length ? errors.slice(0, 3).join(' | ') : 'none');
await browser.close();
