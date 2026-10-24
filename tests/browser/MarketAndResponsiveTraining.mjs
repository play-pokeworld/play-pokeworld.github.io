/** @file MarketAndResponsiveTraining.mjs @brief Chromium acceptance with explicit progression fixtures, not a campaign playthrough. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT ||
  path.resolve('artifacts/browser-market-training');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1560, height: 1120 } });
page.setDefaultTimeout(12000);
const issues = [],
  results = [];
let fixture;
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type()))
    issues.push(`${message.type()}: ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400)
    issues.push(`HTTP ${response.status()} ${response.url()}`);
});
// Exact state comparisons disable only scheduled training and autosave ticks. Explicit commands and saves remain real.
await page.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    import('/src/systems/TrainingSystem.js').then(({ TrainingSystem }) =>
      TrainingSystem.getInstance().setEnabled(false),
    );
    import('/src/systems/SaveSystem.js').then(({ SaveSystem }) =>
      SaveSystem.getInstance().setEnabled(false),
    );
  });
});
async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, passed: true, detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    await page
      .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
      .catch(() => {});
    throw error;
  }
}
const market = () => page.locator('#fs-market');
async function openMarket() {
  await page.locator('#win-shortcuts [data-panel="market"]').click();
  await market().waitFor({ state: 'visible' });
}
async function closeMarket() {
  await market().locator('.modal-close').click();
}
async function label(key) {
  return page.evaluate(
    async (key) =>
      (await import('/src/localization/LocalizationManager.js')).t(key),
    key,
  );
}
async function action(key) {
  await market()
    .getByRole('button', { name: await label(key), exact: true })
    .click();
}
async function state() {
  return page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    return SaveSystem.getInstance().getCurrentSave().serialize();
  });
}
async function mobileTraining(width) {
  await page.setViewportSize({ width, height: 1000 });
  if (width <= 680) {
    await page
      .locator('.mobile-nav-bar')
      .getByRole('button', { name: 'Gestion', exact: true })
      .click();
    await page
      .locator('.mobile-subnav-bar')
      .getByRole('button', { name: 'Entraînement', exact: true })
      .click();
  }
  await page.locator('#win-training').scrollIntoViewIfNeeded();
}
async function captureTraining(filename) {
  const original = page.viewportSize(),
    panel = page.locator('#win-training');
  const bounds = await panel.boundingBox();
  if (bounds.height + 240 > original.height)
    await page.setViewportSize({
      width: original.width,
      height: Math.ceil(bounds.height) + 240,
    });
  await panel.evaluate((element) =>
    window.scrollTo(
      0,
      window.scrollY + element.getBoundingClientRect().top - 210,
    ),
  );
  await panel.screenshot({ path: path.join(output, filename) });
  if (page.viewportSize().height !== original.height)
    await page.setViewportSize(original);
}
async function trainingBounds() {
  return page.locator('#win-training').evaluate((panel) => {
    const body = panel.querySelector('#training-window-body'),
      b = body.getBoundingClientRect(),
      r = panel.getBoundingClientRect();
    const overflow = [...body.querySelectorAll('*')]
      .filter(
        (e) =>
          e instanceof HTMLElement &&
          e.getClientRects().length > 0 &&
          getComputedStyle(e).display !== 'contents',
      )
      .flatMap((e) => {
        const x = e.getBoundingClientRect();
        if (x.width < 1 || x.height < 1) return [];
        const outside = x.left < b.left - 0.75 || x.right > b.right + 0.75;
        const clipped = e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1;
        return outside || clipped
          ? [
              {
                className: e.className,
                tag: e.tagName,
                width: x.width,
                left: x.left,
                right: x.right,
                scrollWidth: e.scrollWidth,
                clientWidth: e.clientWidth,
                outside,
                clipped,
              },
            ]
          : [];
      });
    return {
      viewport: innerWidth,
      panelWidth: r.width,
      bodyWidth: b.width,
      slots: [
        ...body.querySelectorAll('.training-slot-card,.training-locked-slot'),
      ]
        .filter((e) => e.getClientRects().length > 0)
        .map((e) => ({
          width: e.getBoundingClientRect().width,
          right: e.getBoundingClientRect().right,
        })),
      overflow,
      bodyOverflow: getComputedStyle(body).overflowY,
    };
  });
}
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  await check(
    'the real Market shortcut and command share the first-badge gate',
    async () => {
      fixture = await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { Engine } = await import('/src/core/Engine.js');
        const { LocalizationManager } = await import(
          '/src/localization/LocalizationManager.js'
        );
        const { ShopSystem } = await import('/src/systems/ShopSystem.js');
        LocalizationManager.getInstance().setLanguage('fr');
        const saves = SaveSystem.getInstance(),
          backup = saves.createNewSave('Market backup', 'squirtle');
        backup.tutorial.enabled = false;
        saves.saveCurrent();
        const save = saves.createNewSave('Market browser', 'charmander');
        save.tutorial.enabled = false;
        save.currencies.add('questPoint', 50000);
        Engine.getInstance().getPageManager().openPage('game');
        return {
          id: save.id,
          backupId: backup.id,
          result: ShopSystem.getInstance().buyMarket('bulbasaur', 1),
        };
      });
      assert.equal(fixture.result, 'locked');
      assert.equal(
        await page.locator('#win-shortcuts [data-panel="market"]').count(),
        0,
      );
    },
  );
  await check(
    'earning the first badge opens the implemented fullscreen, never a coming-soon route',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { ShopSystem } = await import('/src/systems/ShopSystem.js');
        const save = SaveSystem.getInstance().getCurrentSave();
        save.player.earnBadge('brock');
        for (const offer of ShopSystem.getInstance().getMarketOffers())
          save.pokedex.markSeen(offer.speciesId, { deferSave: true });
      });
      await openMarket();
      assert.equal(await market().locator('.pw-market-row').count(), 9);
      assert.equal(
        await market().locator('.pw-market-footer:visible').count(),
        0,
      );
    },
  );
  await check(
    'native Kanto categories, circular sprites, type pills and quest-point wallet render as a responsive grid',
    async () => {
      const facts = await market().evaluate((root) => {
        const grid = root.querySelector('.pw-market-grid'),
          row = root.querySelector('.pw-market-row'),
          c = getComputedStyle(row);
        return {
          grid: getComputedStyle(grid).display,
          direction: c.flexDirection,
          cards: root.querySelectorAll('.pw-market-row').length,
          circles: root.querySelectorAll('.pw-poke-circle-wrap').length,
          types: root.querySelectorAll('.type-badge').length,
          questIcon: root
            .querySelector('.pw-market-wallet img')
            ?.getAttribute('src'),
          columns: getComputedStyle(grid).gridTemplateColumns,
        };
      });
      assert.equal(facts.grid, 'grid');
      assert.equal(facts.direction, 'column');
      assert.equal(facts.cards, 9);
      assert.equal(facts.circles, 9);
      assert.ok(facts.types >= 9);
      assert.match(facts.questIcon, /questPoint/);
      assert.equal(facts.columns.split(' ').length, 5);
      await page.waitForTimeout(2500);
      await market().screenshot({
        path: path.join(output, 'market-kanto-1560.png'),
      });
      return facts;
    },
  );
  await check(
    'selecting a card only selects it, and keyboard activation retains the focused native button',
    async () => {
      const before = await state();
      await market().locator('[data-species-id="bulbasaur"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(
        await market()
          .locator('[data-species-id="bulbasaur"]')
          .getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(
        await market()
          .locator('[data-species-id="bulbasaur"]')
          .evaluate((e) => getComputedStyle(e).outlineWidth),
        '2px',
      );
      assert.equal(
        (await state()).currencies.questPoint,
        before.currencies.questPoint,
      );
      assert.equal(
        await market().locator('.pw-market-footer:visible').count(),
        1,
      );
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.speciesId),
        'bulbasaur',
      );
    },
  );
  await check(
    'Reset, live typing, +10, +100 and Max preserve the same quantity field and exact quote',
    async () => {
      await market()
        .locator('.pw-shop-qty')
        .evaluate((e) => (e.dataset.acceptance = 'stable-quantity'));
      await market().locator('.pw-shop-qty').fill('4');
      assert.equal(await market().locator('.pw-shop-qty').inputValue(), '4');
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.acceptance),
        'stable-quantity',
      );
      assert.equal(
        await market().locator('.pw-shop-total').getAttribute('title'),
        '4 000',
      );
      await market().getByRole('button', { name: '+10', exact: true }).click();
      assert.equal(await market().locator('.pw-shop-qty').inputValue(), '14');
      await market().getByRole('button', { name: '+100', exact: true }).click();
      assert.equal(await market().locator('.pw-shop-qty').inputValue(), '50');
      await action('shop_reset');
      assert.equal(await market().locator('.pw-shop-qty').inputValue(), '1');
      await action('shop_max');
      assert.equal(await market().locator('.pw-shop-qty').inputValue(), '50');
      assert.equal(
        await market().locator('.pw-shop-qty').getAttribute('data-acceptance'),
        'stable-quantity',
      );
      await market().locator('.pw-shop-qty').fill('3');
      await market().screenshot({
        path: path.join(output, 'market-selected-quantity.png'),
      });
    },
  );
  await check(
    'unchanged live events perform zero market DOM mutations and never replace decoded sprites',
    async () => {
      await page.waitForFunction(() =>
        [...document.querySelectorAll('#fs-market img')].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      );
      const mutations = await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const root = document.querySelector('#fs-market');
        let records = 0;
        const observer = new MutationObserver(
          (changes) => (records += changes.length),
        );
        observer.observe(root, {
          attributes: true,
          childList: true,
          subtree: true,
          characterData: true,
        });
        SaveSystem.getInstance()
          .getCurrentSave()
          .currencies.add('questPoint', 0);
        await Promise.resolve();
        observer.disconnect();
        return records;
      });
      assert.equal(mutations, 0);
      return { mutations };
    },
  );
  await check(
    'a genuine three-Pokémon purchase pays once, stores unique UIDs and auto-joins only the first new species',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const system = SaveSystem.getInstance(),
          original = system.saveCurrent.bind(system);
        globalThis.__marketWrites = 0;
        system.saveCurrent = (...args) => {
          globalThis.__marketWrites++;
          return original(...args);
        };
      });
      await action('buy_btn');
      const facts = await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const save = SaveSystem.getInstance().getCurrentSave(),
          entries = save.collection
            .getAll()
            .filter((p) => p.species === 'bulbasaur');
        return {
          points: save.currencies.get('questPoint'),
          uids: entries.map((p) => p.uid),
          team: save.team.filter((p) => p.species === 'bulbasaur').length,
          canonical: save.team.every((p) => save.collection.get(p.uid) === p),
          level: entries.map((p) => p.level),
          writes: globalThis.__marketWrites,
          caught: save.pokedex.isCaught('bulbasaur'),
          caughtCredits: save.statistics.caughtTotal,
        };
      });
      assert.equal(facts.points, 47000);
      assert.equal(facts.uids.length, 3);
      assert.equal(new Set(facts.uids).size, 3);
      assert.equal(facts.team, 1);
      assert.equal(facts.canonical, true);
      assert.deepEqual(facts.level, [1, 1, 1]);
      assert.equal(facts.writes, 1);
      assert.equal(facts.caught, true);
      assert.equal(facts.caughtCredits, 0);
      assert.equal(await market().locator('.pw-shop-qty').inputValue(), '1');
      return facts;
    },
  );
  await check(
    'the full PC displays every purchased object, including its party reference, without duplicating ownership',
    async () => {
      await closeMarket();
      await page.locator('#win-shortcuts [data-panel="box_view"]').click();
      await page.locator('#fs-box').waitFor({ state: 'visible' });
      assert.equal(
        await page.locator('#fs-box .pw-pokemon-grid-entry').count(),
        4,
      );
      await page.locator('#fs-box .modal-close').click();
      await openMarket();
    },
  );
  await check(
    'an already owned species can be bought again into the PC, and a zero wallet keeps its quote visible',
    async () => {
      await market().locator('[data-species-id="bulbasaur"]').click();
      await market().locator('.pw-shop-qty').fill('2');
      await action('buy_btn');
      let raw = await state();
      assert.equal(
        raw.collection.filter((p) => p.species === 'bulbasaur').length,
        5,
      );
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const save = SaveSystem.getInstance().getCurrentSave();
        save.currencies.add('questPoint', -save.currencies.get('questPoint'));
        globalThis.__marketWrites = 0;
      });
      const before = await state();
      assert.equal(
        await market()
          .locator('[data-species-id="bulbasaur"] .pw-price-tag')
          .getAttribute('title'),
        '1 000',
      );
      await action('buy_btn');
      raw = await state();
      assert.equal(raw.collection.length, before.collection.length);
      assert.equal(raw.currencies.questPoint, 0);
      assert.equal(await page.evaluate(() => globalThis.__marketWrites), 0);
      await market().screenshot({
        path: path.join(output, 'market-zero-wallet.png'),
      });
    },
  );
  await check(
    'Johto uses the approved existing-encounter filtering: three starters and three other species',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { EventBus } = await import('/src/core/EventBus.js');
        const { LocationChangedEvent } = await import(
          '/src/core/events/LocationChangedEvent.js'
        );
        const save = SaveSystem.getInstance().getCurrentSave();
        save.player.region = 'johto';
        save.player.location = 'newbark';
        save.access.unlockRegionStarter('johto');
        EventBus.getInstance().dispatch(
          new LocationChangedEvent('johto', 'newbark'),
        );
      });
      assert.equal(await market().locator('.pw-market-row').count(), 6);
      assert.deepEqual(
        await market()
          .locator('.pw-market-row')
          .evaluateAll((rows) => rows.map((row) => row.dataset.speciesId)),
        ['chikorita', 'cyndaquil', 'totodile', 'espeon', 'umbreon', 'slowking'],
      );
      assert.equal(
        await market().locator('.pw-market-footer:visible').count(),
        0,
      );
      await market().screenshot({
        path: path.join(output, 'market-johto-6-offers.png'),
      });
    },
  );
  await check(
    'Hoenn preserves Castform and all four quotes while unseen names remain masked',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { EventBus } = await import('/src/core/EventBus.js');
        const { LocationChangedEvent } = await import(
          '/src/core/events/LocationChangedEvent.js'
        );
        const save = SaveSystem.getInstance().getCurrentSave();
        save.player.region = 'hoenn';
        save.player.location = 'littleroot';
        save.access.unlockRegionStarter('hoenn');
        save.currencies.add('questPoint', 50000);
        EventBus.getInstance().dispatch(
          new LocationChangedEvent('hoenn', 'littleroot'),
        );
      });
      assert.equal(await market().locator('.pw-market-row').count(), 4);
      assert.ok(
        (
          await market()
            .locator('[data-species-id="treecko"] .pw-manage-name')
            .textContent()
        ).includes('???'),
      );
      assert.equal(
        await market()
          .locator('[data-species-id="castform"] .pw-price-tag')
          .getAttribute('title'),
        '12 000',
      );
    },
  );
  await check(
    'a real controlled shiny purchase displays the golden owned ball and persists the acquired Pokémon',
    async () => {
      await page.evaluate(async () => {
        const { ShopSystem } = await import('/src/systems/ShopSystem.js');
        const { Random } = await import('/src/core/Random.js');
        ShopSystem.getInstance().setRandom(Random.sequence([0]));
      });
      await market().locator('[data-species-id="treecko"]').click();
      await action('buy_btn');
      assert.match(
        await market()
          .locator('[data-species-id="treecko"] .pw-market-ball')
          .getAttribute('src'),
        /Pokeball-shiny/,
      );
      assert.match(
        await market()
          .locator('[data-species-id="treecko"] .pw-poke-circle-img')
          .getAttribute('src'),
        /pokemon\/shiny\/treecko/,
      );
      assert.equal((await state()).currencies.questPoint, 44000);
      await market().screenshot({
        path: path.join(output, 'market-hoenn-shiny.png'),
      });
    },
  );
  await check(
    'English market labels, type pills and shared actions update in place at mobile width',
    async () => {
      await page.evaluate(async () => {
        const { LocalizationManager } = await import(
          '/src/localization/LocalizationManager.js'
        );
        LocalizationManager.getInstance().setLanguage('en');
      });
      await page.setViewportSize({ width: 390, height: 900 });
      assert.ok(
        await market()
          .getByRole('button', { name: 'Buy', exact: true })
          .isVisible(),
      );
      assert.equal(
        await market().locator('.pw-shop-qty').getAttribute('aria-label'),
        'Quantity to purchase',
      );
      assert.ok(
        (await market().locator('.pw-market-wallet').textContent()).includes(
          'Quest Points',
        ),
      );
      const bounds = await market().evaluate((root) => {
        const r = root.getBoundingClientRect();
        return {
          right: r.right,
          width: r.width,
          screen: innerWidth,
          overflow: root.scrollWidth > root.clientWidth + 1,
        };
      });
      assert.ok(bounds.right <= 390 + 0.5 && !bounds.overflow);
      await market().screenshot({
        path: path.join(output, 'market-english-390.png'),
      });
      return bounds;
    },
  );
  await check(
    'reload restores the paid wallet, shiny ownership and canonical UID references from actual storage',
    async () => {
      const expected = await state();
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator(`[id="save-card-${fixture.id}"]`).click();
      const actual = await state();
      assert.deepEqual(actual.collection, expected.collection);
      assert.deepEqual(actual.team, expected.team);
      assert.equal(
        actual.currencies.questPoint,
        expected.currencies.questPoint,
      );
      const facts = await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const save = SaveSystem.getInstance().getCurrentSave();
        return {
          canonical: save.team.every((p) => save.collection.get(p.uid) === p),
          gold: save.pokedex.getCaughtStatus('treecko'),
        };
      });
      assert.equal(facts.canonical, true);
      assert.equal(facts.gold, 'shiny');
      await page.setViewportSize({ width: 1560, height: 1120 });
    },
  );
  await check(
    'switching saves cannot carry a selected offer or charge another save',
    async () => {
      const facts = await page.evaluate(async (id) => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { ShopSystem } = await import('/src/systems/ShopSystem.js');
        const { Engine } = await import('/src/core/Engine.js');
        const saves = SaveSystem.getInstance();
        saves.loadSlot(id);
        Engine.getInstance().getPageManager().openPage('game');
        const save = saves.getCurrentSave(),
          before = save.serialize(),
          result = ShopSystem.getInstance().buyMarket('treecko', 8);
        return { before, after: save.serialize(), result };
      }, fixture.backupId);
      assert.deepEqual(facts.before, facts.after);
      assert.equal(facts.result, 'locked');
      assert.equal(
        await page.locator('#win-shortcuts [data-panel="market"]').count(),
        0,
      );
    },
  );
  await check(
    'empty and locked training slots fit narrow desktop columns, mobile screens and a constrained wide-screen panel',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { Engine } = await import('/src/core/Engine.js');
        const { LocalizationManager } = await import(
          '/src/localization/LocalizationManager.js'
        );
        LocalizationManager.getInstance().setLanguage('fr');
        const s = SaveSystem.getInstance().createNewSave(
          'Responsive training',
          'charmander',
        );
        s.tutorial.enabled = false;
        s.access.unlockFeature('training');
        for (const badge of [
          'brock',
          'misty',
          'surge',
          'erika',
          'koga',
          'sabrina',
          'blaine',
          'giovanni',
        ])
          s.player.earnBadge(badge);
        s.statistics.recordLeague('kanto');
        Engine.getInstance().getPageManager().openPage('game');
      });
      const checks = [];
      for (const width of [1560, 1100, 960, 860, 390, 320]) {
        await mobileTraining(width);
        const facts = await trainingBounds();
        assert.equal(facts.slots.length, 2);
        assert.deepEqual(facts.overflow, []);
        assert.equal(facts.bodyOverflow, 'visible');
        checks.push(facts);
        if ([960, 320].includes(width))
          await captureTraining(`training-empty-${width}.png`);
      }
      await page.setViewportSize({ width: 1560, height: 1120 });
      const style = await page.addStyleTag({
        content: '#win-training { width:210px; max-width:210px; }',
      });
      try {
        const facts = await trainingBounds();
        assert.ok(facts.panelWidth <= 210.5);
        assert.deepEqual(facts.overflow, []);
        checks.push(facts);
      } finally {
        await style.evaluate((e) => e.remove());
      }
      return checks;
    },
  );
  await check(
    'occupied training reflows every unlocked mode and long nickname without hiding or clipping actions',
    async () => {
      await page.evaluate(async () => {
        const { PokemonFactory } = await import(
          '/src/data/pokemon/PokemonFactory.js'
        );
        const { BoxSystem } = await import('/src/systems/BoxSystem.js');
        const { TrainingSystem } = await import(
          '/src/systems/TrainingSystem.js'
        );
        const pokemon = PokemonFactory.create('pidgey', 10);
        pokemon.nickname = 'TrèsLongNomSansEspacesEntraînement';
        BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true });
        globalThis.__trainee = pokemon.uid;
        TrainingSystem.getInstance().assignPokemon(0, pokemon.uid);
      });
      const checks = [];
      for (const width of [1560, 1100, 960, 860, 390, 320]) {
        await mobileTraining(width);
        const facts = await trainingBounds();
        assert.deepEqual(facts.overflow, []);
        assert.equal(
          await page
            .locator('#win-training .training-mode-row:visible')
            .count(),
          5,
        );
        assert.equal(
          await page
            .locator('#win-training .pw-facility-manage:visible')
            .count(),
          1,
        );
        checks.push(facts);
        if ([960, 320].includes(width))
          await captureTraining(`training-occupied-${width}.png`);
      }
      return checks;
    },
  );
  await check(
    'an actual active training battle remains byte-identical through desktop and mobile resize',
    async () => {
      const before = await page.evaluate(async () => {
        const { TrainingSystem } = await import(
          '/src/systems/TrainingSystem.js'
        );
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const system = TrainingSystem.getInstance();
        const result = system.startSession(globalThis.__trainee, 'level', 0);
        if (result.result !== 'ready') throw Error(JSON.stringify(result));
        system.update(0.37);
        SaveSystem.getInstance().saveCurrent();
        return SaveSystem.getInstance().getCurrentSave().training.serialize();
      });
      const checks = [];
      for (const width of [1100, 960, 860, 390, 320]) {
        await mobileTraining(width);
        const facts = await trainingBounds();
        assert.deepEqual(facts.overflow, []);
        assert.ok(
          await page
            .locator('#win-training')
            .getByRole('button', { name: 'Abandonner', exact: true })
            .isVisible(),
        );
        assert.deepEqual((await state()).training, before);
        checks.push(facts);
      }
      await captureTraining('training-active-320.png');
      return checks;
    },
  );
  await check(
    'a genuine engine-completed training result wraps at 320px and keeps the explicit removal control reachable',
    async () => {
      const result = await page.evaluate(async () => {
        const { TrainingSystem } = await import(
          '/src/systems/TrainingSystem.js'
        );
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const system = TrainingSystem.getInstance();
        for (let n = 0; n < 1500 && system.isActive(); n++) system.update(0.5);
        if (system.isActive())
          throw Error('Training did not finish within the rules timeout');
        return SaveSystem.getInstance().getCurrentSave().training.slots[0]
          .result;
      });
      assert.ok(result);
      const facts = await trainingBounds();
      assert.deepEqual(facts.overflow, []);
      assert.ok(
        await page
          .locator('#win-training .pw-training-result:visible')
          .isVisible(),
      );
      assert.ok(
        await page
          .locator('#win-training')
          .getByRole('button', { name: 'Retirer', exact: true })
          .isVisible(),
      );
      await captureTraining('training-result-320.png');
      return { result: result.result, success: result.success, bounds: facts };
    },
  );
  await check(
    'the town Shop still uses the unchanged selection, shared footer and money purchase flow',
    async () => {
      await page.setViewportSize({ width: 1560, height: 1120 });
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { EventBus } = await import('/src/core/EventBus.js');
        const { ModalOpenRequestedEvent } = await import(
          '/src/core/events/ModalOpenRequestedEvent.js'
        );
        const { ModalIds } = await import('/src/config/ModalIds.js');
        const s = SaveSystem.getInstance().getCurrentSave();
        s.player.region = 'kanto';
        s.player.location = 'pewter';
        s.currencies.add('money', 10000);
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.SHOP),
        );
      });
      await page.locator('#fs-shop').waitFor({ state: 'visible' });
      const before = await state();
      await page.locator('#fs-shop [data-offer-key="pokeball"]').click();
      await page.locator('#fs-shop .pw-shop-qty').fill('2');
      await page.locator('#fs-shop .pw-shop-qty').press('Tab');
      await page
        .locator('#fs-shop')
        .getByRole('button', { name: await label('buy_btn'), exact: true })
        .click();
      const after = await state();
      assert.equal(after.inventory.pokeball, before.inventory.pokeball + 2);
      assert.ok(after.currencies.money < before.currencies.money);
      assert.equal(after.currencies.questPoint, before.currencies.questPoint);
      await page
        .locator('#fs-shop')
        .screenshot({ path: path.join(output, 'shop-shared-flow.png') });
    },
  );
  await check(
    'the complete production browser run has no console error, warning or failed resource',
    async () => {
      assert.deepEqual(issues, []);
      return { issues };
    },
  );
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        browserVersion: browser.version(),
        fixtures:
          'Progression and RNG are explicitly prepared. Scheduled training/autosave ticks disabled; explicit commands, real saves, UI, events and combat engine retained.',
        johtoPolicy: 'main filters on unchanged Rework wild data: 6 offers',
        results,
        issues,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
