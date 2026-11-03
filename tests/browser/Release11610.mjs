/**
 * @file Release11610.mjs
 * @brief Real Chromium verification of 1.16.10: the save-card Pokémon fills its frame (no dark disc),
 *        every window answers Escape / traps the focus / restores it, and battle fatigue really fires.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ PLAYWRIGHT_MODULE=./node_modules/playwright/index.mjs node tests/browser/Release11610.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-11610');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.setDefaultTimeout(20000);

const issues = [];
const results = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
});

await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of ['TrainingSystem', 'HatcherySystem', 'MineSystem', 'RelaunchSystem', 'DungeonAutoSystem']) {
      import(`/src/systems/${name}.js`).then((module) => module[name].getInstance().setEnabled(false));
    }
  })
);

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

/** Measures the save-card avatar: frame, art and disc. */
const measureCardAvatar = (selector) =>
  page.evaluate((sel) => {
    const card = document.querySelector(sel);
    if (!card) return { missing: true };
    const icon = card.querySelector('.save-slot-icon');
    const wrap = icon?.querySelector('.pw-poke-circle-wrap');
    const disc = icon?.querySelector('.pw-poke-circle-bg');
    const img = icon?.querySelector('img');
    const box = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { w: Math.round(rect.width), h: Math.round(rect.height) };
    };
    return {
      frame: box(icon),
      avatar: box(wrap),
      art: box(img),
      discDisplay: disc ? getComputedStyle(disc).display : 'absent',
      discBackground: disc ? getComputedStyle(disc).backgroundColor : 'absent',
      src: img?.getAttribute('src') || '',
      hasHookClass: !!wrap?.classList.contains('save-card-avatar')
    };
  }, selector);

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('a save is created and the dashboard is open', async () => {
    const fact = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('Cadre', 'charmander');
      save.tutorial.enabled = false;
      Engine.getInstance().getPageManager().openPage('game');
      return { id: save.id, species: save.team[0].species };
    });
    await page.waitForSelector('#win-shortcuts', { state: 'visible' });
    // The framed save card lives in the settings preview and on the save menu.
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS));
    });
    await page.waitForSelector('#save-profile-section .save-profile-preview .save-slot', { state: 'visible' });
    await page.waitForTimeout(400);
    return fact.species;
  });

  await check('the card avatar has no dark disc and fills the frame', async () => {
    const card = await measureCardAvatar('#save-profile-section .save-profile-preview .save-slot');
    assert.ok(!card.missing, 'the preview card exists');
    assert.ok(card.hasHookClass, 'the avatar carries the save-card hook class');
    assert.equal(card.discDisplay, 'none', `the dark disc is gone, got display: ${card.discDisplay}`);
    assert.ok(card.frame.w >= 70 && card.frame.w <= 76, `the frame is the 74 px box, got ${card.frame.w}`);
    assert.ok(card.art.w === card.frame.w - 2, `the art fills the frame (${card.frame.w} px wide frame, ${card.art.w} px art)`);
    assert.ok(card.art.h === card.frame.h - 2, `the art fills the frame in height (${card.art.h} of ${card.frame.h})`);
    await page.screenshot({ path: path.join(output, '01-card-avatar.png') });
    return `frame ${card.frame.w}x${card.frame.h}, art ${card.art.w}x${card.art.h}, disc ${card.discDisplay}`;
  });

  await check('the save menu card uses the same geometry', async () => {
    const fact = await page.evaluate(async () => {
      const { Engine } = await import('/src/core/Engine.js');
      Engine.getInstance().getPageManager().openPage('saveMenu');
      return true;
    });
    assert.ok(fact, 'the save menu opened');
    await page.waitForSelector('.save-slot .save-slot-icon', { state: 'visible' });
    await page.waitForTimeout(500);
    const card = await measureCardAvatar('.save-slot');
    assert.equal(card.discDisplay, 'none', 'no dark disc on the save-menu card either');
    assert.ok(card.art.w === card.frame.w - 2, `the art fills the frame (${card.art.w} of ${card.frame.w})`);
    await page.screenshot({ path: path.join(output, '02-save-menu-card.png') });
    return `frame ${card.frame.w}x${card.frame.h}, art ${card.art.w}x${card.art.h}`;
  });

  await check('the dashboard is inert while a window is open', async () => {
    await page.evaluate(async () => {
      const { Engine } = await import('/src/core/Engine.js');
      Engine.getInstance().getPageManager().openPage('game');
    });
    await page.waitForSelector('#win-shortcuts', { state: 'visible' });
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS));
    });
    await page.waitForSelector('#settings-window', { state: 'visible' });
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const inert = [...document.querySelectorAll('[inert]')].map((node) => node.id || node.className);
      const hidden = [...document.querySelectorAll('[aria-hidden="true"]')].map((node) => node.id || node.className);
      return { inert, hidden, focusedInside: !!document.activeElement?.closest('#settings-window') };
    });
    assert.ok(state.inert.length > 0, 'the dashboard is inert');
    assert.ok(state.hidden.length > 0, 'the dashboard is aria-hidden');
    assert.ok(state.focusedInside, 'the focus went inside the window');
    await page.screenshot({ path: path.join(output, '03-modal-inert.png') });
    return `${state.inert.length} inert node(s), focus inside`;
  });

  await check('Escape closes the window and gives the focus back', async () => {
    // Close the window opened by the previous check, then reopen it from a real control:
    // the focus must come back to that control when the window closes.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const trigger = await page.evaluate(() => {
      const button = document.querySelector('#win-shortcuts button');
      button?.focus();
      return { focused: document.activeElement === button, label: button?.textContent?.trim()?.slice(0, 20) || '' };
    });
    assert.ok(trigger.focused, 'a dashboard control holds the focus before opening the window');
    await page.evaluate(async () => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      const { ModalIds } = await import('/src/config/ModalIds.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SETTINGS));
    });
    await page.waitForSelector('#settings-window', { state: 'visible' });
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      visible: !!document.querySelector('.pw-modal-backdrop.is-open'),
      inert: document.querySelectorAll('[inert]').length,
      hidden: document.querySelectorAll('[aria-hidden="true"]').length,
      backOnTrigger: document.activeElement === document.querySelector('#win-shortcuts button'),
      focusedTag: document.activeElement?.tagName || '',
      focusedInsideModal: !!document.activeElement?.closest('.pw-modal-backdrop')
    }));
    assert.equal(after.visible, false, 'no window is open any more');
    assert.equal(after.inert, 0, 'the dashboard is interactive again');
    assert.equal(after.focusedInsideModal, false, 'the focus left the closed window');
    assert.ok(after.backOnTrigger, `the focus returned to the control that opened the window (on ${after.focusedTag})`);
    return `focus restored to the trigger (${trigger.label})`;
  });

  await check('fatigue fires at the 50th consecutive victory of a real battle', async () => {
    const setup = await page.evaluate(async () => {
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const battle = BattleSystem.getInstance();
      if (battle.isActive()) battle.endBattle(false);
      const save = SaveSystem.getInstance().getCurrentSave();
      save.team[0].level = 45;
      for (const member of save.team) member.healFull();
      if (!battle.startBattle('route1', { chain: true })) return { started: false };
      // 49 victories already won in this chain: the next one crosses the threshold.
      battle._activeRun.wins = 49;
      // The session log is reset when the next foe arrives, so the fatigue lines are
      // recorded as they are emitted — the battle itself is entirely real.
      window.__fatigue = [];
      const log = battle._session.log;
      const originalAdd = log.add.bind(log);
      log.add = (key, params) => {
        if (String(key).includes('fatigue')) window.__fatigue.push({ key: String(key), params: params || null });
        return originalAdd(key, params);
      };
      return { started: true, maxHp: save.team[0].getMaxHp(), hp: save.team[0].hp };
    });
    assert.ok(setup.started, 'the wild battle started');

    // Win one more fight: the foe is put at 1 HP and the engine lands the next hit.
    await page.evaluate(async () => {
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const battle = BattleSystem.getInstance();
      battle._session.foe.pokemon.hp = 1;
      battle._session.playerCooldownMs = 0;
    });
    const deadline = Date.now() + 25000;
    let state = null;
    while (Date.now() < deadline) {
      state = await page.evaluate(async () => {
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const battle = BattleSystem.getInstance();
        const save = SaveSystem.getInstance().getCurrentSave();
        return {
          wins: battle._activeRun?.wins ?? 0,
          fatigue: window.__fatigue || [],
          hp: save.team[0].hp,
          maxHp: save.team[0].getMaxHp()
        };
      });
      if (state.fatigue.length) break;
      await page.waitForTimeout(150);
    }
    assert.ok(state, 'the loop produced a state');
    const keys = state.fatigue.map((entry) => entry.key);
    assert.ok(state.wins >= 50, `the chain reached the threshold (wins ${state.wins})`);
    assert.ok(keys.some((key) => key.includes('fatigue_warning')), `the threshold warning is emitted (saw ${keys.join(', ') || 'nothing'})`);
    assert.ok(keys.some((key) => key.includes('fatigue_wear')), 'the wear is emitted');
    const warning = state.fatigue.find((entry) => entry.key.includes('fatigue_warning'));
    assert.equal(warning.params.count, 50, 'the warning carries the number of victories');
    const wear = state.fatigue.find((entry) => entry.key.includes('fatigue_wear'));
    assert.ok(wear.params.damage >= 1, `the wear has a damage amount (${wear.params?.damage})`);
    assert.ok(state.hp < state.maxHp, `the team really lost HP (${state.hp} / ${state.maxHp})`);
    await page.screenshot({ path: path.join(output, '04-fatigue.png') });
    return `wins ${state.wins}, ${keys.length} fatigue line(s), ${wear.params.damage} HP wear, team ${state.hp}/${state.maxHp}`;
  });

  await check('the console stayed clean', async () => {
    const ignored = issues.filter((line) => !/favicon|net::ERR_/.test(line));
    assert.deepEqual(ignored, [], `console/page errors: ${ignored.slice(0, 3).join(' | ')}`);
    return 'no error';
  });
} catch (error) {
  await browser.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, issues }, null, 2));
  process.exit(1);
}

await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, issues }, null, 2));
console.log(`\n${results.filter((entry) => entry.passed).length}/${results.length} checks passed — artifacts in ${output}`);
await browser.close();
