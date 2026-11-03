/**
 * @file ItemSpriteSize.mjs
 * @brief Real Chromium verification of 1.16.8: item sprites of the battle summary and of the AFK
 *        report render exactly like the ones of the location window (72 px round frame).
 *
 * The bug was measurable, so it is measured: the item art files span 24 px to 371 px of intrinsic
 * size, and the two summaries used to paint the file size as-is. Every assertion below compares the
 * rendered box of the loot media with the box actually used by the location drops in the same page,
 * so a future style change cannot silently desynchronise the two windows again.
 *
 * Run: npm start (in another terminal) then `node tests/browser/ItemSpriteSize.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-item-size');
await fs.mkdir(output, { recursive: true });

/** Items whose art is tiny, huge and vector: the whole point of the regression. */
const ITEMS = [
  { itemId: 'rarecandy', quantity: 2 },
  { itemId: 'masterball', quantity: 1 },
  { itemId: 'nugget', quantity: 12 },
  { itemId: 'pokeball', quantity: 5 }
];

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
page.setDefaultTimeout(15000);

const issues = [];
const results = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`);
});

await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of ['TrainingSystem', 'HatcherySystem', 'MineSystem', 'RelaunchSystem', 'DungeonAutoSystem']) {
      import(`/src/systems/${name}.js`).then((m) => m[name].getInstance().setEnabled(false));
    }
  })
);

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
    return detail;
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure.html'), await page.content()).catch(() => {});
    throw error;
  }
}

/** Rendered boxes of the item media of a selector, sprite frames and images separated. */
const measure = (selector) =>
  page.evaluate((sel) => {
    // Layout box, not the painted rect: the windows animate with a transform on open, and the
    // question here is the CSS size the sprite is laid out at.
    const size = (el) => ({ w: el.offsetWidth, h: el.offsetHeight });
    const roots = [...document.querySelectorAll(sel)];
    const inside = roots.flatMap((root) => [...root.querySelectorAll('.pw-item-sprite, img')]);
    const frames = inside.filter((el) => el.classList.contains('pw-item-sprite'));
    const images = inside.filter((el) => el.tagName === 'IMG');
    return {
      count: roots.length,
      frames: frames.map((el) => ({ ...size(el), className: String(el.className) })),
      images: images.map((el) => ({
        ...size(el),
        natural: `${el.naturalWidth}x${el.naturalHeight}`,
        className: String(el.className)
      })),
      bareImages: [...document.querySelectorAll(sel)].flatMap((root) =>
        [...root.querySelectorAll('img')].filter((img) => !img.closest('.pw-item-sprite')).map((img) => String(img.className))
      )
    };
  }, selector);

const box = ({ w, h }) => `${w}x${h}`;
/** Reference measurement of the location drops, kept for the parity check below. */
let locationMeasurement = null;
const distinct = (entries) => [...new Set(entries.map(box))];

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('a save stands on a route that drops items', async () => {
    const drops = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('Item size', 'charmander');
      save.tutorial.enabled = false;
      for (const badge of ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni']) save.player.earnBadge(badge);
      save.player.location = 'route1';
      for (const { itemId, quantity } of [{ itemId: 'rarecandy', quantity: 2 }, { itemId: 'masterball', quantity: 1 }, { itemId: 'nugget', quantity: 12 }, { itemId: 'pokeball', quantity: 5 }]) {
        save.inventory.add(itemId, quantity, { deferSave: true });
      }
      Engine.getInstance().getPageManager().openPage('game');
      return true;
    });
    assert.ok(drops, 'the game page is open');
    await page.waitForSelector('#win-tabs .pw-loc-drop-grid .pw-item-sprite', { state: 'visible' });
    return 'save ready on route1';
  });

  const reference = await check('the location window is the reference: 72 px round frames', async () => {
    const found = await measure('#win-tabs .pw-loc-drop-grid');
    locationMeasurement = found;
    assert.ok(found.frames.length >= 2, 'the route displays its drops');
    assert.equal(found.bareImages.length, 0, 'the location never paints a bare <img> as an item');
    const sizes = distinct(found.frames);
    assert.deepEqual(sizes, ['72x72'], `location drops must all be 72x72, got ${sizes.join(',')}`);
    assert.deepEqual(distinct(found.images), ['72x72'], 'the clipped art fills its frame');
    await page.screenshot({ path: path.join(output, '01-location-reference.png') });
    return `${found.frames.length} drops at 72x72`;
  });

  await check('the battle summary loot uses exactly the reference frame', async () => {
    // A real wild battle opens a real run; its loot is then seeded with the reported items.
    const started = await page.evaluate(async (items) => {
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const battle = BattleSystem.getInstance();
      if (!battle.startBattle('route1', { chain: false })) return false;
      const run = battle._activeRun;
      run.items = items.map((entry) => ({ ...entry }));
      return true;
    }, ITEMS);
    assert.ok(started, 'the genuine wild battle started');

    // Open the shipped window through the very event its loot button dispatches.
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BATTLE_SUMMARY));
    });
    await page.waitForSelector('.pw-battle-summary-modal .loot-item-entry .pw-item-sprite', { state: 'visible' });

    // Let the window finish its opening transition, then measure.
    await page.waitForTimeout(400);
    const found = await measure('.pw-battle-summary-modal');
    assert.equal(found.count, 1, 'one summary window');
    assert.equal(found.frames.length, ITEMS.length, 'every looted item is displayed');
    assert.equal(found.bareImages.length, 0, 'no unstyled <img> is left in the summary');
    const sizes = distinct(found.frames);
    assert.deepEqual(sizes, ['72x72'], `battle summary items must be 72x72, got ${sizes.join(',')}`);
    assert.deepEqual(distinct(found.images), ['72x72'], 'the art is clipped to its frame');
    // The regression was intrinsic-size rendering: assert the files really differ in size.
    const natural = [...new Set(found.images.map((entry) => entry.natural))];
    assert.ok(natural.some((dim) => Number(dim.split('x')[0]) >= 200), `the sample must contain a huge art file, got ${natural.join(',')}`);
    await page.screenshot({ path: path.join(output, '02-battle-summary.png') });
    return `${found.frames.length} items at 72x72 (native ${natural.join(' / ')})`;
  });

  await check('the AFK report loot uses the very same frame', async () => {
    // Exactly what FastForwardSystem dispatches when the return recap is ready.
    await page.evaluate(async (items) => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.AFK_SUMMARY, {
        summary: {
          wins: 12, fainted: 1, captures: 0, captureList: [], items,
          money: 900, energy: 6, training: 0, mineDigs: 0,
          durationMs: 3600000, debug: false
        }
      }));
    }, ITEMS);
    await page.waitForSelector('.pw-afk-modal-window .loot-item-entry .pw-item-sprite', { state: 'visible' });

    await page.waitForTimeout(400);
    const found = await measure('.pw-afk-modal-window');
    assert.equal(found.frames.length, ITEMS.length, 'every recapped item is displayed');
    assert.equal(found.bareImages.length, 0, 'no unstyled <img> is left in the AFK report');
    const sizes = distinct(found.frames);
    assert.deepEqual(sizes, ['72x72'], `AFK items must be 72x72, got ${sizes.join(',')}`);
    assert.deepEqual(distinct(found.images), ['72x72'], 'the art is clipped to its frame');
    await page.screenshot({ path: path.join(output, '03-afk-report.png') });
    return `${found.frames.length} items at 72x72`;
  });

  await check('both summaries agree pixel for pixel with the location window', async () => {
    const referenceSizes = distinct(locationMeasurement.frames);
    const summary = await measure('.pw-battle-summary-modal');
    const afk = await measure('.pw-afk-modal-window');
    const compared = {
      location: referenceSizes,
      battleSummary: distinct(summary.frames),
      afk: distinct(afk.frames)
    };
    assert.deepEqual(compared.battleSummary, compared.location, 'battle summary vs location');
    assert.deepEqual(compared.afk, compared.location, 'AFK report vs location');
    return JSON.stringify(compared);
  });

  await check('the compact windows kept their own, smaller sizing', async () => {
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(ModalIds.BATTLE_SUMMARY));
      EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(ModalIds.AFK_SUMMARY));
    });
    await page.waitForTimeout(250);

    const shortcut = page.locator('#win-shortcuts [data-panel="inventory"]');
    await shortcut.waitFor({ state: 'visible' });
    await shortcut.click();
    await page.waitForSelector('#fs-inventory .inv-icon-img', { state: 'visible' });
    const bag = await page.evaluate(() => {
      const sizes = new Set();
      document.querySelectorAll('#fs-inventory .inv-icon-img').forEach((el) => {
        sizes.add(`${el.offsetWidth}x${el.offsetHeight}`);
      });
      return [...sizes];
    });
    assert.ok(bag.length >= 1, 'the bag displays item icons');
    for (const size of bag) {
      const width = Number(size.split('x')[0]);
      assert.ok(width > 0 && width <= 48, `bag icons must stay compact, got ${size}`);
      assert.notEqual(size, '72x72', 'the bag was not resized by this fix');
    }
    await page.screenshot({ path: path.join(output, '04-bag-compact.png') });
    return `bag icons ${bag.join(', ')}`;
  });

  await check('in English, whose item names are longer, the frames stay 72 px and inside the window', async () => {
    await page.evaluate(async () => {
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('en');
    });
    await page.waitForTimeout(300);
    await page.evaluate(async (items) => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.AFK_SUMMARY, {
        summary: { wins: 4, fainted: 0, captures: 0, captureList: [], items, money: 10, energy: 1, durationMs: 60000, debug: false }
      }));
    }, ITEMS);
    await page.waitForSelector('.pw-afk-modal-window .loot-item-entry .pw-item-sprite', { state: 'visible' });
    await page.waitForTimeout(400);
    const fact = await page.evaluate(() => {
      const win = document.querySelector('.pw-afk-modal-window');
      const frames = [...win.querySelectorAll('.loot-item-entry .pw-item-sprite')];
      const wr = win.getBoundingClientRect();
      const overflowing = [...win.querySelectorAll('.loot-item-entry')]
        .filter((el) => el.getBoundingClientRect().right > wr.right + 1)
        .map((el) => String(el.className));
      return {
        sizes: [...new Set(frames.map((el) => `${el.offsetWidth}x${el.offsetHeight}`))],
        overflowing,
        horizontalOverflow: win.scrollWidth - win.clientWidth
      };
    });
    assert.deepEqual(fact.sizes, ['72x72'], `english labels must not resize the frame: ${fact.sizes.join(',')}`);
    assert.deepEqual(fact.overflowing, [], 'no loot card crosses the window edge');
    assert.ok(fact.horizontalOverflow <= 1, `the window does not scroll horizontally (${fact.horizontalOverflow}px)`);
    await page.screenshot({ path: path.join(output, '05-afk-english.png') });
    return 'english fits';
  });

  await check('no console error during the whole session', async () => {
    assert.deepEqual(issues, [], 'browser console is clean');
    return 'clean';
  });

  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, issues }, null, 2));
  console.log(`\n${results.length} checks passed`);
} finally {
  await browser.close();
}
