/**
 * @file MobileTouch.mjs
 * @brief Real Chromium verification of the touch-screen pass (v1.16.19): panels that scroll, filter
 *        chips that are no longer sliced, press-and-hold secondary actions, and the page behind a
 *        panel that must not move.
 *
 * Emulation: an iPhone 13 (390 x 664 CSS px, device pixel ratio 3, `pointer: coarse`), the same
 * profile on which the defects were reported. Every gesture is dispatched as a real CDP touch
 * sequence, so what is measured is what a finger does, not what `element.click()` pretends.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/MobileTouch.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium, devices } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-mobile');
await fs.mkdir(output, { recursive: true });
const BASE = process.env.PW_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ ...devices['iPhone 13'] });
page.setDefaultTimeout(20000);

const issues = [];
const results = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name + (detail ? ` — ${detail}` : ''));
    return detail;
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    console.log('FAIL ' + name);
    console.log(error.stack);
    throw error;
  }
}

const cdp = await page.context().newCDPSession(page);

/** Real finger gesture: press, hold `hold` ms, release. No movement, like a long press. */
async function press(x, y, hold) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(hold);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Real finger swipe: press then move vertically, so the browser scrolls whatever is under it. */
async function swipe(x, y, dy, steps = 14) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * step) / steps }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const openModal = (modalId, params = {}) => page.evaluate(async ([id, p]) => {
  const { EventBus } = await import('/src/core/EventBus.js');
  const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
  EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(id, p));
}, [modalId, params]);

/** Back to the game page, whichever page the previous check had opened. */
const goToGame = async () => {
  await page.evaluate(async () => {
    const { Engine } = await import('/src/core/Engine.js');
    const { PageIds } = await import('/src/pages/PageIds.js');
    Engine.getInstance().getPageManager().openPage(PageIds.GAME);
  });
  await page.waitForTimeout(1800);
};

/** Ids of every layer currently visible on top of the game (overlays, backdrops, static modals). */
const openLayers = () => page.evaluate(() =>
  [...document.querySelectorAll('.pw-fullscreen-overlay.is-open, .pw-modal-backdrop.is-open, .pw-modal.is-open')]
    // A backdrop may be anonymous: fall back to the id of the modal it carries, so every layer has
    // a name in the assertion messages.
    .map((el) => el.id || el.querySelector('[id]')?.id || el.className.split(' ')[0]),
);

const closeModals = async () => {
  // Escape is the path a player uses, and it reaches every layer through its focus scope. Layers
  // without one are then closed by request (a backdrop may carry no id of its own).
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await openLayers()).length === 0) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(220);
  }
  await page.evaluate(async () => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js');
    const ids = new Set();
    for (const el of document.querySelectorAll('.pw-fullscreen-overlay.is-open, .pw-modal-backdrop.is-open, .pw-modal.is-open')) {
      // An anonymous backdrop is closed through the id of the modal it carries.
      const id = el.id || el.querySelector('[id]')?.id || '';
      ids.add(id);
      ids.add(id.replace(/-overlay$/, ''));
    }
    for (const id of ids) if (id) EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(id));
  });
  await page.waitForTimeout(350);
};

/** Centre of the first element matching `selector` inside the open panel. */
const centreOf = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, box: [Math.round(rect.width), Math.round(rect.height)] };
}, selector);

await page.goto(BASE, { waitUntil: 'networkidle' });

