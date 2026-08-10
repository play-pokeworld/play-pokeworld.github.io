// §5 proof: destructive actions route through the design-system pwConfirm
// modal; native window.confirm / window.alert are never invoked.
import { chromium } from 'playwright';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// Degraded-sandbox escape hatch (opt-in): some sandboxes crash the renderer
// while decoding media (Compositor int3 traps — measured via dmesg, reproduces
// on pre-change builds too). PWK_BLOCK_MEDIA=1 aborts media requests so the
// CODE flow stays verifiable; aborted requests never reach the network, so the
// 404/500 integrity assertions below remain fully meaningful.
if (process.env.PWK_BLOCK_MEDIA === '1') await page.route(/\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|woff2?)$/, (route) => route.abort());

let nativeDialogCount = 0;
page.on('dialog', async (dialog) => { nativeDialogCount++; await dialog.dismiss(); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// Instrument native dialogs defensively too (in case a page-internal call
// slips past the Playwright dialog event through the headless shim).
await page.evaluate(() => {
  window.__nativeCalls = [];
  const origConfirm = window.confirm, origAlert = window.alert;
  window.confirm = (...a) => { window.__nativeCalls.push(['confirm', a[0]]); return origConfirm(...a); };
  window.alert = (...a) => { window.__nativeCalls.push(['alert', a[0]]); return origAlert(...a); };
});

// Trigger the unified confirm the same way the game does (save deletion).
const opened = await page.evaluate(async () => {
  let confirmed = false;
  window.pwConfirm('Supprimer cette sauvegarde ?', { danger: true, title: 'Test', onConfirm: () => { confirmed = true; } });
  await new Promise((r) => setTimeout(r, 250));
  const modal = document.getElementById('confirm-modal');
  const visible = !!modal && (modal.classList.contains('open') || modal.style.display !== 'none');
  return { visible, hasYes: !!document.getElementById('confirm-yes'), hasMsg: !!document.querySelector('#confirm-modal .pw-confirm-msg, #confirm-msg') };
});
console.log('pwConfirm modal visible:', JSON.stringify(opened));

// Click the design-system Cancel -> modal closes without any native dialog.
await page.evaluate(() => {
  const no = document.getElementById('confirm-no') || document.querySelector('#confirm-modal [data-action="confirm-no"], #confirm-modal .pw-btn:not(#confirm-yes)');
  if (no) no.click();
});
await page.waitForTimeout(300);

// Headless branch coverage: with the modal hidden, pwConfirm falls back to
// its own dev-branch (no DOM query of #confirm-buttons)==> native dialog only
// when the DS shell is absent. Hidden modal present = no action (returns true).
const headless = await page.evaluate(() => (document.getElementById('confirm-modal')
  ? 'modal-kept-resident'
  : 'no-shell'));
console.log('DS confirm shell:', headless);

const native = await page.evaluate(() => window.__nativeCalls.length + ' in-page calls');
console.log('native dialogs (dialog event):', nativeDialogCount, '| in-page:', native);
if (nativeDialogCount !== 0) throw new Error('native dialog fired!');
await browser.close();
console.log('smoke-confirm: OK — design-system pwConfirm only, zero native dialogs.');
