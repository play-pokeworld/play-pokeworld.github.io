/**
 * @file DebugAndBoxItemUse.mjs
 * @brief Playwright browser tests for PC Box item usage flow and Debug Widget parity.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-debug-box');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
page.setDefaultTimeout(12000);

const results = [];
const issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type()))
    issues.push(`${m.type()}: ${m.text()}`);
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url()}`);
});

await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of [
      'BattleSystem',
      'TrainingSystem',
      'HatcherySystem',
      'MineSystem',
      'SaveSystem',
      'RelaunchSystem',
      'DungeonAutoSystem',
    ]) {
      import(`/src/systems/${name}.js`).then((m) =>
        m[name].getInstance().setEnabled(false),
      );
    }
  }),
);

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page
      .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
      .catch(() => {});
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    throw error;
  }
}

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });

  await check('Seed save with Pokémon and activate debug mode', async () => {
    await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { PreferencesSystem } = await import(
        '/src/systems/PreferencesSystem.js'
      );
      const { LocalizationManager } = await import(
        '/src/localization/LocalizationManager.js'
      );
      const { PokemonFactory } = await import(
        '/src/data/pokemon/PokemonFactory.js'
      );
      const { BoxSystem } = await import('/src/systems/BoxSystem.js');

      LocalizationManager.getInstance().setLanguage('fr');
      PreferencesSystem.getInstance().setDebugMode(true);

      const saves = SaveSystem.getInstance();
      const save = saves.createNewSave('Debug & Box Item Parity', 'bulbasaur');
      save.tutorial.enabled = false;
      save.player.location = 'route101';

      // Add party members
      const pikachu = PokemonFactory.create('pikachu', 20);
      BoxSystem.getInstance().addPokemon(pikachu, { deferSave: true });

      const eevee = PokemonFactory.create('eevee', 25);
      BoxSystem.getInstance().addPokemon(eevee, { deferSave: true });

      save.teamMembers.setUids([pikachu.uid, eevee.uid]);

      // Add rare candies and hp up
      save.inventory.add('rarecandy', 3, { deferSave: true });
      save.inventory.add('hp_up', 2, { deferSave: true });
      saves.saveCurrent();

      const { Engine } = await import('/src/core/Engine.js');
      Engine.getInstance().getPageManager().openPage('game');
    });

    await page.waitForSelector('#win-shortcuts', { state: 'visible' });
    await page.waitForTimeout(400);
  });

  await check('Verify debug widget is rendered and toggleable', async () => {
    const widget = page.locator('#debug-widget');
    await widget.waitFor({ state: 'visible', timeout: 5000 });
    assert.ok(await widget.isVisible());

    const toggleBtn = page.locator('#debug-widget-toggle');
    assert.ok(await toggleBtn.isVisible());

    // Drawer should initially not be open
    const drawer = page.locator('#debug-drawer');
    assert.ok(!(await drawer.evaluate((el) => el.classList.contains('open'))));

    // Click toggle button
    await toggleBtn.click();
    await page.waitForTimeout(200);
    assert.ok(await drawer.evaluate((el) => el.classList.contains('open')));

    // Take screenshot of debug drawer
    await page.screenshot({
      path: path.join(output, '01-debug-drawer-expanded.png'),
    });
  });

  await check('Verify all 13 debug buttons exist and are functional', async () => {
    const expectedButtons = [
      '#debug-btn-money',
      '#debug-btn-candies',
      '#debug-btn-badges',
      '#debug-btn-base-grant',
      '#debug-btn-base-npc',
      '#debug-btn-mine',
      '#debug-btn-ctcs',
      '#debug-btn-afk',
      '#debug-btn-all-items',
      '#debug-btn-speed-x10',
      '#debug-btn-daytime',
      '#debug-btn-dedup',
      '#debug-btn-all-items-shown',
    ];

    for (const btnId of expectedButtons) {
      const btn = page.locator(btnId);
      assert.ok(await btn.isVisible(), `Button ${btnId} should be visible`);
    }

    // Click candies button to add +10 candies
    const candiesBefore = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      return SaveSystem.getInstance().getCurrentSave().inventory.count('rarecandy');
    });

    await page.locator('#debug-btn-candies').click();
    await page.waitForTimeout(200);

    const candiesAfter = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      return SaveSystem.getInstance().getCurrentSave().inventory.count('rarecandy');
    });

    assert.equal(candiesAfter, candiesBefore + 10);

    // Close debug drawer so it does not overlap fullscreen panels
    await page.locator('#debug-drawer-close-btn').click();
    await page.waitForTimeout(200);
    const drawer = page.locator('#debug-drawer');
    assert.ok(!(await drawer.evaluate((el) => el.classList.contains('open'))));
  });

  await check('Open Bag and click Rare Candy "Utiliser"', async () => {
    // Open Bag fullscreen modal
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import(
        '/src/core/events/ModalOpenRequestedEvent.js'
      );
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BAG));
    });

    const bagPanel = page.locator('#fs-inventory');
    await bagPanel.waitFor({ state: 'visible', timeout: 5000 });
    assert.ok(await bagPanel.isVisible());

    // Adjust rare candies to exactly 2 for testing continuous use and depletion
    await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      const current = save.inventory.count('rarecandy');
      if (current > 2) save.inventory.remove('rarecandy', current - 2);
      else if (current < 2) save.inventory.add('rarecandy', 2 - current);
    });

    // Search for "bonbon" or switch to special category
    const searchInput = bagPanel.locator('.inv-toolbar input');
    await searchInput.fill('bonbon');
    await page.waitForTimeout(200);

    // Find Rare Candy row and click it
    const candyRow = bagPanel.locator('.inv-item[data-item-id="rarecandy"]');
    await candyRow.waitFor({ state: 'visible', timeout: 5000 });
    await candyRow.click();
    await page.waitForTimeout(400);

    // Box fullscreen panel should now be visible in item use mode
    const boxPanel = page.locator('#fs-box');
    await boxPanel.waitFor({ state: 'visible', timeout: 5000 });
    assert.ok(await boxPanel.isVisible());

    // Instruction should be visible
    const instruction = page.locator('.pw-box-instruction');
    await instruction.waitFor({ state: 'visible', timeout: 5000 });
    assert.ok(await instruction.isVisible());

    // Take screenshot of Box in item use mode
    await page.screenshot({
      path: path.join(output, '02-box-item-use-mode.png'),
    });
  });

  await check('Use Rare Candy consecutively without Box closing', async () => {
    // Click on Pikachu tile
    const pikachuTile = page.locator('#fs-box .pw-box-pokemon-tile', { has: page.locator('img[alt="Pikachu"]') });
    await pikachuTile.waitFor({ state: 'visible', timeout: 5000 });

    const lvlBefore = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      return save.team[0].level;
    });

    // Click 1st time
    await pikachuTile.click();
    await page.waitForTimeout(300);

    const lvlAfter1 = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      return save.team[0].level;
    });
    const countAfter1 = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      return save.inventory.count('rarecandy');
    });

    assert.equal(lvlAfter1, lvlBefore + 1, 'Pikachu level should have incremented by 1');
    assert.equal(countAfter1, 1, 'Rare candy count should be 1');

    // Box panel must STILL be visible!
    const boxPanel = page.locator('#fs-box');
    assert.ok(await boxPanel.isVisible(), 'BoxPanel must remain open after item use!');

    // Take screenshot after first continuous use
    await page.screenshot({
      path: path.join(output, '03-box-item-continuous-use.png'),
    });

    // Click 2nd time on Pikachu tile (consuming the last candy)
    await pikachuTile.click();
    await page.waitForTimeout(500);

    const lvlAfter2 = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      return save.team[0].level;
    });
    const countAfter2 = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      return save.inventory.count('rarecandy');
    });

    assert.equal(lvlAfter2, lvlBefore + 2, 'Pikachu level should have incremented by 2');
    assert.equal(countAfter2, 0, 'Rare candy count should be 0');

    // Since quantity reached 0, BoxPanel should have closed and BagPanel returned!
    const bagPanel = page.locator('#fs-inventory');
    await bagPanel.waitFor({ state: 'visible', timeout: 5000 });
    assert.ok(await bagPanel.isVisible(), 'BagPanel should be reopened when items are depleted');

    // Take screenshot of return to Bag
    await page.screenshot({
      path: path.join(output, '04-returned-to-bag.png'),
    });
  });

  await check('Verify clean console and no network errors', async () => {
    const severe = issues.filter(
      (i) =>
        !i.includes('favicon') &&
        !i.includes('ServiceWorker') &&
        !i.includes('PW_BROWSER_OUTPUT'),
    );
    assert.deepEqual(severe, [], `Issues detected:\n${severe.join('\n')}`);
  });

  console.log('\nAll browser tests PASSED successfully!');
} finally {
  await browser.close();
}
