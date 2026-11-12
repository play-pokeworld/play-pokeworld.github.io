/**
 * @file port-shots.mjs
 * @brief Reaches the six modals that the status document lists as validated but not ported, and
 *        shoots each one so it can be laid next to its catalogue frame.
 *
 * Usage: node tools/measure/port-shots.mjs <outDir> [id,id,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/port';
const ONLY = (process.argv[3] || 'presets,ball-picker,pnj,quetes-repeat,puzzle-solve,map-help,confirm-relance').split(',');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

async function boot() {
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
  await page.waitForTimeout(800);
}

const dispatch = (ids, payloadExpression) => page.evaluate(async ({ ids, payloadExpression }) => {
  const bus = (await import('/src/core/EventBus.js')).EventBus.getInstance();
  const ev = (await import('/src/core/events/ModalOpenRequestedEvent.js')).ModalOpenRequestedEvent;
  const m = (await import('/src/config/ModalIds.js')).ModalIds;
  // eslint-disable-next-line no-new-func
  const payload = payloadExpression ? await new Function('return (async () => ' + payloadExpression + ')()')() : {};
  bus.dispatch(new ev(m[ids], payload));
  return JSON.stringify(payload).slice(0, 120);
}, { ids, payloadExpression });

const shot = async (name) => {
  await page.waitForTimeout(900);
  // Pick the layer that is really on screen: a closed backdrop keeps a zero box, and the download
  // prompt stays last in the document for a while after its close animation.
  const handle = await page.evaluateHandle(() => {
    const visible = [...document.querySelectorAll('.pw-modal-backdrop, .pw-fullscreen-overlay')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 300 && r.height > 200 && !el.classList.contains('is-hidden');
      });
    return visible[visible.length - 1] || null;
  });
  const el = handle.asElement();
  if (!el) {
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`MISS ${name} (no modal on screen)`);
    return;
  }
  const box = await el.boundingBox();
  const info = await el.evaluate((node) => ({
    title: (node.querySelector('.pw-modal-hdr-title, .pw-modal-title, .modal-title, h2')?.textContent || '').trim().slice(0, 40),
    cls: (node.className || '').toString().slice(0, 40),
    parts: [...node.querySelectorAll('.pw-modal, .pw-sheet, .pw-modal-body, .pw-modal-footer, .pw-modal-hdr')]
      .slice(0, 5).map((n) => `${(n.className || '').toString().replace(/pw-element /g, '').slice(0, 34)} ${Math.round(n.getBoundingClientRect().width)}x${Math.round(n.getBoundingClientRect().height)}`)
  }));
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`OK   ${name.padEnd(16)} ${Math.round(box.width)}x${Math.round(box.height)} "${info.title}" [${info.cls}]`);
  for (const line of info.parts) console.log('       ', line);
};

const closeAll = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
};

/** Opens one target on a fresh save: any leftover modal would swallow the next dispatch. */
async function openTarget(id) {
  await boot();
  if (id === 'presets') {
    await dispatch('TEAM_PRESETS');
  } else if (id === 'pnj') {
    const payload = await page.evaluate(async () => {
      const { LocationSystem } = await import('/src/systems/LocationSystem.js');
      const sys = LocationSystem.getInstance();
      const loc = sys.getCurrentLocation?.() || sys.currentLocation || sys.getLocation?.() || {};
      const npcs = loc.npcs || loc.inhabitants || [];
      return { locationId: loc.id || null, npcId: npcs[0]?.id || null };
    });
    await page.evaluate(async (p) => {
      const bus = (await import('/src/core/EventBus.js')).EventBus.getInstance();
      const ev = (await import('/src/core/events/ModalOpenRequestedEvent.js')).ModalOpenRequestedEvent;
      const m = (await import('/src/config/ModalIds.js')).ModalIds;
      bus.dispatch(new ev(m.NPC_TALK, p));
    }, payload);
  } else if (id === 'quetes-repeat') {
    await dispatch('REPEATABLE_QUESTS');
  } else if (id === 'puzzle-solve') {
    const payload = await page.evaluate(async () => {
      const { PuzzleSystem } = await import('/src/systems/PuzzleSystem.js');
      const sys = PuzzleSystem.getInstance();
      const all = sys.getAllPuzzles?.() || sys.puzzles || [];
      return { puzzleId: Array.isArray(all) ? all[0]?.id : Object.keys(all)[0] };
    });
    await page.evaluate(async (p) => {
      const bus = (await import('/src/core/EventBus.js')).EventBus.getInstance();
      const ev = (await import('/src/core/events/ModalOpenRequestedEvent.js')).ModalOpenRequestedEvent;
      const m = (await import('/src/config/ModalIds.js')).ModalIds;
      bus.dispatch(new ev(m.PUZZLE_SOLVE, p));
    }, payload);
  } else if (id === 'map-help') {
    await dispatch('MAP_HELP');
  } else if (id === 'ball-picker') {
    const payload = await page.evaluate(async () => {
      const { PokeballSystem } = await import('/src/systems/PokeballSystem.js');
      const filters = PokeballSystem.getInstance().getFilters?.() || [];
      return { filterId: filters[0]?.id || null };
    });
    await page.evaluate(async (p) => {
      const bus = (await import('/src/core/EventBus.js')).EventBus.getInstance();
      const ev = (await import('/src/core/events/ModalOpenRequestedEvent.js')).ModalOpenRequestedEvent;
      const m = (await import('/src/config/ModalIds.js')).ModalIds;
      bus.dispatch(new ev(m.BALL_PICKER, p));
    }, payload);
  }
}

for (const id of ONLY.filter((x) => x !== 'confirm-relance')) {
  await openTarget(id);
  await shot(id);
}

if (ONLY.includes('confirm-relance')) {
  // The relaunch confirmation lives in the save menu of the shell, before a save is loaded.
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(1400);
  const ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, .pw-btn')]
      .find((b) => /recommencer|relancer|nouvelle partie/i.test(b.textContent || ''));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) console.log('note: relaunch button not found on the shell');
  await shot('confirm-relance');
}

console.log('page errors:', errors.length ? errors.slice(0, 3).join(' | ') : 'none');
await browser.close();
