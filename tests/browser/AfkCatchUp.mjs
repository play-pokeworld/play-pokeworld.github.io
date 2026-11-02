/**
 * @file AfkCatchUp.mjs
 * @brief Real Chromium verification of the AFK window (1.16.3): the catch-up only replays what the
 *        player launched, the recap lists the real figures of that replay (same stat grid as the battle
 *        summary), and the debug shortcut goes through the same path.
 *
 * Run: npm start (in another terminal) then `node tests/browser/AfkCatchUp.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-afk');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
page.setDefaultTimeout(20000);

const results = [];
const issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`);
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  }
}

/** Raw localization keys leaking into a window (a missing translation). */
const RAW_KEY = /\b[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,3}\b/;

/** Text of the recap window, or '' when it is not on screen. */
const recapText = () => page.evaluate(() => {
  const overlay = document.querySelector('#pw-afk-summary-overlay');
  if (!overlay || overlay.getBoundingClientRect().height === 0) return '';
  return overlay.innerText;
});

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('a save with nothing running is left completely untouched', async () => {
    const result = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { FastForwardSystem } = await import('/src/systems/FastForwardSystem.js');
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('AFK Idle', 'charmander');
      save.tutorial.enabled = false;
      save.player.location = 'route1';
      save.team[0].hp = 1;
      Engine.getInstance().getPageManager().openPage('game');
      const money = save.currencies.get('money');
      const summary = FastForwardSystem.getInstance().triggerCatchUp(3 * 3600 * 1000);
      return {
        summary,
        moneyBefore: money,
        moneyAfter: save.currencies.get('money'),
        hp: save.team[0].hp,
        battleActive: BattleSystem.getInstance().isActive()
      };
    });
    await page.waitForTimeout(300);
    assert.equal(result.summary, null, 'nothing was replayed');
    assert.equal(result.moneyAfter, result.moneyBefore, 'no money granted');
    assert.equal(result.hp, 1, 'no free heal on return');
    assert.equal(result.battleActive, false, 'no battle invented');
    assert.equal(await recapText(), '', 'no window for an idle save');
    return 'idle absence -> nothing';
  });

  await check('the running battle is replayed and the recap lists its real figures', async () => {
    const result = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { FastForwardSystem } = await import('/src/systems/FastForwardSystem.js');
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const { EventBus } = await import('/src/core/EventBus.js');
      const { BattleStartedEvent } = await import('/src/core/events/BattleStartedEvent.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      save.team[0].setLevel(60);
      save.team[0].healFull();
      let started = 0;
      let wildDefeated = 0;
      const { PokemonDefeatedEvent } = await import('/src/core/events/PokemonDefeatedEvent.js');
      const unsubscribeDefeated = EventBus.getInstance().subscribe(PokemonDefeatedEvent, (event) => {
        if (event.wild) wildDefeated++;
      });
      const unsubscribe = EventBus.getInstance().subscribe(BattleStartedEvent, () => { started++; });
      const money = save.currencies.get('money');
      BattleSystem.getInstance().startBattle('route1', { chain: false });
      const session = BattleSystem.getInstance()._session;
      BattleSystem.getInstance().catchUp(0.5);
      const sameSession = BattleSystem.getInstance()._session === session;
      FastForwardSystem.getInstance().triggerCatchUp(10 * 60 * 1000);
      await new Promise((resolve) => setTimeout(resolve, 600));
      unsubscribe();
      unsubscribeDefeated();
      return {
        started,
        wildDefeated,
        sameSession,
        moneyGained: save.currencies.get('money') - money,
        battleActive: BattleSystem.getInstance().isActive()
      };
    });
    const text = await recapText();
    assert.equal(result.sameSession, true, 'the live session was continued, not re-rolled');
    assert.equal(result.started, 1, 'only the battle the player launched was started');
    assert.equal(result.battleActive, false, 'nothing else was started afterwards');
    assert.ok(text.length > 0, 'the recap window is on screen');
    assert.ok(/Combats/.test(text) && /Argent/.test(text), 'the shared stat grid is rendered');
    const wins = Number((text.match(/(\d+)\nCombats/) || [])[1]);
    assert.equal(wins, result.wildDefeated, 'the récap counts exactly the wild Pokémon that were defeated');
    assert.ok(wins > 0, 'a won battle no longer reports zero victories');
    assert.ok(/Durée/.test(text) && /Pokémon K\.O\./.test(text) && /Captures/.test(text), 'every historical row is there');
    assert.ok(/Énergie mine/.test(text) && /Entraînement/.test(text) && /Minages auto/.test(text), 'mine and training rows are there');
    assert.ok(/Pokémon capturés/.test(text) && /Objets trouvés/.test(text), 'captures and items sections are there');
    const status = await page.evaluate(() => {
      const node = document.querySelector('#pw-afk-summary-overlay .afk-result-status');
      return node ? { text: node.textContent, kind: node.className } : null;
    });
    assert.ok(status && status.text.length > 0, 'the recap shows a status pill');
    assert.ok(/success/.test(status.kind), 'a won battle reports the positive status');
    assert.ok(!RAW_KEY.test(text), 'no raw localization key in the recap');
    assert.ok(!/fatigue|usure/i.test(text), 'the removed fatigue line is gone');
    await page.screenshot({ path: path.join(output, 'afk-report.png') });
    return text.split('\n').slice(0, 6).join(' | ');
  });

  await check('the debug shortcut replays a 30-minute absence through the same path', async () => {
    const result = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { FastForwardSystem } = await import('/src/systems/FastForwardSystem.js');
      const { MineRules } = await import('/src/config/MineRules.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      save.mine.energy = 10;
      save.mine.lastEnergyAt = Date.now();
      const outcome = FastForwardSystem.getInstance().debugSkip(30 * 60 * 1000);
      const expected = Math.min(MineRules.MAX_ENERGY, 10 + 1800 * MineRules.ENERGY_REGEN_PER_SECOND);
      return { outcome, energy: save.mine.energy, expected };
    });
    await page.waitForTimeout(300);
    assert.ok(result.outcome, 'the shortcut ran');
    assert.equal(result.energy, Math.round(result.expected), 'the mine is credited by its own regeneration rule');
    return `mine energy ${result.energy} (rule-based)`;
  });

  await check('no console error or failed request during the whole run', async () => {
    assert.deepEqual(issues, [], 'the page stayed clean');
    return 'clean';
  });
} finally {
  const summary = {
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
    issues
  };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(summary, null, 2)).catch(() => {});
  await browser.close();
  console.log(`\n${summary.passed} PASS / ${summary.failed} FAIL`);
  if (summary.failed > 0 || issues.length > 0) process.exitCode = 1;
}
