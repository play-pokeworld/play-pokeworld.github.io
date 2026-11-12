/**
 * @file audit-all-windows.mjs
 * @brief Opens every modal that can be opened by request and reports the containers that paint a
 *        frame, plus a screenshot of each window. Used to find what still belongs to the old
 *        display grammar before a rework; the rules it encodes are the shared catalogue grammar.
 *
 * Usage: node tools/measure/audit-all-windows.mjs [outDir] [ID,ID,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || '/tmp/audit-all';
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });

/** Ids that need params or a game state we do not have in a fresh save. */
const NEEDS_PARAMS = new Set([
  'TEAM_PRESET_EDITOR', 'ITEM_TARGET', 'MOVE_LEARN', 'SAVE_ICON_PICKER',
  'PUZZLE_SOLVE', 'BALL_PICKER', 'BALL_FILTERS', 'POKEDEX_DETAIL', 'DICTIONARY_DETAIL',
  'ATC_FACTORY_PREP', 'ATOLL_FACTORY_PREP', 'SECRET_BASE_NPC', 'SECRET_BASE_PC',
  'RELAUNCH_CONFIRM_PREFIX', 'AFK_SUMMARY', 'FOSSIL_LAB', 'REPEATABLE_UPGRADES'
]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

/** Boots a fresh game and lands on the dashboard. A reload per window keeps the audit honest:
 *  a panel left open by the previous probe used to show up in the measurements of the next one. */
async function boot() {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    const input = document.getElementById('starter-name-input');
    if (input) { input.value = 'A'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.evaluate(() => document.querySelector('.starter-card')?.click());
  await page.waitForTimeout(700);
  // The catalogue's confirmation step: the pick is only committed on "Confirmer".
  await page.evaluate(() => { const b = [...document.querySelectorAll('.pw-sheet-btn.is-primary')].pop(); if (b) b.click(); });
  await page.waitForTimeout(1900);
  await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
  await page.waitForTimeout(500);
}

await boot();

const ids = await page.evaluate(async () => {
  const mod = await import('/src/config/ModalIds.js');
  return Object.keys(mod.ModalIds);
});

const report = [];
for (const name of ids) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  await boot();
  if (NEEDS_PARAMS.has(name)) { report.push(`${name}: skipped (needs params or game state)`); continue; }
  const opened = await page.evaluate(async (id) => {
    const bus = await import('/src/core/EventBus.js');
    const ev = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const m = await import('/src/config/ModalIds.js');
    try {
      bus.EventBus.getInstance().dispatch(new ev.ModalOpenRequestedEvent(m.ModalIds[id], {}));
      return true;
    } catch (e) { return String(e).slice(0, 120); }
  }, name);
  if (opened !== true) { report.push(`${name}: could not open (${opened})`); continue; }
  await page.waitForTimeout(900);

  const found = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.pw-modal-backdrop:not(.is-hidden), .pw-fullscreen-overlay.is-open')]
      .filter((layer) => { const r = layer.getBoundingClientRect(); return r.width > 100 && r.height > 100; });
    // The last visible layer in document order is the one just opened: the others belong to the shell.
    const layers = visible.length ? [visible[visible.length - 1]] : [];
    const rows = [];
    const seen = new Set();
    for (const layer of layers) {
      for (const el of layer.querySelectorAll('*')) {
        const tag = el.tagName.toLowerCase();
        if (['input', 'select', 'textarea', 'img', 'svg'].includes(tag)) continue;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width < 60 || rect.height < 22) continue;
        const bg = style.backgroundColor;
        const border = parseFloat(style.borderTopWidth) > 0;
        const painted = (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || border;
        if (!painted) continue;
        const key = (el.getAttribute('class') || tag).replace(/pw-element /g, '').slice(0, 58);
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(`${key.padEnd(58)} ${String(Math.round(rect.width)).padStart(4)}x${String(Math.round(rect.height)).padStart(4)} bg=${bg} border=${style.borderTopWidth} ${style.borderTopColor} r=${style.borderRadius}`);
      }
    }
    return rows;
  });

  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  report.push(found.length ? `=== ${name} ===\n  ${found.join('\n  ')}` : `=== ${name} (clean) ===`);

}

await browser.close();
console.log(report.join('\n'));
console.log(`\npage errors: ${errors.length ? errors.join(' | ') : 'none'}`);
console.log(`screenshots: ${OUT}`);
