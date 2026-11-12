/**
 * @file audit-reachable-windows.mjs
 * @brief Opens the windows that the generic audit cannot reach (they need params or a game state)
 *        by driving the real UI, then reports the containers that paint a frame and saves a shot
 *        of each one.
 *
 * The generic audit (audit-all-windows.mjs) dispatches ModalOpenRequestedEvent with no payload, so
 * every window that reads an id, an item or a uid stays closed. Here the same windows are reached
 * by clicking what a player clicks: a dictionary entry, a Pokedex cell, an item of the bag, a
 * member of the team, a preset row.
 *
 * Usage: node tools/measure/audit-reachable-windows.mjs [outDir] [NAME,NAME,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/audit-reachable';
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

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
  await page.waitForTimeout(1900);
  await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.pw-toast-card').forEach((e) => e.remove()));
}

/** Opens a modal by id, as the generic audit does. */
const openModal = (id) => page.evaluate(async (name) => {
  const bus = await import('/src/core/EventBus.js');
  const ev = await import('/src/core/events/ModalOpenRequestedEvent.js');
  const m = await import('/src/config/ModalIds.js');
  bus.EventBus.getInstance().dispatch(new ev.ModalOpenRequestedEvent(m.ModalIds[name], {}));
  return true;
}, id);

const click = (selector, index = 0) => page.evaluate(({ selector, index }) => {
  const nodes = [...document.querySelectorAll(selector)].filter((e) => e.getBoundingClientRect().width > 10);
  const el = nodes[index];
  if (!el) return false;
  el.click();
  return true;
}, { selector, index });

const CASES = {
  DICTIONARY_DETAIL: async () => { await openModal('DICTIONARY'); await page.waitForTimeout(900); return click('.dict-entry'); },
  POKEDEX_DETAIL: async () => { await openModal('POKEDEX'); await page.waitForTimeout(900); return click('.dex-entry, .pw-pokedex-entry'); },
  BALL_PICKER: async () => { await openModal('TEAM'); await page.waitForTimeout(1000); return click('.poke-card, .pw-team-member-card'); },
  TEAM_PRESET_EDITOR: async () => { await openModal('TEAM_PRESETS'); await page.waitForTimeout(1000); return click('.preset-row .hbtn, .preset-edit-btn, .preset-row .pw-button'); },
  SAVE_ICON_PICKER: async () => { await openModal('SETTINGS'); await page.waitForTimeout(1100); return click('.save-profile-portrait, .save-icon-choice'); },
  ITEM_TARGET: async () => { await openModal('BAG'); await page.waitForTimeout(900); return click('.inv-item'); },
  MOVE_LEARN: async () => {
    await openModal('TEAM'); await page.waitForTimeout(1000);
    await click('.poke-card, .pw-team-member-card'); await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelectorAll('.pw-modal-backdrop:not(.is-hidden)').forEach((e) => e.classList.add('is-hidden')));
    await page.evaluate(async () => {
      const el = document.querySelector('[data-pokemon-uid], [data-uid]');
      const uid = el?.getAttribute('data-pokemon-uid') || el?.getAttribute('data-uid');
      if (!uid) return;
      const bus = await import('/src/core/EventBus.js');
      const ev = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const m = await import('/src/config/ModalIds.js');
      bus.EventBus.getInstance().dispatch(new ev.ModalOpenRequestedEvent(m.ModalIds.POKEMON_INFO, { pokemonUid: uid }));
    });
    await page.waitForTimeout(1100);
    return click('.poke-detail-full-list-btn');
  },
  PUZZLE_SOLVE: async () => { await openModal('PUZZLES'); await page.waitForTimeout(900); return click('.servrow, .pw-puzzle-card, .hbtn'); },
  SECRET_BASE_PC: async () => { await openModal('SECRET_BASE'); await page.waitForTimeout(1000); return click('.pw-base-pc, .pw-secret-base-pc, .hbtn'); },
  SECRET_BASE_NPC: async () => { await openModal('SECRET_BASE'); await page.waitForTimeout(1000); return click('.pw-base-npc, .pw-secret-base-npc'); }
};

const report = [];
for (const name of Object.keys(CASES)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  await boot();
  let reached = false;
  try { reached = await CASES[name](); } catch (e) { reached = String(e).slice(0, 120); }
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('.pw-toast-card').forEach((e) => e.remove()));

  const rows = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.pw-modal-backdrop:not(.is-hidden), .pw-fullscreen-overlay.is-open')]
      .filter((layer) => { const r = layer.getBoundingClientRect(); return r.width > 100 && r.height > 100; });
    const layers = visible.length ? [visible[visible.length - 1]] : [];
    const out = [];
    const seen = new Set();
    for (const layer of layers) {
      for (const el of layer.querySelectorAll('*')) {
        if (el.tagName === 'IMG' || el.tagName === 'CANVAS') continue;
        const c = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 20) continue;
        const paints = (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent')
          || parseFloat(c.borderTopWidth) > 0;
        if (!paints) continue;
        const line = `${(el.getAttribute('class') || el.tagName).slice(0, 48).padEnd(48)} `
          + `${String(Math.round(r.width)).padStart(4)}x${String(Math.round(r.height)).padStart(4)} `
          + `bg=${c.backgroundColor} border=${c.borderTopWidth} ${c.borderTopColor} r=${c.borderRadius}`;
        if (seen.has(line)) continue;
        seen.add(line);
        out.push(line);
      }
    }
    return out.slice(0, 30);
  });

  report.push(`=== ${name} === reached=${reached}`);
  report.push(...rows.map((r) => `  ${r}`));
  if (!rows.length) report.push('  (nothing open)');
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

await browser.close();
const text = `${report.join('\n')}\n\npage errors: ${errors.length ? errors.join(' | ') : 'none'}\nscreenshots: ${OUT}\n`;
fs.writeFileSync(`${OUT}/report.txt`, text);
console.log(text);