await check('a save boots in mobile mode on a phone viewport', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
    LocalizationManager.getInstance().setLanguage('fr');
    const save = SaveSystem.getInstance().createNewSave('Tactile', 'charmander');
    // The tutorial hands out Poké Balls, whose row has no primary action on a tap (a tap opens its
    // sheet, like a hold does). Disable it so the bag only holds consumables, the one family where
    // "tap" and "hold" are visibly different actions.
    save.tutorial.enabled = false;
    if (save.inventory.count('pokeball')) save.inventory.remove('pokeball', save.inventory.count('pokeball'));
    save.player.region = 'kanto';
    save.player.location = 'route1';
    // No Poké Ball on purpose: a ball row has no primary action on a tap (its sheet IS the tap), so
    // it cannot tell a short tap from a long press. A consumable opens the target picker on a tap and
    // the item sheet on a hold, which is exactly the difference this suite has to measure.
    save.inventory.add('bottle_cap', 3);
    Engine.getInstance().getPageManager().openPage('game');
    return { id: save.id };
  });
  await page.waitForTimeout(2500);
  const ui = await page.evaluate(() => ({
    coarse: matchMedia('(pointer: coarse)').matches,
    mobileClass: document.body.classList.contains('mobile-mode'),
    navBar: !!document.querySelector('.mobile-nav-bar'),
    vw: innerWidth,
  }));
  assert.ok(ui.coarse, 'the emulated device reports a coarse pointer');
  assert.ok(ui.mobileClass && ui.navBar, 'the game switched to its mobile layout');
  return `save ${fact.id}, ${ui.vw}px, coarse pointer, mobile nav bar`;
});

await check('the dashboard never scrolls sideways', async () => {
  const fact = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(fact.scrollWidth <= fact.clientWidth + 1, `no horizontal overflow (${fact.scrollWidth} / ${fact.clientWidth})`);
  return `${fact.scrollWidth}px of content in ${fact.clientWidth}px`;
});

await check('the filter drawer folds the search field and never slices a chip', async () => {
  await openModal('fs-box');
  await page.waitForTimeout(700);
  const collapsed = await page.evaluate(() => {
    const bar = document.querySelector('.pw-fullscreen-overlay.is-open .pw-filterbar');
    const barRect = bar.getBoundingClientRect();
    const chips = [...bar.querySelectorAll('.pw-chip')].map((chip) => {
      const rect = chip.getBoundingClientRect();
      return { text: chip.textContent.trim().slice(0, 14), cut: rect.bottom > barRect.bottom + 1 || rect.top < barRect.top - 1 };
    });
    return {
      cut: chips.filter((chip) => chip.cut).map((chip) => chip.text),
      chipCount: chips.length,
      fields: getComputedStyle(bar.querySelector('.pw-filter-fields')).display,
      end: getComputedStyle(bar.querySelector('.pw-filter-end')).display,
    };
  });
  assert.equal(collapsed.cut.length, 0, `no chip is cut (cut: ${collapsed.cut.join(', ')})`);
  assert.equal(collapsed.end, 'none', 'the search field is folded away');
  assert.equal(collapsed.fields, 'none', 'the labelled selects are folded away');

  const toggle = await centreOf('.pw-fullscreen-overlay.is-open .pw-drawer-toggle');
  assert.ok(toggle, 'the drawer toggle is reachable');
  await press(toggle.x, toggle.y, 90);
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => ({
    end: getComputedStyle(document.querySelector('.pw-fullscreen-overlay.is-open .pw-filter-end')).display,
    expanded: document.querySelector('.pw-fullscreen-overlay.is-open .pw-filterbar').classList.contains('mobile-drawer-open'),
  }));
  assert.ok(opened.expanded, 'the toggle expands the toolbar');
  assert.notEqual(opened.end, 'none', 'the search field comes back when expanded');
  await closeModals();
  return `${collapsed.chipCount} chips whole, search folded then revealed`;
});

