import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('[console] ' + m.text().slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
const r1 = await page.evaluate(async () => {
  G.badges = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
  updateFeatureWindows && updateFeatureWindows();
  const win = document.getElementById('win-training');
  const out = { trainingUnlocked: typeof trainingUnlocked === 'function' ? trainingUnlocked() : null, winDisplay: win && getComputedStyle(win).display, winHtmlLen: win && win.innerHTML.length };
  try { renderTrainingWindow(); } catch (e) { out.renderErr = String(e); }
  out.winHtmlAfter = win && win.innerHTML.length;
  out.bodyText = win && win.innerText.slice(0, 600);
  return out;
});
console.log(JSON.stringify(r1, null, 1));
await page.screenshot({ path: 'tests/_dbg/shots/training-1.png' });
// try to assign the team pokemon to slot 0 and start
const r2 = await page.evaluate(async () => {
  const out = {};
  try {
    ensureTrainingSlots();
    const p = G.team[0];
    out.poke = { id: p.id, name: p.name, level: p.level, uid: p.uid, keys: Object.keys(p).slice(0, 30) };
    out.slotsBefore = JSON.stringify(G.trainingSlots).slice(0, 300);
    const res = setTrainingSlotPokemon(0, 'team', String(p.uid != null ? p.uid : 0), p);
    out.setRes = res;
    out.slotsAfter = JSON.stringify(G.trainingSlots).slice(0, 300);
    out.trainee = getTraineePoke(0) ? getTraineePoke(0).name : null;
    out.avail = trainingModeAvailability(getTraineePoke(0));
    out.unlockedLevel = isTrainingModeUnlocked('level');
    const r = startTrainingBattle('level', 0);
    out.startRes = r;
    out.slotAfterStart = JSON.stringify({ active: G.trainingSlots[0].active, mode: G.trainingSlots[0].mode, enemy: G.trainingSlots[0].battle && G.trainingSlots[0].battle.enemy && G.trainingSlots[0].battle.enemy.name });
  } catch (e) { out.err = String(e && e.stack || e); }
  return out;
});
console.log(JSON.stringify(r2, null, 1));
await page.waitForTimeout(6000);
const r3 = await page.evaluate(() => {
  const s = G.trainingSlots[0];
  const win = document.getElementById('win-training');
  return { active: s.active, lastResult: s.lastResult, battle: s.battle && { enemyIndex: s.battle.enemyIndex, enemyHP: s.battle.enemy && s.battle.enemy.currentHP, pHP: getTraineePoke(0) && getTraineePoke(0).currentHP, logs: (s.battle.logs || []).slice(-4) }, panel: !!document.getElementById('training-battle-live-panel'), live: document.getElementById('battle-active-scene').classList.contains('is-live'), sceneDisp: getComputedStyle(document.getElementById('battle-active-scene')).display, idleDisp: getComputedStyle(document.getElementById('battle-idle-screen')).display, winText: win && win.innerText.slice(0, 500), ticker: typeof _trainingSlotTicker };
});
console.log(JSON.stringify(r3, null, 1));
await page.screenshot({ path: 'tests/_dbg/shots/training-2.png' });
console.log('errors', errors.slice(0, 10));
await browser.close();
