/**
 * @file PanelFit.mjs
 * @brief Real Chromium verification of Rule §5: "every panel must fit its available width".
 *        No box, text or grid of a dashboard window may cross the window's own edge, at any width,
 *        for any location the player can stand on. Nothing is clipped: the content reflows.
 *
 * Run: npm start (in another terminal) then `node tests/browser/PanelFit.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-fit');
await fs.mkdir(output, { recursive: true });

/** Widths a player actually gets: wide desktop, narrow column, tablet, phone. */
const WIDTHS = [1440, 1280, 1100, 900, 768, 620, 480, 390, 360];
/** Locations covering every block the window can render (sanctuary, dungeon, drops, NPCs, roaming). */
const LOCATIONS = [
  'route1', 'pallet', 'cerulean', 'celadon',
  'desert_ruins', 'sky_pillar', 'mirage_island',
  'seafoamislands', 'safarizone', 'pokemonmansion', 'pokemontower', 'mtmoon'
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

/** Every element of a visible dashboard window that crosses the window's right or left edge. */
const measureWindows = () =>
  page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#main-dashboard .dash-win').forEach((win) => {
      const wr = win.getBoundingClientRect();
      if (wr.width === 0 || win.classList.contains('is-hidden')) return;
      const name = win.id || String(win.className).slice(0, 40);
      win.querySelectorAll('*').forEach((el) => {
        // A map surface is pannable by design (Rules §5) and SVG coordinates are not CSS pixels.
        if (el.closest('svg')) return;
        if (el.closest('.pw-map-surface, #map-svg, .map-viewport, .pw-map-viewport')) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        // A deliberately scrollable/pannable box clips its own content, it does not overflow the window.
        const scroller = el.parentElement && el.parentElement.closest('[data-pan], .pw-map-surface');
        if (scroller) return;
        const overRight = Math.round(r.right - wr.right);
        const overLeft = Math.round(wr.left - r.left);
        if (overRight > 1 || overLeft > 1) {
          out.push(`${name}: ${String(el.className).slice(0, 48)} (+${overRight}px right, +${overLeft}px left)`);
        }
      });
    });
    return [...new Set(out)];
  });

