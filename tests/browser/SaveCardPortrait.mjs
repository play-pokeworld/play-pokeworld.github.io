/**
 * @file SaveCardPortrait.mjs
 * @brief Real Chromium verification of 1.16.9: the save card shows an OWNED POKÉMON chosen from the
 *        PC box, never an NPC/trainer portrait (main-game behaviour).
 *
 * Flow driven exactly like a player: Settings → profile section → "choose" → picker → pick a boxed
 * Pokémon → the card preview changes → "Apply" → the save menu card shows that Pokémon after a reload.
 *
 * Run: npm start (in another terminal) then `node tests/browser/SaveCardPortrait.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-save-portrait');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1300 } });
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

/** Everything a save card renders about its portrait. */
const readCard = (selector) =>
  page.evaluate((sel) => {
    const card = document.querySelector(sel);
    if (!card) return { missing: true };
    const icon = card.querySelector('.save-slot-icon');
    const img = icon?.querySelector('img');
    return {
      src: img?.getAttribute('src') || '',
      alt: img?.getAttribute('alt') || '',
      isPokemonSprite: !!icon?.querySelector('.pw-poke-circle-wrap.pw-poke-circle-wrap--large'),
      trainerPortrait: !!icon && !!img && String(img.getAttribute('src')).includes('images/trainers/'),
      placeholder: !!icon?.querySelector('.save-slot-icon-missing-mark')
    };
  }, selector);