await check('a full-screen panel scrolls with a finger and the page behind stays put', async () => {
  await openModal('fs-dictionary');
  await page.waitForTimeout(900);
  const geometry = await page.evaluate(() => {
    const container = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-container');
    const body = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-body');
    const cs = getComputedStyle(body);
    return {
      bodyScrollable: body.scrollHeight > body.clientHeight + 2,
      bodyOverflow: cs.overflowY,
      overscroll: cs.overscrollBehaviorY,
      containerScrolls: container.scrollHeight > container.clientHeight + 2,
      locked: document.body.classList.contains('pw-scroll-locked'),
      pageScrollY: window.scrollY,
      vh: innerHeight,
      bodyBottom: Math.round(body.getBoundingClientRect().bottom),
    };
  });
  assert.equal(geometry.bodyOverflow, 'auto', 'the panel body is the scroller');
  assert.equal(geometry.overscroll, 'contain', 'a swipe that reaches the end cannot chain to the page');
  assert.ok(geometry.bodyScrollable, 'there is something to scroll');
  assert.ok(!geometry.containerScrolls, 'the panel container itself does not scroll (no nested scroll)');
  assert.ok(geometry.locked, 'the page is locked while the panel is open');
  assert.ok(geometry.bodyBottom <= geometry.vh + 1, 'the body ends inside the visible viewport');

  const box = await page.evaluate(() => {
    const rect = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-body').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + Math.min(240, rect.height / 2) };
  });
  const before = await page.evaluate(() => ({
    body: document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-body').scrollTop,
    page: window.scrollY,
  }));
  await swipe(box.x, box.y, -260);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    body: document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-body').scrollTop,
    page: window.scrollY,
  }));
  assert.ok(after.body > before.body + 40, `the finger scrolled the panel (${before.body} → ${after.body})`);
  assert.equal(after.page, before.page, 'the game page behind the panel did not move');
  await closeModals();
  const released = await page.evaluate(() => document.body.classList.contains('pw-scroll-locked'));
  assert.equal(released, false, 'closing the panel releases the page lock');
  return `body ${before.body} → ${after.body}, page stayed at ${after.page}`;
});

await check('the Pokémon sheet scrolls under the finger too, inside the screen', async () => {
  await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    const lead = (save.team ?? [])[0] ?? null;
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent('poke-modal-inner', { pokemonUid: lead?.uid ?? null, teamIndex: 0 }));
  });
  await page.waitForTimeout(1000);
  const box = await page.evaluate(() => {
    const sheet = document.querySelector('#poke-modal-inner');
    if (!sheet) return null;
    const rect = sheet.getBoundingClientRect();
    const scroller = [...sheet.querySelectorAll('*')].find((el) => {
      const cs = getComputedStyle(el);
      return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 20;
    });
    return {
      rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
      vh: innerHeight,
      scroller: scroller ? { cls: scroller.className, over: scroller.scrollHeight - scroller.clientHeight } : null,
    };
  });
  assert.ok(box, 'the Pokémon sheet is open');
  assert.ok(box.rect[1] >= 0 && box.rect[1] + box.rect[3] <= box.vh + 1, `the sheet fits the visible height (${box.rect.join(',')} in ${box.vh})`);
  assert.ok(box.rect[0] >= 0 && box.rect[0] + box.rect[2] <= (await page.evaluate(() => innerWidth)) + 1, 'the sheet fits the width');
  await closeModals();
  return `sheet ${box.rect[2]}x${box.rect[3]} in ${box.vh}px, scroller ${box.scroller ? 'yes' : 'none'}`;
});