const travel = (locationId, region) =>
  page.evaluate(async ([id, reg]) => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { EventBus } = await import('/src/core/EventBus.js');
    const { LocationChangedEvent } = await import('/src/core/events/LocationChangedEvent.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    save.player.location = id;
    save.player.region = reg;
    EventBus.getInstance().dispatch(new LocationChangedEvent(reg, id, { deferSave: true }));
  }, [locationId, region]);

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  const regions = await check('a save is created with a full team, items and a boxed Pokémon', async () => {
    return page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      const { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js');
      const { TeamSystem } = await import('/src/systems/TeamSystem.js');
      const { BoxSystem } = await import('/src/systems/BoxSystem.js');
      const { LocationDB } = await import('/src/data/world/LocationDB.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('Panel Fit', 'charmander');
      save.tutorial.enabled = false;
      save.player.location = 'route1';
      save.inventory.add('rarecandy', 3, { deferSave: true });
      save.inventory.add('pokeball', 5, { deferSave: true });
      for (const species of ['pikachu', 'bulbasaur']) {
        const pokemon = PokemonFactory.create(species, 12);
        BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true });
        TeamSystem.getInstance().addMember(pokemon.uid, { persist: true, notify: false });
      }
      Engine.getInstance().getPageManager().openPage('game');
      return Object.fromEntries(LocationDB.getInstance().getAll().map((l) => [l.id, l.region]));
    });
  });

  await check('the location window fits every width, for every representative location', async () => {
    const problems = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1400 });
      await page.waitForTimeout(280);
      for (const id of LOCATIONS) {
        const region = regions[id] || 'kanto';
        await travel(id, region);
        await page.waitForTimeout(90);
        const found = await measureWindows();
        for (const entry of found) problems.push(`${width}px ${id}: ${entry}`);
      }
    }
    assert.deepEqual(problems.slice(0, 12), [], `windows overflow their own box:\n${problems.slice(0, 12).join('\n')}`);
    return `${WIDTHS.length} widths x ${LOCATIONS.length} locations`;
  });

  await check('the sanctuary card reflows instead of widening the window', async () => {
    await page.setViewportSize({ width: 900, height: 1400 });
    await travel('desert_ruins', 'hoenn');
    await page.waitForTimeout(300);
    const fact = await page.evaluate(() => {
      const card = document.querySelector('.pw-loc-sanctuary-card');
      const button = card?.querySelector('.pw-loc-sanctuary-row-action .pw-btn');
      if (!card || !button) return { missing: true };
      const info = document.querySelector('.pw-loc-info');
      const cr = card.getBoundingClientRect();
      const br = button.getBoundingClientRect();
      const ir = info.getBoundingClientRect();
      return {
        cardInsidePanel: Math.round(cr.right) <= Math.round(ir.right) + 1,
        buttonInsideCard: Math.round(br.right) <= Math.round(cr.right) + 1,
        buttonWidth: Math.round(br.width),
        cardWidth: Math.round(cr.width),
        scrollOverflow: info.scrollWidth - info.clientWidth,
      };
    });
    assert.ok(!fact.missing, 'the sanctuary card is displayed at Regirock ruins');
    assert.ok(fact.cardInsidePanel, 'the card stays inside the location window');
    assert.ok(fact.buttonInsideCard, 'the Forger/Invoquer button stays inside the card');
    assert.ok(fact.buttonWidth <= fact.cardWidth, 'the action button is never wider than its card');
    assert.equal(fact.scrollOverflow, 0, 'the location content has no horizontal overflow');
    await page.screenshot({ path: path.join(output, 'sanctuary-900.png'), fullPage: true });
    return fact;
  });

  await check('the sanctuary card keeps its action reachable at phone width', async () => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.waitForTimeout(350);
    const fact = await page.evaluate(() => {
      const button = document.querySelector('.pw-loc-sanctuary-row-action .pw-btn');
      const r = button.getBoundingClientRect();
      const panel = document.getElementById('right-panel').getBoundingClientRect();
      return {
        visible: r.width > 0 && r.height > 0,
        insidePanel: Math.round(r.right) <= Math.round(panel.right) + 1,
        height: Math.round(r.height),
      };
    });
    assert.ok(fact.visible, 'the button is rendered');
    assert.ok(fact.insidePanel, 'and reachable inside the window');
    assert.ok(fact.height >= 24, 'with a tappable height');
    await page.screenshot({ path: path.join(output, 'sanctuary-390.png'), fullPage: true });
    return fact;
  });

  await check('the page itself never scrolls horizontally', async () => {
    const problems = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1400 });
      await page.waitForTimeout(220);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) problems.push(`${width}px: +${over}px`);
    }
    assert.deepEqual(problems, [], 'horizontal page scroll');
    return 'no horizontal scroll';
  });

  await check('switching to English, whose labels are longer, keeps every panel inside its box', async () => {
    await page.setViewportSize({ width: 900, height: 1400 });
    await travel('desert_ruins', 'hoenn');
    await page.waitForTimeout(250);
    await page.evaluate(async () => {
      (await import('/src/localization/LocalizationManager.js')).LocalizationManager.getInstance().setLanguage('en');
    });
    await page.waitForTimeout(250);
    const found = await measureWindows();
    assert.deepEqual(found.slice(0, 10), [], 'english labels overflow');
    await page.screenshot({ path: path.join(output, 'sanctuary-900-en.png'), fullPage: true });
    return 'english fits too';
  });

  await check('no console error during the whole sweep', async () => {
    assert.deepEqual(issues, [], 'browser console is clean');
    return 'clean';
  });

  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, issues }, null, 2));
  console.log(`\n${results.length} checks passed`);
} finally {
  await browser.close();
}
