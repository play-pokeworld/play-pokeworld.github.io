/**
 * @file BagAndPokemonInfoParity.mjs
 * @brief Playwright acceptance suite for Bag (Sac) item usage and Pokémon Information Sheet parity.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-bag-pokeinfo');
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

const bagPanel = () => page.locator('#fs-inventory');
const pokeModal = () => page.locator('#poke-modal-inner');
const dictDetailModal = () => page.locator('#pw-dictionary-detail');

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });

  await check(
    'Seed save with starter, evolvable party members, stones, treasures, and items',
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
        const save = saves.createNewSave('Bag & Info Parity', 'pikachu');
        save.tutorial.enabled = false;
        save.player.location = 'route1';

        // Add stone-evolvable Pokémon: Pikachu (team leader), Eevee (team member 2), Poliwhirl (box)
        const pikachu = PokemonFactory.create('pikachu', 20);
        BoxSystem.getInstance().addPokemon(pikachu, { deferSave: true });

        const eevee = PokemonFactory.create('eevee', 25);
        BoxSystem.getInstance().addPokemon(eevee, { deferSave: true });

        const poliwhirl = PokemonFactory.create('poliwhirl', 30);
        BoxSystem.getInstance().addPokemon(poliwhirl, { deferSave: true });

        save.teamMembers.setUids([pikachu.uid, eevee.uid]);

        // Add inventory items
        save.inventory.add('thunderstone', 2, { deferSave: true });
        save.inventory.add('waterstone', 1, { deferSave: true });
        save.inventory.add('nugget', 3, { deferSave: true });
        save.inventory.add('leftovers', 2, { deferSave: true });
        save.inventory.add('rarecandy', 5, { deferSave: true });
        save.inventory.add('pokeball', 10, { deferSave: true });
        save.inventory.add('cs03_surf', 1, { deferSave: true });
        save.inventory.add('ct06_toxic', 1, { deferSave: true });

        Engine.getInstance().getPageManager().openPage('game');
      });

      await page.waitForSelector('#win-shortcuts', { state: 'visible' });
    },
  );

  await check(
    'Shortcut button opens fullscreen Bag with category chips and accurate counters',
    async () => {
      const shortcut = page.locator('#win-shortcuts [data-panel="inventory"]');
      await shortcut.waitFor({ state: 'visible' });
      await shortcut.click();

      await bagPanel().waitFor({ state: 'visible' });
      const chips = bagPanel().locator('.inv-toolbar .pw-chip');
      const count = await chips.count();
      assert.ok(count >= 7, 'multiple category chips are visible');

      const items = bagPanel().locator('.inv-list-root .inv-item');
      assert.ok((await items.count()) > 0, 'items are rendered in the Bag');
      await page.screenshot({ path: path.join(output, '01-bag-fullscreen.png') });
    },
  );

  await check(
    'Live search in Bag filters items accurately and reset restores the list',
    async () => {
      // Click on Évolution category chip
      const evoChip = bagPanel().locator('.inv-toolbar .pw-chip', { hasText: 'Évolution' });
      await evoChip.waitFor({ state: 'visible' });
      await evoChip.click();
      await page.waitForTimeout(100);

      const searchInput = bagPanel().locator('.inv-toolbar input');
      await searchInput.fill('foudre');
      await page.waitForTimeout(100);

      const items = bagPanel().locator('.inv-list-root .inv-item');
      const count = await items.count();
      assert.equal(count, 1, 'only thunder stone matches');
      assert.ok((await items.first().innerText()).includes('Pierre Foudre'));

      const resetBtn = bagPanel().locator('.inv-toolbar .pw-filter-reset');
      await resetBtn.click();
      await page.waitForTimeout(100);
      assert.ok((await bagPanel().locator('.inv-list-root .inv-item').count()) >= 2, 'items restored');
    },
  );

  await check(
    'Clicking an evolution stone opens inline Stone Evolution view with candidate cards',
    async () => {
      // Switch to Evolution category or find thunder stone
      const evoCategoryChip = bagPanel().locator('.inv-toolbar .pw-chip', { hasText: 'Évolution' });
      if (await evoCategoryChip.count() > 0) {
        await evoCategoryChip.click();
      }

      const stoneRow = bagPanel().locator('.inv-item', { hasText: 'Pierre Foudre' });
      await stoneRow.waitFor({ state: 'visible' });
      await stoneRow.click();

      // Stone evolution view appears
      const stickyHeader = bagPanel().locator('.pw-sticky-header');
      await stickyHeader.waitFor({ state: 'visible' });
      assert.ok((await stickyHeader.innerText()).includes('Pierre Foudre'));
      assert.ok((await stickyHeader.innerText()).includes('×2'));

      // Candidate cards grid
      const candidates = bagPanel().locator('.pw-starter-grid .pw-starter-card');
      const count = await candidates.count();
      assert.ok(count >= 2, 'Pikachu and Eevee are candidates for Thunder Stone');

      // Candidate cards: Eevee -> Voltali and Pikachu -> Raichu
      const candidatesText = await candidates.allInnerTexts();
      assert.ok(candidatesText.some((text) => text.includes('Voltali') || text.includes('Raichu')));
      assert.ok(candidatesText.some((text) => text.includes('Nv.')));
      assert.ok(await candidates.first().locator('.evo-owned-badge').isVisible());
      await page.screenshot({ path: path.join(output, '02-bag-stone-evolution.png') });
    },
  );

  await check(
    'Clicking "Retour au sac" in Stone Evolution view returns to the standard Bag',
    async () => {
      const backBtn = bagPanel().locator('.pw-starter-actions .hbtn', { hasText: 'Retour au sac' });
      await backBtn.waitFor({ state: 'visible' });
      await backBtn.click();

      // Sticky header gone, standard inv-list-root restored
      await page.waitForTimeout(100);
      assert.equal(await bagPanel().locator('.pw-sticky-header').count(), 0);
      assert.ok(await bagPanel().locator('.inv-list-root').isVisible());
    },
  );

  await check(
    'Clicking a treasure item opens inline Treasure Sale view with quotes and actions',
    async () => {
      // Find Trésors category chip
      const treasureCategoryChip = bagPanel().locator('.inv-toolbar .pw-chip', { hasText: 'Trésors' });
      await treasureCategoryChip.waitFor({ state: 'visible' });
      await treasureCategoryChip.click();
      await page.waitForTimeout(100);

      const nuggetRow = bagPanel().locator('.inv-item', { hasText: 'Pépite' });
      await nuggetRow.waitFor({ state: 'visible' });
      await nuggetRow.click();

      // Treasure sale view appears
      const title = bagPanel().locator('.loc-title');
      await title.waitFor({ state: 'visible' });
      assert.ok((await title.innerText()).includes('Pépite'));

      const sub = bagPanel().locator('.loc-sub');
      assert.ok((await sub.innerText()).includes('3'));
      assert.ok((await sub.innerText()).includes('exemplaire'));

      const sellActions = bagPanel().locator('.pw-starter-actions button');
      assert.ok((await sellActions.count()) >= 3, 'Vendre un, Tout vendre, Retour au sac actions present');
      assert.ok((await sellActions.nth(0).innerText()).includes('Vendre'));
      assert.ok((await sellActions.nth(1).innerText()).includes('Tout vendre'));
      await page.screenshot({ path: path.join(output, '03-bag-treasure-sale.png') });
    },
  );

  await check(
    'Clicking "Retour au sac" in Treasure Sale view returns to the standard Bag',
    async () => {
      const backBtn = bagPanel().locator('.pw-starter-actions .hbtn', { hasText: 'Retour au sac' });
      await backBtn.waitFor({ state: 'visible' });
      await backBtn.click();

      await page.waitForTimeout(100);
      assert.equal(await bagPanel().locator('.loc-title').count(), 0);
      assert.ok(await bagPanel().locator('.inv-list-root').isVisible());
    },
  );

  await check(
    'Left-clicking non-usable item opens Dictionary Detail modal with "Retour au sac"',
    async () => {
      // Switch to Objets tenus category
      const heldChip = bagPanel().locator('.inv-toolbar .pw-chip', { hasText: 'Objets tenus' });
      await heldChip.waitFor({ state: 'visible' });
      await heldChip.click();
      await page.waitForTimeout(100);

      const leftoversRow = bagPanel().locator('.inv-item', { hasText: 'Restes' });
      await leftoversRow.waitFor({ state: 'visible' });
      await leftoversRow.click();

      await dictDetailModal().waitFor({ state: 'visible' });
      assert.ok((await dictDetailModal().innerText()).includes('Restes'));
      await page.screenshot({ path: path.join(output, '04-bag-dict-detail.png') });

      const backBtn = dictDetailModal().locator('.pw-info-back-btn');
      await backBtn.waitFor({ state: 'visible' });
      assert.equal(await backBtn.innerText(), 'Retour au sac');

      await backBtn.click();
      await dictDetailModal().waitFor({ state: 'hidden' });
      assert.ok(await bagPanel().isVisible(), 'Bag panel remains open under the modal');
    },
  );

  await check(
    'Right-clicking an item in Bag opens Dictionary Detail modal with "Retour au sac"',
    async () => {
      // Switch to Poké Balls category
      const ballsChip = bagPanel().locator('.inv-toolbar .pw-chip', { hasText: 'Poké Balls' });
      await ballsChip.waitFor({ state: 'visible' });
      await ballsChip.click();
      await page.waitForTimeout(100);

      const ballRow = bagPanel().locator('.inv-item', { hasText: 'Poké Ball' });
      await ballRow.waitFor({ state: 'visible' });
      await ballRow.click({ button: 'right' });

      await dictDetailModal().waitFor({ state: 'visible' });
      assert.ok((await dictDetailModal().innerText()).includes('Poké Ball'));

      const backBtn = dictDetailModal().locator('.pw-info-back-btn');
      await backBtn.click();
      await dictDetailModal().waitFor({ state: 'hidden' });
    },
  );

  await check(
    'CT/CS items display with suffix and clicking opens BoxPanel filtering only compatible Pokémon',
    async () => {
      // Find CT / CS category chip
      const tmCategoryChip = bagPanel().locator('.inv-toolbar .pw-chip', { hasText: 'CT / CS' });
      await tmCategoryChip.waitFor({ state: 'visible' });
      await tmCategoryChip.click();
      await page.waitForTimeout(100);

      // Verify suffix formatting
      const surfRow = bagPanel().locator('.inv-item', { hasText: 'Surf CS' });
      const toxicRow = bagPanel().locator('.inv-item', { hasText: 'Toxik CT' });
      assert.ok(await surfRow.isVisible(), 'Surf CS item is displayed');
      assert.ok(await toxicRow.isVisible(), 'Toxik CT item is displayed');

      // Click Surf CS to open BoxPanel target selector
      await surfRow.click();
      const boxPanel = page.locator('#fs-box');
      await boxPanel.waitFor({ state: 'visible' });

      // Title shows teaching move
      const boxTitle = boxPanel.locator('.pw-fullscreen-title, .modal-title');
      assert.ok((await boxTitle.innerText()).includes('Surf (CS)'));

      // Instruction displays compatible prompt
      const instruction = boxPanel.locator('.pw-box-instruction');
      assert.ok((await instruction.innerText()).includes('Surf'));

      // Grid entries: only Poliwhirl is compatible (Water type), Pikachu and Eevee are excluded!
      const entries = boxPanel.locator('.pw-box-pokemon-tile');
      assert.equal(await entries.count(), 1, 'Only 1 compatible Pokémon shown');
      assert.equal(await entries.first().getAttribute('data-species-id'), 'poliwhirl');
      await page.screenshot({ path: path.join(output, '04-bag-tm-box-target.png') });

      // Click "Retour au sac" in footer returns to Bag
      const backBtn = boxPanel.locator('.pw-box-selection-footer .hbtn, .pw-box-selection-footer button').last();
      await backBtn.click();
      await boxPanel.waitFor({ state: 'hidden' });
      await bagPanel().waitFor({ state: 'visible' });
    },
  );

  await check(
    'Closing the Bag fullscreen panel returns cleanly to main screen',
    async () => {
      const closeBtn = bagPanel().locator('.modal-close');
      await closeBtn.click();
      await bagPanel().waitFor({ state: 'hidden' });
    },
  );

  await check(
    'Opening Pokémon Info Sheet from team card displays canonical header, hero, and protection actions',
    async () => {
      const leadCard = page.locator('#win-team .pw-poke-card').first();
      await leadCard.waitFor({ state: 'visible' });

      // Right-click opens Pokémon info sheet in desktop pointer mode
      await leadCard.click({ button: 'right' });

      await pokeModal().waitFor({ state: 'visible' });
      const title = pokeModal().locator('.poke-detail-title');
      assert.ok((await title.innerText()).includes('Pikachu'));
      assert.ok((await title.innerText()).includes('#25'));

      // Hero panel
      const hero = pokeModal().locator('.poke-detail-hero');
      assert.ok(await hero.isVisible());
      assert.ok(await hero.locator('.poke-detail-sprite-card').isVisible());
      assert.ok(await hero.locator('.type-badge').isVisible());
      assert.ok(await hero.locator('.poke-detail-location').isVisible());

      // Protection actions
      const favBtn = pokeModal().locator('[data-focus-key="pokemon-info-favorite"]');
      const lockBtn = pokeModal().locator('[data-focus-key="pokemon-info-locked"]');
      assert.ok(await favBtn.isVisible());
      assert.ok(await lockBtn.isVisible());
      await page.screenshot({ path: path.join(output, '05-pokemon-info-hero-stats.png') });
    },
  );

  await check(
    'Toggling favorite and lock protection updates states dynamically',
    async () => {
      const favBtn = pokeModal().locator('[data-focus-key="pokemon-info-favorite"]');
      assert.ok(await favBtn.evaluate((e) => e.classList.contains('is-off')));

      await favBtn.click();
      await page.waitForTimeout(100);
      assert.ok(await favBtn.evaluate((e) => e.classList.contains('is-on')));

      const lockBtn = pokeModal().locator('[data-focus-key="pokemon-info-locked"]');
      assert.ok(await lockBtn.evaluate((e) => e.classList.contains('is-off')));

      await lockBtn.click();
      await page.waitForTimeout(100);
      assert.ok(await lockBtn.evaluate((e) => e.classList.contains('is-locked')));
    },
  );

  await check(
    'Side stat panel switches between Stats, IV, and EV tabs with colored progress bars and totals',
    async () => {
      const tabs = pokeModal().locator('.poke-detail-stat-tabs [role="tab"]');
      assert.equal(await tabs.count(), 3);
      assert.ok((await tabs.nth(0).innerText()).includes('Stat'));
      assert.equal(await tabs.nth(1).innerText(), 'IV');
      assert.equal(await tabs.nth(2).innerText(), 'EV');

      // Stats tab starts active
      assert.ok(await tabs.nth(0).evaluate((e) => e.classList.contains('active')));
      const statRows = pokeModal().locator('.poke-detail-stat-panel.active .poke-detail-stat-row');
      assert.equal(await statRows.count(), 6);

      // Switch to IV
      await tabs.nth(1).click();
      await page.waitForTimeout(100);
      assert.ok(await tabs.nth(1).evaluate((e) => e.classList.contains('active')));
      const ivPanel = pokeModal().locator('#pokemon-info-stat-panel-ivs');
      assert.ok(await ivPanel.isVisible());
      assert.ok((await ivPanel.innerText()).includes('/ 6'));
      assert.ok((await ivPanel.innerText()).includes('Total'));

      // Switch to EV
      await tabs.nth(2).click();
      await page.waitForTimeout(100);
      assert.ok(await tabs.nth(2).evaluate((e) => e.classList.contains('active')));
      const evPanel = pokeModal().locator('#pokemon-info-stat-panel-evs');
      assert.ok(await evPanel.isVisible());
      assert.ok((await evPanel.innerText()).includes('/ 18'));
      assert.ok((await evPanel.innerText()).includes('/ 36'));
      await page.screenshot({ path: path.join(output, '06-pokemon-info-iv-ev.png') });
    },
  );

  await check(
    'Section grid renders Abilities dropdown, Rank panel with BST badge, and Evolutions',
    async () => {
      const grid = pokeModal().locator('.poke-detail-section-grid');
      assert.ok(await grid.isVisible());

      // Ability dropdown
      // Talent select
      const talentSelect = grid.locator('.poke-detail-talent-panel select, .pw-dropdown-select');
      assert.ok(await talentSelect.first().isVisible());

      // Rank panel
      const rankPanel = grid.locator('.poke-rank-panel');
      assert.ok(await rankPanel.isVisible());
      assert.ok((await rankPanel.innerText()).includes('BST'));

      // Evolutions panel
      const evoCard = grid.locator('.pw-progress-card-subtle');
      assert.ok(await evoCard.isVisible());
      assert.ok((await evoCard.innerText()).includes('Raichu'));
      await page.screenshot({ path: path.join(output, '07-pokemon-info-grid.png') });
    },
  );

  await check(
    'Moves block renders known moves, move replacement selection, and right-click dictionary routing',
    async () => {
      const movesBlock = pokeModal().locator('.poke-detail-moves-block');
      assert.ok(await movesBlock.isVisible());

      const knownMoves = movesBlock.locator('.poke-detail-moves-list.current .poke-detail-move-row');
      assert.ok((await knownMoves.count()) > 0, 'known moves are rendered');

      // Left-click selects known move for replacement
      await knownMoves.first().click();
      assert.ok(await knownMoves.first().evaluate((e) => e.classList.contains('selected')));
      const cancelBtn = movesBlock.locator('.poke-detail-moves-title .poke-detail-mini-btn');
      assert.ok(await cancelBtn.isVisible());

      // Right-click known move opens dictionary detail modal
      await knownMoves.first().click({ button: 'right' });
      await dictDetailModal().waitFor({ state: 'visible' });
      assert.ok(await dictDetailModal().locator('.pw-info-head').isVisible());

      // Close dictionary detail modal
      const closeBtn = dictDetailModal().locator('.modal-close, .pw-info-back-btn').first();
      await closeBtn.click();
      await dictDetailModal().waitFor({ state: 'hidden' });

      // Click cancel button to deselect
      await cancelBtn.click();
      assert.equal(await cancelBtn.isVisible(), false);

      // Check full list button
      const fullListBtn = movesBlock.locator('.poke-detail-full-list-btn');
      assert.ok(await fullListBtn.isVisible());
    },
  );

  await check(
    'Responsive layout at 390px mobile viewport renders cleanly with zero horizontal overflow',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);

      const hasOverflow = await page.evaluate(() => {
        const modal = document.querySelector('#poke-modal-inner');
        return modal ? modal.scrollWidth > modal.clientWidth + 2 : false;
      });
      assert.equal(hasOverflow, false, 'Pokémon info modal does not horizontally overflow on mobile 390px');
      await page.screenshot({ path: path.join(output, '08-pokemon-info-mobile-390.png') });

      // Close modal
      const closeBtn = pokeModal().locator('[data-focus-key="pokemon-info-close"]');
      await closeBtn.click();
      await pokeModal().waitFor({ state: 'hidden' });
    },
  );

  await check(
    'All sprites, icons and images loaded cleanly with zero console errors or warnings',
    async () => {
      assert.deepEqual(issues, [], 'no unhandled exceptions or console errors');
    },
  );

  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify({ passed: true, results }, null, 2),
  );
  console.log('All Bag & Pokemon Info parity checks passed successfully!');
} finally {
  await browser.close();
}
