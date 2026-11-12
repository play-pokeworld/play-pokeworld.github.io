/**
 * @file modal-audit.mjs
 * @brief Dumps the painted anatomy of a catalogue modal sheet and of the matching game modal, so the
 *        two can be compared role by role (surface, header, rows, footer, buttons, type scale).
 *
 * Usage: node tools/measure/modal-audit.mjs <catalogueId> <GAME_MODAL_ID|presets>
 */
import { chromium } from 'playwright';

const CAT_ID = process.argv[2];
const GAME_ID = process.argv[3];
const browser = await chromium.launch();

const DESCRIBE = `(root) => {
  const out = [];
  const walk = (el, depth) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 8) return;
    const painted = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')
      || parseFloat(cs.borderTopWidth) > 0;
    const text = (el.children.length === 0 ? (el.textContent || '').trim() : '').slice(0, 26);
    if (painted || text) {
      out.push([
        '  '.repeat(depth) + (el.tagName.toLowerCase()) + '.' + (el.className || '').toString().replace(/pw-element /g, '').trim().split(/\\s+/).slice(0, 3).join('.'),
        Math.round(r.width) + 'x' + Math.round(r.height),
        'bg=' + cs.backgroundColor,
        'bd=' + cs.borderTopWidth + ' ' + cs.borderTopColor,
        'r=' + cs.borderRadius,
        'pad=' + cs.padding.replace(/px/g, ''),
        'f=' + cs.fontSize + '/' + cs.fontWeight,
        'c=' + cs.color,
        text ? '«' + text + '»' : ''
      ].filter(Boolean).join(' '));
    }
    if (depth < 6) for (const child of el.children) walk(child, depth + 1);
  };
  walk(root, 0);
  return out;
}`;

// ---- catalogue side ----
const cat = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await cat.goto('http://127.0.0.1:3000/catalogue/CATALOGUE_AFFICHAGES.html');
await cat.waitForTimeout(900);
const catRows = await cat.evaluate(({ id, describe }) => {
  current = id;
  render();
  const sheet = [...document.querySelectorAll('.sh.pcmodal, .sh')].find((el) => el.getBoundingClientRect().width > 200);
  if (!sheet) return ['no sheet'];
  // eslint-disable-next-line no-new-func
  return new Function('return ' + describe)()(sheet);
}, { id: CAT_ID, describe: DESCRIBE });
console.log(`=== CATALOGUE ${CAT_ID} ===`);
console.log(catRows.join('\n'));

// ---- game side ----
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:3000/');
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(900);
await page.evaluate(() => {
  const input = document.getElementById('starter-name-input');
  if (input) { input.value = 'Ash'; input.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.evaluate(() => document.querySelector('.starter-card')?.click());
  await page.waitForTimeout(700);
  // The catalogue's confirmation step: the pick is only committed on "Confirmer".
  await page.evaluate(() => { const b = [...document.querySelectorAll('.pw-sheet-btn.is-primary')].pop(); if (b) b.click(); });
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await page.waitForTimeout(600);
await page.evaluate(async (id) => {
  const bus = (await import('/src/core/EventBus.js')).EventBus.getInstance();
  const ev = (await import('/src/core/events/ModalOpenRequestedEvent.js')).ModalOpenRequestedEvent;
  const m = (await import('/src/config/ModalIds.js')).ModalIds;
  const payloads = { BALL_PICKER: { filterId: 'default' }, PUZZLE_SOLVE: { puzzleId: 'p1' } };
  try { bus.dispatch(new ev(m[id], payloads[id] || {})); } catch (e) { /* ignored */ }
}, GAME_ID);
await page.waitForTimeout(1200);
const gameRows = await page.evaluate((describe) => {
  const visible = [...document.querySelectorAll('.pw-modal-backdrop, .pw-fullscreen-overlay')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 300 && r.height > 200 && !el.classList.contains('is-hidden'); });
  const layer = visible[visible.length - 1];
  if (!layer) return ['no modal'];
  const panel = layer.querySelector('.pw-modal-container, .pw-modal, .pw-fs-panel, .pw-panel') || layer;
  // eslint-disable-next-line no-new-func
  return new Function('return ' + describe)()(panel);
}, DESCRIBE);
console.log(`\n=== JEU ${GAME_ID} ===`);
console.log(gameRows.join('\n'));
await browser.close();