let boxed = null;

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  boxed = await check('a save exists with a starter and two boxed Pokémon', async () => {
    const fact = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js');
      const { BoxSystem } = await import('/src/systems/BoxSystem.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('Portrait', 'charmander');
      save.tutorial.enabled = false;
      const pokemon = [PokemonFactory.create('bulbasaur', 10), PokemonFactory.create('squirtle', 7)];
      for (const entry of pokemon) BoxSystem.getInstance().addPokemon(entry, { deferSave: true });
      Engine.getInstance().getPageManager().openPage('game');
      return {
        saveId: save.id,
        starterUid: save.player.avatarPokemonUid,
        boxed: pokemon.map((entry) => ({ uid: entry.uid, species: entry.species }))
      };
    });
    assert.equal(fact.boxed.length, 2, 'two Pokémon sit in the PC box');
    assert.ok(fact.starterUid, 'a new save already stores its starter as the card portrait');
    await page.waitForSelector('#win-shortcuts', { state: 'visible' });
    return fact;
  });

  await check('the settings portrait field offers a Pokémon, not an NPC image', async () => {
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS));
    });
    await page.waitForSelector('#settings-window .save-profile-portrait', { state: 'visible' });
    const field = await page.evaluate(() => {
      const section = document.querySelector('#save-profile-section');
      const portrait = section.querySelector('.save-profile-portrait');
      return {
        hasPortrait: !!portrait,
        sprite: !!portrait?.querySelector('.pw-poke-circle-wrap'),
        trainerImage: !!portrait && String(portrait.innerHTML).includes('images/trainers/'),
        selects: section.querySelectorAll('select').length,
        npcOption: [...section.querySelectorAll('option')].some((o) => /Red|Leaf|Gamin|Gentleman/i.test(o.textContent || '')),
        button: !!portrait?.querySelector('button')
      };
    });
    assert.ok(field.hasPortrait, 'the portrait field exists');
    assert.ok(field.sprite, 'it shows a Pokémon sprite');
    assert.equal(field.trainerImage, false, 'no trainer/NPC image in the field');
    assert.equal(field.npcOption, false, 'no NPC portrait option anywhere in the profile section');
    assert.ok(field.button, 'a button opens the picker');
    await page.screenshot({ path: path.join(output, '01-settings-portrait.png') });
    return field;
  });

  await check('the picker lists every owned Pokémon (team and PC box)', async () => {
    await page.locator('#save-profile-section .save-profile-portrait button').click();
    await page.waitForSelector('#pw-save-icon-picker .pw-save-icon-picker-grid', { state: 'visible' });
    await page.waitForTimeout(300);
    const fact = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#pw-save-icon-picker .pw-save-icon-tile')];
      return {
        count: tiles.length,
        alt: tiles.map((tile) => tile.querySelector('img')?.getAttribute('alt') || ''),
        pressed: tiles.filter((tile) => tile.getAttribute('aria-pressed') === 'true').length,
        hasSearch: !!document.querySelector('#pw-save-icon-picker #save-icon-picker-search')
      };
    });
    assert.equal(fact.count, 3, `the starter and the two boxed Pokémon are listed (got ${fact.count})`);
    assert.equal(fact.pressed, 1, 'the current choice is marked');
    assert.ok(fact.hasSearch, 'the picker can be searched');
    await page.screenshot({ path: path.join(output, '02-picker.png') });
    return fact.alt.join(', ');
  });

  await check('the search field filters the list without losing focus', async () => {
    const field = page.locator('#pw-save-icon-picker #save-icon-picker-search');
    await field.fill('bulba');
    await page.waitForTimeout(250);
    const filtered = await page.evaluate(() => ({
      tiles: document.querySelectorAll('#pw-save-icon-picker .pw-save-icon-tile').length,
      focused: document.activeElement?.id || '',
      count: document.querySelector('#pw-save-icon-picker .pw-save-icon-picker-toolbar .pw-text-sm')?.textContent || ''
    }));
    assert.equal(filtered.tiles, 1, 'only the matching Pokémon is listed');
    assert.equal(filtered.focused, 'save-icon-picker-search', 'the field keeps the focus while filtering');
    await field.fill('zzzz');
    await page.waitForTimeout(250);
    const empty = await page.evaluate(() => ({
      tiles: document.querySelectorAll('#pw-save-icon-picker .pw-save-icon-tile').length,
      message: document.querySelector('#pw-save-icon-picker .pw-empty-state-md')?.textContent || ''
    }));
    assert.equal(empty.tiles, 0, 'no tile for an unknown name');
    assert.ok(empty.message.length > 0, 'an explicit empty message is shown');
    await field.fill('');
    await page.waitForTimeout(250);
    const restored = await page.evaluate(() => document.querySelectorAll('#pw-save-icon-picker .pw-save-icon-tile').length);
    assert.equal(restored, 3, 'clearing the search restores every Pokémon');
    return `filtered ${filtered.count}`;
  });

  await check('choosing a boxed Pokémon updates the card preview immediately', async () => {
    const target = boxed.boxed[0];
    await page.locator(`#pw-save-icon-picker .pw-save-icon-tile[data-focus-key="save-icon-${target.uid}"]`).click();
    await page.waitForTimeout(300);
    const preview = await readCard('#save-profile-section .save-profile-preview .save-slot');
    assert.ok(preview.isPokemonSprite, 'the preview draws a Pokémon sprite');
    assert.equal(preview.trainerPortrait, false, 'the preview never falls back to an NPC portrait');
    assert.ok(preview.src.includes(`/pokemon/${target.species}`), `the preview shows ${target.species}, got ${preview.src}`);
    await page.screenshot({ path: path.join(output, '03-preview.png') });
    return preview.src;
  });

  await check('a large collection stays inside the modal and scrolls', async () => {
    await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js');
      const { BoxSystem } = await import('/src/systems/BoxSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      for (let index = 0; index < 120; index++) {
        const pokemon = PokemonFactory.create('rattata', 3 + (index % 20));
        BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true });
      }
      void save;
    });
    // A laptop viewport: the list must scroll while the search field stays reachable.
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.locator('#save-profile-section .save-profile-portrait button').click();
    await page.waitForSelector('#pw-save-icon-picker .pw-save-icon-picker-grid', { state: 'visible' });
    await page.waitForTimeout(400);
    const fact = await page.evaluate(() => {
      const modal = document.querySelector('#pw-save-icon-picker');
      const list = modal.querySelector('.pw-save-icon-picker-list');
      const rect = modal.getBoundingClientRect();
      list.scrollTop = list.scrollHeight;
      const search = document.querySelector('#save-icon-picker-search').getBoundingClientRect();
      return {
        tiles: modal.querySelectorAll('.pw-save-icon-tile').length,
        insideViewport: rect.top >= -1 && rect.bottom <= window.innerHeight + 1,
        scrolls: list.scrollHeight > list.clientHeight + 1,
        searchVisible: search.top >= 0 && search.bottom <= window.innerHeight
      };
    });
    assert.ok(fact.tiles >= 123, `every owned Pokémon is listed (${fact.tiles})`);
    assert.ok(fact.insideViewport, 'the picker never grows past the viewport');
    assert.ok(fact.scrolls, 'the grid scrolls instead of stretching the window');
    assert.ok(fact.searchVisible, 'the search field stays reachable while the grid scrolls');
    await page.screenshot({ path: path.join(output, '03b-large-collection.png') });
    await page.locator('#pw-save-icon-picker .pw-modal-close-btn').click();
    await page.setViewportSize({ width: 1440, height: 1300 });
    await page.waitForTimeout(300);
    return `${fact.tiles} tiles, scrollable`;
  });

  await check('applying persists the choice and the save-menu card shows that Pokémon', async () => {
    await page.locator('#save-profile-section .save-profile-apply-row button').click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(async (uid) => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      return { inMemory: save.player.avatarPokemonUid, expected: uid };
    }, boxed.boxed[0].uid);
    assert.equal(stored.inMemory, boxed.boxed[0].uid, 'the chosen uid is stored on the player');

    // Close the settings window and go back to the save menu: the card must read the persisted save.
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(ModalIds.SETTINGS));
    });
    await page.waitForTimeout(250);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.save-menu-list .save-slot', { state: 'visible' });
    const card = await readCard('.save-menu-list .save-slot');
    assert.equal(card.trainerPortrait, false, 'the menu card shows no NPC portrait');
    assert.ok(card.isPokemonSprite, 'the menu card draws a Pokémon sprite');
    assert.ok(card.src.includes(`/pokemon/${boxed.boxed[0].species}`), `the menu card shows ${boxed.boxed[0].species}, got ${card.src}`);
    await page.screenshot({ path: path.join(output, '04-save-menu.png') });
    return card.src;
  });

  await check('the resolution order holds: chosen, then lead, then first owned, then placeholder', async () => {
    const fact = await page.evaluate(async () => {
      const { SaveCard } = await import('/src/ui/SaveCard.js');
      const lead = { uid: 'u-lead', species: 'charmander' };
      const boxed = { uid: 'u-box', species: 'bulbasaur' };
      const collection = {
        get: (uid) => [lead, boxed].find((entry) => entry.uid === uid) || null,
        getAll: () => [lead, boxed]
      };
      const run = (player, team) => SaveCard.resolveAvatarPokemon({ player, team, collection })?.species || null;
      return {
        chosen: run({ avatarPokemonUid: 'u-box' }, ['u-lead']),
        released: run({ avatarPokemonUid: 'u-gone' }, ['u-lead']),
        noTeam: run({ avatarPokemonUid: '' }, []),
        none: SaveCard.resolveAvatarPokemon({
          player: { avatarPokemonUid: '' }, team: [],
          collection: { get: () => null, getAll: () => [] }
        })
      };
    });
    assert.equal(fact.chosen, 'bulbasaur', "the player's choice wins");
    assert.equal(fact.released, 'charmander', 'a released portrait falls back to the team lead');
    assert.equal(fact.noTeam, 'charmander', 'with no party the first owned Pokémon is used');
    assert.equal(fact.none, null, 'a save with no owned Pokémon resolves nothing (explicit placeholder)');
    return JSON.stringify(fact);
  });

  await check('no console error during the whole run', async () => {
    assert.deepEqual(issues, [], 'browser console is clean');
    return 'clean';
  });

  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, issues }, null, 2));
  console.log(`\n${results.length} checks passed`);
} finally {
  await browser.close();
}
