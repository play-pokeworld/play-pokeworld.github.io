// Vérification SND en navigateur : pas de réseau audio au boot, déverrouillage au
// premier geste, contexte musical, effets sur événements, pause onglet caché, réglages.
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200)); });
const audioRequests = []; page.on('request', (r) => { if (/assets\/audio/.test(r.url())) audioRequests.push(r.url().split('/').pop()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.waitForTimeout(1200);
console.log('boot: audio requests =', audioRequests.length, '| state =', JSON.stringify(await page.evaluate(() => audioState())));
// Premier geste → déverrouillage + musique du menu
await page.mouse.click(700, 450);
await page.waitForTimeout(1500);
console.log('after gesture:', JSON.stringify(await page.evaluate(() => ({ s: audioState(), ctx: audioCurrentContext() }))), '| requests:', audioRequests);
// Nouvelle partie
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(1500);
console.log('in game:', JSON.stringify(await page.evaluate(() => ({ music: audioCurrentMusic(), ctx: audioCurrentContext() }))));
// Espionner audioPlaySfx puis combat sauvage + brillant forcé
const r = await page.evaluate(async () => {
  const played = [];
  const orig = window.audioPlaySfx;
  window.audioPlaySfx = (n) => { played.push(n); return orig(n); };
  clickLocation('route1');
  exploreArea();
  await new Promise((r) => setTimeout(r, 900));
  const out = { afterExplore: played.slice(), music: audioCurrentMusic(), ctx: audioCurrentContext() };
  // Brillant : on force un adversaire shiny via spawnNextWild sur un enemy modifié
  battle.enemyPoke.currentHP = 0;
  await new Promise((r) => setTimeout(r, 1500));
  out.afterKo = played.slice();
  // Simuler l'apparition d'un brillant + capture brillante via le bus (même chemin que le jeu)
  pwEmit('battle:enemy', { id: 25, shiny: true });
  pwEmit('pokemonCaught', { id: 25, shiny: true });
  pwEmit('pokemonCaught', { id: 25, shiny: false });
  out.shinyPath = played.slice(-3);
  // Onglet caché → pause
  const el = (() => { try { return null; } catch (_) { return null; } })();
  return out;
});
console.log('battle:', JSON.stringify(r));
// Visibilité : simuler l'onglet caché
const hid = await page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  const s1 = audioState();
  const played = audioPlaySfx('click');
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  return { hiddenState: s1.hidden, sfxWhileHidden: played, afterVisible: audioState().hidden };
});
console.log('visibility:', JSON.stringify(hid));
// Réglages → Son
await page.evaluate(() => { if (battle.active) endBattle(); openSettings(); });
await page.waitForTimeout(300);
const settings = await page.evaluate(() => {
  const sec = document.querySelector('.settings-sound');
  const out = { present: !!sec, text: sec && sec.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) };
  toggleAudioBus('music');
  out.musicOffPrefs = JSON.parse(localStorage.getItem('pokeworld_audio_prefs'));
  setAudioVolume('sfx', 35);
  out.sfxVol = audioPrefs().sfxVol;
  toggleAudioBus('music');
  out.musicBack = audioPrefs().musicOn;
  return out;
});
console.log('settings:', JSON.stringify(settings));
const shot = await page.$('#settings-modal .pw-modal, #settings-modal');
await page.screenshot({ path: 'tests/_dbg/shots/settings-sound.png' });
console.log('errors:', errors.slice(0, 5));
await browser.close();
