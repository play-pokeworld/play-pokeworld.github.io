/**
 * @file port-cibles.mjs
 * @brief Shoots the nine screens of the "validated in the catalogue, not yet in the game" list, one
 *        PNG per screen, each reached on a fresh save so no leftover modal can swallow the next one.
 *
 * Usage: node tools/measure/port-cibles.mjs <outDir> [id,id,...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/cibles';
const ONLY = (process.argv[3] || 'presets,starter-confirm,confirm-relance,confirm-quitter,ball-picker,pnj,quetes-repeat,puzzle-solve,map-help').split(',');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`${String(e).slice(0, 120)}`));

/** Fresh save, starter confirmed: the dashboard is live and no modal is left open. */
async function boot() {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const input = document.getElementById('starter-name-input');
    if (input) { input.value = 'Ash'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.evaluate(() => document.querySelector('.starter-card')?.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.pw-sheet-btn.is-primary')].pop(); if (b) b.click(); });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
  await page.waitForTimeout(600);
}

/** Opens the starter screen and stops on the confirmation sheet it now owns. */
async function openStarterConfirm() {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const input = document.getElementById('starter-name-input');
    if (input) { input.value = 'Ash'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.evaluate(() => document.querySelector('.starter-card')?.click());
  await page.waitForTimeout(800);
}

const dispatch = (id, payload = {}) => page.evaluate(async ({ id, payload }) => {
  const bus = (await import('/src/core/EventBus.js')).EventBus.getInstance();
  const ev = (await import('/src/core/events/ModalOpenRequestedEvent.js')).ModalOpenRequestedEvent;
  const m = (await import('/src/config/ModalIds.js')).ModalIds;
  try { bus.dispatch(new ev(m[id], payload)); return 'ok'; } catch (e) { return String(e).slice(0, 120); }
}, { id, payload });

const shot = async (name) => {
  await page.waitForTimeout(900);
  await page.evaluate(() => document.activeElement?.blur());
  const handle = await page.evaluateHandle(() => {
    const sheets = [...document.querySelectorAll('.pw-sheet, .pw-fullscreen-overlay')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 200 && r.height > 100 && !el.classList.contains('is-hidden');
      });
    return sheets[sheets.length - 1] || null;
  });
  const el = handle.asElement();
  if (!el) { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log(`MISS ${name}`); return; }
  const box = await el.boundingBox();
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`OK   ${name.padEnd(16)} ${Math.round(box.width)}x${Math.round(box.height)}`);
};

for (const id of ONLY) {
  if (id === 'starter-confirm') {
    await openStarterConfirm();
    await shot('starter-confirm');
    continue;
  }
  await boot();
  if (id === 'presets') await dispatch('TEAM_PRESETS');
  if (id === 'confirm-relance') {
    // The reusable confirmation of the game (delete a save): the catalogue frame `confirm-relance`
    // is this component, so the shot is the component itself.
    const shown = await page.evaluate(async () => {
      const { ConfirmDialog } = await import('/src/ui/ConfirmDialog.js');
      const dialog = new ConfirmDialog({ id: 'pw-shot-confirm-dialog' });
      document.body.appendChild(dialog.getDomElement());
      dialog.ask({
        title: 'Relancer ?',
        message: 'La progression en cours sera perdue. La sauvegarde reste intacte.',
        icon: 'exclamation',
        confirmLabel: 'Relancer',
        danger: true,
        onConfirm: () => {}
      });
      return true;
    });
    if (!shown) console.log('note: confirm dialog not shown');
  }
  if (id === 'confirm-quitter') {
    await page.evaluate(() => document.getElementById('leave-btn')?.click());
  }
  if (id === 'ball-picker') {
    const filterId = await page.evaluate(async () => {
      const { PokeballSystem } = await import('/src/systems/PokeballSystem.js');
      return PokeballSystem.getInstance().getFilters?.()[0]?.id || null;
    });
    await dispatch('BALL_PICKER', { filterId });
  }
  if (id === 'pnj') {
    // The catalogue frame is the conversation itself: open the modal on the first inhabitant.
    const payload = await page.evaluate(async () => {
      const { LocationSystem } = await import('/src/systems/LocationSystem.js');
      const { NpcDirectory } = await import('/src/data/world/NpcDirectory.js');
      const sys = LocationSystem.getInstance();
      const locationId = sys.getCurrentLocationId();
      const npcs = NpcDirectory.getByLocation(locationId);
      return { locationId, npcId: npcs[0]?.id || null };
    });
    await dispatch('NPC_TALK', payload);
  }
  if (id === 'quetes-repeat') {
    await page.evaluate(async () => {
      // The board only opens once the feature is unlocked in the save.
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      save?.quests?.setRepeatableUnlocked?.(true);
    });
    await dispatch('REPEATABLE_QUESTS');
  }
  if (id === 'puzzle-solve') {
    const payload = await page.evaluate(async () => {
      const { PuzzleDB } = await import('/src/data/quests/PuzzleDB.js');
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const first = PuzzleDB.getInstance().getAll()[0] || {};
      const save = SaveSystem.getInstance().getCurrentSave();
      if (save?.player && first.locationId) {
        save.player.location = first.locationId;
        save.player.region = first.region || save.player.region;
      }
      return { puzzleId: first.id || null, locationId: first.locationId || null };
    });
    await dispatch('PUZZLE_SOLVE', payload);
  }
  if (id === 'map-help') await dispatch('MAP_HELP');
  await shot(id);
}

console.log('page errors:', errors.length ? [...new Set(errors)].slice(0, 4).join(' | ') : 'none');
await browser.close();
