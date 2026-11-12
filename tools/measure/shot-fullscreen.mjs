/** Developer tool: opens a full-screen panel by its modal id and captures it. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const id = process.argv[2] || 'BAG';
const out = process.argv[3] || '/tmp/fs';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:3000/'); await p.waitForTimeout(1500);
await p.evaluate(() => document.getElementById('save-menu-new-btn')?.click()); await p.waitForTimeout(1200);
await p.evaluate(() => { const i = document.getElementById('starter-name-input'); if (i) { i.value='Ash'; i.dispatchEvent(new Event('input',{bubbles:true})); } });
await p.evaluate(() => document.querySelector('.starter-card')?.click()); await p.waitForTimeout(1800);
await p.evaluate(() => document.querySelectorAll('.pw-modal-backdrop,.pw-modal,.pw-toast-card').forEach(e=>e.remove()));
const ok = await p.evaluate(async (id) => {
  const mod = await import('/src/core/EventBus.js');
  const ev = await import('/src/core/events/ModalOpenRequestedEvent.js');
  const ids = await import('/src/config/ModalIds.js');
  if (!ids.ModalIds[id]) return 'unknown id: ' + Object.keys(ids.ModalIds).join(',');
  mod.EventBus.getInstance().dispatch(new ev.ModalOpenRequestedEvent(ids.ModalIds[id], {}));
  return 'ok';
}, id);
await p.waitForTimeout(1400);
await p.evaluate(() => document.querySelectorAll('.pw-toast-card').forEach(e=>e.remove()));
await p.screenshot({ path: `${out}/fs-${id}.png` });
console.log(id, ok, 'errors:', errs.length ? errs : 'none');
await b.close();
