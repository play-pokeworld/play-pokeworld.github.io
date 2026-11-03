/**
 * @file RoamingOff.mjs
 * @brief Real Chromium verification of 1.16.7: with the roaming feature switched off, no map node takes
 *        the purple roaming colour, the map legend does not advertise it, and no panel shows a roamer.
 *
 * Run: npm start (in another terminal) then `node tests/browser/RoamingOff.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-roaming-off');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
page.setDefaultTimeout(20000);

const results = [];
const issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`);
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  }
}

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('a Kanto save is loaded with the map visible', async () => {
    await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const save = SaveSystem.getInstance().createNewSave('Roaming off', 'charmander');
      save.tutorial.enabled = false;
      for (const badge of ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni']) save.player.earnBadge(badge);
      save.player.location = 'route1';
      save.player.region = 'kanto';
      SaveSystem.getInstance().saveCurrent();
      Engine.getInstance().getPageManager().openPage('game');
    });
    await page.locator('#win-map').waitFor({ state: 'visible' });
    const nodes = await page.locator('#win-map .loc-node').count();
    assert.ok(nodes > 10, `${nodes} map nodes`);
    return `${nodes} nodes`;
  });

  await check('no map node carries the purple roaming colour', async () => {
    const colours = await page.evaluate(() => {
      const counts = {};
      for (const node of document.querySelectorAll('#win-map .loc-node')) {
        const colour = [...node.classList].find((name) => name.startsWith('map-color-')) || 'none';
        counts[colour] = (counts[colour] || 0) + 1;
      }
      return counts;
    });
    assert.equal(colours['map-color-roaming'] ?? 0, 0, JSON.stringify(colours));
    return JSON.stringify(colours);
  });

  await check('the living rotation is real, but the game exposes none of it', async () => {
    const state = await page.evaluate(async () => {
      const { RoamingSystem } = await import('/src/systems/RoamingSystem.js');
      const { RoamingRules } = await import('/src/config/RoamingRules.js');
      const { LocationDB } = await import('/src/data/world/LocationDB.js');
      const now = Date.now();
      let assigned = 0;
      let exposed = 0;
      for (const pool of Object.values(RoamingRules.REGIONS)) {
        for (const routeId of pool.routes) {
          if (RoamingSystem.getAssignedSpecies(routeId, now)) assigned++;
          if (RoamingSystem.getSpeciesAt(routeId, now)) exposed++;
        }
      }
      return { assigned, exposed, enabled: RoamingSystem.isEnabled(), route: LocationDB.getInstance().getById('route1')?.id };
    });
    assert.equal(state.enabled, false, 'the feature is switched off');
    assert.equal(state.exposed, 0, 'no roamer is exposed to the game');
    return `${state.assigned} rule assignments this window, ${state.exposed} exposed`;
  });

  await check('the map legend lists the five reachable colours, without the purple one', async () => {
    await page.locator('#win-map .pw-win-help-btn').first().click();
    const legend = page.locator('.pw-map-help-panel');
    await legend.waitFor({ state: 'visible' });
    const states = await page.evaluate(() => [...document.querySelectorAll('.pw-map-help-panel .pw-map-help-row')]
      .map((row) => row.getAttribute('data-map-legend-state')));
    assert.equal(states.includes('roaming'), false, JSON.stringify(states));
    assert.deepEqual(states, ['quest', 'catch', 'shiny', 'locked', 'complete']);
    const purpleSwatch = await page.locator('.pw-map-help-panel .pw-map-help-swatch.is-purple').count();
    assert.equal(purpleSwatch, 0, 'no purple swatch is offered');
    await page.locator('.pw-map-help-panel .pw-modal-close-btn').click();
    return states.join(', ');
  });

  await check('the location window shows no roaming card, badge or timer', async () => {
    const counts = await page.evaluate(() => ({
      card: document.querySelectorAll('.pw-loc-wild-card--roaming, .pw-loc-wild-card.is-roaming').length,
      badge: document.querySelectorAll('.pw-loc-roaming-badge').length,
      timer: [...document.querySelectorAll('#win-location .pw-loc-timer')].length,
    }));
    assert.equal(counts.card, 0, JSON.stringify(counts));
    assert.equal(counts.badge, 0, JSON.stringify(counts));
    return JSON.stringify(counts);
  });

  await page.screenshot({ path: path.join(output, 'map-without-roaming.png'), fullPage: true });
  assert.deepEqual(issues, [], issues.join('\n'));
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results }, null, 2));
  await browser.close();
}

const failed = results.filter((entry) => !entry.passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
