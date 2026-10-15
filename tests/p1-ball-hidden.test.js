import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

// ── V7 · BALL-01 — les 11 balls « ferme » (notForSale) sont `hidden` ────────
// Absentes du dex d'objets, du sélecteur de balls et des boutiques tant
// qu'on n'en possède aucune (débloquées par CRF-01 en P6).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const FARM_BALLS = ['lureball', 'moonball', 'fastball', 'diveball', 'repeatball', 'nestball', 'duskball', 'timerball', 'quickball', 'luxuryball', 'beastball'];

async function loadItems() {
  globalThis.window = globalThis;
  const m = await import('../src/data/items-data.js');
  return m.ITEMS || globalThis.ITEMS;
}

function loadBallDefs() {
  const src = R('src/application/economy/pokeballs.js')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/m, '')
    .replace(/^export\s+/gm, '');
  const sandbox = { console, G: { pokeballs: {} }, t: (k) => k, tr: (k) => k };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox;
}

test('BALL-01 — items-data: exactly the 11 farm balls carry hidden:true (and stay notForSale)', async () => {
  const ITEMS = await loadItems();
  const hiddenBalls = Object.keys(ITEMS).filter((k) => ITEMS[k].type === 'ball' && ITEMS[k].hidden).sort();
  assert.deepEqual(hiddenBalls, [...FARM_BALLS].sort());
  for (const k of FARM_BALLS) assert.equal(ITEMS[k].notForSale, true, `${k} notForSale`);
  for (const k of ['pokeball', 'greatball', 'ultraball', 'masterball', 'honorball']) assert.ok(!ITEMS[k].hidden, `${k} visible`);
});

test('BALL-01 — BALL_DEFS mirrors the flag and isBallHidden() depends on ownership', () => {
  const sb = loadBallDefs();
  for (const k of FARM_BALLS) assert.equal(sb.BALL_DEFS[k].hidden, true, `${k} hidden in BALL_DEFS`);
  for (const k of ['pokeball', 'greatball', 'ultraball', 'masterball', 'honorball']) assert.ok(!sb.BALL_DEFS[k].hidden);
  assert.equal(typeof sb.isBallHidden, 'function');
  assert.equal(sb.isBallHidden('lureball'), true, 'hidden while none owned');
  assert.equal(sb.isBallHidden('pokeball'), false);
  sb.G.pokeballs.lureball = 1;
  assert.equal(sb.isBallHidden('lureball'), false, 'revealed once owned');
});

test('BALL-01 — the ball picker and the item dictionary honour the flag; shops never list price-0 balls', () => {
  assert.match(R('src/ui/game/pokeball-window.js'), /isBallHidden\(type\)/);
  const fp = R('src/ui/game/fullscreen-panel.js');
  assert.match(fp, /itm\.hidden/);
  assert.match(fp, /G\.pokeballs && G\.pokeballs\[k\]/);
  assert.ok(wsMatch(R('src/ui/game/shop-panel.js'), /if\(!itm\|\|!itm\.price\) continue;/)); // V7 · DBT-01
});
