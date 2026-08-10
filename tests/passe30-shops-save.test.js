import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── Wave 16 (2026-08-06): shops/market + save extras rebuilt on the DS ───
// Two kinds of checks here:
//   1. source contracts (adapters route through the DS, zero legacy markup),
//   2. ACTUAL rendered HTML of the rebuilt views/components (DOM-free
//      toHTML — no jsdom in tests/, the DS is pure ESM).
const R = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('shop adapter routes through ShopView (throw contract, labels stay in the adapter)', () => {
  const shop = R('src/ui/game/shop-panel.js');
  assert.ok(shop.includes("PokeUI views not loaded (ShopView)"), 'throw contract');
  assert.ok(shop.includes('views.ShopView.toHTML'), 'render through the view');
  assert.ok(shop.includes("state: 'locked'"), 'indigo lock is a model state');
  assert.ok(!shop.includes('` ${stockList.map'), 'no legacy row template left');
  assert.ok(shop.includes('stockLabel') && shop.includes("getItemDesc(key)"), 'adapter still localizes');
});

test('market adapter routes through MarketView (buckets + labels in the adapter)', () => {
  const market = R('src/ui/game/market-panel.js'); // adapter moved to the UI layer (wave 33)
  assert.ok(market.includes("PokeUI views not loaded (MarketView)"), 'throw contract');
  assert.ok(market.includes('views.MarketView.toHTML'), 'render through the view');
  assert.ok(market.includes("cats.starter.push(id)") && market.includes("cats.fossil.push(id)") && market.includes("cats.rare.push(id)"), 'bucketing preserved');
  assert.ok(market.includes('market_cat_starter') && market.includes("t('bought')"), 'labels localized in the adapter');
});

test('ShopView renders ACTUAL rows/empty/locked states (rendered-attribute assertions)', async () => {
  const { ShopView } = await import('../src/ui/views/ShopView.js');
  const ok = ShopView.toHTML({ state: 'ok', items: [{
    key: 'potion', name: 'Potion', desc: 'Heal 20', stockLabel: 'Stock: 3',
    maxLabel: 'MAX', priceLabel: '200₽', spriteHtml: '<img src="x" alt="p">',
  }] });
  assert.ok(ok.includes('class="shop-item pw-choice-card pw-shop-row"'), 'row classes');
  assert.ok(ok.includes('data-action="legacy-call"') && ok.includes('data-call="buyItem"'), 'buy contract');
  assert.ok(ok.includes('data-call-args="\'potion\'"'), 'item key arg');
  assert.ok(ok.includes('Stock: 3') && ok.includes('<span class="pw-red"> MAX</span>'), 'stock + MAX markup');
  assert.ok(ok.includes('200₽'), 'price cell');
  assert.ok(ok.includes('pw-choice-icon') && ok.includes('<img src="x" alt="p">'), 'sprite cell raw html');
  const locked = ShopView.toHTML({ state: 'locked', locked: { title: 'Locked', desc: 'Become champion' } });
  assert.ok(locked.includes('pw-empty-state-lg') && locked.includes('pw-choice-title') && locked.includes('Become champion'), 'locked state markup');
  const empty = ShopView.toHTML({ state: 'empty', emptyLabel: 'Nothing here' });
  assert.ok(empty.includes('pw-empty-state-lg') && empty.includes('Nothing here'), 'empty state markup');
});

