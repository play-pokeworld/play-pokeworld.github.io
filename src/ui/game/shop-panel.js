// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function renderShop(el){
 const loc=getLocObj(G.location);
 const shopId=loc?loc.shopId:null;

 
 // Wave 15 (user feedback): the money row is ALWAYS visible, rendered
 // through the SAME DS MoneyRow component as the market panel.
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
  const comps = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
  if(!comps || typeof comps.moneyRowHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (moneyRowHTML)');
  filterBar.style.display = 'flex';
  filterBar.style.alignItems = 'center';
  filterBar.style.justifyContent = 'flex-end';
  _pwSetHtmlSafe(filterBar, comps.moneyRowHTML({ label: t('money'), amount: G.money.toLocaleString() }));
 }

 // Wave 16: the panel itself is the rebuilt ECS ShopView — the adapter
 // only shapes the model (localized labels stay HERE).
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.ShopView) throw new Error('[ui] PokeUI views not loaded (ShopView)');
 if(!shopId||!SHOPS[shopId]){
 _pwSetHtmlSafe(el, views.ShopView.toHTML({ state: 'empty', emptyLabel: t('shop_empty') }));
 return;
 }
 if(shopId === 'indigo' && !G.championTitle){
 _pwSetHtmlSafe(el, views.ShopView.toHTML({ state: 'locked', locked: { title: t('indigo_shop_locked_title'), desc: t('indigo_shop_locked_desc') } }));
 return;
 }
 const shop=SHOPS[shopId];
 // Phase 26: the generated TM/HM stock (canonical by version: gen 1 goes to Kanto,
 // gen 2 + leftovers to Johto) is merged into the shop's base stock.
 const baseItems = shop.items || [];
 const ctcsStock = (typeof CTCS_SHOP_STOCK !== 'undefined' && CTCS_SHOP_STOCK && CTCS_SHOP_STOCK[shopId]) || [];
 const stockList = baseItems.concat(ctcsStock.filter(k => !baseItems.includes(k)));
 const model = { state: 'ok', items: [] };
 for(const key of stockList){
  const itm=ITEMS[key];
  if(!itm||!itm.price) continue;
  const owned=G.inventory[key]||0;
  const isBuff = !!itm.buff;
  const full = isBuff && owned>=25;
  const stockStr = isBuff ? `${owned}/25` : `${owned}`;
  model.items.push({
   key,
   name: getItemName(key),
   desc: getItemDesc(key),
   stockLabel: `${t('stock')}: ${stockStr}`,
   maxLabel: full ? (typeof t==='function'?t('max_lbl'):'MAX') : null,
   priceLabel: `${itm.price}₽`,
   spriteHtml: itemSpriteHtml(key,40),
  });
 }
 _pwSetHtmlSafe(el, views.ShopView.toHTML(model));
}

// buyItem is NOT defined here anymore: the purchase rule (bag cap, funds,
// wallet/bag mutation) runs in the `economy:market` ECS system on the
// Wallet/InventoryItems/ShopStock components (src/application/market-system.js,
// wave 33 §1.3). The name keeps its exact public surface, re-exposed from
// the application layer.

// --- Migrated to ES module, globals exposed ---
if (typeof renderShop !== 'undefined') { if (typeof window !== 'undefined') window.renderShop = renderShop; if (typeof globalThis !== 'undefined') globalThis.renderShop = renderShop; }
// buyItem: exposed by src/application/market-system.js (ECS).



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderShop,
};

