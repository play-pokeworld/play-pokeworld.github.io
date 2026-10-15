import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const boot = async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await p.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await p.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
  await p.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
  await p.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await p.waitForTimeout(600);
};
await boot(page);
const shotEl = async (sel, path) => {
  const el = await page.$(sel);
  if (!el) { console.log('missing', sel); return; }
  if (await el.isVisible()) { await el.screenshot({ path, timeout: 8000 }).catch((e) => console.log('shot fail', path, e.message.split('\n')[0])); return; }
  console.log('not visible', sel); await page.screenshot({ path });
};
await page.mouse.click(700, 450);
await page.waitForTimeout(300);

// 1. Réglages → Son
await page.evaluate(() => { openSettings(); });
await page.waitForTimeout(400);
const snd = await page.evaluate(() => {
  const box = document.getElementById('settings-modal');
  const cards = Array.from(box.querySelectorAll('.settings-sound-card')).map((c) => ({
    cls: c.className,
    state: c.querySelector('.pw-switch-state')?.textContent,
    checked: c.querySelector('.pw-switch')?.getAttribute('aria-checked'),
    fill: c.querySelector('input[type=range]')?.style.getPropertyValue('--pw-fill'),
    val: c.querySelector('output')?.textContent,
  }));
  return cards;
});
console.log('sound cards', JSON.stringify(snd));
await shotEl('#settings-modal .settings-sound', 'docs/captures/v7-r3d-settings-sound.png');
// bascule musique → coupé + curseur sfx à 25
await page.evaluate(() => { toggleAudioBus('music'); });
await page.waitForTimeout(250);
await page.evaluate(() => { const i = document.getElementById('audio-sfx-volume'); i.value = '25'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(250);
const snd2 = await page.evaluate(() => Array.from(document.querySelectorAll('.settings-sound-card')).map((c) => c.className + ' / ' + c.querySelector('.pw-switch-state')?.textContent + ' / ' + c.querySelector('input[type=range]')?.style.getPropertyValue('--pw-fill') + ' / ' + c.querySelector('output')?.textContent));
console.log('after toggle', JSON.stringify(snd2));
await shotEl('#settings-modal .settings-sound', 'docs/captures/v7-r3d-settings-sound-off.png');
await page.evaluate(() => { toggleAudioBus('music'); closeSettings(); });

// 2. Musique par lieu : contextes
const ctx = await page.evaluate(() => {
  const out = {};
  for (const loc of ['pokemontower', 'mtmoon', 'viridianforest', 'route1', 'route2', 'pallet', 'viridian', 'cerulean', 'lavender', 'route111', 'mt_chimney', 'icepath', 'sprouttower', 'sky_pillar', 'route119', 'blackthorn', 'jroute29', 'jroute30']) {
    G.location = loc; G.unlockedLocs = G.unlockedLocs || {}; G.unlockedLocs[loc] = true;
    const c = audioCurrentContext(); const chain = audioMusicChain(c);
    const pick = typeof audioMusicTrackFor === 'function' ? audioMusicTrackFor(c) : null;
    out[loc] = c + ' → ' + (pick && pick.key ? pick.key : JSON.stringify(pick)).toString().slice(0, 60);
  }
  G.location = 'route1';
  return out;
});
console.log('contexts', JSON.stringify(ctx, null, 1));

// 3. Compte à rebours de relance dans le menu de butin (combat sauvage)
await page.evaluate(() => {
  G.automationUpgrades = Object.assign({}, G.automationUpgrades, { autoRelaunch: true });
  G.automation = Object.assign({}, G.automation, { autoRelaunch: true });
  G.location = 'route1';
  // butin de session factice pour que le résumé ait de quoi afficher
  if (typeof getBattleSessionSummaryData === 'function') { /* lecture seule */ }
  openBattleSummary(true);
  scheduleAutoRelaunch();
});
await page.waitForTimeout(900);
const cd = await page.evaluate(() => {
  const host = document.getElementById('summary-relaunch-wild');
  const modal = document.getElementById('battle-summary-modal');
  return { open: modal.classList.contains('open'), html: host ? host.innerHTML.slice(0, 400) : null, fill: host?.querySelector('.pw-summary-relaunch-fill')?.style.width, left: autoRelaunchRemainingMs() };
});
console.log('countdown', JSON.stringify(cd));
await shotEl('#battle-summary-modal .modal-box, #battle-summary-modal .pw-modal-box, #battle-summary-inner', 'docs/captures/v7-r3d-loot-countdown.png');
// clic sur « Arrêter la relance »
await page.click('#summary-relaunch-wild .pw-summary-relaunch-cancel');
await page.waitForTimeout(300);
const cd2 = await page.evaluate(() => ({ armed: autoRelaunchRemainingMs(), html: document.getElementById('summary-relaunch-wild').innerText, open: document.getElementById('battle-summary-modal').classList.contains('open') }));
console.log('after cancel', JSON.stringify(cd2));
await shotEl('#battle-summary-modal .modal-box, #battle-summary-modal .pw-modal-box, #battle-summary-inner', 'docs/captures/v7-r3d-loot-cancelled.png');
await page.evaluate(() => closeBattleSummary());

// 4. Donjon : compte à rebours de la prochaine expédition dans le butin
await page.evaluate(() => {
  G.automationUpgrades.autoDungeonRelaunch = true; G.automation.autoDungeonRelaunch = true;
  G.unlockedLocs.mtmoon = true; G.location = 'mtmoon'; G.badges = ['brock'];
  ensureWallet().dungeonTokens = 1000;
  openBattleSummary(true);
  const r = scheduleAutoDungeonRelaunch({ loc: 'mtmoon', mode: 'farm', outcome: 'cleared' });
  window.__dgArmed = r;
});
await page.waitForTimeout(700);
const dg = await page.evaluate(() => ({ armed: window.__dgArmed, left: autoDungeonRelaunchRemainingMs(), text: document.getElementById('summary-relaunch-dungeon')?.innerText }));
console.log('dungeon countdown', JSON.stringify(dg));
await shotEl('#battle-summary-modal .modal-box, #battle-summary-modal .pw-modal-box, #battle-summary-inner', 'docs/captures/v7-r3d-loot-dungeon-countdown.png');
// clic sur « Arrêter la relance » pour l'expédition
await page.click('#summary-relaunch-dungeon .pw-summary-relaunch-cancel');
await page.waitForTimeout(300);
const dg2 = await page.evaluate(() => ({ armed: autoDungeonRelaunchRemainingMs(), html: document.getElementById('summary-relaunch-dungeon')?.innerText }));
console.log('after dungeon cancel', JSON.stringify(dg2));
await page.evaluate(() => { cancelAutoDungeonRelaunch(); closeBattleSummary(); });
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close();
