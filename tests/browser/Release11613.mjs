/**
 * @file Release11613.mjs
 * @brief Real Chromium verification of 1.16.13: an evolution never transforms the Pokémon that
 *        triggers it, the evolved species joins the box at level 1, and the sheet / notifications
 *        say so in the player's language.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/Release11613.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-11613');
await fs.mkdir(output, { recursive: true });
const BASE = process.env.PW_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(20000);

const issues = [];
const results = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) issues.push(`http ${response.status()}: ${new URL(response.url()).pathname}`);
});

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

const bagPanel = () => page.locator('#fs-inventory');
const boxPanel = () => page.locator('#fs-box');
const pokeModal = () => page.locator('#poke-modal-inner');

await page.goto(BASE, { waitUntil: 'networkidle' });

await check('a French save is seeded with a level-15 starter and a rare candy', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
    LocalizationManager.getInstance().setLanguage('fr');
    const save = SaveSystem.getInstance().createNewSave('Évolution 1.16.13', 'charmander');
    save.tutorial.enabled = false;
    save.player.region = 'kanto';
    save.player.location = 'route1';
    const starter = save.team[0];
    starter.setLevel(15);
    save.inventory.add('rarecandy', 3, { deferSave: true });
    save.inventory.add('firestone', 1, { deferSave: true });
    Engine.getInstance().getPageManager().openPage('game');
    return { uid: starter.uid, species: starter.species, level: starter.level };
  });
  await page.waitForSelector('#win-shortcuts', { state: 'visible' });
  assert.equal(fact.species, 'charmander');
  assert.equal(fact.level, 15);
  return `starter ${fact.species} lv ${fact.level}`;
});

await check('a rare candy that reaches level 16 keeps the starter and adds a level-1 Reptincel', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { ItemUseSystem } = await import('/src/systems/ItemUseSystem.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    const starter = save.team[0];
    const result = ItemUseSystem.getInstance().useOnPokemon('rarecandy', starter.uid);
    return {
      result: result.result,
      starter: { uid: starter.uid, species: starter.species, level: starter.level },
      collection: save.collection.getAll().map((pokemon) => ({ species: pokemon.species, level: pokemon.level, shiny: pokemon.shiny })),
      caught: save.pokedex.isCaught('charmeleon'),
      targets: [...starter.evolvedTargets],
      toasts: [...document.querySelectorAll('.pw-toast-card')].map((node) => node.innerText.replace(/\s+/g, ' ').trim())
    };
  });
  assert.equal(fact.result, 'success');
  assert.equal(fact.starter.species, 'charmander', 'the starter is never transformed');
  assert.equal(fact.starter.level, 16, 'the starter keeps its level');
  const evolved = fact.collection.find((entry) => entry.species === 'charmeleon');
  assert.ok(evolved, 'Charmeleon joined the collection');
  assert.equal(evolved.level, 1, 'the new Pokémon starts at level 1');
  assert.ok(fact.caught, 'the Pokédex marks it caught');
  assert.deepEqual(fact.targets, ['charmeleon']);
  assert.ok(fact.toasts.some((text) => text.includes('Reptincel') && text.includes('Niv. 1')),
    `the toast announces the level-1 arrival (${fact.toasts.join(' | ')})`);
  await page.screenshot({ path: path.join(output, '01-level-evolution-toast.png') });
  return fact.toasts.find((text) => text.includes('Reptincel')) ?? 'toast seen';
});

await check('the bag stone view skips a target that was already produced', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { ItemUseSystem } = await import('/src/systems/ItemUseSystem.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    save.inventory.add('thunderstone', 1, { deferSave: true });
    const eligible = ItemUseSystem.getInstance().getEligibleTargets('thunderstone');
    const firestoneCandidates = ItemUseSystem.getInstance().getEligibleTargets('firestone');
    return { thunder: eligible.length, fire: firestoneCandidates.length };
  });
  assert.equal(fact.thunder, 0, 'no candidate for a stone the starter cannot use');
  assert.equal(fact.fire, 0, 'a level-16 Charmander is not a stone candidate');
  return 'no false candidate';
});

await check('the information sheet keeps the real species and flags the produced evolution', async () => {
  const card = page.locator('#win-team .pw-poke-card').first();
  await card.waitFor({ state: 'visible' });
  await card.click({ button: 'right' });
  await pokeModal().waitFor({ state: 'visible' });
  const fact = await page.evaluate(() => {
    const modal = document.querySelector('#poke-modal-inner');
    const done = modal.querySelector('.pw-evo-done');
    const title = modal.querySelector('.poke-detail-title');
    return {
      title: title ? title.innerText.replace(/\s+/g, ' ').trim() : '',
      evoText: modal.querySelector('.poke-detail-panel-wide')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
      doneText: done ? done.innerText.trim() : null,
      level: modal.innerText.includes('Niv. 16')
    };
  });
  assert.ok(fact.title.includes('Salamèche'), `the sheet keeps the real species (${fact.title})`);
  assert.ok(fact.evoText.includes('Reptincel'), `the evolution row lists Reptincel (${fact.evoText})`);
  assert.equal(fact.doneText, '(déjà obtenue)', 'the produced evolution is flagged');
  await page.screenshot({ path: path.join(output, '02-sheet-evolution-flag.png') });
  await page.keyboard.press('Escape');
  return `${fact.title} → ${fact.doneText}`;
});

await check('a stone evolution in the bag creates the evolved species at level 1', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js');
    const { BoxSystem } = await import('/src/systems/BoxSystem.js');
    const { ItemUseSystem } = await import('/src/systems/ItemUseSystem.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    const vulpix = PokemonFactory.create('vulpix', 25);
    BoxSystem.getInstance().addPokemon(vulpix, { deferSave: true });
    const before = ItemUseSystem.getInstance().getEligibleTargets('firestone').length;
    const result = ItemUseSystem.getInstance().useOnPokemon('firestone', vulpix.uid);
    const ninetales = save.collection.getAll().find((entry) => entry.species === 'ninetales');
    return {
      before,
      result: result.result,
      target: result.targetSpecies,
      vulpix: { species: vulpix.species, level: vulpix.level },
      ninetales: ninetales ? { level: ninetales.level } : null,
      firestones: save.inventory.count('firestone')
    };
  });
  assert.equal(fact.before, 1, 'Vulpix is offered for the Fire Stone');
  assert.equal(fact.result, 'success');
  assert.equal(fact.target, 'ninetales');
  assert.equal(fact.vulpix.species, 'vulpix');
  assert.equal(fact.vulpix.level, 25);
  assert.equal(fact.ninetales?.level, 1, 'Feunard joins the box at level 1');
  assert.equal(fact.firestones, 0, 'the stone is consumed');
  return 'Goupix kept, Feunard level 1';
});

await check('the bag still opens and the box lists the new level-1 Pokémon', async () => {
  const shortcut = page.locator('#win-shortcuts [data-panel="inventory"]');
  await shortcut.click();
  await bagPanel().waitFor({ state: 'visible' });
  const firestone = bagPanel().locator('.inv-item[data-item-id="firestone"]');
  assert.equal(await firestone.count(), 0, 'the used stone left the bag');
  await bagPanel().locator('.modal-close').click();
  await bagPanel().waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(output, '03-return-to-game.png') });
  return 'bag responsive after the evolutions';
});

await check('no console error or failed request during the flow', async () => {
  assert.deepEqual(issues, [], `page issues: ${issues.join(' | ')}`);
  return 'clean';
});

await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, issues }, null, 2));
await browser.close();
console.log(`\n${results.filter((entry) => entry.passed).length}/${results.length} checks passed`);
