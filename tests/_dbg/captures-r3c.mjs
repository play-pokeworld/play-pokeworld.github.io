import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning' && /inline/i.test(m.text())) errors.push('[warn] ' + m.text().slice(0, 160)); });
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
  const vis = await el.isVisible();
  if (vis) { await el.screenshot({ path, timeout: 8000 }).catch((e) => console.log('shot fail', path, e.message.split('\n')[0])); return; }
  console.log('not visible', sel);
  await page.screenshot({ path });
};
await page.mouse.click(700, 450);
await page.waitForTimeout(300);

// 1. Réglages → Son : trois curseurs, fonctionnels (0–100), plus de fourre-tout
await page.evaluate(() => { openSettings(); });
await page.waitForTimeout(400);
const sliders = await page.evaluate(() => {
  const box = document.getElementById('settings-modal');
  const inputs = Array.from(box.querySelectorAll('input[type=range]'));
  const before = audioState();
  const r = inputs.map((i) => ({ bus: i.dataset.inputArgs || i.dataset.bus || i.name || i.id, min: i.min, max: i.max, value: i.value }));
  // simule un déplacement réel du curseur des cris à 17
  const cries = inputs.find((i) => /cries/.test(i.dataset.inputArgs || '') || /cries/.test(i.id || ''));
  if (cries) { cries.value = '17'; cries.dispatchEvent(new Event('input', { bubbles: true })); }
  const after = audioState();
  const txt = box.innerText;
  return {
    sliders: r,
    criesVolBefore: before.criesVol ?? before.volumes ?? null,
    criesVolAfter: after.criesVol ?? after.volumes ?? null,
    keys: Object.keys(after).filter((k) => /vol|cries|music|sfx/i.test(k)),
    hasAutomation: /Automatisation/.test(txt),
    hasDebugHint: /pwDebug/.test(txt),
    hasSoundHint: /CREDITS|download_assets/.test(txt),
    versionLine: (txt.match(/PokéWorld — version[^\n]*/) || [''])[0],
  };
});
console.log('settings', JSON.stringify(sliders));
await shotEl('#settings-modal .modal-box, #settings-modal .pw-modal-box, #settings-inner', 'docs/captures/v7-r3c-settings-sound.png');
await page.evaluate(() => closeSettings());

// 2. Mine : en-tête avec bouton Mine auto (achat avec prix), outils en bascule, visée
await page.evaluate(() => {
  G.badges = ['brock', 'misty', 'surge', 'erika'];
  G.location = 'diglettscave'; if (typeof unlockLocation === 'function') try { unlockLocation('diglettscave'); } catch (_) {}
  ensureWallet().diamonds = 2500;
  updateFeatureWindows(); renderMineWindow();
});
await page.waitForTimeout(400);
await page.evaluate(() => { const chip = document.querySelector('#win-mine [data-tool="hammer"]'); if (chip) chip.click(); });
await page.waitForTimeout(200);
const tile = await page.$('#win-mine .mine-tile:nth-child(12), #win-mine .mine-grid > *:nth-child(12)');
if (tile) await tile.hover();
await page.waitForTimeout(300);
const mine = await page.evaluate(() => {
  const w = document.getElementById('win-mine');
  const pressed = w.querySelector('#win-mine [aria-pressed="true"], #win-mine .is-on, #win-mine .is-active');
  const cs = pressed ? getComputedStyle(pressed) : null;
  const aim = w.querySelector('.is-aim');
  const acs = aim ? getComputedStyle(aim) : null;
  const auto = w.querySelector('[data-call="buyMineAutomation"], [data-call="toggleMineAutomation"]');
  return {
    text: w.innerText.replace(/\s+/g, ' ').slice(0, 260),
    hasEmoji: /[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u.test(w.innerText),
    pressedShadow: cs && cs.boxShadow, pressedOutline: cs && cs.outlineStyle, pressedBg: cs && cs.backgroundColor,
    aimOutline: acs && (acs.outlineColor + ' / ' + acs.boxShadow).slice(0, 120),
    autoBtn: auto ? auto.textContent.trim() : null,
  };
});
console.log('mine', JSON.stringify(mine));
await shotEl('#win-mine', 'docs/captures/v7-r3c-mine-panel.png');

// 3. Guide → Stats, IV & EV
await page.evaluate(() => { openGuideSection('stats'); });
await page.waitForTimeout(700);
await shotEl('#fullscreen-panel-overlay, #fullscreen-overlay, #fs-panel-content', 'docs/captures/v7-r3c-guide-stats.png');
const guideTxt = await page.evaluate(() => (document.querySelector('#fullscreen-panel-overlay') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 400));
console.log('guide stats', guideTxt);
await page.evaluate(() => { openGuideSection('automation'); });
await page.waitForTimeout(500);
await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('#fullscreen-panel-overlay h3, #fullscreen-panel-overlay h4'));
  const el = all.find((h) => /Où acheter|acheter/i.test(h.textContent || ''));
  if (el) el.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(300);
await shotEl('#fullscreen-panel-overlay, #fullscreen-overlay, #fs-panel-content', 'docs/captures/v7-r3c-guide-automation-buy.png');
await page.evaluate(() => { if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel(); });

// 4. Pension : carte verrouillée avec prix + bouton Acheter
await page.evaluate(() => { G.badges = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni']; updateFeatureWindows(); if (typeof openHatcheryManagementMenu === 'function') openHatcheryManagementMenu('automation'); else if (typeof openMineManagementMenu === 'function') openMineManagementMenu('automation'); });
await page.waitForTimeout(500);
const lockedCards = await page.evaluate(() => Array.from(document.querySelectorAll('.automation-locked-card')).map((c) => c.innerText.replace(/\s+/g, ' ').slice(0, 120)));
console.log('locked cards', JSON.stringify(lockedCards));
await shotEl('.pw-mgmt-modal, .management-modal, #management-modal, .pw-modal-box', 'docs/captures/v7-r3c-automation-buy-card.png');

// 5. Filtre : nouveau chromatique d'une espèce déjà capturée en normal → ball lancée
const filt = await page.evaluate(() => {
  const b = ensurePokeballs();
  b.ultraball = 5; b.pokeball = 10;
  const ns = b.filters.find((f) => f.id === 'new_shiny'); ns.ball = 'ultraball'; ns.enabled = true;
  const c = b.filters.find((f) => f.id === 'caught'); c.ball = 'pokeball'; c.enabled = true;
  G.collection = G.collection || {};
  const sp = Object.values(G.collection).concat(G.team)[0];
  const id = sp ? Number(sp.id) : 1;
  const ball = ballForEnemy({ id, shiny: true, isShiny: true, encounter: 'route' });
  const ballNormal = ballForEnemy({ id, shiny: false, encounter: 'route' });
  return { id, order: b.filters.map((f) => f.id), shinyBall: ball, normalBall: ballNormal };
});
console.log('filters', JSON.stringify(filt));
console.log('errors', errors);
await browser.close();
