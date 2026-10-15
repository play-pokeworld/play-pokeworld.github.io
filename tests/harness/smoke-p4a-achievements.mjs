import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });

await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal.open, #starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) btn.click();
});
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });

// Verify shortcut button exists
const hasShortcut = await page.evaluate(() => {
  const btn = document.querySelector('#shortcuts-window-body [data-panel="achievements"]');
  return !!btn;
});
assert.ok(hasShortcut, 'Achievements shortcut button is present in shortcuts window');

// Open achievements panel
await page.evaluate(() => {
  if (typeof window.openFullscreenPanel === 'function') window.openFullscreenPanel('achievements');
});
await page.waitForTimeout(400);

const panelState = await page.evaluate(() => {
  const modal = document.getElementById('fullscreen-panel-modal');
  const summaryVal = document.querySelector('.pw-ach-summary-value')?.textContent;
  const cardsCount = document.querySelectorAll('.pw-ach-card').length;
  const filtersCount = document.querySelectorAll('.pw-ach-filter-bar button').length;
  return {
    modalVisible: modal && modal.style.display === 'flex',
    summaryVal,
    cardsCount,
    filtersCount,
  };
});
console.log('Achievements panel state in Chromium:', panelState);
assert.ok(panelState.modalVisible, 'Modal is visible');
assert.ok(panelState.cardsCount > 50, 'Achievements cards rendered');
assert.equal(panelState.filtersCount, 16, '16 filter buttons (All + 15 families)');

// Click a family filter (Combat)
await page.click('.pw-ach-filter-bar button:nth-child(4)'); // Family Combat
await page.waitForTimeout(300);

const combatCardsCount = await page.evaluate(() => {
  return document.querySelectorAll('.pw-ach-card').length;
});
console.log('Combat filtered cards count:', combatCardsCount);
assert.ok(combatCardsCount >= 20, 'Combat family cards rendered');

// Close panel
await page.evaluate(() => {
  if (typeof window.closeFullscreenPanel === 'function') window.closeFullscreenPanel();
});
await page.waitForTimeout(200);

const closedState = await page.evaluate(() => {
  const modal = document.getElementById('fullscreen-panel-modal');
  return modal && modal.style.display;
});
assert.equal(closedState, 'none', 'Modal closed cleanly');

console.log('smoke-p4a-achievements: PASS — Achievements panel, shortcuts, filters and cards verified in browser!');
await browser.close();
