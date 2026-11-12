/**
 * tools/measure/measure-dashboard.mjs
 * ---------------------------------------------------------------------------
 * Developer tool (not shipped): reaches the game dashboard, then reads the computed
 * styles of the elements the rework targets, so a port can be compared with the
 * catalogue on measured values instead of estimates.
 *
 * Usage: node tools/measure/measure-dashboard.mjs [--shot <dir>]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:3000/';
const shotIndex = process.argv.indexOf('--shot');
const SHOT_DIR = shotIndex > -1 ? process.argv[shotIndex + 1] : null;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE);
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('save-menu-new-btn')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const i = document.getElementById('starter-name-input');
  if (i) { i.value = 'Ash'; i.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.evaluate(() => document.querySelector('.starter-card')?.click());
await page.waitForTimeout(1800);
await page.evaluate(() => document.querySelectorAll('.pw-modal-backdrop,.pw-modal').forEach((e) => e.remove()));
// Toasts would sit over the windows in a capture.
await page.evaluate(() => document.querySelectorAll('.pw-toast-card,.pw-toast,.pw-toast-stack').forEach((e) => e.remove()));
await page.waitForTimeout(400);

const report = await page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      font: s.fontSize,
      weight: s.fontWeight,
      color: s.color,
      bg: s.backgroundColor,
      border: s.borderTopWidth + ' ' + s.borderTopColor,
      radius: s.borderRadius,
      padding: s.padding,
      gap: s.gap,
      display: s.display,
      columns: s.gridTemplateColumns
    };
  };
  const out = { windows: {}, panels: {} };

  for (const id of ['win-pokeballs', 'win-currency', 'win-achievements', 'win-story', 'win-battle', 'win-map', 'win-tabs', 'win-team', 'win-shortcuts']) {
    out.windows[id] = box(document.getElementById(id));
  }

  // Poké Balls
  out.panels.pokeballs = {
    row: box(document.querySelector('.pw-ball-row')),
    rows: [...document.querySelectorAll('.pw-ball-row')].map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10),
    head: box(document.querySelector('.pw-ball-head')),
    headName: box(document.querySelector('.pw-ball-head-name')),
    headCol: box(document.querySelector('.pw-ball-col')),
    name: box(document.querySelector('.pw-ball-row-name')),
    qty: box(document.querySelector('.pw-ball-row-qty')),
    ballIcon: box(document.querySelector('.pw-ball-icon'))
  };

  // Currencies
  out.panels.currencies = {
    panel: box(document.querySelector('.pw-currency-panel')),
    cols: [...document.querySelectorAll('.pw-cur-col')].map(box),
    amount: box(document.querySelector('.pw-cur-amount')),
    name: box(document.querySelector('.pw-cur-name')),
    ico: box(document.querySelector('.pw-cur-ico'))
  };

  // Achievements window
  out.panels.achievements = {
    rows: [...document.querySelectorAll('#win-achievements .pw-ach-row')].map(box),
    card: box(document.querySelector('#win-achievements .pw-ach-card')),
    title: box(document.querySelector('#win-achievements .pw-ach-title')),
    bar: box(document.querySelector('#win-achievements .pw-progress-bar, #win-achievements .pw-ach-bar'))
  };

  // Quests
  out.panels.story = {
    cards: [...document.querySelectorAll('#win-story .pw-quest-card')].map(box),
    tutorial: box(document.querySelector('#win-story .pw-tutorial-card')),
    title: box(document.querySelector('#win-story .pw-section-title'))
  };

  // Shortcuts
  out.panels.shortcuts = {
    rows: [...document.querySelectorAll('#win-shortcuts .pw-shortcut')].map(box)
  };

  // Team cards
  out.panels.team = {
    cards: [...document.querySelectorAll('#win-team .poke-card')].map(box)
  };

  // Battle
  out.panels.battle = {
    body: box(document.querySelector('#battle-window-body')),
    text: (document.querySelector('#battle-window-body')?.innerText || '').slice(0, 120)
  };

  // Map
  out.panels.map = {
    view: box(document.querySelector('#win-map .pw-map-view, #win-map canvas, #win-map img')),
    legend: box(document.querySelector('#win-map .pw-map-legend'))
  };

  return out;
});

console.log(JSON.stringify(report, null, 2));

if (SHOT_DIR) {
  await page.screenshot({ path: `${SHOT_DIR}/game-dashboard.png`, fullPage: true });
  for (const [name, id] of [['pokeballs', 'win-pokeballs'], ['currency', 'win-currency'], ['achievements', 'win-achievements'], ['story', 'win-story'], ['shortcuts', 'win-shortcuts'], ['team', 'win-team'], ['battle', 'win-battle'], ['map', 'win-map'], ['tabs', 'win-tabs']]) {
    const el = await page.$(`#${id}`);
    if (el) await el.screenshot({ path: `${SHOT_DIR}/game-${name}.png` }).catch(() => {});
  }
}

console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
