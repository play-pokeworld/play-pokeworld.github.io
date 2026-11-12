/**
 * @file MapTravel.mjs
 * @brief Real Chromium check of 1.16.50: the map travels on a plain click, and a drag pans the
 *        camera without travelling.
 *
 *        Regression covered: the camera gestures took the pointer on `pointerdown`. A captured
 *        pointer retargets the following `click` to the map view itself, so the click handler no
 *        longer saw a `[data-node-id]` and the player could not move any more. Capture is now
 *        taken only once a real gesture (drag or pinch) has begun.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/MapTravel.mjs
 */

import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.PW_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(20000);

const issues = [];
const results = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true });
    console.log('PASS ' + name + (detail ? ` — ${detail}` : ''));
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.log('FAIL ' + name + ' — ' + error.message);
  }
}

const currentLocation = () => page.evaluate(async () => {
  const module = await import('/src/systems/LocationSystem.js');
  return module.LocationSystem.getInstance().getCurrentLocationId();
});

/** Centre of a map node, in viewport pixels. */
const nodeCentre = (id) => page.evaluate((nodeId) => {
  const node = document.querySelector(`#map-svg [data-node-id="${nodeId}"]`);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
}, id);

await page.goto(BASE);
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const input = document.getElementById('starter-name-input');
  if (input) { input.value = 'MapTest'; input.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(2000);
// The first-launch download prompt is a real modal: dismiss it the way a player does.
await page.evaluate(() => document.querySelector('.pw-download-prompt-backdrop .pw-modal-close-btn')?.click());
await page.waitForTimeout(600);

await check('the dashboard and its map are on screen', async () => {
  const ready = await page.evaluate(() => !!document.querySelector('#map-svg [data-node-id]'));
  assert.ok(ready, 'the map renders location nodes');
  return 'nodes rendered';
});

await check('a plain click on an adjacent location travels there', async () => {
  const start = await currentLocation();
  const target = await page.evaluate(() => {
    const node = document.querySelector('#map-svg .loc-node.adjacent[data-node-id]');
    return node ? node.getAttribute('data-node-id') : null;
  });
  assert.ok(target, 'an adjacent location is offered');
  const centre = await nodeCentre(target);
  assert.ok(centre, 'the node has a box on screen');
  await page.mouse.click(centre.x, centre.y);
  await page.waitForTimeout(1200);
  const arrived = await currentLocation();
  assert.equal(arrived, target, `the player moved from ${start} to ${target}`);
  return `${start} → ${arrived}`;
});

await check('a drag pans the camera and never travels', async () => {
  const before = await currentLocation();
  const origin = await nodeCentre(before);
  // Zoom in first: panning only exists above the minimum zoom.
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(300);
  const viewBoxBefore = await page.evaluate(() => document.getElementById('map-svg').getAttribute('viewBox'));
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) await page.mouse.move(origin.x - step * 14, origin.y - step * 6);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const viewBoxAfter = await page.evaluate(() => document.getElementById('map-svg').getAttribute('viewBox'));
  const after = await currentLocation();
  assert.notEqual(viewBoxAfter, viewBoxBefore, 'the viewBox followed the drag');
  assert.equal(after, before, 'a drag does not travel');
  return `${viewBoxBefore} → ${viewBoxAfter}`;
});

await check('no page error and no failed request during the run', async () => {
  assert.deepEqual(issues, []);
  return 'clean console';
});

await browser.close();
const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
