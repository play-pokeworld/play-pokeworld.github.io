/**
 * Harnais visuel PASSE 39e — UNIFICATION du butin/résumé (retours joueur) :
 *   1. La réglette de butin est UNIQUE (#battle-loot-inline), située SOUS la
 *      carte de donjon, visible pendant tout le run.
 *   2. Pendant un run, elle montre le butin de TOUT le donjon (plusieurs
 *      combats cumulés), pas seulement le dernier combat.
 *   3. UN SEUL total d'argent (pas de doublon « total + dernier combat »).
 *   4. Le résumé modal montre AUSSI tout le run (mêmes captures, même total).
 *   5. La réglette et le résumé utilisent les MÊMES puces (.loot-item).
 * Usage : node tests/harness/visual-passe39e.mjs   (serveur dev sur :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:5173/';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(25000);

const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const ok = (label, cond) => console.log((cond ? '  ✔ ' : '  ✘ ') + label);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);

// ── ENTRER À LA FORÊT DE JADE ───────────────────────────────────────────────
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'viridianforest';
  window.markVisited && window.markVisited('viridianforest');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
});
await page.waitForTimeout(800);
await page.evaluate(() => window.startDungeonRun('viridianforest'));
await page.waitForTimeout(800);

// ── 1+2) SIMULER DEUX COMBATS GAGNÉS (captures + argent cumulés dans le run)
await page.evaluate(() => {
  // combat 1 : capture + argent
  globalThis.battle.sessionCatches = [{ id: 25, name: 'Pikachu', emoji: '', shiny: false }];
  globalThis.battle.sessionMoney = 150;
  window.dungeonOnWin();
  // combat 2 : capture + argent
  globalThis.battle.sessionCatches = [{ id: 133, name: 'Évoli', emoji: '', shiny: false }];
  globalThis.battle.sessionMoney = 40;
  window.dungeonOnWin();
  // un coffre remplit le sac (jetons)
  const run = G.dungeonRun;
  run.bag.tokens = 24;
  window.refreshDungeonPanel && window.refreshDungeonPanel();
});
await page.waitForTimeout(500);

const strip = await page.evaluate(() => {
  const row = document.getElementById('battle-loot-row');
  const inline = document.getElementById('battle-loot-inline');
  const bar = document.getElementById('battle-dungeon-bar');
  const map = bar && bar.querySelector('.pw-bdg-map');
  const chips = inline ? [...inline.querySelectorAll('.loot-item')] : [];
  const moneyChips = chips.filter((c) => c.classList.contains('loot-currency') && /argent/i.test(c.getAttribute('title') || ''));
  const rowR = row && row.getBoundingClientRect();
  const mapR = map && map.getBoundingClientRect();
  return {
    rowVisible: row ? getComputedStyle(row).display !== 'none' : false,
    belowMap: !!(mapR && rowR && rowR.top >= mapR.bottom - 2),
    chipCount: chips.length,
    moneyCount: moneyChips.length,
    moneyTexts: moneyChips.map((c) => (c.textContent || '').trim()),
    titles: chips.map((c) => (c.getAttribute('title') || '')),
    hasPikachu: chips.some((c) => (c.getAttribute('title') || '').includes('Pikachu')),
    hasEvoli: chips.some((c) => (c.getAttribute('title') || '').includes('Évoli')),
  };
});
console.log('  réglette sous la carte:', JSON.stringify(strip));
ok('PASSE 39e : la réglette est SOUS la carte et visible pendant le run', strip.rowVisible && strip.belowMap);
ok('PASSE 39e : TOUT le run est dans la réglette (Pikachu + Évoli)', strip.hasPikachu && strip.hasEvoli);
ok('PASSE 39e : UN SEUL total d\'argent (pas de doublon)', strip.moneyCount <= 1);
if (strip.moneyCount === 1) {
  ok('PASSE 39e : le total affiché inclut les deux combats (+190)', /190/.test(strip.moneyTexts[0]));
}

// ── 4) LE RÉSUMÉ MODAL MONTRE AUSSI TOUT LE RUN ─────────────────────────────
await page.click('#loot-open-btn');
await page.waitForTimeout(600);
const modal = await page.evaluate(() => {
  const inner = document.getElementById('battle-summary-inner');
  if (!inner) return { missing: true };
  const text = inner.textContent || '';
  const chips = [...inner.querySelectorAll('.loot-item')];
  return {
    hasPikachu: text.includes('Pikachu'),
    hasEvoli: text.includes('Évoli'),
    money: text.match(/\+\s?\d+/)?.[0] || null,
    chipsCount: chips.length,
  };
});
console.log('  résumé modal:', JSON.stringify(modal));
ok('PASSE 39e : le résumé modal montre TOUT le run (Pikachu + Évoli)', modal.hasPikachu && modal.hasEvoli);
ok('PASSE 39e : le résumé montre le total du run', modal.money && /190/.test(modal.money));
await page.evaluate(() => window.closeBattleSummary && window.closeBattleSummary());
await page.waitForTimeout(300);

// ── 5) LES PUCES DE LA RÉGLETTE = CELLES DU RÉSUMÉ (même composant) ─────────
const markup = await page.evaluate(() => {
  const inline = document.getElementById('battle-loot-inline');
  const inlineChips = inline ? [...inline.querySelectorAll('.loot-item')] : [];
  const inlineClasses = inlineChips.map((c) => c.className).join('|');
  const row = document.getElementById('battle-loot-row');
  return {
    inlineClasses,
    rowId: row ? row.id : 'missing',
  };
});
ok('PASSE 39e : la réglette utilise les puces .loot-item/.loot-currency', /loot-item/.test(markup.inlineClasses));

// ── 3) PLUS AUCUN PANNEAU PARALLÈLE DANS LE BANDEAU ─────────────────────────
const noParallel = await page.evaluate(() => {
  const bar = document.getElementById('battle-dungeon-bar');
  return bar ? !bar.querySelector('.pw-bdg-loot') : true;
});
ok('PASSE 39e : plus de panneau de butin parallèle dans le bandeau', noParallel);

await page.screenshot({ path: '/home/user/shots/p39e-butin-unifie.png' });
await browser.close();

const bad = errs.filter((e) => !/favicon/i.test(e));
console.log('erreurs JS:', bad.length ? bad.join(' | ') : 'aucune');
process.exit(bad.length ? 1 : 0);
