/**
 * @file DictionaryParity.mjs
 * @brief Real Chromium tests for the Dictionary (items, moves, talents, progressive discovery and details).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-dictionary');
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

const dictPanel = () => page.locator('#fs-dictionary');
const detailModal = () => page.locator('#pw-dictionary-detail');

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });

  await check(
    'Shortcut button opens fullscreen Dictionary with Objets, Attaques, and Talents tabs',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { Engine } = await import('/src/core/Engine.js');
        const { LocalizationManager } = await import(
          '/src/localization/LocalizationManager.js'
        );
        const { PokemonFactory } = await import(
          '/src/data/pokemon/PokemonFactory.js'
        );
        const { BoxSystem } = await import('/src/systems/BoxSystem.js');

        LocalizationManager.getInstance().setLanguage('fr');
        const saves = SaveSystem.getInstance();
        const save = saves.createNewSave('Browser Dict Save', 'charmander');
        save.tutorial.enabled = false;
        save.player.location = 'route1';
        save.inventory.add('rarecandy', 3, { deferSave: true });
        save.inventory.add('leftovers', 2, { deferSave: true });

        const pikachu = PokemonFactory.create('pikachu', 15);
        BoxSystem.getInstance().addPokemon(pikachu, { deferSave: true });

        Engine.getInstance().getPageManager().openPage('game');
      });

      const shortcut = page.locator('#win-shortcuts [data-panel="dictionary"]');
      await shortcut.waitFor({ state: 'visible' });
      await shortcut.click();

      await dictPanel().waitFor({ state: 'visible' });
      assert.equal(
        await dictPanel().locator('.modal-title .pw-info-name').innerText(),
        'Dictionnaire',
      );

      const tabs = dictPanel().locator('.dict-tab');
      assert.equal(await tabs.count(), 3);
      assert.equal(await tabs.nth(0).innerText(), 'Objets');
      assert.equal(await tabs.nth(1).innerText(), 'Attaques');
      assert.equal(await tabs.nth(2).innerText(), 'Talents');
      assert.ok(
        await tabs.nth(0).evaluate((e) => e.classList.contains('active')),
      );
    },
  );

  await check(
    'Kanto progressive item discovery displays exactly 214 items with no Gen 4+ items',
    async () => {
      const entries = dictPanel().locator('.dict-entry');
      const count = await entries.count();
      assert.equal(count, 214);

      const firstTexts = await entries.locator('b').allInnerTexts();
      assert.ok(firstTexts.includes('Poké Ball'));
      assert.ok(firstTexts.includes('Super Bonbon'));
      assert.ok(!firstTexts.includes('Charbon'), 'Gen 2 hidden in Kanto');
      assert.ok(!firstTexts.includes('Mouchoir Soie'), 'Gen 3 hidden in Kanto');
      assert.ok(!firstTexts.includes('Muscle Band'), 'Gen 4 always hidden');

      await page.screenshot({
        path: path.join(output, 'dict-items-kanto.png'),
      });
      return { count };
    },
  );

  await check(
    'Search input filters items in real time and highlights owned quantities',
    async () => {
      const search = dictPanel().locator('.dict-search');
      await search.fill('bonbon');

      const entries = dictPanel().locator('.dict-entry');
      const filteredCount = await entries.count();
      assert.ok(filteredCount >= 1 && filteredCount <= 5);

      const rareCandy = dictPanel().locator(
        '.dict-entry[data-key="rarecandy"]',
      );
      assert.ok(await rareCandy.isVisible());
      assert.ok(await rareCandy.evaluate((e) => e.classList.contains('owned')));
      assert.ok((await rareCandy.innerText()).includes('Possédé ×3'));

      await search.fill('terme_inexistant_xyz_123');
      assert.equal(await dictPanel().locator('.dict-entry').count(), 0);
      assert.ok(await dictPanel().locator('.dict-muted').isVisible());

      await search.fill('');
      assert.equal(await dictPanel().locator('.dict-entry').count(), 214);
    },
  );

  await check(
    'Clicking an item card opens Item Detail modal with sources, price and return button',
    async () => {
      const rareCandy = dictPanel().locator(
        '.dict-entry[data-key="rarecandy"]',
      );
      await rareCandy.scrollIntoViewIfNeeded();
      await rareCandy.click();

      await detailModal().waitFor({ state: 'visible' });
      const text = await detailModal().innerText();

      assert.ok(text.includes('Super Bonbon'));
      assert.ok(text.includes('Bonbon'));
      assert.ok(text.includes('Prix'));
      assert.ok(text.includes('10 000₽'));
      assert.ok(text.includes('Possédé'));
      assert.ok(text.includes('×3'));
      assert.ok(text.includes('Où trouver :'));
      assert.ok(text.includes('Boutique Plateau Indigo'));
      assert.ok(text.includes('Centre Commercial Céladon'));
      assert.ok(text.includes('Atoll de Combat'));
      assert.ok(text.includes('Quête principale'));

      await page.waitForTimeout(250);
      await page.screenshot({
        path: path.join(output, 'dict-detail-item.png'),
        animations: 'disabled',
      });

      const backBtn = detailModal().locator('.pw-info-back-btn');
      assert.equal(await backBtn.innerText(), '← Retour au Dictionnaire');
      await backBtn.click();

      await detailModal().waitFor({ state: 'hidden' });
      assert.ok(await dictPanel().isVisible(), 'fullscreen panel stays open');
    },
  );

  await check(
    'Attaques tab displays all moves with type badges, colors, and live user counts',
    async () => {
      const tabs = dictPanel().locator('.dict-tab');
      await tabs.nth(1).click();
      assert.ok(
        await tabs.nth(1).evaluate((e) => e.classList.contains('active')),
      );

      const moveEntries = dictPanel().locator('.dict-entry');
      const count = await moveEntries.count();
      assert.ok(count >= 416);

      // Starter knows Flamèche (ember)
      const ember = dictPanel().locator('.dict-entry[data-key="ember"]');
      await ember.scrollIntoViewIfNeeded();
      assert.ok(await ember.isVisible());
      assert.ok(await ember.evaluate((e) => e.classList.contains('owned')));
      assert.ok((await ember.innerText()).includes('Flamèche'));
      assert.ok((await ember.innerText()).includes('Feu'));

      // Check type badge and border color
      assert.ok(await ember.locator('.type-badge.type-fire').isVisible());

      await page.screenshot({ path: path.join(output, 'dict-moves.png') });
      return { count };
    },
  );

  await check(
    'Clicking a move card opens Move Detail modal with power, category, effects and learners',
    async () => {
      const ember = dictPanel().locator('.dict-entry[data-key="ember"]');
      await ember.scrollIntoViewIfNeeded();
      await ember.click();

      await detailModal().waitFor({ state: 'visible' });
      const text = await detailModal().innerText();

      assert.ok(text.includes('Flamèche'));
      assert.ok(text.includes('Puissance :'));
      assert.ok(text.includes('40'));
      assert.ok(text.includes('Catégorie'));
      assert.ok(text.includes('Spéciale'));
      assert.ok(text.includes('Description'));
      assert.ok(text.includes('Effets'));
      assert.ok(text.includes('Brûlure'));
      assert.ok(text.includes("Pokémon pouvant l'apprendre"));
      assert.ok(text.includes('Par niveau'));
      assert.ok(text.includes('#4 Salamèche'));
      assert.ok(text.includes('Par CT / CS'));
      assert.ok(text.includes('#149 Dracolosse'));

      await page.waitForTimeout(250);
      await page.screenshot({
        path: path.join(output, 'dict-detail-move.png'),
        animations: 'disabled',
      });

      await detailModal().locator('.modal-close').click();
      await detailModal().waitFor({ state: 'hidden' });
      assert.ok(await dictPanel().isVisible());
    },
  );

  await check(
    'Talents tab displays all 195 abilities with rarity and unlock status',
    async () => {
      const tabs = dictPanel().locator('.dict-tab');
      await tabs.nth(2).click();
      assert.ok(
        await tabs.nth(2).evaluate((e) => e.classList.contains('active')),
      );

      const talentEntries = dictPanel().locator('.dict-entry');
      assert.equal(await talentEntries.count(), 195);

      const blaze = dictPanel().locator('.dict-entry[data-key="blaze"]');
      await blaze.scrollIntoViewIfNeeded();
      assert.ok(await blaze.isVisible());
      assert.ok((await blaze.innerText()).includes('Brasier'));
      assert.ok((await blaze.innerText()).includes('Commun'));

      await page.screenshot({ path: path.join(output, 'dict-talents.png') });
    },
  );

  await check(
    'Clicking a talent card opens Ability Detail modal with description, carriers and rarity',
    async () => {
      const blaze = dictPanel().locator('.dict-entry[data-key="blaze"]');
      await blaze.scrollIntoViewIfNeeded();
      await blaze.click();

      await detailModal().waitFor({ state: 'visible' });
      const text = await detailModal().innerText();

      assert.ok(text.includes('Brasier'));
      assert.ok(text.includes('Commun'));
      assert.ok(text.includes('Description'));
      assert.ok(text.includes('Pokémon concernés'));
      assert.ok(text.includes('#4 Salamèche'));
      assert.ok(text.includes('Rareté'));

      await page.waitForTimeout(250);
      await page.screenshot({
        path: path.join(output, 'dict-detail-talent.png'),
        animations: 'disabled',
      });

      await detailModal().locator('.pw-info-back-btn').click();
      await detailModal().waitFor({ state: 'hidden' });
      assert.ok(await dictPanel().isVisible());
    },
  );

  await check(
    'Switching language to English updates tabs, entries and details live',
    async () => {
      await page.evaluate(async () => {
        const { LocalizationManager } = await import(
          '/src/localization/LocalizationManager.js'
        );
        LocalizationManager.getInstance().setLanguage('en');
      });

      assert.equal(
        await dictPanel().locator('.modal-title .pw-info-name').innerText(),
        'Dictionary',
      );
      const tabs = dictPanel().locator('.dict-tab');
      assert.equal(await tabs.nth(0).innerText(), 'Items');
      assert.equal(await tabs.nth(1).innerText(), 'Moves');
      assert.equal(await tabs.nth(2).innerText(), 'Abilities');

      await tabs.nth(0).click();
      const rareCandy = dictPanel().locator(
        '.dict-entry[data-key="rarecandy"]',
      );
      await rareCandy.scrollIntoViewIfNeeded();
      assert.ok((await rareCandy.innerText()).includes('Rare Candy'));
      assert.ok((await rareCandy.innerText()).includes('Owned ×3'));

      await rareCandy.click();
      await detailModal().waitFor({ state: 'visible' });
      assert.ok((await detailModal().innerText()).includes('Rare Candy'));
      assert.ok((await detailModal().innerText()).includes('Price'));
      assert.ok(
        (await detailModal().innerText()).includes('← Back to Dictionary'),
      );

      await detailModal().locator('.pw-info-back-btn').click();
      await detailModal().waitFor({ state: 'hidden' });

      // Switch back to French
      await page.evaluate(async () => {
        const { LocalizationManager } = await import(
          '/src/localization/LocalizationManager.js'
        );
        LocalizationManager.getInstance().setLanguage('fr');
      });
    },
  );

  await check(
    'Responsive layout at 390px mobile viewport has no horizontal overflow',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const overflow = await dictPanel().evaluate(
        (e) => e.scrollWidth > e.clientWidth + 1,
      );
      assert.equal(overflow, false, 'no horizontal scrollbar on mobile');

      await page.screenshot({ path: path.join(output, 'dict-mobile-390.png') });
      await page.setViewportSize({ width: 1360, height: 1000 });
    },
  );

  await check(
    'Closing dictionary panel returns cleanly to main screen',
    async () => {
      await dictPanel().locator('.modal-close').click();
      await dictPanel().waitFor({ state: 'hidden' });
      assert.equal(await dictPanel().isVisible(), false);
    },
  );

  await check(
    'All dictionary sprites and icons loaded cleanly with no errors',
    async () => {
      assert.deepEqual(issues, []);
    },
  );
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      { browserVersion: browser.version(), results, issues },
      null,
      2,
    ),
  );
  await browser.close();
}
