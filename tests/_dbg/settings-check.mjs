import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
const errors=[]; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text()); });
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await p.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await p.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await p.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await p.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await p.waitForTimeout(500);
await p.evaluate(() => { try { window.openSettings(); } catch(e) { console.log('openSettings err', e); } });
await p.waitForTimeout(500);
const info = await p.evaluate(() => {
  const s = document.getElementById('audio-sfx-volume');
  if (!s) return { noSlider: true, body: (document.getElementById('settings-body')||{}).innerHTML?.slice(0,300) };
  const cs = getComputedStyle(s);
  return { min: s.min, max: s.max, step: s.step, value: s.value, oninput: s.getAttribute('oninput'), width: cs.width, appearance: cs.appearance, display: cs.display, prefs: window.audioPrefs() };
});
console.log(JSON.stringify(info, null, 1));
// simulate drag to 100
const after = await p.evaluate(() => {
  const s = document.getElementById('audio-sfx-volume');
  s.value = '100'; s.dispatchEvent(new Event('input', { bubbles: true }));
  const r1 = { prefs: JSON.parse(JSON.stringify(window.audioPrefs())), out: document.getElementById('audio-sfx-value')?.textContent };
  s.value = '1'; s.dispatchEvent(new Event('input', { bubbles: true }));
  const r2 = { prefs: JSON.parse(JSON.stringify(window.audioPrefs())), out: document.getElementById('audio-sfx-value')?.textContent };
  return { r1, r2 };
});
console.log(JSON.stringify(after));
// real pointer interaction
const box = await p.locator('#audio-music-volume').boundingBox();
console.log('music slider box', box);
if (box) {
  await p.mouse.move(box.x + 5, box.y + box.height/2); await p.mouse.down(); await p.mouse.move(box.x + box.width - 2, box.y + box.height/2, { steps: 8 }); await p.mouse.up();
  console.log('after drag', await p.evaluate(() => ({ v: document.getElementById('audio-music-volume').value, prefs: window.audioPrefs().musicVol, out: document.getElementById('audio-music-value').textContent })));
}
await p.locator('.settings-sound').screenshot({ path: '/tmp/settings-sound.png' });
await p.locator('#settings-modal').screenshot({ path: '/tmp/settings-full.png' });
console.log('errors', errors.slice(0,5));
await b.close();
