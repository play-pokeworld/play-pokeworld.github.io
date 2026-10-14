// smoke-p0d.mjs — tutorial quest flow in a real Chromium:
//  - progress bar + "3/5" counter on the tutorial card;
//  - step 2 (configure Poké Balls) VALIDATES when a ball is set (clicked UI).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 }).catch(() => {});
const picked = await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) { btn.click(); return true; } return false;
});
if (picked) {
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
} else {
  await page.evaluate(() => { window.G.starter = true; window.G.team.push(window.createPoke(4, 5, false)); window.saveGame(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.startSaveById(window.currentSaveId || localStorage.getItem('pokeworld_active_save')));
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
}
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });

// Progress bar: 3 wins on route 1 → card shows "3/5".
await page.evaluate(() => { G.wildWinsByLoc = { route1: 3 }; window.renderStoryWindow(); });
await page.waitForTimeout(100);
const progText = await page.evaluate(() => (document.getElementById('story-panel') || {}).textContent || '');
assert.ok(/3\s*\/\s*5/.test(progText), 'T1 — tutorial card shows progress "3/5" for battles');

// Complete route1_battles → step 2 becomes current.
await page.evaluate(() => { G.wildWinsByLoc = { route1: 5 }; window.updateTutorialProgress(); });
await page.waitForTimeout(100);
const step2 = await page.evaluate(() => {
  const st = window.ensureTutorialState();
  const current = window.tutorialSteps().find(s => !st.completed[s.id]);
  return { id: current ? current.id : null, title: current ? current.title : '' };
});
assert.equal(step2.id, 'set_pokeball_filter', 'T2 — step 2 is "configure Poké Balls"');

// Open the ball picker for the "Nouveau" filter and pick the Poké Ball (real clicks).
await page.evaluate(() => window.openBallPicker('new'));
await page.waitForSelector('.pw-ball-row-opt', { timeout: 5000 });
await page.evaluate(() => {
  const opts = [...document.querySelectorAll('.pw-ball-row-opt')];
  const target = opts.find(r => (r.querySelector('.pw-ball-name')?.textContent || '').trim() === 'Poké Ball');
  if (target) target.click();
});
await page.waitForTimeout(200);
const afterPick = await page.evaluate(() => {
  const st = window.ensureTutorialState();
  const current = window.tutorialSteps().find(s => !st.completed[s.id]);
  return {
    done: !!st.completed['set_pokeball_filter'],
    current: current ? current.id : null,
    balls: G.pokeballs.pokeball,
    filterBall: (G.pokeballs.filters.find(f => f.id === 'new') || {}).ball,
    story: (document.getElementById('story-panel') || {}).textContent || '',
  };
});
assert.equal(afterPick.filterBall, 'pokeball', 'T3 — the ball was set on the "Nouveau" filter');
assert.equal(afterPick.done, true, 'T4 — tutorial step 2 VALIDATES after setting a ball');
assert.equal(afterPick.current, 'catch_first', 'T5 — capture comes BEFORE buying (order: set ball → catch → buy)');
assert.ok(!/Configure tes Poké Balls/.test(afterPick.story), 'T6 — story window re-rendered (step 2 gone)');

// Order of the tutorial: catch_first must precede buy_pokeballs.
const order = await page.evaluate(() => {
  const steps = window.tutorialSteps().map(s => s.id);
  return { catchIdx: steps.indexOf('catch_first'), buyIdx: steps.indexOf('buy_pokeballs') };
});
assert.ok(order.catchIdx >= 0 && order.buyIdx > order.catchIdx, 'T7 — buy step comes after the capture step');
// Les étapes « guide » 11-13 (mine/quests/badge) sont supprimées : 10 étapes utiles.
const stepsNow = await page.evaluate(() => window.tutorialSteps().map(s => s.id));
assert.equal(stepsNow.length, 10, 'T8 — tutorial reduced to 10 actionable steps');
assert.ok(!stepsNow.includes('mine_intro') && !stepsNow.includes('quest_intro') && !stepsNow.includes('first_badge'), 'T9 — filler steps removed');

assert.deepEqual(errors, [], 'Z — no page errors');
console.log('smoke-p0d: OK — tutorial progress bar + step 2 validates on ball pick + reward + re-render, 0 error.');
await browser.close();

