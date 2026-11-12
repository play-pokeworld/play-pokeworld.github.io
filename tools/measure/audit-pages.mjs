/**
 * Developer tool: for each full-screen panel, lists the containers that draw a frame
 * (a background or a border) inside the panel body, and saves a screenshot.
 * Used to find the boxes the catalogue does not have.
 *
 * Run: node server.js, then `node tools/measure/audit-pages.mjs [outDir]`.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '/tmp/audit';
mkdirSync(out, { recursive: true });

const IDS = process.argv[3]
  ? process.argv[3].split(',')
  : ['SHOP', 'MARKET', 'BAG', 'BOX', 'BADGES', 'POKEDEX', 'ACHIEVEMENTS', 'ATOLL', 'DICTIONARY', 'PUZZLES'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));

await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const input = document.getElementById('starter-name-input');
  if (input) { input.value = 'Audit'; input.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await page.waitForTimeout(400);

for (const id of IDS) {
  const opened = await page.evaluate(async (modalId) => {
    const bus = await import('/src/core/EventBus.js');
    const event = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const ids = await import('/src/config/ModalIds.js');
    if (!ids.ModalIds[modalId]) return 'unknown: ' + modalId;
    bus.EventBus.getInstance().dispatch(new event.ModalOpenRequestedEvent(ids.ModalIds[modalId], {}));
    return 'ok';
  }, id);
  await page.waitForTimeout(1500);

  const report = await page.evaluate(() => {
    const body = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-body');
    if (!body) return null;
    const seen = new Map();
    for (const el of body.querySelectorAll('*')) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width < 60 || rect.height < 20) continue;
      const painted = style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const bordered = parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderLeftWidth) > 0;
      if (!painted && !bordered) continue;
      const cls = (el.getAttribute('class') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
      const isControl = /pw-input|pw-button|pw-btn|pw-dropdown|pw-select|select|input|button/i.test(el.tagName + ' ' + cls);
      const entry = seen.get(cls) || { cls, count: 0, w: Math.round(rect.width), h: Math.round(rect.height), bg: style.backgroundColor, border: style.borderTopWidth + ' ' + style.borderTopColor, radius: style.borderRadius, control: isControl };
      entry.count += 1;
      seen.set(cls, entry);
    }
    return [...seen.values()];
  });

  console.log(`\n=== ${id} (${opened}) ===`);
  if (!report) { console.log('  panneau introuvable'); continue; }
  for (const entry of report) {
    if (entry.control) continue;
    console.log(`  ${entry.cls.padEnd(58)} x${String(entry.count).padStart(2)} ${String(entry.w).padStart(4)}x${String(entry.h).padStart(3)} bg=${entry.bg.padEnd(22)} border=${entry.border.padEnd(18)} r=${entry.radius}`);
  }
  await page.screenshot({ path: `${out}/${id}.png` });
  await page.evaluate(() => {
    document.querySelectorAll('.pw-fullscreen-overlay.is-open .pw-modal-close-btn').forEach((btn) => btn.click());
  });
  await page.waitForTimeout(700);
}

console.log('\nerreurs de page :', errors.length ? errors : 'aucune');
await browser.close();
