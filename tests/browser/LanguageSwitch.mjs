/**
 * @file LanguageSwitch.mjs
 * @brief Real Chromium verification of the live localization (v1.17.0): a window already on screen
 *        follows the language chosen in Settings → Language, without being closed and reopened.
 *
 * Run: npm start (in another terminal) then `node tests/browser/LanguageSwitch.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-language');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
page.setDefaultTimeout(15000);

const results = [];
const issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`);
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url()}`);
});

// The simulated time systems would move the save under our feet (never disable BattleSystem: a
// disabled battle system does not re-render its panel when it is enabled back).
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
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure.html'), await page.content()).catch(() => {});
    throw error;
  }
}

/** A text that is a raw key (`item.foo.name`, `puzzles.generic.return`) instead of a translation. */
const RAW_KEY = /\b[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,3}\b/;

const bodyText = () => page.evaluate(() => document.body.innerText);
const panelText = (selector) => page.locator(selector).innerText();

async function openSettings() {
  await page.evaluate(async () => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const { ModalIds } = await import('/src/config/ModalIds.js');
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS));
  });
  await page.locator('#settings-window').waitFor({ state: 'visible' });
}

/** Clicks the real language button of the Settings window (the path a player uses). */
async function switchLanguage(lang) {
  const button = page.locator(`#settings-window .lang-btn[data-lang="${lang}"]`);
  await button.waitFor({ state: 'visible' });
  await button.click();
  await page.waitForTimeout(150);
}

async function closeModal(id) {
  await page.evaluate(async (modalId) => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js');
    EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(modalId));
  }, id);
  await page.waitForTimeout(150);
}

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('a save is created in French', async () => {
    await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('Language Save', 'charmander');
      save.tutorial.enabled = false;
      save.player.location = 'route1';
      save.inventory.add('rarecandy', 3, { deferSave: true });
      save.inventory.add('pokeball', 5, { deferSave: true });
      Engine.getInstance().getPageManager().openPage('game');
    });
    await page.locator('#win-shortcuts').waitFor({ state: 'visible' });
    assert.ok((await bodyText()).includes('Équipe'), 'the dashboard is in French');
    return 'fr';
  });

  await check('the Settings window switches the whole game to English in place', async () => {
    await openSettings();
    const before = await panelText('#settings-window');
    assert.ok(before.includes('Thème'), 'the Settings window starts in French');
    await switchLanguage('en');
    const after = await panelText('#settings-window');
    assert.notEqual(after, before, 'the open Settings window re-rendered its texts');
    assert.ok(after.includes('Theme') && !after.includes('Thème'), 'the section titles are English');
    assert.equal(after.split('\n').length, before.split('\n').length, 'the layout kept the same rows');
    const dashboard = await bodyText();
    assert.ok(dashboard.includes('Party') && !dashboard.includes('Équipe'), 'the dashboard behind it is English too');
    assert.ok(await page.locator('#settings-window').isVisible(), 'the window was never closed');
    await page.screenshot({ path: path.join(output, 'settings-en.png') });
    await closeModal('settings-window');
    return 'in place';
  });

  await check('a battle in progress follows the switch', async () => {
    const started = await page.evaluate(async () => {
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      return Boolean(BattleSystem.getInstance().startBattle('route1'));
    });
    assert.ok(started, 'the battle starts');
    await page.waitForFunction(() => /Live Battle/.test(document.body.innerText), null, { timeout: 15000 });
    const before = await bodyText();

    await openSettings();
    await switchLanguage('fr');
    await closeModal('settings-window');
    const after = await bodyText();
    assert.notEqual(after, before, 'the running battle followed the switch');
    assert.ok(/Combat en direct/.test(after), 'the running battle is French again');
    assert.ok(!/Live Battle/.test(after), 'no English leftover in the battle');
    assert.ok(!RAW_KEY.test(after.replace(/[×x]\s?\d+/g, '')), 'the battle shows no raw key');
    await page.screenshot({ path: path.join(output, 'battle-fr.png') });
    return 'battle follows';
  });

  await check('an open full-screen window follows the switch made in Settings (Bag)', async () => {
    await page.locator('#win-shortcuts [data-panel="inventory"]').click();
    await page.locator('#fs-inventory').waitFor({ state: 'visible' });
    const bagFr = await panelText('#fs-inventory');
    assert.ok(/Objets|Sac/.test(bagFr), 'the bag is in French');

    await openSettings();
    await switchLanguage('en');
    const bagEn = await panelText('#fs-inventory');
    assert.notEqual(bagEn, bagFr, 'the open bag followed the switch to English');
    assert.ok(!/\bObjets\b/.test(bagEn), 'no French leftover in the bag');
    assert.ok(await page.locator('#fs-inventory').isVisible(), 'the bag was never closed');
    await page.screenshot({ path: path.join(output, 'bag-en.png') });
    await closeModal('settings-window');
    return 'bag follows';
  });

  await check('the Pokédex opened before the switch follows it too', async () => {
    await closeModal('fs-inventory');
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.POKEDEX));
    });
    await page.locator('#fs-pokedex').waitFor({ state: 'visible' });
    const dexEn = await panelText('#fs-pokedex');
    await openSettings();
    await switchLanguage('fr');
    await closeModal('settings-window');
    const dexFr = await panelText('#fs-pokedex');
    assert.notEqual(dexFr, dexEn, 'the open Pokédex followed the switch');
    assert.ok(/Pokédex/.test(dexFr), 'the Pokédex is French again');
    const stripped = dexFr.replace(/[×x]\s?\d+/g, '').replace(/Pokédex/g, '');
    assert.equal(stripped.match(RAW_KEY), null, 'the Pokédex shows no raw key');
    assert.ok(await page.locator('#fs-pokedex').isVisible(), 'the Pokédex was never closed');
    await page.screenshot({ path: path.join(output, 'pokedex-fr.png') });
    return 'dex follows';
  });

  await check('a notification posted before the switch follows it', async () => {
    await closeModal('fs-pokedex');
    const before = await page.evaluate(async () => {
      const { NotificationSystem } = await import('/src/systems/NotificationSystem.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      const manager = LocalizationManager.getInstance();
      const key = manager.has('ball_no_stock') ? 'ball_no_stock' : Object.keys(manager._tables.fr).find((k) => /^os_|^not_enough/.test(k));
      NotificationSystem.getInstance().notify(manager.t(key || 'cancel'), {});
      const node = document.querySelector('[class*="notification"]');
      return node ? node.innerText : '';
    });
    assert.ok(before.length > 0, 'a notification is displayed');
    await openSettings();
    await switchLanguage('en');
    await closeModal('settings-window');
    const after = await page.evaluate(() => document.querySelector('[class*="notification"]')?.innerText || '');
    assert.notEqual(after, before, 'the notification followed the switch');
    return 'notification follows';
  });

  await check('the chosen language survives a reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const text = await bodyText();
    assert.ok(!/Charger|Nouvelle partie|Jouer/.test(text), 'the menu is not French anymore');
    assert.ok(/Load|Continue|New game|Save/i.test(text), 'the interface boots in English');
    await page.screenshot({ path: path.join(output, 'reload-en.png') });
    return 'persisted';
  });

  await check('no console error, no failed asset and no raw key on screen', async () => {
    assert.deepEqual(issues, [], 'browser console is clean');
    const screen = (await bodyText()).replace(/[×x]\s?\d+/g, '');
    assert.equal(screen.match(RAW_KEY), null, 'no raw key on screen');
    return 'clean';
  });

  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, issues }, null, 2));
  console.log(`\n${results.length} checks passed`);
} finally {
  await browser.close();
}
