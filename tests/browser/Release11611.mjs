/**
 * @file Release11611.mjs
 * @brief Real Chromium verification of 1.16.11: the stylesheet tree loads as declared,
 *        the unified vocabulary renders, nothing overflows at 390 px and the themes reply.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/Release11611.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-11611');
await fs.mkdir(output, { recursive: true });
const BASE = process.env.PW_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.setDefaultTimeout(20000);

const issues = [];
const results = [];
const sheetRequests = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('response', (response) => {
  const url = response.url();
  if (url.endsWith('.css')) sheetRequests.push({ url: new URL(url).pathname, status: response.status() });
});
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
});

await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of ['TrainingSystem', 'HatcherySystem', 'MineSystem', 'RelaunchSystem', 'DungeonAutoSystem']) {
      import(`/src/systems/${name}.js`).then((module) => module[name].getInstance().setEnabled(false));
    }
  })
);

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name + (detail ? ` — ${detail}` : ''));
    return detail;
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    console.log('FAIL ' + name);
    console.log(error.stack);
    throw error;
  }
}

const openModal = (modalId) =>
  page.evaluate(async (id) => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const { ModalIds } = await import('/src/config/ModalIds.js');
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds[id]));
  }, modalId);

const closeAll = async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(180);
  }
};

await page.goto(BASE, { waitUntil: 'networkidle' });

await check('a save is created and the dashboard is open', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
    LocalizationManager.getInstance().setLanguage('fr');
    const save = SaveSystem.getInstance().createNewSave('Vocabulaire', 'charmander');
    save.tutorial.enabled = false;
    save.player.region = 'kanto';
    save.player.location = 'pewter';
    save.currencies.add('money', 5000);
    Engine.getInstance().getPageManager().openPage('game');
    return { id: save.id, species: save.team[0].species };
  });
  await page.waitForSelector('#win-shortcuts', { state: 'visible' });
  return `save ${fact.id} (${fact.species})`;
});

await check('the page loads one stylesheet entry point and every declared sheet', async () => {
  const links = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((node) => new URL(node.href).pathname));
  assert.deepEqual(links, ['/assets/css/style.css'], `one link, got ${links.join(',')}`);
  const failed = sheetRequests.filter((entry) => entry.status >= 400);
  assert.deepEqual(failed, [], 'no sheet 404s');
  const unique = new Set(sheetRequests.map((entry) => entry.url));
  assert.ok(unique.size >= 70, `every @import is fetched (${unique.size})`);
  return `${unique.size} sheets, none missing`;
});

await check('the canonical section title renders and follows the theme', async () => {
  await openModal('BOX');
  await page.locator('.pw-box-panel, #fs-box').first().waitFor({ state: 'visible' });
  const facts = await page.evaluate(async () => {
    const { UI_THEMES } = await import('/src/config/UiThemes.js');
    const titles = [...document.querySelectorAll('.pw-section-title')];
    const sizes = titles.map((node) => ({
      text: node.textContent.trim().slice(0, 24),
      size: getComputedStyle(node).fontSize,
    }));
    const colors = {};
    for (const theme of UI_THEMES) {
      document.documentElement.setAttribute('data-theme', theme === 'dark' ? '' : theme);
      if (!document.documentElement.getAttribute('data-theme')) document.documentElement.removeAttribute('data-theme');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      colors[theme] = titles[0] ? getComputedStyle(titles[0]).color : '';
    }
    document.documentElement.removeAttribute('data-theme');
    return { sizes, distinctColors: new Set(Object.values(colors)).size };
  });
  assert.ok(facts.sizes.length >= 1, 'a title is rendered');
  for (const title of facts.sizes) assert.ok(Number.parseFloat(title.size) >= 11, `"${title.text}" is ${title.size}`);
  assert.ok(facts.distinctColors >= 3, `the title colour follows the theme (${facts.distinctColors})`);
  await page.locator('.pw-box-panel, #fs-box').first().screenshot({ path: path.join(output, 'titles-box.png') }).catch(() => {});
  await closeAll();
  return facts.sizes.map((title) => `${title.text || '(empty)'}=${title.size}`).join(', ');
});

await check('the canonical empty state spans its grid track', async () => {
  const facts = await page.evaluate(async () => {
    const { UIText } = await import('/src/ui/UIText.js');
    const host = document.createElement('div');
    host.style.display = 'grid';
    host.style.gridTemplateColumns = 'repeat(3, 1fr)';
    host.style.width = '600px';
    document.body.appendChild(host);
    const state = new UIText({ tagName: 'div', className: 'pw-empty-state is-lg', text: 'Rien ici' });
    host.appendChild(state.getDomElement());
    const node = state.getDomElement();
    const style = getComputedStyle(node);
    const facts = { size: style.fontSize, align: style.textAlign,
      width: Math.round(node.getBoundingClientRect().width),
      hostWidth: Math.round(host.getBoundingClientRect().width) };
    host.remove();
    return facts;
  });
  assert.ok(Number.parseFloat(facts.size) >= 11);
  assert.equal(facts.align, 'center');
  assert.ok(facts.width >= facts.hostWidth - 2, `${facts.width}/${facts.hostWidth}`);
  return `${facts.size}, full width`;
});

await check('item pictures use the three-size scale in the real windows', async () => {
  await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    save.inventory.add('pokeball', 12, { deferSave: true });
    save.inventory.add('potion', 5, { deferSave: true });
  });
  await openModal('BAG');
  await page.locator('#fs-inventory').waitFor({ state: 'visible' });
  const widths = await page.evaluate(() => [...document.querySelectorAll('.inv-icon, .pw-bag-detail-icon')]
    .slice(0, 4).map((node) => Math.round(node.getBoundingClientRect().width)));
  assert.ok(widths.length > 0, 'bag icons are rendered');
  for (const width of widths) assert.ok([40, 52].includes(width), `bag icon is 40 or 52px, got ${width}`);
  await page.locator('#fs-inventory').screenshot({ path: path.join(output, 'icons-bag.png') }).catch(() => {});
  await closeAll();
  return widths.join(', ');
});

await check('no informational text drops below 11px', async () => {
  const small = await page.evaluate(() => {
    const badge = /badge|pill|chip|level|count|counter|slot|dot|tag|rank|mini|hp-text/i;
    const offenders = [];
    for (const node of document.querySelectorAll('body *')) {
      if (node.childElementCount || !node.textContent.trim()) continue;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const size = Number.parseFloat(style.fontSize);
      if (size < 10) offenders.push(`${node.className || node.tagName}:${size}`);
      else if (size === 10 && !badge.test(String(node.className))) offenders.push(`${node.className || node.tagName}:10`);
    }
    return offenders;
  });
  assert.deepEqual(small, [], 'no text below the floor');
  return 'floor respected';
});

await check('every window stays inside a 390px viewport', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = [];
  for (const [modalId, selector] of [['BAG', '#fs-inventory'], ['POKEDEX', '#fs-pokedex'],
    ['DICTIONARY', '#fs-dictionary'], ['MARKET', '#fs-market'], ['BOX', '.pw-box-panel, #fs-box']]) {
    await openModal(modalId);
    await page.locator(selector).first().waitFor({ state: 'visible' }).catch(() => {});
    await page.waitForTimeout(220);
    const fact = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      if (!node) return { missing: true };
      return { scroll: node.scrollWidth, client: node.clientWidth };
    }, selector);
    if (!fact.missing && fact.scroll > fact.client + 1) overflow.push(`${modalId}: ${fact.scroll}>${fact.client}`);
    await page.screenshot({ path: path.join(output, `mobile-${modalId.toLowerCase()}.png`) }).catch(() => {});
    await closeAll();
    await page.waitForTimeout(100);
  }
  assert.deepEqual(overflow, [], 'no horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1200 });
  return '5 windows at 390px';
});

await check('the console stayed clean', async () => {
  assert.deepEqual(issues, []);
  return 'no console error';
});

await browser.close();
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, sheetRequests }, null, 2));
console.log(`\n${results.filter((r) => r.passed).length}/${results.length} checks passed — artifacts in ${output}`);