test('MarketView renders categories + cards with the buy contract', async () => {
  const { MarketView } = await import('../src/ui/views/MarketView.js');
  const html = MarketView.toHTML({ emptyLabel: 'Empty', categories: [
    { key: 'starter', label: 'Starters', cards: [{
      id: 1, name: 'Bulbasaur', numLabel: '#1', typesHtml: '<span class="type-badge">G</span>',
      bstLabel: 'BST 318', priceLabel: '1,000₽', ownedLabel: 'Bought', spriteHtml: '<img src="b">',
    }] },
    { key: 'rare', label: 'Rare', cards: [{
      id: 25, name: '???', numLabel: '#25', typesHtml: '', bstLabel: 'BST 320',
      priceLabel: '50,000₽', ownedLabel: null, spriteHtml: '<img src="p">',
    }] },
  ] });
  assert.ok(html.includes('pw-market-cat'), 'category titles');
  assert.ok(html.includes('data-call="buyPokemon"') && html.includes('data-call-args="25"'), 'buy contract + numeric arg');
  assert.ok(html.includes('???'), 'unseen species hidden');
  assert.ok(html.includes('pw-text-sm pw-green') && html.includes('Bought'), 'owned line only when owned');
  assert.ok((html.match(/pw-market-row/g) || []).length === 2, 'exactly two cards');
  const empty = MarketView.toHTML({ emptyLabel: 'Sold out', categories: [] });
  assert.ok(empty.includes('pw-empty-state-lg') && empty.includes('Sold out'), 'empty state when every bucket is empty');
});

test('save extras components render context menu / icon grid / current icon', async () => {
  const { saveContextMenuHTML, saveIconGridHTML, saveProfileCurrentIconHTML } = await import('../src/ui/components/save-extras.js');
  const ctx = saveContextMenuHTML({ items: [
    { icon: '⬇', label: 'Download', intent: 'dl', call: 'downloadSaveById', callArgs: "'PW-1'" },
    { icon: '⬆', label: 'Import', intent: 'imp', call: 'importOverwriteSaveById', callArgs: "'PW-1'" },
    { icon: '🗑', label: 'Delete', intent: 'danger', call: 'deleteSaveById', callArgs: "'PW-1'" },
  ] });
  assert.ok(ctx.includes('save-context-item dl-item') && ctx.includes('save-context-item imp-item') && ctx.includes('save-context-item danger'), 'one colour class per action');
  assert.ok((ctx.match(/legacy-call/g) || []).length === 3, 'all three actions callable');
  const grid = saveIconGridHTML({ choices: [
    { key: 'box1', id: 25, name: 'Pikachu', level: 50, shiny: true, active: true, levelLabel: 'Lv.', iconHtml: '<img src="p25">' },
    { key: 'box2', id: 1, name: 'Bulbasaur', level: 5, shiny: false, active: false, levelLabel: 'Lv.', iconHtml: '<img src="b1">' },
  ] });
  assert.ok(grid.includes('save-icon-choice active'), 'active state on the current icon');
  assert.ok(grid.includes("data-call-args=\"'box1',25\""), 'selection contract (key + id)');
  assert.ok(grid.includes('#25 · Lv.50 ★'), 'shiny star + level');
  const emptyGrid = saveIconGridHTML({ emptyLabel: 'No box', choices: [] });
  assert.ok(emptyGrid.includes('save-icon-empty') && emptyGrid.includes('No box'), 'empty grid state');
  const cur = saveProfileCurrentIconHTML({ id: 25, name: 'Pikachu', iconHtml: '<img>', noIdLabel: 'None' });
  assert.ok(cur.includes('save-slot-icon') && cur.includes('#25'), 'current icon display');
});

test('save adapters route through the DS extras (throw contracts)', () => {
  const save = R('src/application/save/save.js');
  assert.ok(save.includes("PokeUI components not loaded (saveContextMenuHTML)"), 'context menu contract');
  assert.ok(save.includes("PokeUI components not loaded (saveIconGridHTML)"), 'icon grid contract');
  assert.ok(save.includes("PokeUI components not loaded (saveProfileCurrentIconHTML)"), 'current icon contract');
  assert.ok(!save.includes('` ★`:\'\''), 'no shiny-ternary template left in the adapter');
});

test('views/components are registered in the DS index files', () => {
  const views = R('src/ui/views/index.js');
  assert.ok(views.includes("export { ShopView } from './ShopView.js';") && views.includes("export { MarketView } from './MarketView.js';"), 'views registered');
  const comps = R('src/ui/components/index.js');
  assert.ok(comps.includes("from './save-extras.js'") && comps.includes('saveContextMenuHTML') && comps.includes('saveIconGridHTML'), 'save extras registered');
});