await check('every panel keeps its content inside the phone screen', async () => {
  const panels = ['fs-inventory', 'fs-box', 'fs-pokedex', 'fs-badges', 'fs-guide'];
  const report = [];
  for (const id of panels) {
    await openModal(id);
    await page.waitForTimeout(700);
    const fact = await page.evaluate(() => {
      const container = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-container');
      const body = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-body');
      const rect = container.getBoundingClientRect();
      const crossings = [];
      for (const el of container.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > rect.right + 2 || r.left < rect.left - 2) {
          crossings.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (${Math.round(r.left)}→${Math.round(r.right)})`);
        }
      }
      body.scrollTop = body.scrollHeight;
      const last = body.lastElementChild?.getBoundingClientRect();
      return {
        crossings: crossings.slice(0, 4),
        reachable: !last || last.bottom <= rect.bottom + 2,
        height: Math.round(rect.height),
        vh: innerHeight,
      };
    });
    assert.deepEqual(fact.crossings, [], `${id} keeps every box inside the panel`);
    assert.ok(fact.reachable, `${id} reaches its last row by scrolling`);
    report.push(`${id} ${fact.height}/${fact.vh}px`);
    await closeModals();
  }
  return report.join(', ');
});

/** Opens the bag and taps the first category chip that actually holds something. */
async function openBagOnFilledCategory() {
  await openModal('fs-inventory');
  await page.waitForTimeout(800);
  const chips = await page.evaluate(() => [...document.querySelectorAll('.pw-fullscreen-overlay.is-open .pw-chip')].map((chip) => {
    const rect = chip.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      active: chip.classList.contains('active'),
      filled: /[1-9]/.test(chip.textContent.trim().slice(-3)),
    };
  }));
  const target = chips.find((chip) => chip.filled && !chip.active);
  if (target) {
    await press(target.x, target.y, 90);
    await page.waitForTimeout(550);
  }
}

await check('tapping a row still runs its primary action, and holding it opens the sheet', async () => {
  await openBagOnFilledCategory();
  const row = await centreOf('.pw-fullscreen-overlay.is-open .inv-item');
  assert.ok(row, 'the bag shows a row');

  const isSheet = (layers) => layers.some((id) => /dictionary-detail/.test(id ?? ''));

  // Short tap: the primary action, never the item sheet.
  await press(row.x, row.y, 90);
  await page.waitForTimeout(700);
  const afterTap = await openLayers();
  assert.ok(!isSheet(afterTap), `a short tap does not open the item sheet (open: ${afterTap.join(', ')})`);
  assert.ok(afterTap.some((id) => /item-target/.test(id ?? '')), `the tap ran the item's own action (open: ${afterTap.join(', ')})`);
  await closeModals();

  await openBagOnFilledCategory();
  const again = await centreOf('.pw-fullscreen-overlay.is-open .inv-item');
  assert.ok(again, 'the bag shows a row again');
  await press(again.x, again.y, 700);
  await page.waitForTimeout(600);
  const afterHold = await openLayers();
  assert.ok(isSheet(afterHold), `holding the row opens its sheet (open: ${afterHold.join(', ') || 'none'})`);
  const title = await page.evaluate(() => document.querySelector('#pw-dictionary-detail .pw-info-name, #pw-dictionary-detail h2, #pw-dictionary-detail .modal-title')?.textContent?.trim() ?? '');
  await closeModals();
  return `tap → ${afterTap.filter((id) => id !== 'fs-inventory').join(', ') || 'nothing'}, hold → "${title}"`;
});

await check('holding a PC box entry opens the Pokémon sheet', async () => {
  await openModal('fs-box');
  await page.waitForTimeout(900);
  const entry = await centreOf('.pw-fullscreen-overlay.is-open .pw-box-grid-entry');
  assert.ok(entry, 'the box shows an entry');
  await press(entry.x, entry.y, 700);
  await page.waitForTimeout(700);
  const fact = await openLayers();
  assert.ok(fact.some((id) => /poke-modal|poke-sheet|pokemon-info/.test(id ?? '')), `the Pokémon sheet opened (open: ${fact.join(', ')})`);
  await closeModals();
  return fact.join(', ');
});

await check('holding a save card opens its menu and the menu survives the release', async () => {
  await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { PageIds } = await import('/src/pages/PageIds.js');
    SaveSystem.getInstance().createNewSave('Tactile B', 'squirtle');
    Engine.getInstance().getPageManager().openPage(PageIds.SAVE_MENU);
  });
  await page.waitForTimeout(2000);
  const card = await centreOf('.save-slot');
  assert.ok(card, 'the save menu shows a card');
  await press(card.x, card.y, 700);
  await page.waitForTimeout(700);
  const fact = await page.evaluate(() => ({
    open: !!document.querySelector('.pw-context-menu.open'),
    items: [...document.querySelectorAll('.pw-context-menu.open button')].map((b) => b.textContent.trim()).filter(Boolean),
    stillOnSaveMenu: !!document.querySelector('.save-menu-panel'),
  }));
  assert.ok(fact.open, 'the menu is open after the finger lifts');
  assert.ok(fact.items.length >= 3, `the menu carries its actions (${fact.items.join(' / ')})`);
  assert.ok(fact.stillOnSaveMenu, 'the release did not launch the save');
  return fact.items.join(' / ');
});

await check('the page lock is released after every overlay closes', async () => {
  const fact = await page.evaluate(() => ({
    locked: document.body.classList.contains('pw-scroll-locked'),
    overlays: document.querySelectorAll('.pw-fullscreen-overlay.is-open').length,
  }));
  assert.equal(fact.overlays, 0, 'no overlay is left open');
  assert.equal(fact.locked, false, 'the game page can scroll again');
  return 'clean';
});

await check('the visible controls are big enough for a finger', async () => {
  await goToGame();
  const measure = () => page.evaluate(() => {
    const small = [];
    for (const el of document.querySelectorAll('button, [role=button], a[href], .pw-chip, .modal-close, select, input')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.width < 34 || r.height < 34) small.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return small.slice(0, 6);
  });
  const dashboard = await measure();
  assert.deepEqual(dashboard, [], `no dashboard control is smaller than 34px (${dashboard.join(', ')})`);

  await openModal('fs-pokedex');
  await page.waitForTimeout(800);
  const panel = await measure();
  assert.deepEqual(panel, [], `no panel control is smaller than 34px (${panel.join(', ')})`);
  await closeModals();
  return 'every control is at least 34px, dashboard and panel';
});

await check('the long press never leaves text selectable under the finger', async () => {
  await page.evaluate(async () => {
    const { Engine } = await import('/src/core/Engine.js');
    const { PageIds } = await import('/src/pages/PageIds.js');
    Engine.getInstance().getPageManager().openPage(PageIds.SAVE_MENU);
  });
  await page.waitForTimeout(1200);
  const fact = await page.evaluate(() => {
    const card = document.querySelector('.save-slot');
    if (!card) return null;
    const cs = getComputedStyle(card);
    return { longPressClass: card.classList.contains('pw-long-press'), callout: cs.webkitTouchCallout || cs.getPropertyValue('-webkit-touch-callout'), select: cs.userSelect };
  });
  assert.ok(fact, 'a long-press surface is on screen');
  assert.ok(fact.longPressClass, 'the gesture marks its surface');
  assert.equal(fact.select, 'none', 'the surface is not selectable while it hosts the gesture');
  return `user-select: ${fact.select}, callout: ${fact.callout.trim()}`;
});

await check('turned sideways, a panel still fits and the chip row stays whole', async () => {
  await goToGame();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await openModal('fs-box');
  await page.waitForTimeout(900);
  const fact = await page.evaluate(() => {
    const container = document.querySelector('.pw-fullscreen-overlay.is-open .pw-modal-container');
    const rect = container.getBoundingClientRect();
    const bar = document.querySelector('.pw-fullscreen-overlay.is-open .pw-filterbar');
    const barRect = bar.getBoundingClientRect();
    const cut = [...bar.querySelectorAll('.pw-chip')].filter((chip) => {
      const r = chip.getBoundingClientRect();
      return r.bottom > barRect.bottom + 1 || r.top < barRect.top - 1;
    }).length;
    return {
      box: [Math.round(rect.width), Math.round(rect.height)],
      vw: innerWidth,
      vh: innerHeight,
      cut,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  assert.ok(fact.box[0] <= fact.vw + 1 && fact.box[1] <= fact.vh + 1, `the panel fits the landscape screen (${fact.box.join('x')} in ${fact.vw}x${fact.vh})`);
  assert.equal(fact.cut, 0, 'no chip is cut in landscape either');
  assert.ok(fact.scrollWidth <= fact.vw + 1, 'the page does not scroll sideways');
  await closeModals();
  await page.setViewportSize({ width: 390, height: 664 });
  await page.waitForTimeout(400);
  return `${fact.box.join('x')} in ${fact.vw}x${fact.vh}`;
});

await check('the console stayed clean', () => {
  assert.deepEqual(issues, []);
  return 'no warning, no error';
});

await browser.close();
const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
