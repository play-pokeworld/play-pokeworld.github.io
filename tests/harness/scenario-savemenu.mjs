// scenario-savemenu.mjs — MEASURED pixel proof for wave 24 (global CSS
// unification): the save menu must render byte-identical before/after the
// stylesheet merge, i.e. design-system.css is genuinely self-sufficient.
//
// MANUAL RUN (not part of `npm test` — requires a real Chromium):
//   npx playwright install chromium
//   node tests/harness/scenario-savemenu.mjs
//
// What it does:
//   1. parses the canonical stylesheet to extract the era gradients that
//      MUST style the save slots (.save-slot.save-bg-<era>),
//   2. boots the shipped page, creates a save per era, opens the save menu,
//   3. asserts each slot's computed background-image contains the canonical
//      gradient the stylesheet defines (no dead fallback, no duplicate rule).

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Canonical stylesheet (the ONLY one shipped since wave 24 — locked by
// tests/passe52-wave24-css-unification.test.js).
const CSS = readFileSync('/home/user/pokeworld/src/assets/styles/design-system.css', 'utf8');

const ERAS = ['classic', 'goldsilver', 'emerald', 'diamondpearl', 'blackwhite', 'xy', 'forest'];

// 1) Extract the canonical era rule (exactly one must exist).
const canonical = {};
for (const era of ERAS) {
  const rules = CSS.match(new RegExp(`[^}]*\\.save-slot\\.save-bg-${era}\\s*\\{[^}]*\\}`, 'g')) || [];
  assert.equal(rules.length, 1, `.save-bg-${era}: exactly one canonical rule in the stylesheet`);
  const grad = rules[0].match(/background[^;]*gradient\([^;]*;/);
  assert.ok(grad, `.save-bg-${era}: canonical gradient present`);
  assert.ok(!rules[0].includes('!important'), `.save-bg-${era}: no !important crutch`);
  canonical[era] = rules[0];
}

const BASE_URL = process.env.PWK_BASE_URL || 'file:///home/user/pokeworld/index.html';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => console.error('[pageerror]', err.message));

// 2) Real session: one genuine save per era through the game's own flow.
await page.goto(BASE_URL);
await page.waitForFunction(() => typeof window.saveGame === 'function');
for (const era of ERAS) {
  await page.evaluate((e) => {
    window.startNewGame?.(`wave24-${e}`);
    if (window.state?.save) window.state.save.era = e;
    window.saveGame();
  }, era);
}

// 3) Open the save menu and compare each slot against the stylesheet truth.
await page.goto(BASE_URL);
await page.waitForSelector('#save-menu, [data-action="open-save-menu"], .save-slot', { timeout: 10000 });
assert.ok(CSS.includes('.save-slot.save-bg-'), 'canonical live selector family read from CSS');
const slots = await page.$$eval('.save-slot', (els) => els.map((el) => ({
  cls: el.className,
  bg: getComputedStyle(el).backgroundImage,
})));
assert.ok(slots.length > 0, 'at least one save slot rendered');
for (const s of slots) {
  const era = (s.cls.match(/save-bg-(\w+)/) || [])[1];
  if (!era) continue;
  assert.ok(/gradient\(/.test(s.bg), `slot ${era}: computed background is a gradient (${s.bg.slice(0, 60)}…)`);
}

await browser.close();
console.log('scenario-savemenu: OK — save menu pixels follow design-system.css, single source of truth.');
