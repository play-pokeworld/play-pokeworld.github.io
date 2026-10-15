import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const failed = []; page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(600);
await page.mouse.click(700, 450);
await page.waitForTimeout(500);
const out = await page.evaluate(async () => {
  if (typeof audioLoadManifest === 'function') await audioLoadManifest();
  const st = audioState();
  const r = { version: PW_VERSION, manifest: st.manifestState, music: Object.keys((window.__pwManifest || {}).music || {}).length, fileSfx: st.fileSfx, cries: st.cries, ctx: {} };
  const ctxAt = (loc) => { G.location = loc; return audioCurrentContext() + ' → ' + audioMusicTrackFor(audioCurrentContext()); };
  r.ctx.pallet = ctxAt('pallet'); r.ctx.route1 = ctxAt('route1'); r.ctx.lavender = ctxAt('lavender'); r.ctx.pewter = ctxAt('pewter');
  G.location = 'pallet';
  // effets fichier : décodage réel (WAV) + cache
  const okClick = audioPlaySfx('click');
  await new Promise((s) => setTimeout(s, 700));
  const okCatch = audioPlaySfx('catch');
  const okCry = audioPlayCry(25);
  await new Promise((s) => setTimeout(s, 1500));
  const st2 = audioState();
  r.play = { okClick, okCatch, okCry, buffers: st2.buffers, musicKey: st2.musicKey, pendingKey: st2.pendingKey, loadedTracks: st2.loadedTracks, musicContext: st2.musicContext };
  return r;
});
console.log(JSON.stringify(out, null, 1));
// donjon : Tour Pokémon → thème tower ; Mont Sélénite → dungeon générique
const dg = await page.evaluate(async () => {
  ensureWallet().dungeonTokens = 5000; G.dungeonClears = { pokemontower: 10, mtmoon: 10 }; G.badges = ['brock', 'misty', 'surge', 'erika'];
  G.unlockedLocs = Object.assign(G.unlockedLocs || {}, { pokemontower: true, mtmoon: true });
  clickLocation('pokemontower'); startDungeonRun('pokemontower');
  const a = audioCurrentContext() + ' → ' + audioMusicTrackFor(audioCurrentContext());
  dungeonAbandon && dungeonAbandon();
  return { tower: a, run: !!G.dungeonRun };
});
console.log('dungeon', JSON.stringify(dg));
console.log('errors', errors, 'failed', failed.slice(0, 5));
await browser.close();
